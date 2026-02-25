# Bloom Filters

## Introduction

You're building a web crawler that has visited 10 billion URLs. Before fetching a new URL, you need to check: "Have I seen this before?" A hash set would work, but storing 10 billion URLs in memory requires hundreds of gigabytes. A database lookup would be accurate but far too slow -- you're checking millions of URLs per second.

A Bloom filter answers "have I seen this?" using a fraction of the memory, with one trade-off: it sometimes says "yes" when the answer is actually "no" (false positive), but it never says "no" when the answer is actually "yes" (no false negatives). For URL deduplication, this trade-off is perfect -- occasionally re-crawling a page is acceptable, but missing a page because the filter incorrectly said "not seen" would be a real problem.

Bloom filters are one of the most practical [data structures](/learn/data-structures) in system design. They show up anywhere you need fast, space-efficient membership testing: web crawlers, [database caching](/learn/database-caching) systems, spam filters, and content deduplication.

---

## What Is a Bloom Filter?

A Bloom filter is a **probabilistic data structure** that tests whether an element is a member of a set. It supports two operations:

- **Add**: Insert an element into the set
- **Query**: Check if an element might be in the set

The key insight: a Bloom filter uses a **fixed amount of memory** regardless of how many elements you add. You choose the memory size upfront based on your expected number of elements and acceptable false positive rate.

The trade-off:

|                       | Element IS in the set      | Element is NOT in the set |
| --------------------- | -------------------------- | ------------------------- |
| **Filter says "yes"** | Correct (true positive)    | Wrong (false positive)    |
| **Filter says "no"**  | Impossible (never happens) | Correct (true negative)   |

**No false negatives** is the critical property. If the filter says "not seen," you can trust that answer completely. If it says "seen," there's a small chance it's wrong.

---

## How Bloom Filters Work

A Bloom filter consists of:

1. A **bit array** of `m` bits, all initialized to 0
2. `k` independent **hash functions**, each mapping an element to a position in the bit array

**Adding an element:**

```
1. Feed the element through all k hash functions
2. Each hash function produces an index (0 to m-1)
3. Set the bit at each of those k positions to 1
```

**Querying an element:**

```
1. Feed the element through all k hash functions
2. Check the bit at each of the k positions
3. If ALL k bits are 1: element is "probably in the set"
4. If ANY bit is 0: element is "definitely not in the set"
```

**Example with m=10 bits, k=3 hash functions:**

```
Initial:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

Add "url-A": hash1→2, hash2→5, hash3→8
             [0, 0, 1, 0, 0, 1, 0, 0, 1, 0]

Add "url-B": hash1→1, hash2→5, hash3→7
             [0, 1, 1, 0, 0, 1, 0, 1, 1, 0]

Query "url-A": positions 2,5,8 → all 1s → "probably yes"
Query "url-C": hash1→3, hash2→5, hash3→9
               positions 3,5,9 → bit 3 is 0 → "definitely no"
```

Notice that "url-A" and "url-B" share position 5. This overlap is what causes false positives: as more elements are added, more bits are set to 1, and random queries are more likely to find all their bits set by coincidence.

---

## False Positives and No False Negatives

**Why no false negatives?** When you add an element, you set k specific bits to 1. Bits are never set back to 0. So when you query that same element, those k bits are guaranteed to still be 1. The filter will always say "probably yes" for elements that were actually added.

**Why false positives?** When you query an element that was never added, all k of its bit positions might happen to be set to 1 by other elements. The filter can't distinguish between "these bits were set by this exact element" and "these bits were set by a combination of other elements."

**The false positive rate** depends on three factors:

- **m** (bit array size): More bits = fewer collisions = lower false positive rate
- **k** (number of hash functions): More hash functions = more bits checked = lower false positive rate (up to a point)
- **n** (number of elements inserted): More elements = more bits set = higher false positive rate

The approximate false positive rate formula:

```
FP rate ≈ (1 - e^(-kn/m))^k
```

For practical purposes: with 10 bits per element (m/n = 10) and 7 hash functions, the false positive rate is about 0.8%.

---

## Tuning Parameters

Choosing the right Bloom filter parameters:

**Start with your requirements:**

1. How many elements will you store? (n)
2. What false positive rate is acceptable? (p)

**Calculate the optimal parameters:**

```
Optimal bit array size:   m = -(n × ln(p)) / (ln(2))²
Optimal hash functions:   k = (m/n) × ln(2)
```

**Practical examples:**

| Elements (n) | Target FP rate | Bits (m)  | Hash functions (k) | Memory |
| ------------ | -------------- | --------- | ------------------ | ------ |
| 1 million    | 1%             | 9.6M bits | 7                  | 1.2 MB |
| 100 million  | 1%             | 960M bits | 7                  | 120 MB |
| 1 billion    | 1%             | 9.6B bits | 7                  | 1.2 GB |
| 10 billion   | 1%             | 96B bits  | 7                  | 12 GB  |

