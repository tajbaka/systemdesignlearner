## Introduction

You're in a system design interview, explaining how you'd build a leaderboard service. You mention Redis sorted sets for ranking, and the interviewer asks:

"Why does Redis use a skip list instead of a balanced BST for sorted sets? They're both O(log n)."

The naive answer is "I don't know, they're both O(log n)."

Then the follow-up: "If you were building a write-heavy time-series database, what storage engine would you choose and why?"

Now the gap is exposed. You can implement a red-black tree on a whiteboard, but you don't understand why certain data structures are chosen for specific systems. You don't know the engineering trade-offs that drive real infrastructure decisions.

That's what this article is about. Not LeetCode data structures. The ones that actually power the systems you'll design in interviews.

---

## The Data Structures That Actually Come Up

Forget arrays, linked lists, and binary search trees for a minute. Those are coding interview territory.

In system design, you need to understand five data structures that power real infrastructure:

- **Hash tables**: the backbone of every cache system (Redis, Memcached)
- **Skip lists**: how Redis implements sorted sets for ranked data
- **LSM trees**: the storage engine behind Cassandra, LevelDB, and RocksDB
- **B-trees**: the storage engine behind PostgreSQL and MySQL
- **Bloom filters**: probabilistic structures that save millions of disk reads

You won't be asked to implement these. But you will be asked why a system uses one over another. That's the difference between knowing data structures and understanding systems.

---

## Hash Tables

You know hash tables. O(1) average lookup, insert, and delete. Put a key in, get a value out. Simple.

But in system design, hash tables show up in two critical contexts that go way beyond the textbook version.

### Caching Systems

Every in-memory cache is fundamentally a hash table. Redis and Memcached are giant distributed hash tables sitting in front of your database.

When you say "add a cache layer" in an interview, you're really saying "add a hash table in memory so we don't hit disk." The core operation is straightforward:

```
GET user:12345
  -> hash("user:12345") -> bucket 7
  -> find key in bucket -> return cached profile

SET user:12345 {name: "Alice", ...} TTL 300
  -> hash("user:12345") -> bucket 7
  -> store value, set expiry to 5 minutes
```

For more on caching patterns and when to use them, see [Databases & Caching](/learn/database-caching).

### Consistent Hashing for Distribution

Here's where it gets interesting for system design. When you have multiple cache nodes, you need to decide which node holds which keys. Regular modular hashing (`hash(key) % num_nodes`) breaks horribly when you add or remove nodes, because almost every key remaps.

Consistent hashing solves this. Nodes sit on a virtual ring, and each key maps to the nearest node clockwise:

![Consistent hashing ring](diagram:ds-consistent-hashing)

With consistent hashing, adding a node only moves about 1/N of the keys (where N is the number of nodes). Without it, you'd invalidate almost your entire cache on a topology change.

### Collision Handling in Practice

In textbooks, you learn about chaining (linked lists in each bucket) and open addressing (probing for the next empty slot). In real systems, the choice matters for performance.

Redis uses a variation of chaining with incremental rehashing. When the hash table gets too full, Redis doesn't stop the world to rebuild it. Instead, it maintains two hash tables simultaneously and migrates entries gradually on each operation. This keeps individual operations fast even during resizing.

Memcached uses open addressing with a slab allocator. Memory is pre-divided into chunks of fixed sizes, which avoids fragmentation but means you waste some space.

The key thing to know for interviews: hash table performance degrades when the load factor gets too high. Good implementations keep it below 0.75 and resize proactively.

### Hash Tables in Interview Context

When you bring up hash tables in a system design interview, the conversation usually goes one of two ways:

**Scenario 1: "How does your cache work?"**

You should be able to explain: key-value pairs in memory, O(1) lookups, TTL-based expiration, and an eviction policy (LRU, LFU) when memory is full. The hash table is the lookup structure. The eviction policy decides what to throw away.

**Scenario 2: "How do you distribute keys across cache nodes?"**

