## Introduction

Alright, so the interviewer says: "Design Pastebin."

You're thinking, "Text storage? Easy. Stick it in a database, generate a link, done."

Then they hit you with: "Each paste can be up to 10MB. How do you handle 100 million pastes? Where does the content actually live? What happens when a paste goes viral and gets 10 million views in an hour?"

And suddenly you realize this isn't just a CRUD app with a text field.

The key insight with Pastebin is that **the text content is NOT metadata**. It's a blob. And blobs don't belong in your SQL database.

---

## Functional Requirements

Let's nail down what the system actually needs to do:

**1. Create a paste**

- User submits text content
- System returns a unique URL for sharing
- Example: `paste.ly/abc123`

**2. Retrieve a paste**

- Anyone with the URL can view the paste content
- Should return the full text content and metadata (title, creation date)

**3. Unique identifiers**

- Every paste gets a unique ID
- No two pastes share the same ID

That's the core. Three operations. Don't overcomplicate it.

**Optional (mention if time allows):**

- Paste expiration (TTL)
- Syntax highlighting for code
- Visibility controls (public, unlisted, private)
- Raw text endpoint for CLI tools (`curl paste.ly/raw/abc123`)

---

## Non-Functional Requirements

**Low latency reads**

- Paste retrieval should be fast -- target p95 under 150ms
- This is a read-heavy service, so read performance is critical

**High availability**

- Target 99.9% uptime
- A broken paste link is a terrible user experience
- Prioritize availability over strict consistency

**Scalability**

- Support millions of pastes
- Handle thousands of reads per second
- Read-to-write ratio is high (10:1 or more) -- way more people view pastes than create them

**Storage efficiency**

- Paste content can be large (up to 10MB)
- Storing blobs in SQL is expensive and doesn't scale
- Need cost-effective storage for the actual text content

---

## API Design

Two core endpoints that map directly to our functional requirements:

**1. Create Paste**

```
POST /api/v1/pastes

Request Body:
{
  "content": "console.log('Hello World!')",
  "title": "My Code Snippet",
  "expiresAt": "2025-12-31T23:59:59Z"  // optional
}

Response:
{
  "id": "abc123",
  "url": "https://paste.ly/abc123",
  "createdAt": "2024-01-15T12:00:00Z"
}

Status: 201 Created
```

**2. Retrieve Paste**

```
GET /api/v1/pastes/:id

Example: GET /api/v1/pastes/abc123

Response:
{
  "id": "abc123",
  "content": "console.log('Hello World!')",
  "title": "My Code Snippet",
  "createdAt": "2024-01-15T12:00:00Z"
}

Status: 200 OK
```

**Why 200 and not 301/302?**

Unlike a URL shortener, we're not redirecting the user anywhere. We're returning the actual paste content. So it's a standard 200 OK with the content in the response body.

**Error cases:**

- `400` -- Invalid content or missing required fields
- `404` -- Paste not found
- `410` -- Paste has expired
- `429` -- Rate limit exceeded

---

## High Level Design

Here's the architecture:

### Key Components

**1. API Gateway**

- Single entry point for all requests
- Routes to the Paste Service
- Handles rate limiting and authentication

**2. Paste Service**

- Handles all paste creation and retrieval logic
- Coordinates between the database and object storage
- Stateless, can scale horizontally

**3. SQL Database (Metadata)**

- Stores small, structured metadata: paste ID, title, creation date, expiration, storage key
- Does NOT store the paste content itself
- Fast queries on indexed fields

**4. Object Storage (S3)**

- Stores the actual paste content as blobs
- Key-value model: key = `pastes/abc123.txt`, value = the text content
- Cheap, durable, scales to petabytes

**5. CDN**

- Caches popular paste content at edge locations globally
- Reduces latency for reads from ~200ms (S3 origin) to ~20ms (edge cache)
- Perfect for Pastebin because paste content is immutable. Once created, it never changes

### Why This Architecture

The critical decision here is **separating metadata from content**. For a deep dive on this pattern, see [Object Storage & CDN](/learn/object-storage-cdn).

**Why object storage instead of SQL for content?**

A paste can be up to 10MB. If you have 100 million pastes, that's potentially a petabyte of data in your SQL database. SQL databases aren't designed for that. Object storage (S3) costs ~$0.02/GB/month vs ~$0.10-0.30/GB/month for SQL. That's 5-15x cheaper. And S3 scales to petabytes without you managing anything.

**Why SQL for metadata?**

Metadata is small (~200 bytes per paste) and needs to be queried (lookup by ID, filter by user, check expiration). SQL handles this perfectly.

**Why a CDN?**

Paste content is immutable and read-heavy. A viral paste might get millions of views. Without a CDN, every request hits S3 directly. With a CDN, the first request fetches from S3, and every subsequent request in that region gets served from the edge in ~20ms.

For more on when and how to use caching effectively, see our guide on [Databases & Caching](/learn/database-caching).

---

## Detailed Design

### Write Path (Creating a Paste)

Here's what happens when a user creates a paste:

```
1. Client sends POST /api/v1/pastes with text content
2. Paste Service generates a unique ID (e.g., "abc123")
3. Store metadata in SQL Database:
   - paste_id: "abc123"
   - title: "My Code Snippet"
   - created_at: timestamp
   - expires_at: timestamp (if set)
   - storage_key: "pastes/abc123.txt"
   - content_size: 2048
4. Upload content to S3:
   - Key: "pastes/abc123.txt"
   - Value: the raw text content
5. Return paste ID and URL to client
```

