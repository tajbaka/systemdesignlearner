## Introduction

You're in your system design interview, designing Pastebin. You say: "I'll store the text content in the database."

The interviewer raises an eyebrow: "Each paste can be 10MB. You have 100 million pastes. That's a petabyte in your SQL database. How's that going to work?"

And now you're stuck, because you treated a database like a filing cabinet for everything.

One of the most important patterns in system design is knowing when NOT to put data in your database.

---

## The Core Concept: Separate Metadata from Content

This is the single most important idea in this article:

**Metadata goes in the database. Content goes in object storage.**

Think of it like a library:

- The **card catalog** (database) stores small, structured data: book title, author, shelf number, checkout status
- The **actual books** (object storage) are the big, unstructured blobs sitting on shelves

You don't shove the entire book into the card catalog. That would be insane. But that's exactly what people do when they store file content in SQL.

**The mental model:**

```
Database (SQL/NoSQL):
  - Paste ID: "abc123"
  - Title: "My Code Snippet"
  - Created: "2024-01-15"
  - Size: 45KB
  - Storage Key: "pastes/abc123.txt"

Object Storage (S3):
  - Key: "pastes/abc123.txt"
  - Value: [the actual 45KB of text content]
```

The database row is ~200 bytes. The content is 45,000 bytes. Keeping them separate means your database stays fast and small.

---

## Object Storage: The Basics

### What It Is

Object storage (Amazon S3, Google Cloud Storage, Azure Blob Storage) is a key-value store designed for large blobs of data.

**How it works:**

```
PUT: key = "pastes/abc123.txt", value = [blob of data]
GET: key = "pastes/abc123.txt" → returns the blob
```

That's it. No tables, no schemas, no joins. Just keys and values.

### Why It's Different from a Database

| Aspect              | SQL Database           | Object Storage (S3)      |
| ------------------- | ---------------------- | ------------------------ |
| **Row/object size** | Best under 1MB         | Up to 5TB per object     |
| **Cost per GB**     | $0.10-0.30/GB/month    | $0.02/GB/month           |
| **Query support**   | Full SQL (WHERE, JOIN) | Key lookup only          |
| **Scalability**     | Hard to scale past TBs | Virtually unlimited      |
| **Access pattern**  | Random reads/writes    | Whole-object read/write  |
| **Durability**      | You manage replication | 99.999999999% (11 nines) |

**Key takeaway:** Object storage is 5-15x cheaper per GB and scales to petabytes without you lifting a finger. But you can't query it; you can only fetch by key.

### When to Use Object Storage

Use it whenever you're storing content that:

- Is larger than a few KB
- Doesn't need to be queried by its contents
- Is read as a whole blob (not partially)
- Needs to scale to massive volumes

**Examples:** paste content, images, videos, log files, backups, user uploads.

---

## CDN: Caching at the Edge

### What a CDN Does

A CDN (Content Delivery Network) is a network of servers spread across the globe that cache your content close to users.

Instead of every user hitting your origin server in Virginia, a user in Tokyo gets served from an edge server in Tokyo. Faster response, less load on your backend.

**The flow:**

```
User in Tokyo requests paste content:

1. Request → CDN Edge (Tokyo)
2. Cache HIT? → Return immediately (~20ms)
3. Cache MISS? → CDN fetches from Origin (S3 in Virginia) (~200ms)
4. CDN caches the content at Tokyo edge
5. Next request from Tokyo → Cache HIT (~20ms)
```

### When to Use a CDN

CDNs are most effective when your content is:

- **Read-heavy:** Way more reads than writes (Pastebin, image hosting, blogs)
- **Static or immutable:** Content doesn't change after creation (paste content never changes)
- **Global audience:** Users are spread across multiple regions
- **Cacheable:** Content can be served from cache without real-time freshness requirements

**CDNs are NOT great for:**

- Frequently updated content (stock prices, live feeds)
- Personalized content (user dashboards, private data)
- Write-heavy workloads

### The Numbers

