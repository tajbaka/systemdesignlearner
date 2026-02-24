## Introduction

You're designing a file sync service like Dropbox or Google Drive. The interviewer asks how you handle file updates. You say: "When a user modifies a file, we upload the new version to the server."

They nod. Then: "The user edits one sentence in a 1GB presentation. Your system re-uploads the entire 1GB over a cellular connection. That takes 20 minutes. Meanwhile, another device edits the same file. Now you have a conflict on a file that barely changed. How do you fix this?"

And now you realize that re-uploading entire files on every change is wasteful, slow, and creates unnecessary conflicts. You need a way to detect exactly what changed and sync only the difference. That's delta sync.

---

## The Problem: Syncing Large Files

The naive approach is simple: every time a file changes, upload the whole thing. For small files (a few KB), this is fine. For large files, it falls apart fast.

```
1GB file, user edits one paragraph:

Naive approach:
  Upload 1GB over network
  Time on 10 Mbps connection: ~14 minutes
  Bandwidth cost: 1GB per edit

Delta sync approach:
  Detect which chunk changed, upload only that chunk (4MB)
  Time on 10 Mbps connection: ~3 seconds
  Bandwidth cost: 4MB per edit
```

The difference is dramatic. Delta sync reduces bandwidth by 99.6% in this case. For a service with millions of users editing files all day, that translates directly into lower infrastructure costs, faster sync times, and fewer conflicts.

The key insight: most edits to large files are small. A user changes a few slides in a presentation, edits a paragraph in a document, or modifies a layer in an image. If you can figure out which part of the file changed, you only need to transfer that part.

---

## File Chunking

The first step in delta sync is splitting files into chunks. Instead of treating a file as one blob, you divide it into fixed-size blocks, typically 4MB each.

```
1GB file split into 4MB chunks:

Chunk 0:  bytes[0 .. 4MB]       -> hash: a3f2...
Chunk 1:  bytes[4MB .. 8MB]     -> hash: 9c1b...
Chunk 2:  bytes[8MB .. 12MB]    -> hash: 7e4d...
...
Chunk 255: bytes[1020MB .. 1024MB] -> hash: b8f0...
```

Each chunk is identified by its cryptographic hash (SHA-256). The hash acts as a fingerprint: if two chunks have the same hash, they contain the same data. If the hash differs, the content changed.

When a file is modified, you re-chunk it, hash each chunk, and compare against the previous hash list. Only chunks with different hashes need to be uploaded. For the storage layer that holds these chunks, see [Object Storage & CDN](/learn/object-storage-cdn).

Fixed-size chunking is straightforward, but it has a weakness: insertions shift everything.

```
Original file: [AAAA][BBBB][CCCC][DDDD]
Insert "X" at the beginning: [XAAA][ABBB][BCCC][CDDD][D...]

Every single chunk boundary shifted. All chunks look "new."
The system re-uploads the entire file despite a tiny insertion.
```

This is called the boundary-shift problem, and it's why real systems use content-defined chunking.

---

## Content-Defined Chunking

Content-defined chunking (CDC) solves the boundary-shift problem by placing chunk boundaries based on the file's content rather than fixed offsets.

The technique uses a **rolling hash** (typically Rabin fingerprinting). A sliding window moves over the file byte by byte. When the hash of the window matches a certain pattern (e.g., the last 13 bits are all zeros), that position becomes a chunk boundary.

```
Rabin fingerprinting:

Slide a window across the file content:
  hash(window) mod 2^13 == 0  ->  place boundary here

Chunk sizes vary (e.g., 2MB-8MB with 4MB average)
but boundaries are determined by LOCAL content
```

The critical property: boundaries depend only on the bytes around them, not on their absolute position in the file. If you insert data at the beginning, the boundaries after the insertion point remain the same because they're defined by local content.

```
Original:  [AAAA][BBBB][CCCC][DDDD]   (boundaries set by content)
Insert "X": [XAAAA][BBBB][CCCC][DDDD]  (only first chunk changes)

Only 1 chunk differs. Upload only that chunk.
```

### Fixed-Size vs Content-Defined Chunking

| Aspect              | Fixed-Size         | Content-Defined (CDC)    |
| ------------------- | ------------------ | ------------------------ |
| **Boundary logic**  | Every N bytes      | Based on content hash    |
| **Insert handling** | All chunks shift   | Only local chunks change |
| **Chunk sizes**     | Uniform            | Variable (bounded range) |
| **Deduplication**   | Poor after inserts | Excellent                |
| **Complexity**      | Simple             | Moderate (rolling hash)  |
| **Overhead**        | Minimal            | Rolling hash computation |

Dropbox, Google Drive, and rsync all use content-defined chunking in some form. The variable chunk sizes add complexity, but the deduplication benefits are significant.

---

## Detecting Changes with Hashes

Once you've chunked a file, detecting changes is a matter of comparing hash lists.

```
Version 1 chunks: [a3f2, 9c1b, 7e4d, b8f0, 22aa]
Version 2 chunks: [a3f2, 9c1b, 55c3, b8f0, 22aa]
                                 ^^^^
Chunk 2 changed (7e4d -> 55c3). Upload only chunk 2.
```

The client stores the hash list for the last synced version. On each change, it computes new hashes and diffs against the stored list. Changed chunks are uploaded; unchanged chunks are skipped.