This is where consistent hashing comes in. You should be able to sketch the ring, explain why modular hashing fails on node changes, and mention virtual nodes for better distribution. Real systems like DynamoDB, Cassandra, and most cache clusters use consistent hashing.

The bottom line: hash tables are the simplest structure on this list, but they underpin the most common interview pattern, adding a cache layer to reduce database load. Know them cold.

---

## Skip Lists

Skip lists are one of those data structures that most engineers have heard of but few actually understand. And they come up more than you'd expect because of one system: Redis.

### What Is a Skip List?

A skip list is a probabilistic data structure built on top of sorted linked lists. You take a regular sorted linked list and add multiple "express lane" levels above it. Each higher level skips over more elements, giving you O(log n) search instead of O(n).

```
Level 3:  HEAD --------------------------> 50 ------------------> NIL
               |                            |
Level 2:  HEAD ----------> 20 -----------> 50 ----------> 80 --> NIL
               |            |               |              |
Level 1:  HEAD ----> 10 -> 20 ----> 40 -> 50 ----> 70 -> 80 --> NIL
               |     |      |       |      |       |      |
Level 0:  HEAD -> 5 -> 10 -> 20 -> 30 -> 40 -> 50 -> 60 -> 70 -> 80 -> NIL
```

To search for 40:

1. Start at Level 3 HEAD. Next is 50, which is > 40. Drop down.
2. Level 2 HEAD. Next is 20, which is < 40. Move right to 20.
3. At 20, Level 2. Next is 50, which is > 40. Drop down.
4. At 20, Level 1. Next is 40. Found it.

Instead of scanning all 8 elements on Level 0, you touched 4 nodes. That's the power of the express lanes.

### How Levels Are Assigned

Here's the clever part. When you insert a new element, you flip a coin to decide how many levels it gets. Each level has a 50% chance (or sometimes 25%; Redis uses p=0.25) of being promoted to the next level up.

```
Insert value 35:

1. Insert at Level 0 (always)
2. Flip: heads -> promote to Level 1
3. Flip: heads -> promote to Level 2
4. Flip: tails -> stop

Result: 35 appears in levels 0, 1, and 2
```

No rebalancing. No rotations. The probabilistic assignment of levels gives you O(log n) performance in expectation without any of the complexity of balanced BSTs.

### Why Redis Chose Skip Lists

This is the interview question. Redis uses skip lists for its sorted set implementation (ZSET), and Antirez (the creator of Redis) has explained the reasoning publicly. Here's why:

**1. Simpler to implement and debug**

A red-black tree or AVL tree requires rotation operations that are notoriously tricky to get right. Skip lists are conceptually simpler. They're just linked lists with express lanes. In a system like Redis where reliability matters enormously, simpler code means fewer bugs.

**2. Better for range queries**

This is the big one. [Redis sorted sets](/learn/redis-sorted-sets) support range operations like ZRANGEBYSCORE (get all elements with scores between X and Y). In a skip list, once you find the start of the range, you just walk forward on Level 0. It's sequential access.

In a BST, range queries require an in-order traversal, which jumps around in memory. Skip lists have better cache locality for this use case.

```
ZRANGEBYSCORE leaderboard 100 200

Skip list approach:
  1. Search for score 100 -> O(log n)
  2. Walk Level 0 forward until score > 200 -> O(k) where k = results
  Sequential memory access, cache-friendly

BST approach:
  1. Find 100 -> O(log n)
  2. In-order traversal -> O(k) but pointer chasing, cache-unfriendly
```

**3. Easier concurrent access**

Skip lists can be modified with fine-grained locking or even lock-free algorithms more easily than balanced BSTs. Each level is independent, so you can lock individual nodes. Balanced BSTs require rotations that affect multiple nodes at once, making concurrent modifications much harder.

**4. Tunable performance**

