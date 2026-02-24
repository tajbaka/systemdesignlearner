## Introduction

The interviewer says: "Design Dropbox."

You think, "Just upload files to S3." Then they follow up: "What happens when a user edits a 5GB file and syncs across three devices? How do you avoid re-uploading the entire file? What happens when two people edit the same file at the same time?"

And now you realize this isn't about file storage. It's about chunking, [delta sync](/learn/delta-sync), [presigned URLs](/learn/presigned-urls), and real-time notification. A file sync system combines block-level deduplication, conflict resolution, and cross-device push notifications into one of the most bandwidth-sensitive system design problems.

Here's how to design a file sync system that's efficient, durable, and works across every device.

---

## Functional Requirements

**1. Upload & download files**

- Users upload and download files of any size, from small documents to multi-gigabyte videos
- The system uses [presigned URLs](/learn/presigned-urls) so clients upload directly to object storage (S3), bypassing the application server entirely
- The app server never touches file bytes -- it only manages metadata and generates upload/download URLs
- Each file has a version history, so users can restore previous versions
- Folder hierarchy is preserved: users organize files into nested directories

**2. Delta sync (block-level)**

- Files are split into fixed-size chunks (~4MB each) on the client before upload
- Each chunk is hashed using SHA-256 to produce a content fingerprint
- On file change, the client compares local chunk hashes against the server's record and uploads only the chunks that changed
- A 5GB file with a one-line edit results in uploading a single 4MB chunk, not the full 5GB
- See [delta sync](/learn/delta-sync) for implementation patterns

**3. Cross-device synchronization**

- When a file changes on one device, all other connected devices belonging to the same user are notified
- Notifications are pushed via [WebSockets](/learn/websockets-realtime) for online clients and long-polling as a fallback
- On notification, each device fetches the updated metadata and downloads only the new or modified chunks
- Offline devices sync when they reconnect by requesting all changes since their last sync timestamp

That's the core. A file sync system answers: "Did the file change?", "Which parts changed?", and "Does every device have the latest version?"

---

## Non-Functional Requirements

**Extreme durability**

- File data must have 99.999999999% (11 nines) durability -- losing a user's files is unacceptable
- Store file chunks in S3 with cross-region replication enabled
- Metadata is backed by PostgreSQL with automated backups and point-in-time recovery
- See [storage types](/learn/storage-types) for object storage durability guarantees

**ACID metadata consistency**

- File metadata (hierarchy, versions, chunk mappings) lives in a SQL database with ACID transactions
- When two devices commit changes to the same file simultaneously, version numbers and transactions prevent data corruption
- Strong consistency for metadata operations eliminates ambiguity during conflict resolution
- See [Databases & Caching](/learn/database-caching) for why SQL is the right choice for file metadata

---

## API Design

**Request presigned upload URL**

```
POST /api/v1/files/upload-url

Request Body:
{
  "fileId": "file-8a3f",
  "chunkHash": "sha256:a1b2c3d4...",
  "size": 4194304
}

Response:
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/chunks/sha256:a1b2c3d4...?X-Amz-Signature=...",
  "chunkId": "chunk-5e9b"
}

Status: 200 OK
```

The server checks if a chunk with this hash already exists. If it does, it skips the upload and returns immediately -- this is how deduplication works. If not, it generates a presigned URL valid for a short window (e.g., 15 minutes). The client uploads the chunk directly to S3 using this URL, keeping file data off the app server entirely.

**Commit file version**

```
POST /api/v1/files/{id}/commit

Request Body:
{
  "version": 7,
  "chunks": [
    "sha256:a1b2c3d4...",
    "sha256:e5f6g7h8...",
    "sha256:i9j0k1l2..."
  ]
}

Response:
{
  "fileId": "file-8a3f",
  "version": 7,
  "updatedAt": "2026-03-15T09:22:10Z"
}

Status: 200 OK
```

The commit is atomic: the server verifies that the expected version matches the current version (optimistic locking), writes the new version record and chunk mappings in a single transaction, and publishes a sync event. If the version doesn't match, the commit is rejected and the client must resolve the conflict.

**Get changes since last sync**

