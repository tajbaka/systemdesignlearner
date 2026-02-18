## Introduction

You're designing a distributed job scheduler, and the interviewer asks: "What happens when the scheduler crashes? Who picks up its work?"

You say: "We'll run two instances." Great. But now both instances wake up at the same second, poll the database, and fire the same job twice. One user gets two password reset emails. Another gets double-charged.

The problem isn't redundancy. It's **coordination**. When you have multiple instances of a service, someone needs to be in charge. That's what leader election solves.

---

## What Is Leader Election?

Leader election is a protocol where multiple nodes in a distributed system agree on exactly one node to act as the "leader." The leader performs coordination tasks that must happen on a single node: writing to a shared resource, assigning work, or polling a database for due jobs.

The other nodes are followers (or standbys). If the leader dies, the followers detect the failure and elect a new leader. The system continues without manual intervention.

```
Node A (Leader)  ← does the work
Node B (Follower) ← watches, ready to take over
Node C (Follower) ← watches, ready to take over
```

The key guarantee: **at any point in time, at most one node believes it is the leader.** Violating this — called "split brain" — leads to duplicate processing, data corruption, or worse.

---

## Why Leader Election Matters

Leader election shows up in almost every distributed systems interview, even when it's not the main question. Here's where you'll need it:

**Job Schedulers & Cron Systems**

Only one node should poll the database for due jobs. Without a leader, every node polls and dispatches the same jobs, causing duplicate execution. For more on this, see [Cron Architecture](/learn/cron-architecture).

**Database Replication**

In primary-replica setups (PostgreSQL, MySQL), the primary accepts writes. If it fails, a replica must be promoted. That's leader election.

**Distributed Locks**

When multiple services need exclusive access to a resource (a file, a queue partition, a configuration update), the lock holder is effectively the leader.

**Consensus Systems**

Kafka uses leader election to assign partition leaders. etcd and ZooKeeper use it internally for their own replication. It's leaders all the way down.

---

## Common Algorithms

### The Bully Algorithm

The simplest leader election algorithm. Every node has a numeric ID. The node with the highest ID wins.

```
1. Node detects leader is dead
2. Node sends "election" message to all nodes with higher IDs
3. If no higher node responds → this node becomes leader
4. If a higher node responds → that node takes over the election
5. The highest living node broadcasts "I am leader"
```

**Pros:** Simple to understand and implement.
**Cons:** Assumes reliable failure detection. Not partition-tolerant. Rarely used in production.

### Raft Consensus

Raft is the most popular consensus algorithm in modern systems. etcd (used by Kubernetes) and Consul both use Raft.

```
1. Nodes start as "followers"
2. If a follower doesn't hear from the leader within a timeout, it becomes a "candidate"
3. Candidate requests votes from all other nodes
4. If it gets a majority of votes → it becomes the new leader
5. Leader sends periodic heartbeats to maintain authority
```

**Key property:** Raft guarantees that only one leader exists per "term" (election round). A leader must have a majority, so even during a network partition, at most one partition can elect a leader.

**Why Raft matters in interviews:** It's behind etcd, Consul, CockroachDB, and TiKV. When you say "we'll use etcd for leader election," you're implicitly saying "we'll use Raft."

### Paxos

Paxos is the original consensus algorithm. It predates Raft and solves the same problem, but it's notoriously hard to understand and implement correctly.

**In interviews:** You almost never need to explain Paxos. Mentioning that Raft was designed as a more understandable alternative to Paxos is sufficient. If the interviewer asks, say "Paxos solves the same consensus problem but Raft is preferred in practice because it's easier to implement correctly."

---

## ZooKeeper: The Classic Approach

Apache ZooKeeper is a coordination service that makes leader election easy. It's used by Kafka (older versions), Hadoop, and many Java-based distributed systems.

**How it works:**

```
1. Each node creates an "ephemeral sequential" znode (a temporary, auto-numbered file)
   /election/node-0001
   /election/node-0002
   /election/node-0003

2. The node with the lowest number is the leader
   node-0001 → Leader

3. Each non-leader node watches the node just before it
   node-0003 watches node-0002
   node-0002 watches node-0001

4. If the leader (node-0001) dies, ZooKeeper deletes its ephemeral znode
   node-0002 gets notified → becomes leader

5. If node-0002 also dies, node-0003 gets notified → becomes leader
```

**Why ephemeral nodes?** If a node crashes or loses its connection to ZooKeeper, the ephemeral znode is automatically deleted. No manual cleanup needed. The system self-heals.

**Pros:** Battle-tested, strong consistency guarantees, built-in failure detection via session timeouts.
**Cons:** Requires running a ZooKeeper cluster (3-5 nodes), adds operational complexity, Java-based.

---

## etcd and Raft: The Modern Approach

etcd is a distributed key-value store that uses Raft internally. It's the backbone of Kubernetes and the modern alternative to ZooKeeper.

**How leader election works with etcd:**