This also enables **cross-user deduplication**. If two users upload the same file (or the same chunk appears in different files), the server already has that chunk. The hash matches an existing chunk, so nothing needs to be uploaded. This is sometimes called content-addressable storage: chunks are stored and retrieved by their hash.

---

## Merkle Trees for Efficient Diff

Comparing hash lists chunk by chunk works, but it's O(n) where n is the number of chunks. For a 10GB file with 2,500 chunks, the client and server must exchange and compare all 2,500 hashes every time.

A **Merkle tree** makes this O(log n). It's a binary tree where each leaf is the hash of a chunk, and each internal node is the hash of its two children. The root hash represents the entire file.

![Merkle Tree](diagram:merkle-tree)

To find which chunks changed, compare trees from the root down:

```
1. Compare root hashes
   - Same? Nothing changed. Done.
   - Different? At least one chunk changed. Go deeper.

2. Compare left subtree roots
   - Same? Change is in the right subtree. Skip left entirely.
   - Different? Change is in the left subtree. Recurse.

3. Continue until you reach the leaf (the changed chunk)
```

If only 1 out of 2,500 chunks changed, you traverse about log2(2500) = ~12 nodes instead of comparing all 2,500 hashes. The server and client exchange a handful of hashes instead of thousands.

Merkle trees are used extensively in distributed systems beyond file sync. Git uses them for commits, Bitcoin uses them for transaction verification, and databases like Cassandra use them for anti-entropy repair. For more on how distributed systems maintain agreement on data state, see [Consistency Patterns](/learn/consistency-patterns).

---

## The Complete Sync Flow

Putting it all together, here's how a delta sync system works end to end:

```
File modified on client:

1. Content-defined chunking
   Split file into variable-size chunks using Rabin fingerprinting

2. Hash each chunk (SHA-256)
   Compute fingerprint for every chunk

3. Compare Merkle trees
   Client sends root hash to server
   If different, walk the tree to find changed subtrees
   Identify the specific chunks that differ

4. Upload only changed chunks
   Client sends new chunk data for changed chunks
   Server stores chunks by hash (content-addressable)

5. Update metadata
   Server updates the file's chunk list and Merkle tree
   Other devices pull the updated metadata and download only new chunks

6. Conflict resolution
   If two devices changed the same chunk, the server detects a conflict
   Resolution strategy depends on the application (last-write-wins, branching, etc.)
```

The rsync algorithm is a well-known implementation of this idea. It uses a two-level checksum approach: a fast rolling checksum (Adler-32) to find candidate matches, then a strong checksum (MD5 or SHA-256) to confirm. This avoids computing expensive cryptographic hashes for every byte position.

---

## Common Interview Mistakes

### Mistake 1: Re-uploading entire files on every change

"When the file changes, we upload it to object storage."

**Problem:** A 1GB file with a one-line edit costs 1GB of bandwidth. Multiply by millions of users and you have an unsustainable system.

**Better:** Explain chunking, hashing, and delta sync. Show that you only transfer changed chunks, reducing bandwidth by orders of magnitude.

### Mistake 2: Using only fixed-size chunking

"We split the file into 4MB blocks and hash each one."

**Problem:** The interviewer asks what happens when a user inserts a byte at the beginning. All chunk boundaries shift. Every hash changes. You re-upload the entire file anyway.

**Better:** Mention content-defined chunking with Rabin fingerprinting. Explain that boundaries are based on local content, so insertions only affect nearby chunks.

### Mistake 3: Ignoring the cost of comparing chunk lists

"The client sends its full hash list and the server diffs them."

**Problem:** For a 10GB file, that's thousands of hashes transferred and compared on every sync. This adds latency and bandwidth overhead to every operation.

**Better:** Use a Merkle tree. Start from the root and only walk down branches that differ. This gives you O(log n) comparison instead of O(n).

### Mistake 4: Forgetting about deduplication

"Each user's chunks are stored separately."

**Problem:** If 1,000 users upload the same 500MB installer, you store 500TB instead of 500MB. Massive waste of storage.

**Better:** Use content-addressable storage. Chunks are identified by hash. If a chunk already exists on the server (from any user), skip the upload. Reference counting tracks how many files point to each chunk.

---

## Summary: What to Remember

- **Delta sync** transfers only the parts of a file that changed, not the entire file
- **File chunking** splits files into blocks (typically ~4MB), each identified by a SHA-256 hash
- **Content-defined chunking** (Rabin fingerprinting) places boundaries based on content, so insertions don't shift all chunks
- **Merkle trees** enable O(log n) comparison to find changed chunks, instead of comparing every hash
- **Content-addressable storage** deduplicates identical chunks across files and users
- The **rsync algorithm** uses a rolling checksum + strong checksum for efficient diffing

**Key numbers:**

- Typical chunk size: 4MB (variable range: 2MB-8MB for CDC)
- 1GB file, one paragraph edit: upload ~4MB instead of 1GB (99.6% bandwidth savings)
- Merkle tree comparison: O(log n) vs O(n) for linear scan
- SHA-256 collision probability: ~1 in 2^128 (effectively zero)

**Interview golden rule:**

```
Don't just say "upload the file." Explain chunking, content-defined
boundaries, Merkle tree diffing, and deduplication. Show that your
system handles a one-line edit to a 1GB file by uploading only the
affected 4MB chunk.
```