By adjusting the promotion probability (Redis uses p=0.25 instead of p=0.5), you can trade memory for speed. Lower p means fewer levels, less memory overhead, but slightly slower searches. Redis chose p=0.25 to save memory while keeping performance acceptable.

### Skip List Complexity

| Operation   | Average      | Worst Case |
| ----------- | ------------ | ---------- |
| Search      | O(log n)     | O(n)       |
| Insert      | O(log n)     | O(n)       |
| Delete      | O(log n)     | O(n)       |
| Range query | O(log n + k) | O(n)       |
| Space       | O(n)         | O(n log n) |

The worst case is O(n) because the probabilistic level assignment could theoretically put everything on Level 0. In practice, this is astronomically unlikely, similar to how quicksort is O(n^2) worst case but you never see it.

### Memory Overhead

A common follow-up question: how much extra memory do skip lists use?

With promotion probability p, each element appears in an average of 1/(1-p) levels. For Redis's p=0.25, that's about 1.33 levels per element. Each level adds a forward pointer.

```
Memory per element:
  Level 0 pointer: 8 bytes (64-bit)
  Average extra levels: 0.33 * 8 bytes ≈ 2.67 bytes
  Total overhead per element: ~10.67 bytes for pointers

Compare to a red-black tree:
  Left pointer: 8 bytes
  Right pointer: 8 bytes
  Parent pointer: 8 bytes
  Color bit: 1 byte (padded to 8)
  Total overhead per element: ~32 bytes
```

Skip lists actually use less memory per element than balanced BSTs when using p=0.25. That's another reason Redis chose them.

### Skip Lists in Interview Context

You probably won't be asked to implement a skip list. But you should know three things:

1. Redis uses them for sorted sets (ZSET commands like ZADD, ZRANGE, ZRANGEBYSCORE)
2. The choice was made for simplicity, range query performance, and concurrency, not theoretical Big-O
3. Skip lists offer O(log n + k) range queries where k is the number of results, which is key for leaderboard-style operations

When you mention [Redis Sorted Sets](/learn/redis-sorted-sets) in a design, being able to explain the underlying skip list shows depth.

---

## LSM Trees and SSTables

LSM trees (Log-Structured Merge-trees) are the storage engine behind some of the most write-heavy systems in production: Cassandra, LevelDB, RocksDB, HBase, and ScyllaDB.

If someone asks you to design a system that handles massive write throughput (time-series data, event logging, messaging), you should be reaching for an LSM-tree-based storage engine.

### The Core Idea

The fundamental insight behind LSM trees: sequential writes to disk are orders of magnitude faster than random writes. So instead of updating data in place (like a B-tree does), an LSM tree buffers writes in memory and periodically flushes them to disk as sorted, immutable files.

```
Write path in an LSM tree:

1. Write arrives
   |
   v
2. Write to WAL (write-ahead log) for crash safety
   |
   v
3. Insert into Memtable (in-memory sorted structure, usually a red-black tree)
   |
   v
4. When Memtable is full (~64MB), flush to disk as SSTable
   |
   v
5. Background compaction merges SSTables to reclaim space
```

### Memtable: The In-Memory Buffer

The memtable is a sorted data structure in memory, typically a red-black tree or skip list. All writes go here first. Because it's in memory, writes are fast. Because it's sorted, flushing to disk produces a sorted file.

When the memtable reaches a size threshold (typically 32-64 MB), it becomes immutable and gets flushed to disk as an SSTable. A new empty memtable takes its place. The old memtable stays readable until the flush completes.

### SSTables: Sorted String Tables

An SSTable (Sorted String Table) is an immutable file on disk where keys are sorted. This is important because:

- Sorted data can be searched with binary search: O(log n)
- Merging two sorted files is O(n), just like merge sort
- Sequential disk I/O is fast

![SSTable structure on disk](diagram:ds-sstable)

### Compaction: Keeping Things Manageable

