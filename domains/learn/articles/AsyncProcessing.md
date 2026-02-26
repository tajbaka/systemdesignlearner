## Introduction

You're designing a video platform like YouTube, and you tell the interviewer: "The user uploads a video, and we transcode it into multiple resolutions before returning a success response."

The interviewer raises an eyebrow. "A 2-hour 4K video is about 20 GB. Transcoding it to 360p, 720p, 1080p, and 4K takes roughly 30-60 minutes on a decent machine. You're making the user wait an hour for a 200 OK?"

Of course not. You'd queue the work and process it asynchronously. But here's where most candidates stop. They say "I'll add a [message queue](/learn/message-queues)" and move on. The problem is that video processing isn't a single task. It's a pipeline. You need to extract metadata, generate thumbnails, transcode into four resolutions in parallel, build an HLS manifest, update the database, and notify the user. Some of these steps depend on others. Some can run at the same time. Some need to retry independently.

A single queue doesn't model this well. What you actually need is a way to express task dependencies, run independent steps in parallel, handle failures at each step, and track the overall progress of the pipeline. That's where DAGs and async orchestration come in.

---

## Beyond Simple Queues

A [message queue](/learn/message-queues) is perfect when you have independent, isolated tasks. Send an email. Resize an image. Fire a webhook. Each message is self-contained, and the order doesn't matter much. Workers pick up messages, process them, and acknowledge them. Simple.

But what happens when tasks have dependencies?

Consider video processing after a user uploads a file:

```
1. Validate the uploaded file (is it a valid video format?)
2. Extract metadata (duration, resolution, codec)
3. Generate thumbnails (depends on step 2 for duration info)
4. Transcode to 360p  (depends on step 1 validation)
5. Transcode to 720p  (depends on step 1 validation)
6. Transcode to 1080p (depends on step 1 validation)
7. Transcode to 4K    (depends on step 1 validation)
8. Build HLS manifest (depends on steps 4-7 ALL completing)
9. Update database    (depends on steps 3 and 8)
10. Notify user        (depends on step 9)
```

Steps 4-7 can run in parallel, but step 8 can't start until all four are done. Step 3 depends on step 2 but is independent from steps 4-7. Step 9 needs both the thumbnails and the manifest ready before it writes to the database.

If you try to model this with a single queue, you end up with one of two bad patterns:

**Sequential execution:** Process every step one after another. Steps 4-7 run serially instead of in parallel. What could take 15 minutes takes 60 minutes. You're leaving compute on the table.

**Chaotic queue soup:** Each step publishes a message to the next step's queue. You end up with 8 different queues, no central view of where a given video is in the pipeline, and no clean way to say "wait for all four transcodes to finish, then continue." Error handling becomes a nightmare. If step 5 fails, who knows about it? How do you retry just that step?

What you need is a way to declare the entire pipeline as a graph of tasks with explicit dependencies. That's a DAG.

---

## What Is a DAG?

A **Directed Acyclic Graph** (DAG) is a graph where:

- **Directed:** Edges have a direction. Task A leads to Task B, not the other way around.
- **Acyclic:** There are no cycles. You can't have A depends on B depends on C depends on A. That would be an infinite loop.
- **Graph:** It's not a simple linear chain. Tasks can branch out (fan-out) and converge (fan-in).

In the context of async processing, nodes are tasks and edges are dependencies.

![Video Processing DAG](diagram:async-dag)

This is a DAG. It has fan-out (one validation step leads to multiple transcodes), fan-in (all transcodes must complete before the manifest step), and independent branches (thumbnails and transcoding happen in parallel).

The key properties that make DAGs useful for pipeline orchestration:

- **Parallelism is explicit.** Any two tasks without a dependency between them can run concurrently. The DAG structure tells the scheduler exactly what can be parallelized.
- **Dependencies are explicit.** You don't need to guess which tasks must complete before another starts. It's declared in the graph.
- **Progress is trackable.** You can look at the DAG and see exactly which tasks are done, which are running, and which are waiting.

