## Introduction

The interviewer says: "Design a distributed job scheduler."

You think, "A cron job on a server." Then they follow up: "How do you handle 10 million scheduled tasks? What happens when the scheduler crashes? How do you prevent the same job from running twice?"

And now you realize this isn't about cron syntax. It's about coordination, fault tolerance, and scale. A job scheduler combines [leader election](/learn/leader-election), [message queues](/learn/message-queues), and careful [database design](/learn/database-caching) into one of the most challenging system design problems.

Here's how to design a job scheduler that's reliable at scale.

---

## Functional Requirements

**1. Schedule jobs (one-time and recurring)**

- Users submit jobs to run once at a specific time ("Run at 5 PM tomorrow")
- Users submit recurring jobs using cron expressions ("Run every Monday at 9 AM")
- The system computes and stores `next_run_time` for efficient querying
- For more on cron scheduling patterns, see [Cron Architecture](/learn/cron-architecture)

**2. Job execution and isolation**

- The scheduler triggers execution but does not run job logic directly
- Workers execute jobs in isolation (containers, Lambda functions, HTTP callbacks)
- A crashing job must not affect the scheduler or other jobs
- Workers report success or failure back to the system

**3. Status tracking**

- Users can query the current status of any job: Scheduled, Queued, Running, Completed, Failed
- Execution history is stored for debugging and auditing
- Failed jobs include error details and retry count

That's the core. A job scheduler answers: "What needs to run?", "When does it run?", and "Did it actually run?"

---

## Non-Functional Requirements

**At-least-once delivery**

- Jobs must never be silently dropped. Missing a scheduled job is worse than running it twice
- If a worker crashes mid-execution, the job must be retried
- Users are responsible for making their job logic idempotent
- Exactly-once delivery is impractical in distributed systems. At-least-once with idempotent consumers is the standard pattern. See [Message Queues](/learn/message-queues) for details

**High throughput and precision**

- Support millions of scheduled jobs
- Execute jobs within seconds of their scheduled time (not minutes)
- Scanning all jobs every second is not feasible at scale. Need efficient indexing by `next_run_time`
- Partition or bucket jobs by time window to distribute the polling load

**Availability**

- No single point of failure. If the scheduler crashes, a standby takes over
- [Leader election](/learn/leader-election) ensures exactly one scheduler polls at a time, with automatic failover
- Workers are stateless and horizontally scalable

---

## API Design

**Submit a job**

```
POST /api/v1/jobs

Request Body (one-time):
{
  "name": "send-report",
  "type": "http",
  "schedule": "2026-03-01T09:00:00Z",
  "payload": {
    "url": "https://api.example.com/generate-report",
    "method": "POST",
    "body": { "reportId": "abc-123" }
  },
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMs": 5000
  }
}

Request Body (recurring):
{
  "name": "nightly-cleanup",
  "type": "http",
  "schedule": "0 2 * * *",
  "payload": {
    "url": "https://api.example.com/cleanup",
    "method": "POST"
  }
}

Response:
{
  "jobId": "job-7f3a",
  "status": "SCHEDULED",
  "nextRunTime": "2026-03-01T09:00:00Z"
}

Status: 201 Created
```

The `schedule` field accepts either an ISO timestamp (one-time) or a cron expression (recurring). The API validates the format and computes `next_run_time`.

**Get job status and history**

```
GET /api/v1/jobs/job-7f3a/history

Response:
{
  "jobId": "job-7f3a",
  "name": "send-report",
  "status": "COMPLETED",
  "schedule": "0 2 * * *",
  "nextRunTime": "2026-03-02T02:00:00Z",
  "executions": [
    {
      "executionId": "exec-001",
      "startedAt": "2026-03-01T02:00:01Z",
      "completedAt": "2026-03-01T02:00:04Z",
      "status": "SUCCESS",
      "workerId": "worker-5"
    },
    {
      "executionId": "exec-002",
      "startedAt": "2026-02-28T02:00:01Z",
      "completedAt": "2026-02-28T02:00:03Z",
      "status": "SUCCESS",
      "workerId": "worker-2"
    }
  ]
}

Status: 200 OK
```

**Delete or pause a job**

```
DELETE /api/v1/jobs/job-7f3a
Status: 204 No Content

PATCH /api/v1/jobs/job-7f3a
{ "status": "PAUSED" }
Status: 200 OK
```

**Key fields:**

- `jobId`: Unique identifier for the job
- `schedule`: Cron expression or ISO timestamp
- `type`: How to execute (HTTP callback, message publish, etc.)
- `payload`: What to send when the job fires
- `retryPolicy`: How to handle failures
- `nextRunTime`: When the job will next execute (computed from schedule)

---

## High Level Design

Here's the overall architecture:

![Job Scheduler High-level Design](diagram:job-scheduler)

### Key Components

**1. Client**

- Submits job definitions (one-time or recurring) via the REST API
- Queries job status and execution history
- Manages job lifecycle (pause, resume, delete)