As you flush more memtables, you end up with a lot of SSTables on disk. Reading becomes slow because you might have to check multiple files for a single key. Compaction fixes this by merging SSTables:

![SSTable compaction process](diagram:ds-compaction)

There are two main compaction strategies:

**Size-tiered compaction** (Cassandra default): Merges SSTables of similar size. Simpler, uses more temporary disk space. Good for write-heavy workloads.

**Leveled compaction** (LevelDB, RocksDB): Each level has a size limit. When a level is full, files are merged into the next level. Better read performance, more write amplification.

A key detail for interviews: compaction runs in the background. It doesn't block writes. But it does consume disk I/O and CPU, which can cause latency spikes. This is a real operational challenge with LSM-tree-based systems, because compaction can temporarily degrade read performance. Systems like Cassandra let you tune compaction strategies and throttle compaction I/O to manage this.

### Tombstones and Deletes

Deletes in an LSM tree don't actually remove data immediately. Instead, a special marker called a "tombstone" is written. The tombstone tells the read path to ignore older values for that key.

```
SSTable-1 (older):  key="user:123", value="Alice"
SSTable-2 (newer):  key="user:123", TOMBSTONE

Read "user:123":
  -> Check SSTable-2 first (newer)
  -> Find tombstone
  -> Return "not found"
```

The actual data isn't removed until compaction merges the SSTable containing the tombstone with the one containing the original value. Until then, deleted data still takes up disk space. If you're deleting a lot of data, you might temporarily use more disk space than expected. This catches people off guard in production.

### Read Path

Reading from an LSM tree is more complex than writing:

```
Read key "user:123":

1. Check Memtable (current, in-memory)
   -> Not found

2. Check immutable Memtable (being flushed)
   -> Not found

3. Check SSTables from newest to oldest:
   a. Check Bloom filter. Does this SSTable possibly contain the key?
      -> Bloom filter says NO -> skip this SSTable (saved a disk read!)
   b. Bloom filter says MAYBE -> binary search the index
      -> Found at offset 8192 -> read value from data block
```

The bloom filter step is critical. Without it, you'd potentially read every SSTable on disk for a key that doesn't exist. We'll cover bloom filters in detail below.

For a deeper look at how systems like Cassandra use LSM trees with wide-column data models, see [Wide-Column Databases](/learn/wide-column-databases).

### Why LSM Trees Win for Writes

The numbers tell the story. A typical HDD can do about 100 random writes per second but 100 MB/s of sequential writes. SSDs are better at random writes, but sequential writes still win by 10-100x.

LSM trees convert random writes into sequential writes. Every flush is a sequential write of a sorted file. Every compaction is a sequential read-merge-write. There are no random disk seeks on the write path.

### LSM Trees in Interview Context

When you propose Cassandra, RocksDB, or any LSM-tree-based system, you should be ready for these follow-ups:

- **"What happens if a key is spread across multiple SSTables?"** The read path checks from newest to oldest. The first match wins. Compaction eventually merges them.
- **"How do you handle deletes?"** Tombstones. The data isn't removed until compaction.
- **"What about read performance?"** Bloom filters skip SSTables that don't contain the key. Block cache keeps hot data in memory. Compaction reduces the number of SSTables over time.
- **"What's the downside?"** Read amplification (checking multiple SSTables), write amplification (compaction rewrites data), and space amplification (multiple copies of data before compaction).

Understanding these trade-offs is what separates "I've heard of Cassandra" from "I understand why Cassandra works the way it does."

---

## B-Trees vs LSM Trees

This is one of the most important comparisons in system design. B-trees and LSM trees are the two dominant storage engine architectures, and they make fundamentally different trade-offs.

### B-Trees: The Read-Optimized Classic

B-trees are the storage engine behind PostgreSQL, MySQL (InnoDB), and most traditional relational databases. They've been the standard since the 1970s.

A B-tree is a self-balancing tree where each node can have many children (not just two). In practice, a B-tree node is sized to fit one disk page (typically 4KB or 8KB), and a single node might contain hundreds of keys.

