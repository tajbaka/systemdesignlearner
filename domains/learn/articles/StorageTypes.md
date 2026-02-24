## Introduction

You're designing a file-sharing system like Dropbox. You sketch out a database table and say: "I'll store the file content in a BLOB column in PostgreSQL."

The interviewer pauses. "Users upload 5GB videos. You have 500 million files. That's petabytes of binary data in a relational database. How are you going to back that up? How much will that cost?"

And now you're stuck, because you picked the wrong storage type for the job.

Choosing the right storage layer is one of the most fundamental decisions in system design. Block storage, object storage, and file storage each solve different problems, and using the wrong one leads to systems that are slow, expensive, or impossible to scale.

---

## What Is Block Storage

Block storage divides data into fixed-size chunks called blocks (typically 4KB-64KB) and stores them on disk. Each block has an address, and the storage system reads or writes blocks by address. There's no concept of files or objects at this level -- it's raw storage that an operating system or application formats and manages.

Think of it like a hard drive. Your OS formats it with a filesystem, mounts it as a volume, and reads or writes specific sectors. That's block storage.

### How It Works

```
Block storage (like a raw disk):

Block 0: [4KB of data]
Block 1: [4KB of data]
Block 2: [4KB of data]
...
Block N: [4KB of data]

Access: Read/write any block by its address.
The OS layers a filesystem on top (ext4, NTFS, XFS).
```

**Cloud examples:** Amazon EBS (Elastic Block Store), Google Persistent Disks, Azure Managed Disks.

### Key Characteristics

- **Random access:** You can read or write any block without reading the whole volume. This makes it ideal for databases, which need to update individual rows in place.
- **Mounted as a volume:** A block storage device attaches to a single server (or VM) and behaves like a local disk. Only that server can read from or write to it.
- **Low latency:** Sub-millisecond access for provisioned IOPS. An EBS io2 volume can deliver single-digit microsecond latency.
- **Fixed size:** You provision a specific capacity (e.g., 500GB). You pay for the full amount whether you use it or not.

### When to Use Block Storage

- **Databases:** PostgreSQL, MySQL, MongoDB -- any database that needs random I/O to read and update records in place.
- **Virtual machines:** Boot volumes for EC2 instances or Kubernetes nodes.
- **Applications requiring low-latency disk I/O:** Transaction processing, real-time analytics engines.

---

## What Is Object Storage

Object storage uses a flat namespace where each piece of data is stored as a self-contained object with a unique key, the data itself (the blob), and metadata. There are no directories, no hierarchy, no filesystem. You access objects through a REST API using their key.

Think of it like a massive key-value store for files. You PUT an object with a key, and you GET it back by that key. That's it.

### How It Works

```
Object storage (like a key-value store):

Key: "photos/user-42/vacation.jpg"
  → Metadata: { content-type: "image/jpeg", size: 4.2MB, uploaded: "2025-06-15" }
  → Data: [the actual JPEG bytes]

Key: "backups/db-snapshot-2025-06-15.tar.gz"
  → Metadata: { content-type: "application/gzip", size: 12GB }
  → Data: [the actual backup bytes]

Access: HTTP REST API.
  PUT /bucket/photos/user-42/vacation.jpg
  GET /bucket/photos/user-42/vacation.jpg
  DELETE /bucket/photos/user-42/vacation.jpg
```

**Cloud examples:** Amazon S3, Google Cloud Storage, Azure Blob Storage.

### Key Characteristics

- **Flat namespace:** The "/" in a key like `photos/user-42/vacation.jpg` is just part of the string. There are no real directories. Cloud consoles fake a folder view, but underneath it's all flat keys.
- **Immutable objects:** You don't update a portion of an object. You replace the entire thing. There's no "write to byte offset 4096" like block storage. This makes replication and caching much simpler.
- **REST API access:** No mounting, no filesystem drivers. Any service with HTTP access can read or write objects. This makes object storage naturally accessible from anywhere.
- **Virtually unlimited scale:** S3 stores trillions of objects. You never provision capacity -- you just keep writing, and it scales.
- **Extreme durability:** S3 guarantees 99.999999999% (11 nines) durability. That means if you store 10 million objects, you can statistically expect to lose one object every 10,000 years.

### When to Use Object Storage

- **Media files:** Images, videos, audio -- anything that's written once and read many times.
- **User uploads:** Profile pictures, document attachments, file sharing.
- **Backups and archives:** Database snapshots, log archives, compliance data.
- **Static assets:** JavaScript bundles, CSS, fonts -- served through a [CDN for global delivery](/learn/object-storage-cdn).
- **Data lake storage:** Analytics datasets, ML training data, event logs.

---

## Block vs Object Storage Comparison

| Aspect              | Block Storage (EBS)                | Object Storage (S3)            |
| ------------------- | ---------------------------------- | ------------------------------ |
| **Access pattern**  | Random read/write by block address | Whole-object read/write by key |
| **Latency**         | Sub-millisecond                    | 50-200ms (first byte)          |
| **Cost per GB**     | $0.08-0.125/GB/month (gp3)         | $0.023/GB/month (S3 Standard)  |
| **Max object size** | Volume up to 64TB                  | 5TB per object                 |
| **Scalability**     | Attached to one server             | Virtually unlimited            |
| **Durability**      | You manage replication             | 99.999999999% (11 nines)       |
| **API**             | OS-level block device              | HTTP REST API                  |
| **Update model**    | In-place updates                   | Replace entire object          |
| **Best for**        | Databases, VMs                     | Media, backups, static assets  |