**2. API Gateway**

- Routes requests to the Scheduler Service
- Handles authentication and rate limiting
- Stateless entry point for all client traffic

**3. Scheduler Service (Leader)**

- The heart of the system. Elected via [leader election](/learn/leader-election) (etcd/ZooKeeper)
- Polls the Jobs Database every second for due jobs: `WHERE next_run_time <= NOW() AND status = 'SCHEDULED'`
- Pushes due jobs to the message queue for execution
- Updates `next_run_time` for recurring jobs after dispatch
- Only one instance polls at a time. Followers are on standby for failover

**4. Jobs Database**

- Stores all job definitions, schedules, and execution history
- Indexed on `next_run_time` for efficient polling
- Stores status transitions: SCHEDULED, QUEUED, RUNNING, COMPLETED, FAILED
- PostgreSQL works well for moderate scale. Cassandra for very high throughput

**5. Redis**

- Stores leader election lease (if using Redis-based election)
- Caches frequently accessed job metadata
- Can serve as a distributed lock for job claiming

**6. Kafka Queue**

- Decouples the scheduler from workers
- Provides at-least-once delivery guarantees
- Dead letter queue for jobs that fail after max retries
- Partitioned for parallel consumption by workers

**7. Worker Pool**

- Stateless workers that consume jobs from Kafka
- Execute job payloads (HTTP calls, scripts, etc.)
- Report execution results back to the Jobs Database
- Horizontally scalable: add more workers to handle more concurrent jobs

### Why This Architecture

**Why leader election for the scheduler?**

Without leader election, multiple scheduler instances would poll the database simultaneously and dispatch the same jobs multiple times. With leader election, exactly one scheduler polls at a time. If it crashes, a follower takes over within seconds. See [Leader Election](/learn/leader-election) for implementation details.

**Why a message queue between scheduler and workers?**

If the scheduler executed jobs directly, a slow or crashing job would block the polling loop. All other scheduled jobs would pile up. By pushing to [Kafka](/learn/message-queues), the scheduler stays fast (just polling and dispatching) while workers handle execution in parallel at their own pace.

**Why pre-compute next_run_time?**

Evaluating cron expressions against millions of rows every second is computationally expensive. Instead, compute `next_run_time` once (when the job is created or after each run) and index the column. The polling query becomes a simple indexed range scan. See [Cron Architecture](/learn/cron-architecture) for details.

---

## Detailed Design

### Database Schema

```
Table: jobs
  id              UUID PRIMARY KEY
  name            VARCHAR NOT NULL
  type            VARCHAR NOT NULL          -- 'http', 'message', 'script'
  schedule        VARCHAR NOT NULL          -- cron expression or ISO timestamp
  is_recurring    BOOLEAN NOT NULL
  payload         JSONB NOT NULL
  status          VARCHAR NOT NULL          -- SCHEDULED, PAUSED, QUEUED, COMPLETED
  next_run_time   TIMESTAMP WITH TIME ZONE
  retry_policy    JSONB
  created_at      TIMESTAMP NOT NULL
  updated_at      TIMESTAMP NOT NULL

Index: idx_jobs_next_run ON jobs(next_run_time) WHERE status = 'SCHEDULED'

Table: job_executions
  id              UUID PRIMARY KEY
  job_id          UUID REFERENCES jobs(id)
  execution_time  TIMESTAMP NOT NULL
  started_at      TIMESTAMP
  completed_at    TIMESTAMP
  status          VARCHAR NOT NULL          -- QUEUED, RUNNING, SUCCESS, FAILED
  worker_id       VARCHAR
  error           TEXT
  retry_count     INTEGER DEFAULT 0

Index: idx_executions_job ON job_executions(job_id, execution_time DESC)
```

The partial index `WHERE status = 'SCHEDULED'` is important. It means the database only indexes active jobs, not the millions of completed or paused ones. This keeps the polling query fast.

### Scheduler Polling Loop

```
Every 1 second (leader only):

1. Query due jobs:
   SELECT id, payload, schedule, is_recurring
   FROM jobs
   WHERE next_run_time <= NOW()
     AND status = 'SCHEDULED'
   ORDER BY next_run_time ASC
   LIMIT 1000

2. For each batch of due jobs:
   a. UPDATE jobs SET status = 'QUEUED' WHERE id IN (...)
   b. Publish each job to Kafka topic "job-executions"
   c. For recurring jobs: compute next_run_time from cron expression
      UPDATE jobs SET next_run_time = <next>, status = 'SCHEDULED' WHERE id = ...

3. If more jobs remain, loop immediately without waiting
```

**Why LIMIT 1000?** Processing jobs in batches prevents the scheduler from loading millions of rows into memory at once. If a batch exists, it immediately polls again without the 1-second sleep.