```
B-tree structure (simplified, order 4):

                    [30 | 60]
                   /    |     \
          [10 | 20]  [40 | 50]  [70 | 80 | 90]
          / |  \     / |  \      / |   |   \
        [..] [..] [..][..][..] [..][..][..][..]
                    ^
                    leaf nodes contain actual data
```

Key properties:

- **Balanced**: All leaf nodes are at the same depth
- **Wide**: High branching factor means shallow trees (3-4 levels for millions of rows)
- **In-place updates**: When you update a value, the B-tree modifies the page directly
- **Read-optimized**: Finding a key requires at most 3-4 disk reads (one per level)

A B-tree with a branching factor of 500 and 4 levels can index 500^4 = 62.5 billion keys. That's billions of records accessible in 4 disk reads. This is why B-trees are the backbone of relational databases.

### How B-Tree Writes Work

When you insert or update a value in a B-tree, the database:

1. Traverses from root to the correct leaf node (3-4 disk reads)
2. Modifies the leaf page in memory
3. Writes the modified page back to disk (1 disk write)
4. If the page was full, splits it and updates parent pointers (more writes)

```
Insert key 35 into B-tree:

1. Root: [30 | 60] -> go left (35 > 30)
2. Internal: [10 | 20 | 30] -> go to child between 30 and next
3. Leaf: [31, 32, 33, 34] -> insert 35 here

If leaf is full after insert:
  Split: [31, 32, 33] | [34, 35]
  Push middle key (33) up to parent
  Parent might also split -> cascades up
```

This is an in-place update. The data is modified where it lives on disk. That means random I/O: you're seeking to a specific disk page, reading it, modifying it, and writing it back. For read-heavy workloads, this is fine because you read far more than you write. For write-heavy workloads, the random I/O becomes a bottleneck.

### The Comparison

| Factor                  | B-Tree                                                         | LSM Tree                                   |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| **Read performance**    | Excellent. O(log n) with high branching factor, 3-4 disk reads | Slower; may check multiple SSTables        |
| **Write performance**   | Moderate. Random I/O for in-place updates                      | Excellent. Sequential I/O only             |
| **Write amplification** | Lower (update in place)                                        | Higher (compaction rewrites data)          |
| **Read amplification**  | Lower (one tree to search)                                     | Higher (multiple SSTables to check)        |
| **Space amplification** | Lower (one copy of each key)                                   | Higher (multiple copies before compaction) |
| **Range queries**       | Good (sorted leaf pages)                                       | Good (sorted SSTables)                     |
| **Concurrent writes**   | Needs page-level locking                                       | Append-only, naturally concurrent          |
| **Used by**             | PostgreSQL, MySQL, SQLite                                      | Cassandra, RocksDB, LevelDB                |

### When to Pick Each

**Choose B-trees (relational DB) when:**

- Read-heavy workload (>80% reads)
- Need strong consistency and ACID transactions
- Data fits on a single node or small cluster
- Need complex queries with joins
- Typical web applications, OLTP

**Choose LSM trees (Cassandra, RocksDB) when:**

- Write-heavy workload (high write throughput)
- Time-series or event data
- Can tolerate eventual consistency
- Need horizontal scalability
- Logging, metrics, messaging, IoT

### Write Amplification: The Hidden Cost

Write amplification is how many times a single logical write actually hits the disk. This matters a lot for SSD longevity and throughput.

**B-tree write amplification**: A single write might update one page, but that triggers a full page write even if you only changed one byte. With WAL (write-ahead log), each write hits disk twice. Typical amplification: 2-10x.

**LSM tree write amplification**: Data gets written to the WAL, then the memtable flush, then rewritten during compaction at each level. With leveled compaction, a single write might be rewritten 10-30x over its lifetime. But each rewrite is sequential, which is cheaper than random I/O.