**Order matters:** Write metadata to SQL first, then upload to S3. If the S3 upload fails, you can clean up the metadata row. If you do it the other way around, you have orphaned content in S3 with no way to find it.

### Read Path (Viewing a Paste)

Two things need to happen: fetch metadata and fetch content.

**Metadata path:**

```
1. Client requests GET /api/v1/pastes/abc123
2. Paste Service queries SQL for metadata
3. Check if paste exists and hasn't expired
4. If expired → return 410 Gone
5. If not found → return 404
```

**Content path (with CDN):**

```
1. Paste Service constructs the CDN URL for the content
2. Client fetches content from CDN URL
3. CDN edge cache HIT? → Return immediately (~20ms)
4. CDN cache MISS? → CDN fetches from S3 origin (~200ms)
5. CDN caches the content at the edge for future requests
```

In practice, the Paste Service can combine these: fetch metadata from SQL, then either include the content directly (for small pastes) or return the CDN URL for the client to fetch content separately.

### Generating Unique IDs

Same approaches as URL shorteners work here:

- **Pre-generated IDs:** Generate a pool of unique codes ahead of time. Assign on demand. No collision risk.
- **UUID/ULID:** Use UUIDs for simplicity. Extremely low collision probability.
- **Base62 encoding:** Take a counter or hash and encode it into a short alphanumeric string.

For Pastebin, UUIDs are often the simplest choice. Unlike URL shorteners where short codes matter for user experience, paste IDs just need to be unique. Users don't type them manually.

### Storage Calculations

Let's size this:

```
Assumptions:
- 10 million new pastes per day
- Average paste size: 10KB
- Retention: 5 years

Daily content storage:
  10M pastes × 10KB = 100GB per day

Annual content storage:
  100GB × 365 = ~36TB per year

5-year content storage:
  36TB × 5 = ~180TB in S3

S3 cost for 180TB:
  180,000 GB × $0.02/GB = $3,600/month

If this were in SQL:
  180,000 GB × $0.20/GB = $36,000/month
```

That's a 10x cost difference. This is why you use object storage.

**Metadata is tiny in comparison:**

```
Metadata per paste: ~200 bytes
10M pastes/day × 200 bytes = 2GB per day
5 years: ~3.6TB of metadata in SQL

That's completely manageable for a SQL database.
```

### Expiration Cleanup

Pastes with expiration dates need to be cleaned up:

```
Background Cleanup Job (runs periodically):
1. Query SQL for expired pastes (WHERE expires_at < NOW())
2. Delete content from S3
3. Delete metadata from SQL
4. Run in batches to avoid overwhelming the database
```

This is a background job, not part of the critical path. It can run every few minutes or hours depending on how strict your expiration needs to be.

For read requests, always check `expires_at` in the metadata before serving content. Even if the cleanup job hasn't run yet, the service should return `410 Gone` for expired pastes.

### Scaling

The architecture naturally scales in the right places:

- **Paste Service:** Stateless, scale horizontally with more instances. See [Scaling: Vertical vs Horizontal](/learn/scaling) for details.
- **SQL Database:** Read replicas for read-heavy metadata queries. Master handles writes.
- **Object Storage (S3):** Scales automatically. No action needed.
- **CDN:** Scales automatically. The more traffic, the better the cache hit ratio.

The read path is the hot path. CDN handles the bulk of content reads. SQL read replicas handle metadata reads. Your Paste Service instances handle the coordination.

---

## Common Interview Mistakes

### Mistake 1: Storing paste content in SQL

"I'll put the text in a TEXT column."

**Problem:** Your database grows to hundreds of terabytes. Queries slow down. Backups take forever. Storage costs explode.

**Better:** Store a storage key in SQL (~200 bytes), put the actual content in S3.

### Mistake 2: Forgetting about object storage entirely

"I'll just use a NoSQL database for everything."

**Problem:** Even NoSQL databases have row size limits and cost more than object storage. You're paying 5-15x more per GB for no reason.

**Better:** Use object storage for content, database for metadata. See [Object Storage & CDN](/learn/object-storage-cdn).

### Mistake 3: No CDN for read-heavy content

"Users will just fetch from S3 directly."

**Problem:** S3 origin has ~200ms latency for distant users. Popular pastes hammer S3 repeatedly. No edge caching.

**Better:** Put a CDN in front of S3. Immutable content + read-heavy traffic = perfect CDN use case.

### Mistake 4: Overcomplicating the write path

"I'll add Kafka, a write-ahead log, and event sourcing..."

**Problem:** Pastebin writes are simple. Generate ID, store metadata, upload content. Adding message queues and event sourcing is unnecessary complexity.

**Better:** Keep the write path simple and synchronous. Save complexity for where it matters (reads, caching, scaling).

### Mistake 5: Not discussing content size limits

"Users can paste anything they want."

**Problem:** Without limits, one user uploads a 1GB file and your system falls over.

**Better:** Set a max paste size (e.g., 10MB). Validate on the server side. Return 400 for oversized content.

---

**Interview golden rule:**

Don't just list components. Explain WHY you're separating metadata from content, WHY object storage over SQL for blobs, and HOW the CDN makes read-heavy traffic manageable.