---

## DAG Orchestration

Defining a DAG is the easy part. The hard part is executing it reliably at scale. That's what DAG orchestrators do.

### How a DAG Runner Works

At its core, a DAG runner does the following loop:

```
1. Look at all tasks in the DAG
2. Find tasks where all upstream dependencies are COMPLETED
3. Schedule those tasks for execution (on workers, containers, etc.)
4. Wait for results
5. Mark tasks as COMPLETED or FAILED
6. Go to step 1
7. Stop when all tasks are COMPLETED or a critical task FAILED
```

This is a topological sort execution. The scheduler processes the DAG in dependency order, launching tasks as soon as their prerequisites are met.

### Task States

Every task in a DAG goes through a state machine:

```
PENDING --> QUEUED --> RUNNING --> COMPLETED
                         |
                         +--> FAILED --> RETRYING --> RUNNING
                                            |
                                            +--> DEAD (max retries exceeded)
```

- **PENDING:** Waiting for upstream dependencies to complete.
- **QUEUED:** All dependencies met, waiting for a worker.
- **RUNNING:** Actively executing on a worker.
- **COMPLETED:** Finished successfully.
- **FAILED:** Execution failed. Will be retried if retries remain.
- **RETRYING:** Scheduled for another attempt (with backoff).
- **DEAD:** Failed permanently after exhausting all retries.

### Popular DAG Orchestrators

**Apache Airflow** is the most widely known. You define DAGs in Python. It has a web UI for monitoring, supports scheduling (cron-based), and has operators for interacting with AWS, GCP, databases, etc. It's great for batch ETL pipelines. Its weakness is that it wasn't designed for low-latency, event-triggered workflows.

**Temporal** (and its predecessor Cadence from Uber) is built for durable execution. Your workflow code looks like normal functions, but Temporal persists state at every step. If a worker crashes mid-execution, another worker picks up exactly where it left off. It's excellent for long-running, event-driven workflows.

**AWS Step Functions** is the serverless option. You define state machines in JSON (Amazon States Language). It integrates natively with Lambda, SQS, SNS, ECS, and other AWS services. Great for AWS-native architectures where you don't want to manage orchestrator infrastructure.

### Retries and Error Handling

Each task in a DAG should have its own retry policy:

```
Task: Transcode to 720p
  Max retries: 3
  Backoff: exponential (1s, 4s, 16s)
  Timeout: 30 minutes
  On failure: mark as DEAD, alert, don't block other resolutions

Task: Notify User
  Max retries: 5
  Backoff: exponential (2s, 8s, 32s, 128s, 512s)
  Timeout: 30 seconds
  On failure: log and move on (non-critical)
```

The power of per-task retry is that a transient failure in one branch doesn't kill the whole pipeline. If the 720p transcode fails but 360p, 1080p, and 4K succeed, you can retry just the 720p task. The manifest step waits. Once 720p eventually succeeds, the pipeline continues from where it paused.

### Observability

In production, you need to answer questions like:

- "Video upload abc-123 has been processing for 45 minutes. Where is it stuck?"
- "How many videos are currently in the transcode stage?"
- "What's the p95 processing time for the thumbnail generation step?"

DAG orchestrators give you this visibility because every task transition is logged. You get a trace of the entire pipeline execution: what ran, when it started, how long it took, whether it retried, and what the final status was. This is dramatically better than trying to correlate logs across 8 independent queues.

---

## Parallel Task Execution

This is the killer advantage of DAG-based processing over linear queues. Tasks that don't depend on each other run at the same time.

### The Video Transcoding Example

Let's walk through the numbers to see why parallelism matters.

**Sequential processing (single queue):**