```
GET /api/v1/files/changes?since=2026-03-15T08:00:00Z

Response:
{
  "changes": [
    {
      "fileId": "file-8a3f",
      "action": "modified",
      "version": 7,
      "chunks": [
        "sha256:a1b2c3d4...",
        "sha256:e5f6g7h8...",
        "sha256:i9j0k1l2..."
      ],
      "updatedAt": "2026-03-15T09:22:10Z"
    },
    {
      "fileId": "file-2b7c",
      "action": "deleted",
      "version": 3,
      "updatedAt": "2026-03-15T09:15:00Z"
    }
  ],
  "syncToken": "2026-03-15T09:22:10Z"
}

Status: 200 OK
```

**Key fields:**

- `fileId`: Unique identifier for the file
- `chunkHash`: SHA-256 hash of the chunk content, used as the content-addressable key in object storage
- `version`: Monotonically increasing version number per file, used for optimistic concurrency control
- `chunks`: Ordered list of chunk hashes that compose the file at a given version
- `syncToken`: Timestamp or cursor for the next sync request, so the client can resume from where it left off
- `action`: Type of change (created, modified, deleted) so the client knows what to do locally

---

## High Level Design

Here's the overall architecture:

![Dropbox High-level Design](diagram:dropbox)

### Key Components

**1. Client (Watcher/Chunker)**

- Desktop or mobile application installed on the user's device
- Watches the local file system for changes (file created, modified, deleted)
- When a change is detected, splits the file into fixed-size chunks (~4MB), computes SHA-256 hashes for each chunk, and compares against the known chunk list for the current version
- Uploads only changed chunks via [presigned URLs](/learn/presigned-urls) directly to S3
- After all chunks are uploaded, sends a commit request to the Metadata API
- Maintains a local database of file metadata and chunk hashes for offline operation

**2. Metadata API Service**

- Stateless REST service deployed as a [microservice](/learn/microservices) behind a load balancer
- Handles presigned URL generation, commit operations, change queries, and file hierarchy management
- Performs deduplication checks: before generating an upload URL, checks if a chunk with that hash already exists in storage
- Never handles file data -- only metadata. This is the key design decision that allows the service to stay lightweight and scale independently
- Validates version numbers on commit to enforce optimistic locking

**3. Object Storage (S3)**

- Stores raw file chunks, each keyed by its SHA-256 content hash
- Content-addressable storage: identical content always produces the same hash, so duplicate chunks are stored exactly once regardless of which user or file they belong to
- Cross-region replication for 11-nines durability
- See [storage types](/learn/storage-types) for object storage characteristics

**4. Metadata DB (SQL)**

- PostgreSQL database storing users, files, folders, file versions, and chunk mappings
- ACID transactions ensure that a file commit atomically updates the version and chunk list
- The file hierarchy (folders containing files) is stored as a tree structure with parent references
- See [Databases & Caching](/learn/database-caching) for SQL vs NoSQL trade-offs

**5. Message Queue (Kafka)**

- Decouples file commit events from sync notifications
- When the Metadata API commits a new file version, it publishes a `FileUpdated` event to the queue
- Consumers process events asynchronously, ensuring the commit API returns quickly without waiting for notifications to be delivered
- Provides durability: if the notification service is temporarily down, events are retained and processed when it recovers
- See [message queues](/learn/message-queues) for queue patterns

**6. Notification/Sync Service**

- Consumes `FileUpdated` events from Kafka
- Maintains persistent [WebSocket](/learn/websockets-realtime) connections with all online client devices
- When an event arrives, looks up which devices belong to the file's owner (and any shared collaborators), then pushes a lightweight sync signal to those devices
- The signal tells the client "file X changed" -- the client then calls the changes API to get details and download new chunks
- Falls back to long-polling for clients that can't maintain WebSocket connections

### Why This Architecture

**Why presigned URLs?** If every file upload flows through the app server, a 5GB upload consumes 5GB of server bandwidth, memory, and CPU time. With presigned URLs, the client uploads directly to S3. The app server only generates a signed URL (a few hundred bytes), freeing it to handle thousands of concurrent uploads. This is the standard pattern for any system handling large file uploads.