```
Without CDN:
  User (Tokyo) → S3 (Virginia): ~200-300ms

With CDN (cache hit):
  User (Tokyo) → CDN Edge (Tokyo): ~10-30ms

That's a 10x latency improvement.
```

---

## Presigned URLs

A pattern that comes up in interviews: **presigned URLs**.

Instead of your server downloading from S3 and forwarding to the client, you give the client a temporary signed URL that lets them download directly from S3.

**Without presigned URLs:**

```
Client → Your Server → S3 → Your Server → Client
(Your server is a bottleneck)
```

**With presigned URLs:**

```
Client → Your Server: "Give me paste abc123"
Your Server → Client: "Here's a signed URL, valid for 5 minutes"
Client → S3 directly: Downloads content
(Your server is free to handle other requests)
```

**When this matters:**

- Large files (images, videos, big pastes)
- High traffic: takes load off your servers
- Upload scenarios: clients can upload directly to S3

**When to skip it:**

- Small content where the overhead isn't worth it
- When you need to process or transform content before serving
- When you need strict access control on every request

For most Pastebin-style systems, a CDN in front of S3 is simpler and works just as well for reads.

---

## The Complete Pattern

Here's how it all fits together for a system like Pastebin:

### Write Path (Creating a Paste)

```
1. Client sends text content to API
2. Paste Service generates unique ID
3. Store metadata in SQL Database:
   - paste_id, title, created_at, expires_at, storage_key
4. Upload content to Object Storage (S3):
   - Key: "pastes/{paste_id}.txt"
   - Value: the text content
5. Return paste ID and URL to client
```

### Read Path (Viewing a Paste)

```
Option A: CDN + S3 (for content)
1. Client requests paste content
2. CDN edge checks cache → HIT: return content
3. MISS: CDN fetches from S3, caches it, returns to client

Option B: API + DB (for metadata)
1. Client requests paste info
2. Paste Service queries SQL for metadata
3. Returns metadata (title, created date, etc.)
```

**The key insight:** Metadata and content travel different paths. Metadata goes through your API and database. Content goes through CDN and object storage. This separation is what makes the system scale.

---

## Common Interview Mistakes

### Mistake 1: Storing blobs in SQL

"I'll just put the text content in a TEXT column."

**Problem:** Your database balloons to terabytes. Queries slow down. Backups take forever. Cost explodes.

**Better:** Store a storage key in SQL, put the actual content in S3.

### Mistake 2: Not separating metadata from content

"I'll store everything in one place for simplicity."

**Problem:** You can't optimize reads and writes independently. You can't cache content at the edge. You can't use cheap object storage.

**Better:** Metadata in SQL (small, queryable), content in S3 (big, cheap, cacheable).

### Mistake 3: Forgetting CDN for read-heavy workloads

"Users will just fetch from S3 directly."

**Problem:** S3 has higher latency for global users. Every request hits the origin. Popular content hammers S3.

**Better:** Put a CDN in front of S3. Popular content gets cached at the edge.

### Mistake 4: Not mentioning cost differences

"I'll use a database because it's simpler."

**Problem:** At scale, the cost difference between SQL storage and S3 is 5-15x. Interviewers notice when you ignore economics.

**Better:** Mention that object storage is dramatically cheaper per GB, which matters at scale.

---

## Summary: What to Remember

**The core pattern:**

- Database stores metadata (small, structured, queryable)
- Object storage stores content (large, unstructured, cheap)
- CDN caches content at the edge (fast, global, read-heavy)

**When to use object storage:**

- Content larger than a few KB
- Read-as-a-whole-blob access pattern
- Need to scale to millions/billions of objects
- Cost matters at scale

**When to use a CDN:**

- Read-heavy traffic patterns
- Static or immutable content
- Global user base
- Latency-sensitive reads

**The numbers:**

- S3: ~$0.02/GB/month vs SQL: ~$0.10-0.30/GB/month
- CDN cache hit: ~10-30ms vs S3 origin: ~200-300ms
- S3 durability: 99.999999999% (eleven nines)

**Interview golden rule:**

```
Don't store large content in your database.
Separate metadata from content, and always explain why.
```