```
Validate        [====]                                    2 min
Extract Meta    [====]                                    2 min
Thumbnails           [======]                             3 min
Transcode 360p            [===========]                  10 min
Transcode 720p                        [===============]  15 min
Transcode 1080p                                         [=================]  20 min
Transcode 4K                                                                [========================]  30 min
Build Manifest                                                                                         [==]  1 min
Update DB                                                                                                   [=]  0.5 min
Notify User                                                                                                     [=]  0.5 min

Total: ~84 minutes
```

**DAG-based parallel processing:**

```
Time:     0    2    4    7         17        22         32   33  34
          |    |    |    |         |         |          |    |   |
Validate  [====]
Extract        [====]
Thumbnails          [======]
Transcode 360p [===========]
Transcode 720p [===============]
Transcode 1080p[===================]
Transcode 4K   [==============================]
Build Manifest                                         [==]
Update DB                                                   [=]
Notify                                                       [=]

Total: ~34 minutes
```

Same work, less than half the time. The four transcode tasks run in parallel because they have no dependencies on each other. The thumbnails run in parallel with the transcodes. The only sequential bottleneck is the fan-in point where we wait for all transcodes to finish.

### Fan-Out and Fan-In

These are the two fundamental patterns in parallel DAGs:

**Fan-out:** One task spawns multiple parallel tasks.

```
         +----------+
         | Validate |
         +----+-----+
              |
    +---------+---------+---------+
    |         |         |         |
 [360p]   [720p]   [1080p]    [4K]

"After validation, start all four transcodes simultaneously"
```

**Fan-in:** Multiple parallel tasks must all complete before the next task starts.

```
 [360p]   [720p]   [1080p]    [4K]
    |         |         |         |
    +---------+---------+---------+
              |
       +------+------+
       | Build       |
       | Manifest    |
       +-------------+

"Wait for ALL transcodes to finish, then build the manifest"
```

Fan-in is where things get interesting from an implementation perspective. The orchestrator needs to maintain a counter or state for the convergence point. Each time an upstream task completes, the orchestrator checks: "Have all upstream tasks for this fan-in point completed?" If yes, it schedules the downstream task. If no, it waits.

### Dynamic Parallelism

In many real scenarios, you don't know the degree of parallelism ahead of time. Maybe the user's subscription determines which resolutions they get. A free user gets 360p and 720p. A premium user gets all four resolutions plus HDR.

Good DAG orchestrators support dynamic fan-out, where the number of parallel tasks is determined at runtime:

```
resolutions = get_resolutions_for_user(user_id)
# Could be [360p, 720p] or [360p, 720p, 1080p, 4K, 4K_HDR]

for resolution in resolutions:
    dag.add_task(transcode, args=[video_id, resolution])

dag.add_fan_in(build_manifest, depends_on=all_transcode_tasks)
```

Temporal and Step Functions handle dynamic fan-out natively. Airflow supports it through dynamic task mapping (introduced in Airflow 2.3).

---

## Event-Driven Pipelines

So far, we've talked about orchestrated pipelines where a central scheduler manages the DAG. There's another approach: event-driven (choreography), where each step reacts to events from the previous step with no central coordinator.

### How It Works

In an event-driven pipeline, each component publishes an event when it finishes. Other components listen for those events and trigger their own processing.

```
User uploads video to S3
  |
  +--> S3 emits "ObjectCreated" event
         |
         +--> EventBridge rule matches the event
                |
                +--> Triggers Lambda: validate-video
                       |
                       +--> Publishes "VideoValidated" to SNS
                              |
                              +--> SQS queue for transcode-360p worker
                              +--> SQS queue for transcode-720p worker
                              +--> SQS queue for transcode-1080p worker
                              +--> SQS queue for transcode-4k worker
                              +--> SQS queue for metadata-extraction worker
```

In this model, there's no DAG runner. Each service knows what events it cares about and acts independently. The "DAG" is implicit in the event routing.

### Cloud-Native Event Flow

Here's a typical AWS event-driven pipeline for video processing:

![Event-Driven Pipeline](diagram:async-event-pipeline)