**Why chunk-level sync?** A user edits a single paragraph in a 500MB presentation. Without chunking, the entire 500MB is re-uploaded. With 4MB chunks, only the single modified chunk (~4MB) is uploaded. This is 125x more efficient. Chunking also enables resumable uploads: if a connection drops mid-upload, only the incomplete chunk needs to be retried.

**Why SQL for metadata?** Two devices commit changes to the same file simultaneously. Without ACID transactions and version locking, one write silently overwrites the other. SQL's transactional guarantees let you implement optimistic locking cleanly: the second commit fails, the client is notified, and it can resolve the conflict. See [consistency patterns](/learn/consistency-patterns) for more on concurrency control.

**Why a message queue between commit and notification?** The commit path must be fast -- the user is waiting. If the commit handler had to identify all connected devices and push WebSocket messages synchronously, it would add latency and couple the commit's reliability to the notification service's availability. A [message queue](/learn/message-queues) decouples these concerns: commit returns immediately, and notifications are delivered asynchronously.

---

## Detailed Design

### Database Schema

```
Table: users
  id                UUID PRIMARY KEY
  email             VARCHAR UNIQUE NOT NULL
  storage_quota     BIGINT NOT NULL           -- bytes
  storage_used      BIGINT NOT NULL DEFAULT 0
  created_at        TIMESTAMP NOT NULL

Table: files
  id                UUID PRIMARY KEY
  owner_id          UUID REFERENCES users(id)
  parent_folder_id  UUID REFERENCES files(id) -- NULL for root
  name              VARCHAR NOT NULL
  is_folder         BOOLEAN NOT NULL DEFAULT FALSE
  current_version   INTEGER NOT NULL DEFAULT 1
  size              BIGINT NOT NULL DEFAULT 0 -- bytes (latest version)
  created_at        TIMESTAMP NOT NULL
  updated_at        TIMESTAMP NOT NULL
  deleted_at        TIMESTAMP                 -- soft delete

Index: idx_files_parent ON files(parent_folder_id)
Index: idx_files_owner ON files(owner_id, updated_at DESC)
Unique: uq_files_parent_name ON files(parent_folder_id, name) WHERE deleted_at IS NULL

Table: file_versions
  id                UUID PRIMARY KEY
  file_id           UUID REFERENCES files(id)
  version           INTEGER NOT NULL
  size              BIGINT NOT NULL
  committed_by      UUID REFERENCES users(id)
  device_id         UUID REFERENCES devices(id)
  created_at        TIMESTAMP NOT NULL

Unique: uq_file_version ON file_versions(file_id, version)

Table: chunks
  hash              VARCHAR PRIMARY KEY       -- SHA-256 content hash
  size              BIGINT NOT NULL
  reference_count   INTEGER NOT NULL DEFAULT 1
  created_at        TIMESTAMP NOT NULL

Table: file_chunks
  id                UUID PRIMARY KEY
  file_version_id   UUID REFERENCES file_versions(id)
  chunk_hash        VARCHAR REFERENCES chunks(hash)
  chunk_index       INTEGER NOT NULL          -- position in file
  created_at        TIMESTAMP NOT NULL

Index: idx_file_chunks_version ON file_chunks(file_version_id, chunk_index)

Table: devices
  id                UUID PRIMARY KEY
  user_id           UUID REFERENCES users(id)
  name              VARCHAR NOT NULL
  last_sync_at      TIMESTAMP
  created_at        TIMESTAMP NOT NULL
```

The `chunks` table uses the SHA-256 hash as the primary key. This is the foundation of deduplication: if two files (or two users) have identical content in a chunk, only one copy exists in storage. The `reference_count` tracks how many file versions point to each chunk, enabling safe garbage collection.

### Upload Flow

