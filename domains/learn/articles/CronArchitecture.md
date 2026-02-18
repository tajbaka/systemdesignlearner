## Introduction

The interviewer asks: "Design a system that runs scheduled tasks." You think: "Easy. A cron job on a server."

Then they ask: "What happens when that server dies? What about 10 million scheduled tasks? What if two servers both trigger the same job at the same time?"

And now you realize that a single-server cron is a single point of failure with no scalability story. Distributed cron is one of the hardest problems in backend engineering because it combines scheduling, coordination, and fault tolerance.

---

## What Is a Distributed Cron?

A distributed cron is a system that executes scheduled tasks (one-time or recurring) across multiple machines with guarantees about reliability and correctness.

A regular cron (like Linux crontab) runs on one machine. If that machine dies, all scheduled jobs stop. A distributed cron runs across a cluster, so if one machine dies, another picks up the work.

```
Regular Cron:
  Server → runs jobs → server dies → jobs stop

Distributed Cron:
  Server A (Leader) → runs jobs → dies
  Server B (Follower) → detects failure → takes over → jobs continue
```

The core challenge isn't scheduling. Parsing "run every Monday at 9 AM" is straightforward. The hard part is making sure the job runs **exactly once** when you have multiple servers that could all trigger it.

---

## The Core Challenge: Exactly-Once Execution

This is the single most important concept for interviews. When you have N servers capable of running a scheduled job, you need to ensure that exactly one of them actually does it.

**What goes wrong without coordination:**

```
Time: 09:00:00.000
Server A checks DB: "Job #42 is due" → dispatches job
Server B checks DB: "Job #42 is due" → dispatches job
Server C checks DB: "Job #42 is due" → dispatches job

Result: Job #42 runs 3 times. User gets 3 emails.
```

**Three approaches to solve this:**

1. **Single leader polling** — Only one server polls the database. Use [leader election](/learn/leader-election) to choose it.
2. **Database-level locking** — All servers poll, but use `SELECT ... FOR UPDATE SKIP LOCKED` to claim jobs atomically.
3. **Partition assignment** — Divide jobs across servers so each server owns a subset.

Each has trade-offs. Let's examine them.

---

## Architecture Patterns

### Pattern 1: Single Leader with Message Queue

This is the most common pattern and the safest for interviews.

```
1. One Coordinator (elected via leader election) polls the DB every second
2. Query: SELECT * FROM jobs WHERE next_run_time <= NOW() AND status = 'SCHEDULED'
3. For each due job:
   a. Update status to 'QUEUED' (prevents re-pickup)
   b. Push to message queue (Kafka/SQS)
   c. Update next_run_time for recurring jobs
4. Worker pool consumes from queue and executes jobs
5. Workers report success/failure back to DB
```

**Why leader election?** Without it, multiple coordinators would poll the same jobs simultaneously. With [leader election](/learn/leader-election) (via etcd or ZooKeeper), only one coordinator polls at a time. If it crashes, a follower takes over within seconds.

**Why a message queue?** The coordinator shouldn't execute jobs directly. If it did, a slow job would block the polling loop. By pushing to a [message queue](/learn/message-queues), execution is decoupled. Workers process jobs in parallel at their own pace.

**Pros:** Simple, battle-tested, strong exactly-once guarantees.
**Cons:** The single leader is a bottleneck at extreme scale. If you have 1 million jobs due in the same second, one poller may not keep up.

### Pattern 2: Database-Polled with Row Locking

All servers poll the database, but the database itself prevents duplicates using row-level locking.

```
-- Each server runs this query:
BEGIN;
SELECT id, payload FROM jobs
WHERE next_run_time <= NOW() AND status = 'SCHEDULED'
FOR UPDATE SKIP LOCKED
LIMIT 100;

-- Claim the jobs:
UPDATE jobs SET status = 'RUNNING' WHERE id IN (...);
COMMIT;

-- Execute the claimed jobs
```

`FOR UPDATE SKIP LOCKED` is the key. It locks the selected rows and skips any rows already locked by another server. No two servers can claim the same job.

**Pros:** No need for a separate leader election system. The database is the coordinator. Works well up to moderate scale (~100K jobs/minute).
**Cons:** Heavy database load from continuous polling by all servers. Doesn't scale as well as partitioning. Database becomes the bottleneck.

### Pattern 3: Partitioned Scheduling

Divide all jobs across N schedulers. Each scheduler owns a partition and only polls for its own jobs.

```
Scheduler 0: polls jobs WHERE job_id % 3 = 0
Scheduler 1: polls jobs WHERE job_id % 3 = 1
Scheduler 2: polls jobs WHERE job_id % 3 = 2
```

**Pros:** Scales horizontally. Each scheduler handles 1/N of the total load. No contention between schedulers.
**Cons:** If a scheduler dies, its partition's jobs stop until a rebalancing mechanism kicks in. Rebalancing is complex (similar to Kafka consumer group rebalancing). Overkill for most systems.

### Which Pattern to Use in Interviews

| Scale            | Pattern                | Why                               |
| ---------------- | ---------------------- | --------------------------------- |
| < 100K jobs/min  | Single Leader + Queue  | Simple, reliable, easy to explain |
| 100K-1M jobs/min | Database row locking   | Avoids leader bottleneck          |
| > 1M jobs/min    | Partitioned scheduling | Horizontal scaling                |

**Default to Pattern 1** (Single Leader + Queue) in interviews. It's the easiest to explain correctly and covers 90% of real-world job schedulers.