### The Fan-In Problem in Event-Driven Systems

Fan-out is easy in event-driven architectures. Publish an event, and multiple subscribers pick it up. But fan-in is hard. How does the "build manifest" step know that all four transcodes are done?

Common solutions:

**Completion counter in DynamoDB/Redis:** Each transcode worker increments a counter when it finishes. The last one to increment checks "counter == expected" and triggers the next step. This works but has race conditions you need to handle with atomic operations (DynamoDB conditional writes or Redis INCR).

```
Transcode 360p completes:
  INCR completion_count for video-123  -> returns 1 (not 4, wait)

Transcode 720p completes:
  INCR completion_count for video-123  -> returns 2 (not 4, wait)

Transcode 1080p completes:
  INCR completion_count for video-123  -> returns 3 (not 4, wait)

Transcode 4K completes:
  INCR completion_count for video-123  -> returns 4 (== 4, trigger next step!)
```

**Step Functions with Parallel state:** AWS Step Functions has a built-in `Parallel` state type that handles fan-in natively. It waits for all branches to complete, then proceeds. This is essentially a managed orchestrator.

**Callback pattern:** Each transcode worker sends a "task completed" callback to the orchestrator, which tracks completion and triggers the next step.

### Orchestration vs Choreography

This is a distinction interviewers love.

**Orchestration** (central coordinator): One service controls the pipeline. It decides what runs when, tracks state, handles retries. Think Airflow, Temporal, Step Functions.

**Choreography** (event-driven): No central coordinator. Each service listens for events and acts independently. Think SNS/SQS, EventBridge, Kafka consumers.

```
Orchestration:                     Choreography:

  +-------------+                  Service A --> Event --> Service B
  | Orchestrator|                                   |
  +------+------+                              Event --> Service C
         |                                          |
   +-----+-----+-----+                        Event --> Service D
   |     |     |     |
   v     v     v     v
  [A]   [B]   [C]   [D]           No central controller.
                                   Services react to events.
  Central controller
  knows the full plan.
```

**When to use orchestration:**

- Complex dependencies (fan-in, conditional branching)
- You need visibility into the full pipeline state
- Long-running workflows (hours or days)
- Retries and error handling need to be coordinated

**When to use choreography:**

- Simple, linear event chains
- Services are truly independent
- Low coupling between teams is critical
- Each step is owned by a different team

In practice, most large systems use a mix. The video processing pipeline might use Step Functions (orchestration) for the core transcode workflow, while the "notify user" step publishes an event that's consumed by a separate notification service (choreography).

---

## DAGs vs Simple Queues

When should you reach for a DAG orchestrator instead of a simple [message queue](/learn/message-queues)?

| Aspect                | Simple Queue (SQS, RabbitMQ)    | DAG Orchestrator (Airflow, Temporal)     |
| --------------------- | ------------------------------- | ---------------------------------------- |
| **Task dependencies** | None (tasks are independent)    | Explicit (edges define dependencies)     |
| **Parallelism**       | Worker-level only               | Task-level (fan-out/fan-in)              |
| **State tracking**    | Per-message (in-flight or done) | Per-pipeline (all task states visible)   |
| **Error handling**    | Retry per message, DLQ          | Retry per task, conditional branching    |
| **Observability**     | Queue depth, consumer lag       | Full DAG visualization, per-task metrics |
| **Fan-in support**    | Not built-in                    | Native                                   |
| **Complexity**        | Low                             | Moderate to high                         |
| **Latency overhead**  | Very low (ms)                   | Low to moderate (scheduler loop)         |
| **Best for**          | Independent async tasks         | Multi-step dependent workflows           |

### Decision Framework

**Use a simple queue when:**

- Tasks are independent. Sending emails, processing webhooks, resizing images where each message is self-contained.
- You don't need to coordinate between tasks. Each message is a standalone unit of work.
- Low latency matters more than pipeline visibility. The overhead of a DAG scheduler is unnecessary.
- Your team already has queue infrastructure and the problem doesn't need orchestration.