```
1. Client detects a file change (watcher triggers on file system event)
2. Client splits the file into 4MB chunks and computes SHA-256 hash for each
3. Client compares chunk hashes against the local metadata DB:
   - Unchanged chunks: skip (already on server)
   - New/modified chunks: need upload
4. For each new chunk, client calls POST /api/v1/files/upload-url:
   - Server checks if chunk hash exists in the chunks table
   - If exists: return immediately (dedup -- no upload needed)
   - If not: generate presigned S3 URL, return to client
5. Client uploads each new chunk directly to S3 via presigned URL
   - Uploads happen in parallel (up to N concurrent connections)
   - Failed uploads are retried individually
6. After all chunks are uploaded, client calls POST /api/v1/files/{id}/commit:
   a. Server verifies version matches current_version (optimistic lock)
   b. BEGIN TRANSACTION
      - INSERT file_versions record
      - INSERT file_chunks mappings for each chunk in order
      - UPDATE files SET current_version = new_version, size = new_size
      - UPDATE or INSERT chunks records, increment reference_count
   c. COMMIT
   d. Publish FileUpdated event to Kafka
7. Notification Service receives event, pushes sync signal to other devices
```

**Why check deduplication before generating the URL?** If a user uploads the same file twice, or two users upload the same document, every chunk already exists. The server can skip the upload entirely and go straight to the commit step. At scale, this saves enormous amounts of bandwidth and storage.

### Download/Sync Flow

```
1. Client receives sync signal via WebSocket ("file-8a3f changed")
   - Or: client reconnects after being offline and calls GET /api/v1/files/changes?since=<last_sync>
2. Client fetches the updated file metadata, including the new chunk list
3. Client compares the new chunk list against its local chunk cache:
   - Chunks already cached locally: skip download
   - New chunks: need download
4. For each new chunk, client requests a presigned download URL from the server
5. Client downloads new chunks in parallel directly from S3
6. Client reassembles the file locally by concatenating chunks in order
7. Client updates its local metadata DB with the new file version and chunk hashes
8. Client updates last_sync_at timestamp
```

The download flow mirrors the upload flow in its efficiency: only new chunks are downloaded. If a 500MB file had one chunk modified, the client downloads 4MB, not 500MB.

### Conflict Resolution

When two devices edit the same file simultaneously, the system must handle the conflict without losing either user's changes.

```
1. Device A and Device B both have file-8a3f at version 6
2. Device A edits the file and commits:
   - POST /api/v1/files/file-8a3f/commit with version: 7
   - Server: current_version is 6, expected version is 7 -- accepted
   - File is now at version 7
3. Device B edits the file (different changes) and tries to commit:
   - POST /api/v1/files/file-8a3f/commit with version: 7
   - Server: current_version is now 7, not 6 -- version mismatch
   - Server rejects the commit with 409 Conflict
4. Device B receives the rejection and must resolve:
   a. Download version 7 (Device A's changes)
   b. Save Device B's version as a conflict copy:
      "report.docx (conflicted copy - Device B - 2026-03-15)"
   c. Commit the conflict copy as a new file
   d. Notify the user that a conflict occurred
```

This is exactly how Dropbox handles conflicts in practice: last-writer-wins for the original file, and conflicting changes are preserved as a separate "conflicted copy." No data is ever lost. The user resolves the conflict manually by reviewing both versions.

### Deduplication

Content-addressable storage makes deduplication automatic and global:

- Every chunk is stored under its SHA-256 hash as the key
- If two different files contain the same 4MB block of data, the chunk is stored once
- If a user uploads a file that another user already uploaded, no new storage is consumed
- The `reference_count` in the chunks table tracks how many file versions reference each chunk
- When a file version is deleted, the reference count is decremented. When it reaches zero, the chunk is eligible for garbage collection
- At scale, deduplication can save 30-50% of total storage costs, especially for common file types (OS files, shared libraries, duplicated documents)

### Scaling

**Metadata API Service.** The service is stateless -- scale horizontally behind a load balancer. Each instance reads from and writes to the same database. No sticky sessions, no local state.

**Object Storage.** S3 scales effectively without limit. It handles partitioning, replication, and durability automatically. No application-level sharding is needed for file chunks.

**Metadata DB sharding.** At very high scale, shard PostgreSQL by `owner_id` (user ID). All files, versions, and chunk mappings for a single user live on the same shard, avoiding cross-shard transactions. Most operations (upload, download, sync) are scoped to a single user, making this a natural partition key.