---

## Cron Expression Parsing

A cron expression defines a recurring schedule. You don't need to implement a parser in an interview, but you need to understand the format.

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

**Examples:**

```
0 9 * * 1        → Every Monday at 9:00 AM
*/5 * * * *      → Every 5 minutes
0 0 1 * *        → First day of every month at midnight
0 17 * * 1-5     → Weekdays at 5:00 PM
```

**The important design decision:** When you store a recurring job, you need to compute and store `next_run_time`. After each execution, recompute it from the cron expression. This way, your polling query is always a simple time comparison, not a cron expression evaluation on every row.

```
1. Job created: cron = "0 9 * * 1", next_run_time = next Monday 9 AM
2. Monday 9 AM: job triggers, next_run_time updated to following Monday 9 AM
3. Repeat
```

---

## Handling Missed Jobs

What happens when the scheduler is down during a job's scheduled time? This is a critical edge case interviewers love.

**Scenario:** Job is scheduled for Monday 9 AM. The scheduler is down from 8:55 AM to 9:10 AM.

**Option 1: Fire immediately on recovery**

When the scheduler comes back, it finds `next_run_time = 9:00 AM < NOW()`. It fires the job immediately and updates `next_run_time` to the next occurrence.

This is the right behavior for most cases: backups, reports, data syncs. Missing a run is worse than running it late.

**Option 2: Skip and move to next occurrence**

Update `next_run_time` to the next future occurrence without executing. This is appropriate for time-sensitive actions where a late run is meaningless (e.g., "send a flash sale notification for a sale that already ended").

**Option 3: Configurable per job**

Let the user choose. Add a `misfire_policy` field: `FIRE_IMMEDIATELY` or `SKIP`.

```
{
  "cron": "0 9 * * 1",
  "misfire_policy": "FIRE_IMMEDIATELY",
  "max_misfire_age": "1h"
}
```

`max_misfire_age` prevents firing jobs that are days overdue. If the scheduler was down for a week, you probably don't want to fire 7 days' worth of jobs at once.

---

## Real-World Examples

**Kubernetes CronJobs**

Kubernetes uses the single-leader pattern. The kube-controller-manager (elected via etcd lease) checks CronJob schedules every 10 seconds and creates Job objects for due runs. The kubelet on worker nodes executes the actual containers.

**Airflow Scheduler**

Apache Airflow uses a single scheduler process that continuously polls the DAG (Directed Acyclic Graph) for due tasks. In newer versions, multiple schedulers can run with database-level locking to prevent duplicate task execution.

**Celery Beat**

Celery Beat is a single-process scheduler that publishes due tasks to a message broker (Redis or RabbitMQ). Workers consume from the broker. Beat itself is a single point of failure unless you add leader election via django-celery-beat with database locking.

All three follow the same pattern: one coordinator detects due jobs, pushes to a queue, and workers execute. The differences are in how they handle coordination and fault tolerance.

---

## Common Interview Mistakes

### Mistake 1: Ignoring duplicate execution

> "I'll have multiple schedulers polling the database."

**Problem:** Without coordination, all schedulers pick up the same due jobs. Every job runs N times where N is the number of schedulers. This is the most common mistake in job scheduler interviews.

**Better:** Use [leader election](/learn/leader-election) so only one scheduler polls, or use `SELECT FOR UPDATE SKIP LOCKED` for database-level coordination.

### Mistake 2: Running jobs inside the scheduler

> "The scheduler picks up the job and executes it."

**Problem:** If a job takes 30 minutes, the scheduler is blocked. It can't poll for new jobs. All other scheduled tasks pile up and miss their execution times.

**Better:** The scheduler only detects due jobs and pushes them to a [message queue](/learn/message-queues). Separate workers execute the actual job logic. This decoupling is essential.

### Mistake 3: Scanning all jobs every second

> "Every second, query: SELECT \* FROM jobs WHERE cron matches now."

**Problem:** Evaluating cron expressions against millions of rows every second is computationally expensive and doesn't scale. The database becomes the bottleneck.

**Better:** Pre-compute `next_run_time` when the job is created or after each execution. The polling query becomes `WHERE next_run_time <= NOW()` with an index on `next_run_time`. This is an indexed range scan, not a full table scan.

### Mistake 4: Not discussing what happens when the scheduler crashes

> "We'll have a scheduler service."

**Problem:** A single scheduler is a single point of failure. The interviewer will immediately ask what happens when it dies.

**Better:** Run multiple scheduler instances with leader election. The active leader polls. Followers are on standby. If the leader dies, a follower takes over within seconds. Discuss the failover gap and how missed jobs are handled on recovery.

---

## Summary: What to Remember

- Distributed cron is hard because of duplicate execution, not scheduling logic
- Pre-compute `next_run_time` instead of evaluating cron expressions on every poll
- Single Leader + Message Queue is the default interview pattern for job schedulers
- [Leader election](/learn/leader-election) (etcd/ZooKeeper) prevents multiple schedulers from polling simultaneously
- Always separate the scheduler (coordinator) from the workers (executors) using a [message queue](/learn/message-queues)
- Handle missed jobs with a configurable policy: fire immediately, skip, or fire with a max age
- For higher scale, use database row locking or partition-based scheduling

**Interview golden rule:**

Don't just say "a cron service runs the jobs." Explain who decides which jobs are due (the coordinator), how you prevent duplicates (leader election or row locking), and how jobs get executed (message queue to workers).