Compare this to storing 10 billion URLs in a hash set: at ~100 bytes per URL, that's 1 TB of memory. A Bloom filter does the same job in 12 GB -- an 80x reduction.

**Rules of thumb:**

- Use about 10 bits per element for a 1% false positive rate
- Use about 15 bits per element for a 0.1% false positive rate
- The optimal number of hash functions is approximately `0.7 × (m/n)`
- Increasing m (more memory) always reduces the false positive rate
- Adding too many hash functions actually increases the false positive rate (more bits set per element)

---

## Counting Bloom Filters

Standard Bloom filters don't support deletion. Once a bit is set to 1, you can't set it back to 0 without potentially breaking other elements that share that bit position.

**Counting Bloom filters** solve this by replacing each bit with a counter:

- **Add**: Increment the counter at each of the k positions
- **Remove**: Decrement the counter at each of the k positions
- **Query**: Check if all k counters are greater than 0

The cost is more memory: each position needs a counter (typically 4 bits) instead of a single bit. So a counting Bloom filter uses roughly 4x the memory of a standard Bloom filter.

**When to use counting Bloom filters:**

- You need to remove elements (e.g., URLs that were recrawled and should be re-eligible)
- The set membership changes over time
- Memory is less constrained than in the standard case

For most web crawler scenarios, a standard Bloom filter suffices because URLs, once crawled, stay in the "visited" set permanently.

---

## Bloom Filters vs Hash Sets

| Property            | Bloom Filter                                     | Hash Set                              |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| **Memory**          | Fixed, very small (10-15 bits/element)           | Variable, large (~100+ bytes/element) |
| **False positives** | Yes (tunable rate)                               | No                                    |
| **False negatives** | No                                               | No                                    |
| **Deletion**        | Not supported (standard) or expensive (counting) | O(1)                                  |
| **Lookup time**     | O(k) -- constant                                 | O(1) -- constant                      |
| **Disk/network**    | Easily serialized and shared                     | Large, harder to distribute           |

**Use a Bloom filter when:**

- The set is very large (millions to billions of elements)
- Memory is constrained
- Small false positive rate is acceptable
- Deletion is not needed (or rarely needed)

**Use a hash set when:**

- The set is small enough to fit in memory
- Zero false positives are required
- Frequent deletion is needed
- Memory is not a constraint

---

## Real-World Use Cases

**Web crawler URL deduplication.** Before fetching a URL, check the Bloom filter. If it says "not seen," fetch the page. If it says "probably seen," skip it. Occasional false positives (re-crawling a page) are harmless. Missing pages (false negatives) would be harmful -- but Bloom filters guarantee this never happens.

**Database query optimization.** Before running an expensive disk read, check a Bloom filter to see if the key exists in the database file. If the filter says "no," skip the disk read entirely. This is how LSM-tree databases like Cassandra use Bloom filters to avoid unnecessary disk I/O. See [data structures](/learn/data-structures) for more on LSM trees.

**[Cache](/learn/database-caching) filtering.** Before checking a remote cache, a Bloom filter can tell you if the key was ever stored. If the filter says "not stored," skip the network round-trip. This reduces cache miss latency for keys that were never cached in the first place.

**Spam detection.** Maintain a Bloom filter of known spam URLs or email addresses. Quick membership check before processing each message. False positives (occasionally flagging legitimate content) are handled by a secondary check.

**Content deduplication.** When storing documents or files, hash the content and check a Bloom filter before writing. If the content was already stored, skip the write and reference the existing copy.

---

## Common Interview Mistakes

**Mistake 1: Claiming Bloom filters have false negatives.** They don't. If an element was added, the filter will always say "probably yes." False negatives are impossible by construction.

**Mistake 2: Using a hash set at web scale.** Storing 10 billion URLs in a hash set requires ~1 TB of memory. Mention Bloom filters as the space-efficient alternative and quote the memory requirements.

**Mistake 3: Forgetting to tune parameters.** Don't just say "use a Bloom filter." Specify the target false positive rate, calculate the memory requirement, and choose the number of hash functions. Showing you can size the system demonstrates practical engineering knowledge.

**Mistake 4: Not mentioning the deletion limitation.** Standard Bloom filters don't support deletion. If your design requires removing elements, mention counting Bloom filters and their memory trade-off.

---

## Summary: What to Remember

- A Bloom filter is a **space-efficient probabilistic set** that supports add and query operations.
- **No false negatives**: if the filter says "no," the element is definitely not in the set.
- **Possible false positives**: if the filter says "yes," the element is probably (but not certainly) in the set.
- Use **10 bits per element** for a ~1% false positive rate. 10 billion elements need about 12 GB.
- Bloom filters use 80-100x less memory than hash sets for the same number of elements.
- Standard Bloom filters **don't support deletion**. Use counting Bloom filters if deletion is needed.
- Primary use cases: URL deduplication in web crawlers, database query optimization (LSM trees), cache filtering, and spam detection.