**Use a DAG orchestrator when:**

- Tasks have dependencies. Step B can't start until Step A completes.
- You need fan-out and fan-in. Multiple parallel tasks must converge before the next step.
- Pipeline visibility matters. You need to see where a specific job is stuck.
- Workflows are long-running. Hours or days, with potential for failures at any step.
- You need conditional branching. "If transcoding fails, try a different codec. If that fails, mark as unsupported."

**The rule of thumb:** If you can describe your async work as "process each message independently," use a queue. If you need to describe it as "first do A, then do B and C in parallel, then do D after both finish," use a DAG.

---

## Real-World Examples

### Video Transcoding (YouTube, Netflix, Twitch)

This is the canonical example. A [video streaming](/learn/video-streaming) platform needs to process every uploaded video through a complex pipeline:

```
Upload --> Validate --> Extract Metadata
                            |
                 +----------+----------+
                 |                     |
           Generate              Transcode (parallel)
           Thumbnails            360p | 720p | 1080p | 4K
                 |                     |
                 +----------+----------+
                            |
                     Build Manifest (HLS/DASH)
                            |
                     Update CDN + Database
                            |
                     Notify Creator
```

Netflix uses their own orchestrator called Conductor (now open-sourced). YouTube uses a custom pipeline built on Borg (their cluster manager). Smaller companies typically use Temporal or Step Functions.

### ML Training Pipelines

Machine learning workflows are inherently DAG-shaped:

```
Fetch Raw Data --> Clean/Transform --> Feature Engineering
                                            |
                                  +---------+---------+
                                  |         |         |
                              Train      Train     Train
                              Model A    Model B   Model C
                                  |         |         |
                                  +---------+---------+
                                            |
                                     Evaluate All Models
                                            |
                                     Deploy Best Model
                                            |
                                     Run A/B Test
```

Data cleaning, feature engineering, and model training have strict dependencies. Multiple models can train in parallel. Evaluation can only happen after all models finish. Airflow and Kubeflow Pipelines are the standard tools here.

### ETL Pipelines (Data Warehousing)

Extract-Transform-Load pipelines are the original DAG use case:

```
Extract from       Extract from       Extract from
PostgreSQL         S3 Logs            Third-party API
     |                  |                  |
     +--------+---------+--+---------------+
              |             |
         Transform     Transform
         (clean,       (aggregate,
          dedupe)       join)
              |             |
              +------+------+
                     |
                Load into
                Data Warehouse
                     |
              +------+------+
              |             |
         Update         Update
         Dashboards     ML Features
```

Multiple data sources are extracted in parallel. Transformations depend on their specific sources. Loading depends on all transformations completing. Airflow was literally built for this use case.

### Order Fulfillment (E-commerce)

When a customer places an order:

```
Order Placed --> Validate Payment --> Reserve Inventory
                                          |
                              +-----------+-----------+
                              |                       |
                        Generate                 Send to
                        Shipping Label           Warehouse
                              |                       |
                              +-----------+-----------+
                                          |
                                   Update Order Status
                                          |
                                +---------+---------+
                                |                   |
                           Send Email          Send Push
                           Confirmation        Notification
```

Payment validation must happen before inventory reservation. Shipping labels and warehouse notifications can happen in parallel. The customer notification depends on both being complete. Temporal is popular for this because the workflow might pause for days (waiting for the package to ship) and needs durable state.

---

## Common Interview Mistakes

### Mistake 1: Using a single queue for dependent tasks

> "I'll put all the video processing steps into one queue and process them in order."

**Problem:** You lose parallelism entirely. Four transcode tasks that could run simultaneously now run one after another. Your pipeline is 3-4x slower than it needs to be. You also have no clean way to express "wait for all transcodes before building the manifest."