**Notification Service.** Use consistent hashing to assign WebSocket connections to notification server instances. Each instance maintains connections for a subset of users. When an event arrives, route it to the instance holding that user's connection. If an instance fails, clients reconnect and are reassigned. See [consistency patterns](/learn/consistency-patterns) for consistent hashing details.

**Caching.** Cache file metadata and chunk existence checks in Redis. The "does this chunk hash exist?" check happens on every upload and is a prime candidate for caching, since chunks are immutable once stored.

---

## Common Interview Mistakes

### Mistake 1: Proxying file data through the app server

"The client uploads the file to our API server, which then forwards it to S3."

**Problem:** A 5GB upload now consumes 5GB of server memory and bandwidth. Your API server becomes a bottleneck for every file transfer. Ten concurrent 1GB uploads require 10GB of bandwidth through your server. This doesn't scale and wastes resources on data the server doesn't need to inspect.

**Better:** Use [presigned URLs](/learn/presigned-urls) to let clients upload directly to S3. The app server generates a signed URL (a few hundred bytes of work) and gets out of the data path. This is the standard pattern used by Dropbox, Google Drive, and every major file storage service.

### Mistake 2: Uploading entire files on every change

"When a file changes, the client uploads the full file again."

**Problem:** A user edits one cell in a 200MB spreadsheet. Your system re-uploads 200MB. Over a day, a user making frequent edits to large files generates terabytes of unnecessary bandwidth. Mobile users on metered connections will abandon the product.

**Better:** Split files into chunks (~4MB each) and hash each chunk with SHA-256. On file change, compare chunk hashes and upload only the chunks that changed. A one-line edit in a large file results in uploading a single 4MB chunk. This is called [delta sync](/learn/delta-sync) and it's the core differentiator of Dropbox's architecture.

### Mistake 3: Polling for changes instead of push notifications

"Each client polls the server every 30 seconds to check for changes."

**Problem:** With 10 million connected clients polling every 30 seconds, you're handling 330,000 requests per second -- most returning "no changes." This wastes server resources and adds up to 30 seconds of latency before a client sees changes. Real-time collaboration becomes impossible.

**Better:** Maintain persistent [WebSocket](/learn/websockets-realtime) connections to online clients. When a file changes, push a lightweight notification to affected devices. Clients only hit the API when they have something to sync. This reduces server load by orders of magnitude and delivers near-instant sync. Use long-polling as a fallback for clients that can't maintain WebSocket connections.

### Mistake 4: Using NoSQL for file metadata

"I'll use DynamoDB for file metadata because it scales better."

**Problem:** Two devices commit changes to the same file at the same time. Without ACID transactions, you can't do optimistic locking on the version number atomically. One device's changes silently overwrite the other's. File hierarchy operations (move a folder with 1000 files) become eventually consistent, leading to phantom files and broken folder structures.

**Better:** Use a SQL database (PostgreSQL) for file metadata. ACID transactions let you implement optimistic locking cleanly: check the version, update the record, and insert chunk mappings all within one atomic transaction. File hierarchy queries (list folder contents, check permissions) benefit from relational joins. See [Databases & Caching](/learn/database-caching) for the trade-offs.

### Mistake 5: Ignoring conflict resolution

"If two devices edit the same file, the last write wins."

**Problem:** The user spent an hour editing a document on their laptop. Meanwhile, their phone auto-saved a different version. Last-write-wins silently discards the laptop changes. The user discovers the loss hours later. Data loss in a file storage system is a trust-destroying event.

**Better:** Detect conflicts using version numbers. When a commit's expected version doesn't match the current version, reject it and let the client handle the conflict. The standard approach (used by Dropbox) is to save the conflicting version as a separate "conflicted copy" file. No data is ever lost. The user sees both versions and resolves the conflict manually. This is a better UX than silent data loss.

---

**Interview golden rule:**

Don't just say "upload files to S3." Explain the three pillars of a file sync system: chunking with content hashing enables efficient [delta sync](/learn/delta-sync), [presigned URLs](/learn/presigned-urls) keep file data off the app server, and version-based conflict resolution ensures no user data is ever silently lost. Then walk through what happens when a user edits a 5GB file, when two devices sync simultaneously, and when a client reconnects after being offline for a week.