```
1. Node acquires a lease (a time-limited lock):
   etcdctl lease grant 10   → returns lease ID (TTL: 10 seconds)

2. Node writes a key with the lease attached:
   etcdctl put /leader "node-A" --lease=<lease-id>

3. Only the first writer succeeds (compare-and-swap).
   Node A writes successfully → Node A is leader
   Node B tries to write → fails (key exists) → Node B is follower

4. Leader must refresh the lease before it expires:
   etcdctl lease keep-alive <lease-id>   (every few seconds)

5. If the leader crashes, the lease expires after 10 seconds
   Key /leader is deleted
   Followers retry the write → one wins → new leader
```

**Pros:** Simpler than ZooKeeper, Go-based (easier to deploy), Kubernetes-native, excellent documentation.
**Cons:** Still requires a 3-5 node etcd cluster. Lease TTL adds a delay before failover (e.g., 10 seconds of no leader).

---

## Redis Lease-Based Election

For simpler systems that don't need the full guarantees of Raft, Redis offers a lightweight approach.

**How it works:**

```
1. Node tries to set a key with NX (only if not exists) and EX (TTL):
   SET leader "node-A" NX EX 10

2. If SET returns OK → this node is leader
   If SET returns nil → another node is leader

3. Leader refreshes the key before expiry:
   SET leader "node-A" XX EX 10   (XX = only if exists)

4. If leader crashes, key expires after 10 seconds
   Next node to call SET NX wins
```

**Pros:** Dead simple, no extra infrastructure if you already run Redis, sub-second operations.
**Cons:** Redis is not a consensus system. In rare edge cases (Redis failover, clock skew), two nodes may briefly believe they're both leader. Not suitable when split-brain would cause data loss.

**When to use Redis:** When duplicate work is tolerable (idempotent jobs, cache warming) and you want simplicity over correctness guarantees.

---

## Comparison Table

| Approach          | Consistency         | Failover Time | Complexity              | Best For                              |
| ----------------- | ------------------- | ------------- | ----------------------- | ------------------------------------- |
| **ZooKeeper**     | Strong (ZAB)        | ~2-5 seconds  | High (Java cluster)     | Legacy systems, Kafka                 |
| **etcd**          | Strong (Raft)       | ~5-15 seconds | Medium (Go binary)      | Kubernetes, modern stacks             |
| **Redis**         | Weak (no consensus) | ~10 seconds   | Low (existing Redis)    | Simple coordination, idempotent tasks |
| **Raft (direct)** | Strong              | ~1-5 seconds  | Very high (custom impl) | Building your own database            |

**Interview default:** "We'll use etcd for leader election." It's modern, well-understood, and Kubernetes-native. If the system already uses ZooKeeper (e.g., older Kafka), mention that instead.

---

## Common Interview Mistakes

### Mistake 1: Ignoring split brain

> "We'll run two instances and one will be the leader."

**Problem:** How? If they can't communicate (network partition), both think the other is dead. Both become leader. Both process the same jobs.

**Better:** Explain that leader election requires a quorum (majority agreement). With etcd or ZooKeeper, the leader must maintain a lease. If it can't reach the coordination service, it steps down. This prevents split brain.

### Mistake 2: Building your own leader election

> "I'll use a database row with a timestamp. Each node tries to UPDATE WHERE timestamp is old."

**Problem:** Database-based leader election is full of race conditions. Clock skew, long GC pauses, and network delays can all cause two nodes to grab the lock simultaneously. You're reimplementing consensus badly.

**Better:** Use a purpose-built coordination service (etcd, ZooKeeper). They've solved these edge cases already. In an interview, saying "I'd use etcd" is the right level of abstraction.

### Mistake 3: Forgetting the failover delay

> "If the leader dies, a new one takes over instantly."

**Problem:** Failover is never instant. The lease must expire (seconds), followers must detect the failure, and a new election must complete. During this window, no leader exists and work stalls.

**Better:** Acknowledge the failover gap. Discuss the trade-off: shorter lease TTLs mean faster failover but more network traffic for keep-alives. Typical values are 5-15 seconds.

### Mistake 4: Using leader election when you don't need it

> "Every service in my design uses leader election."

**Problem:** Leader election adds complexity and a single point of coordination. If your workers are stateless and idempotent, you don't need a leader. Just let all workers pull from a [message queue](/learn/message-queues) independently.

**Better:** Only use leader election when exactly-one semantics matter: database polling, cron scheduling, partition assignment. For parallel task processing, a queue with competing consumers is simpler and scales better.

---

## Summary: What to Remember

- Leader election ensures exactly one node performs a coordinated task at any time
- etcd (Raft) is the modern default; ZooKeeper is the classic choice; Redis works for simple cases
- Split brain (two leaders) is the main failure mode to discuss. Quorum-based systems prevent it
- Failover is never instant. Lease TTLs create a gap of seconds between leader failure and recovery
- Don't use leader election when a [message queue](/learn/message-queues) with competing consumers would suffice
- Leader election is a building block, not the whole solution. Combine it with queues, databases, and retries

**Interview golden rule:**

Don't just say "we'll have a leader." Explain how it's elected (etcd lease, ZooKeeper ephemeral node), what happens when it dies (lease expires, new election), and what happens during the gap (work stalls briefly, then resumes).