The counterintuitive result: despite higher write amplification, LSM trees often achieve better write throughput because sequential I/O is so much faster than random I/O.

### The Interview Question

When an interviewer asks "B-tree or LSM tree?", they're testing whether you understand the read-write trade-off. Here's a quick framework:

```
"What's your read/write ratio?"

Mostly reads (80%+ reads):
  -> B-tree (PostgreSQL, MySQL)
  -> Reason: single tree to search, in-place reads, no compaction overhead

Mostly writes or balanced:
  -> LSM tree (Cassandra, RocksDB)
  -> Reason: sequential I/O, no random disk seeks on writes

Mixed workload with both:
  -> Consider the consistency requirements
  -> Need ACID? -> B-tree (relational DB)
  -> Can tolerate eventual consistency? -> LSM tree
```

Don't just pick one blindly. State the workload characteristics, name the trade-off, and justify your choice. That's what gets you points.

---

## Bloom Filters

Bloom filters are one of the most elegant data structures in computer science, and they show up everywhere in distributed systems. They answer one question: "Is this element possibly in the set?"

The answer is either "definitely not" or "probably yes." False positives are possible. False negatives are impossible.

### Why They Matter

Think about the LSM tree read path. You might have 100 SSTables on disk. A key lookup could require reading all 100 files. Each disk read takes milliseconds. That's 100+ milliseconds for a single key lookup.

But if each SSTable has a bloom filter, you can skip the ones that definitely don't contain your key. In practice, bloom filters eliminate 99%+ of unnecessary disk reads. Cassandra relies on this heavily; without bloom filters, read performance would be catastrophic.

### How They Work

A bloom filter is a bit array of m bits, all initialized to 0, plus k independent hash functions.

**Insert**: Hash the element with each of the k hash functions. Set the corresponding bits to 1.

**Query**: Hash the element with each of the k hash functions. If all corresponding bits are 1, the element is "probably" in the set. If any bit is 0, the element is definitely not in the set.

```
Bloom filter with m=16 bits, k=3 hash functions:

Insert "apple":
  h1("apple") = 2    h2("apple") = 7    h3("apple") = 13

  Bit array:  0 0 1 0 0 0 0 1 0 0 0 0 0 1 0 0
              ^       ^               ^         ^
              0   2       7          13        15

Insert "banana":
  h1("banana") = 4   h2("banana") = 7   h3("banana") = 11

  Bit array:  0 0 1 0 1 0 0 1 0 0 0 1 0 1 0 0

Query "cherry":
  h1("cherry") = 2   h2("cherry") = 4   h3("cherry") = 9

  Check bit 2: 1 (set)
  Check bit 4: 1 (set)
  Check bit 9: 0 (NOT set)

  Result: DEFINITELY NOT in set (bit 9 is 0)

Query "grape":
  h1("grape") = 2    h2("grape") = 7    h3("grape") = 11

  Check bit 2: 1 (set)
  Check bit 7: 1 (set)
  Check bit 11: 1 (set)

  Result: PROBABLY in set (could be false positive --
          these bits were set by "apple" and "banana")
```

### The Math

The false positive rate depends on three things:

- **m**: number of bits in the filter
- **k**: number of hash functions
- **n**: number of elements inserted

The false positive probability is approximately:

```
FPR ≈ (1 - e^(-kn/m))^k
```

Some practical numbers:

| Elements (n) | Bits (m)            | Hash functions (k) | False positive rate |
| ------------ | ------------------- | ------------------ | ------------------- |
| 1,000,000    | 9,585,059 (~1.2 MB) | 7                  | 1%                  |
| 1,000,000    | 4,792,530 (~600 KB) | 3                  | 10%                 |
| 10,000,000   | 95,850,584 (~12 MB) | 7                  | 1%                  |

A bloom filter with 1% false positive rate uses about 10 bits per element. That's roughly 1.2 MB for a million elements. Incredibly space-efficient compared to storing the actual keys.