**Why update status to QUEUED before publishing?** This prevents re-pickup. If the scheduler crashes after publishing but before updating, the job may execute twice (at-least-once). If it crashes after updating but before publishing, the job would be stuck as QUEUED. A separate reconciliation process detects stuck QUEUED jobs and re-dispatches them.

### Worker Execution Flow

```
1. Worker pulls message from Kafka partition
2. Create execution record:
   INSERT INTO job_executions (job_id, status, started_at, worker_id)
   VALUES (?, 'RUNNING', NOW(), 'worker-5')
3. Execute the job payload:
   - HTTP type: make HTTP request to configured URL
   - Message type: publish to target queue/topic
   - Script type: run in sandboxed container
4. On success:
   UPDATE job_executions SET status = 'SUCCESS', completed_at = NOW()
   Commit Kafka offset
5. On failure:
   If retry_count < max_retries:
     Re-publish to Kafka with incremented retry count and backoff delay
   Else:
     UPDATE job_executions SET status = 'FAILED', error = '...'
     Publish to Dead Letter Queue for manual inspection
```

### Handling Missed Jobs on Recovery

When the scheduler leader fails over, there may be jobs whose `next_run_time` has passed during the failover window.

```
On leader acquisition:
1. Query all overdue jobs:
   SELECT * FROM jobs
   WHERE next_run_time < NOW() AND status = 'SCHEDULED'
2. Process them immediately (same as normal polling)
3. Resume normal polling loop
```

For recurring jobs that missed multiple runs (e.g., scheduler was down for hours), the system fires once and advances `next_run_time` to the next future occurrence. It does not fire multiple catch-up runs unless configured to do so.

### Scaling the Scheduler

At extreme scale (>1M jobs/minute due simultaneously), a single leader polling the database may become a bottleneck.

**Solution: time-based partitioning.**

```
Scheduler 0: polls jobs WHERE next_run_time BETWEEN :now AND :now + 1min AND id % 3 = 0
Scheduler 1: polls jobs WHERE next_run_time BETWEEN :now AND :now + 1min AND id % 3 = 1
Scheduler 2: polls jobs WHERE next_run_time BETWEEN :now AND :now + 1min AND id % 3 = 2
```

Each scheduler owns a partition of jobs. Partition assignment is managed by the leader (or by a system like Kafka consumer groups). This distributes the database load across multiple pollers.

For most systems, the single-leader pattern handles millions of jobs. Only partition when you've confirmed the single leader is the bottleneck.

---

## Common Interview Mistakes

### Mistake 1: Using a single cron server with no failover

"I'll set up a cron job on a server."

**Problem:** That server is a single point of failure. When it crashes, all scheduled jobs stop. No alerts, no recovery, just silence until someone notices.

**Better:** Run multiple scheduler instances with [leader election](/learn/leader-election). The active leader polls for due jobs. Followers are on standby. Failover happens automatically within seconds.

### Mistake 2: Having the scheduler execute jobs directly

"The scheduler picks up the job and runs it."

**Problem:** If a job takes 30 minutes or crashes, the scheduler's polling loop is blocked. All other scheduled jobs pile up and miss their execution times. One bad job takes down the entire system.

**Better:** The scheduler only dispatches jobs to a [message queue](/learn/message-queues). Separate stateless workers execute the actual job logic. This decoupling means a slow or crashing job only affects its own worker, not the scheduler.

### Mistake 3: Not addressing duplicate execution

"Multiple schedulers poll the database for due jobs."

**Problem:** Without coordination, all schedulers pick up the same due jobs and dispatch them. Every job runs N times. Users get duplicate emails, duplicate charges, duplicate everything.

**Better:** Use leader election so only one scheduler polls, or use database-level locking (`SELECT FOR UPDATE SKIP LOCKED`) to ensure each job is claimed by exactly one poller. See [Cron Architecture](/learn/cron-architecture) for detailed patterns.

### Mistake 4: Evaluating cron expressions on every poll

"Every second, I scan all jobs and check if their cron expression matches the current time."

**Problem:** Parsing cron expressions against millions of rows every second is computationally expensive. The database does a full table scan with complex string evaluation.

**Better:** Pre-compute `next_run_time` when the job is created and after each execution. The polling query becomes `WHERE next_run_time <= NOW()` with a simple indexed range scan. Orders of magnitude faster.

### Mistake 5: Ignoring the at-least-once vs exactly-once trade-off

"Each job runs exactly once."

**Problem:** Exactly-once execution is practically impossible in distributed systems. If the worker crashes after executing the job but before acknowledging it, the job will be redelivered and run again.

**Better:** Design for at-least-once delivery. The scheduler guarantees every job runs at least once. Job implementations must be idempotent (running the same job twice produces the same result). Use idempotency keys or database constraints to prevent duplicate side effects.

---

**Interview golden rule:**

Don't just say "a scheduler runs the jobs." Explain the three-part architecture: a coordinator (with leader election) detects due jobs, a message queue decouples scheduling from execution, and stateless workers process jobs with retry logic. Then discuss what happens when each component fails.