**The cost difference is dramatic.** Block storage costs roughly 4-5x more per GB than standard object storage. At petabyte scale, this is the difference between a $100K/month storage bill and a $500K/month one. Interviewers notice when you ignore economics.

### A Brief Note on File Storage

There's a third option: **file storage** (Amazon EFS, NFS, Google Filestore). It provides a shared filesystem that multiple servers can mount simultaneously. Think of it as a network drive.

- **Use case:** Shared config files, CMS content, legacy applications that expect a POSIX filesystem.
- **Trade-off:** More expensive than object storage, slower than block storage, but provides shared access that block storage can't.

In interviews, file storage rarely comes up as a primary design choice. Block and object storage cover 95% of scenarios. But mentioning it briefly shows breadth of knowledge.

---

## When to Use Each in System Design

The decision usually comes down to one question: **does the application need to read or write partial data within a file, or does it treat the data as a whole blob?**

### The Metadata + Content Separation Pattern

The most important storage pattern in system design is separating metadata from content. This comes up in nearly every interview involving user-generated content.

```
Database (SQL on block storage):
  - file_id: "abc123"
  - owner_id: "user-42"
  - filename: "vacation.jpg"
  - size: 4.2MB
  - storage_key: "photos/user-42/abc123.jpg"
  - created_at: "2025-06-15"

Object Storage (S3):
  - Key: "photos/user-42/abc123.jpg"
  - Value: [the actual 4.2MB of image data]
```

The database row is ~200 bytes. The image is 4,200,000 bytes. Keeping them separate means your [database stays small and fast](/learn/database-caching), and your content lives on cheap, infinitely scalable object storage.

### Real-World Examples

**Dropbox** stores file chunks in object storage (originally S3, later their own system called Magic Pocket). The metadata -- file names, folder structure, sharing permissions -- lives in a SQL database. When you sync a file, the client uploads chunks to object storage and updates the metadata in the database.

**Instagram** stores photos in object storage with a CDN in front for delivery. The post metadata (caption, likes, comments, timestamps) lives in a database. This separation lets them serve billions of image requests through [CDN edge caches](/learn/object-storage-cdn) without touching the database.

**Netflix** stores video segments in S3 and serves them through a global CDN. The catalog metadata (titles, descriptions, recommendations) lives in databases. The video content and the metadata are completely decoupled systems.

In all three cases, the database runs on block storage (EBS volumes under PostgreSQL, MySQL, or Cassandra). The content lives in object storage. Block storage serves the database; object storage serves the content.

---

## Common Interview Mistakes

### Mistake 1: Storing Large Blobs in a Database

"I'll put the image data in a BYTEA column in PostgreSQL."

**Problem:** Your database grows to terabytes. Backups take hours. Replication lags. Queries slow down because the database is managing huge blobs alongside small, structured rows. And you're paying 4-5x more per GB than you need to.

**Better:** Store a storage key (S3 path) in the database. Store the actual content in object storage.

### Mistake 2: Using Block Storage for Static Content

"I'll store uploaded images on EBS volumes."

**Problem:** EBS is attached to a single server. When you scale horizontally to multiple app servers, they can't all access the same EBS volume. You'd need to replicate files across volumes manually, manage cleanup, and handle consistency. It doesn't scale.

**Better:** Use object storage. It's accessible from any server via HTTP, scales infinitely, and is cheaper.

### Mistake 3: Using Object Storage for a Database

"I'll store each user record as a JSON object in S3 to avoid database costs."

**Problem:** Object storage has 50-200ms latency per request. There's no querying, no indexing, no transactions. You can't do "find all users in California" without scanning every object. Updates require rewriting the entire object.

**Better:** Use a database on block storage for structured data that needs querying. Reserve object storage for blobs.

### Mistake 4: Not Mentioning Cost Differences

Interviewers expect you to reason about cost at scale. Object storage at $0.023/GB vs block storage at $0.10/GB is a 4x difference. At 1PB, that's the difference between $23K/month and $100K/month. Always mention cost as part of your storage decision.

---

## Summary: What to Remember

- **Block storage** is raw disk. Fixed-size blocks, random access, mount as a volume. Use it for databases and VMs. Cloud examples: EBS, Persistent Disks.
- **Object storage** is a flat key-value store for blobs. Accessed via REST API, immutable objects, virtually unlimited scale. Use it for media, backups, and static assets. Cloud examples: S3, GCS.
- **File storage** (EFS, NFS) is shared network filesystem. Use it when multiple servers need to mount the same volume. Rarely the primary choice in system design.
- **The metadata + content separation pattern** is the single most important storage pattern. Metadata in a database, content in object storage.
- **Cost matters:** Object storage is 4-5x cheaper per GB than block storage. At scale, this difference is enormous.
- **Durability:** S3 provides 99.999999999% (11 nines) durability. You don't need to manage replication yourself.
- **Real systems use both:** Dropbox, Instagram, and Netflix all use databases on block storage for metadata and object storage for content.

**Interview golden rule:**

```
When you see user-generated content (images, videos, files, pastes),
reach for object storage. Keep metadata in your database, content in S3,
and always explain the cost and scalability reasoning behind the split.
```