### Optimal Number of Hash Functions

The optimal k (number of hash functions) that minimizes the false positive rate is:

```
k_optimal = (m / n) * ln(2) ≈ 0.693 * (m / n)
```

In practice, most systems use k = 7 for a 1% false positive rate with ~10 bits per element.

### Real-World Usage

**Cassandra**: Each SSTable has a bloom filter. Before reading an SSTable from disk, Cassandra checks the bloom filter. If the filter says "no," the SSTable is skipped entirely. This turns a potentially expensive disk read into a cheap in-memory bit check.

**LevelDB/RocksDB**: Same pattern. Bloom filters are stored in each SSTable's metadata block and loaded into memory. Default configuration uses 10 bits per key.

**Google Bigtable**: The original paper that popularized bloom filters in storage engines. Each tablet server maintains bloom filters for its SSTables.

**CDNs and web caches**: Some CDNs use bloom filters to quickly check whether a URL is in the cache before doing a more expensive lookup.

**Chrome Safe Browsing**: Google Chrome stores a bloom filter of known malicious URLs. When you visit a URL, it checks the local bloom filter first. Only if the bloom filter says "maybe" does it contact Google's servers for a definitive check. This avoids sending every URL you visit to Google.

### Limitations

Bloom filters have trade-offs you should know:

- **No deletion**: You can't remove an element from a standard bloom filter. Setting bits to 0 could affect other elements. (Counting bloom filters solve this at the cost of more space.)
- **No enumeration**: You can't list what's in the filter.
- **Fixed size**: You need to decide the size upfront. If you underestimate n, the false positive rate increases.
- **False positives grow with load**: As you add more elements, more bits get set to 1, and the probability of false positives rises.

---

## Comparison Table

Here's how all five structures compare across the dimensions that matter in system design interviews:

| Structure        | Best For                       | Time Complexity             | Space     | Real Systems                | Key Trade-off                        |
| ---------------- | ------------------------------ | --------------------------- | --------- | --------------------------- | ------------------------------------ |
| **Hash Table**   | Key-value lookups              | O(1) avg lookup             | O(n)      | Redis, Memcached            | Speed vs. no ordering                |
| **Skip List**    | Sorted data with range queries | O(log n) search/insert      | O(n)      | Redis sorted sets           | Simplicity vs. guaranteed bounds     |
| **LSM Tree**     | Write-heavy storage            | O(1) write, O(n) worst read | O(n)      | Cassandra, RocksDB, LevelDB | Write speed vs. read amplification   |
| **B-Tree**       | Read-heavy storage             | O(log n) read and write     | O(n)      | PostgreSQL, MySQL, SQLite   | Read speed vs. write speed           |
| **Bloom Filter** | Membership testing             | O(k) query (k = hash count) | O(m) bits | Cassandra, Chrome, CDNs     | Space efficiency vs. false positives |

Some key distinctions to remember:

- Hash tables are O(1) but don't support range queries or ordering
- Skip lists and B-trees are both O(log n) but have very different constants and cache behavior
- LSM trees trade read performance for write performance
- Bloom filters trade accuracy (false positives) for extreme space efficiency

---

## Common Interview Mistakes

### Mistake 1: Treating Data Structures as Academic Exercises

> "I'd use a balanced BST because it has O(log n) lookup."

**Problem:** This treats Big-O as the whole story. In real systems, constant factors, cache behavior, disk I/O patterns, and implementation complexity matter enormously. O(log n) in a B-tree with branching factor 500 means 3-4 disk reads. O(log n) in a binary tree means 20+ pointer dereferences scattered across memory. Same Big-O, wildly different performance.

**Better:** "I'd use a B-tree here because the data lives on disk, and a B-tree's high branching factor means we can find any record in 3-4 disk reads. A binary tree would require 20+ reads for the same dataset because it has a branching factor of 2."

### Mistake 2: Not Knowing Why Redis Uses Skip Lists