**Better:** Model the pipeline as a DAG. Identify which tasks are independent and can run in parallel. Use a DAG orchestrator or event-driven architecture with fan-out to execute independent tasks concurrently. Mention specific tools: "I'd use Temporal to orchestrate this workflow" or "I'd use Step Functions with a Parallel state for the transcode step."

### Mistake 2: Ignoring failure handling in multi-step pipelines

> "Each step processes and passes to the next step."

**Problem:** What happens when step 5 of 10 fails? Does the whole pipeline restart from scratch? Are steps 1-4 wasted? If a transcode takes 30 minutes and fails at minute 29, do you lose all that work?

**Better:** Each task should have its own retry policy with exponential backoff. Failed tasks should be retried independently without restarting the entire pipeline. Permanently failed tasks go to a dead state with alerts. The orchestrator should support resuming from the point of failure, not from the beginning. Mention that Temporal provides exactly this: durable execution where if a worker crashes, another worker resumes from the last completed step.

### Mistake 3: Not mentioning parallelism as a benefit

> "The user uploads a video, and we process it through a series of steps."

**Problem:** "A series of steps" implies sequential execution. The interviewer wants to hear that you understand which steps can run concurrently. Parallel execution is often the difference between a 90-minute pipeline and a 30-minute pipeline. That's the difference between a good and bad user experience.

**Better:** Explicitly call out the parallelism: "The four transcode tasks are independent of each other, so they run in parallel. The pipeline's total time is bounded by the slowest transcode (4K at ~30 minutes), not the sum of all transcodes (~75 minutes). This is the main advantage of modeling the pipeline as a DAG rather than a linear queue."

### Mistake 4: Treating orchestration and choreography as either-or

> "We'll use Step Functions for everything" or "Everything is event-driven."

**Problem:** Pure orchestration creates a central bottleneck and tight coupling. Pure choreography makes it impossible to track pipeline state or handle complex fan-in patterns. Neither approach works for all scenarios.

**Better:** Use orchestration for the core pipeline where dependencies matter (the video processing DAG), and choreography for the edges where services should be loosely coupled (notifying downstream services that a video is ready). Explain why: "The transcoding pipeline has complex dependencies and needs state tracking, so I'd orchestrate it with Step Functions. But once the video is ready, I'd publish an event to SNS so the recommendation service, analytics service, and notification service can react independently."

---

## Summary: What to Remember

- **DAG = Directed Acyclic Graph.** Nodes are tasks, edges are dependencies. No cycles allowed.
- A single [message queue](/learn/message-queues) works for independent tasks. Use a DAG when tasks have dependencies and need coordination.
- **Fan-out** (one task spawns many) and **fan-in** (many tasks must complete before one continues) are the core patterns.
- **Parallel execution** is the key advantage. Independent tasks in a DAG run simultaneously, reducing total pipeline time dramatically.
- DAG orchestrators (Airflow, Temporal, Step Functions) handle scheduling, state tracking, retries, and observability.
- **Per-task retry** prevents one failure from killing the entire pipeline. Failed tasks retry independently.
- **Orchestration** (central coordinator) is best for complex dependent workflows. **Choreography** (event-driven) is best for loosely coupled services. Most systems use both.
- Fan-in in event-driven systems requires explicit coordination: atomic counters, callback patterns, or managed parallel states.
- **Real-world DAGs:** video transcoding, ML training, ETL pipelines, order fulfillment, CI/CD pipelines.

**Key numbers:**

- Sequential video processing: ~84 minutes
- DAG-parallel video processing: ~34 minutes (same work, 60% less time)
- Typical DAG orchestrator overhead: 50-200ms per task scheduling decision

**Interview golden rule:**

```
Don't just say "I'll add a queue." If the workflow has
dependencies between steps, model it as a DAG. Identify
which tasks can run in parallel, explain fan-out and fan-in
points, and discuss how individual task failures are handled
without restarting the entire pipeline.
```