> "Redis probably uses a red-black tree or something for sorted sets."

**Problem:** This shows you haven't thought about why systems make specific implementation choices. Redis's use of skip lists is one of the most commonly cited examples in system design discussions. Not knowing it signals you haven't studied real systems.

**Better:** "Redis uses a skip list for sorted sets because skip lists are simpler to implement correctly than balanced BSTs, they provide better cache locality for range queries like ZRANGEBYSCORE, and they're easier to make concurrent. The trade-off is that skip lists have probabilistic rather than guaranteed O(log n) bounds, but in practice the difference is negligible." See more about Redis's sorted set operations in [Redis Sorted Sets](/learn/redis-sorted-sets).

### Mistake 3: Confusing B-Trees with Binary Trees

> "PostgreSQL uses a binary tree index to find rows quickly."

**Problem:** B-trees and binary trees are fundamentally different. A binary tree has at most 2 children per node. A B-tree might have 500+ children per node. This distinction matters because B-trees are designed for disk-based storage where you want to minimize the number of disk reads. Confusing the two makes it sound like you've never looked at how databases actually work.

**Better:** "PostgreSQL uses B-tree indexes. Each node in a B-tree corresponds to a disk page and can hold hundreds of keys, so even a table with billions of rows only needs 3-4 levels. This means any lookup requires at most 3-4 disk reads."

### Mistake 4: Not Knowing LSM Trees Exist

> "For this write-heavy time-series system, I'd use PostgreSQL with good indexing."

**Problem:** PostgreSQL uses B-trees, which do random writes for every update. For a write-heavy workload doing millions of inserts per second, this will bottleneck on disk I/O. Not mentioning LSM-tree-based systems like Cassandra or RocksDB shows a gap in your understanding of storage engine trade-offs.

**Better:** "For a write-heavy time-series workload, I'd use an LSM-tree-based storage engine like Cassandra or a RocksDB-backed system. LSM trees buffer writes in memory and flush sequentially to disk, which gives much higher write throughput than B-tree-based systems. The trade-off is that reads are slightly more expensive because you may need to check multiple SSTables, but bloom filters mitigate this." For details on how Cassandra uses LSM trees with a wide-column data model, see [Wide-Column Databases](/learn/wide-column-databases).

---

## Summary: What to Remember

**Hash Tables:**

- O(1) average lookup, insert, delete
- Consistent hashing for distributed caches; adding a node moves ~1/N keys
- Redis uses incremental rehashing to avoid stop-the-world resizing
- Load factor below 0.75 for good performance

**Skip Lists:**

- O(log n) search, insert, delete (probabilistic, not guaranteed)
- Redis uses p=0.25 promotion probability (not 0.5) to save memory
- Better than balanced BSTs for range queries (sequential access on Level 0)
- Easier to implement, debug, and make concurrent than red-black trees

**LSM Trees:**

- Memtable (in-memory, ~32-64 MB) flushes to SSTable (on-disk, sorted, immutable)
- Sequential writes only; converts random writes to sequential
- Write amplification of 10-30x due to compaction, but sequential I/O makes it fast
- Used by Cassandra, RocksDB, LevelDB, HBase, ScyllaDB

**B-Trees:**

- Branching factor of 500+ means 3-4 levels for billions of keys
- Each node = one disk page (4-8 KB)
- In-place updates with page-level locking
- Used by PostgreSQL, MySQL, SQLite, the default for OLTP

**Bloom Filters:**

- ~10 bits per element for 1% false positive rate
- 1.2 MB for 1 million elements at 1% FPR
- Optimal hash functions: k = 0.693 \* (m/n), typically k = 7
- False positives possible, false negatives impossible
- Eliminates 99%+ of unnecessary disk reads in LSM-tree-based systems

```
Interview golden rule: Don't just name a data structure. Explain WHY
a system chose it over the alternatives. The "why" is where the
engineering trade-offs live, and that's what interviewers are testing.
```
