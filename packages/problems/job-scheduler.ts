import { buildLinks } from "./article-links";

export const JOB_SCHEDULER_PROBLEM = {
  slug: "job-scheduler",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Distributed Job Scheduler",
    description:
      "Design a distributed job scheduler capable of executing millions of scheduled tasks (one-time or recurring) with high reliability and precision.",
    difficulty: "hard" as const,
    timeToComplete: "60 min",
    topic: "System Design",
    links: buildLinks([
      "leader-election",
      "cron-architecture",
      "message-queues",
      "system-design-structure",
    ]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define the core capabilities of the Job Scheduler",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "schedule-job",
            label: "Schedule Jobs (One-time & Recurring)",
            description:
              "Users can submit jobs to run once at a specific time or on a recurring schedule (Cron).",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Support scheduling of ad-hoc tasks and recurring cron-style jobs.",
              },
            ],
            hints: [
              {
                id: "hint-cron-syntax",
                title: "Job Types",
                text: "We need to handle both 'Run at 5 PM' and 'Run every day at 5 PM'.",
                href: "/learn/cron-architecture#what-is-a-distributed-cron",
              },
            ],
            evaluationCriteria:
              "User distinguishes between one-time (delayed) jobs and recurring (periodic) jobs.",
            feedbackOnMissing:
              "Is this just a delay queue, or can I set a recurring schedule like a cron job?",
          },
          {
            id: "job-execution",
            label: "Job Execution & Isolation",
            description:
              "Execute the job code (HTTP call, script) reliably without affecting the scheduler's stability.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Scheduler triggers execution but delegates actual work to isolated workers (containers/functions).",
              },
            ],
            hints: [
              {
                id: "hint-isolation",
                title: "Safety First",
                text: "If a user's script crashes or runs for 1 hour, it shouldn't kill the scheduler. Run it elsewhere.",
                href: "/learn/cron-architecture#architecture-patterns",
              },
            ],
            evaluationCriteria:
              "User mentions decoupling the 'Scheduler' (trigger) from the 'Executor' (worker).",
            feedbackOnMissing:
              "If the job is 'Delete Database' and it hangs, does the scheduler stop working?",
          },
          {
            id: "job-status",
            label: "Status Tracking",
            description:
              "Users can query the status of a job (Scheduled, Running, Completed, Failed).",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Track lifecycle states in a database. Allow users to query current status and history.",
              },
            ],
            hints: [
              {
                id: "hint-monitoring",
                title: "Observability",
                text: "Users need to know if their cron job actually ran last night.",
                href: "/learn/system-design-structure#non-functional-requirements",
              },
            ],
            evaluationCriteria:
              "User includes a mechanism to store and retrieve job execution history.",
            feedbackOnMissing: "How do I know if my payment processing job succeeded or failed?",
          },
        ],
      },
    },
    {
      stepType: "nonFunctional" as const,
      order: 1,
      title: "Non-Functional Requirements",
      description: "Define system quality attributes and constraints",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "reliability-guarantee",
            label: "At-Least-Once Delivery",
            description:
              "Jobs must never be missed. It is better to run a job twice (idempotency required) than never.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Guarantee execution even if nodes fail. Retry on failure. Users must handle idempotency.",
              },
            ],
            hints: [
              {
                id: "hint-guarantees",
                title: "Delivery Semantics",
                text: "Exact-once is impossible in distributed systems. We target At-least-once.",
                href: "/learn/message-queues#key-concepts-you-need-to-know",
              },
            ],
            evaluationCriteria:
              "User specifies At-Least-Once delivery and retries for failed jobs.",
            feedbackOnMissing:
              "If the worker crashes mid-job, do we just forget about it? We need retries.",
          },
          {
            id: "scalability-throughput",
            label: "High Throughput & Precision",
            description:
              "Handle millions of jobs with reasonably low latency (execution within seconds of scheduled time).",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Partition jobs by time buckets or hash. Use a hierarchical timing wheel or priority queue.",
              },
            ],
            hints: [
              {
                id: "hint-partitioning",
                title: "Handling Scale",
                text: "We can't scan 1 billion rows every second to see what to run. We need efficient indexing/bucketing.",
                href: "/learn/cron-architecture#architecture-patterns",
              },
            ],
            evaluationCriteria:
              "User discusses partitioning strategies (Sharding) to distribute the polling load.",
            feedbackOnMissing:
              "How does the database handle querying 'SELECT * FROM jobs WHERE time = now()' when there are billion rows?",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for job management",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "submit-job",
            scope: "endpoint",
            label: "Submit Job",
            description: "Endpoint to register a new job.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/jobs",
            solutions: [
              {
                text: "POST /jobs. Body: { schedule: 'cron_expression', type: 'http', payload: {} }.",
              },
            ],
            hints: [
              {
                id: "hint-cron-payload",
                title: "Job Definition",
                text: "We need the schedule (when) and the payload (what).",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria:
              "User defines a POST endpoint accepting a Cron expression or timestamp.",
            feedbackOnMissing: "How do I tell the system to run my script every Monday?",
          },
          {
            id: "get-job-status",
            scope: "endpoint",
            label: "Get Job Status",
            description: "Endpoint to check execution history.",
            weight: 10,
            required: true,
            method: "GET",
            correctPath: "/api/v1/jobs/{id}/history",
            solutions: [
              {
                text: "GET /jobs/{id}/history. Returns list of execution results (success/fail).",
              },
            ],
            hints: [
              {
                id: "hint-history",
                title: "Audit Trail",
                text: "Developers need logs. Provide an endpoint to see past runs.",
                href: "/learn/system-design-structure#api-design",
              },
            ],
            evaluationCriteria: "User defines a GET endpoint for job history.",
            feedbackOnMissing: "I need to debug my job. Where are the logs?",
          },
        ],
      },
    },
    {
      stepType: "highLevelDesign" as const,
      order: 3,
      title: "High-Level Design",
      description: "Design the architecture components and data flow",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            nodes: [
              { id: "Client", type: "Client" },
              { id: "API-Svc", type: "Service", label: "Scheduler API" },
              {
                id: "DB-Jobs",
                type: "Database",
                label: "Job DB (SQL/Cassandra)",
              },
              {
                id: "Coordinator",
                type: "Service",
                label: "Coordinator/Leader",
              },
              { id: "Message-Queue", type: "Queue", label: "Kafka/SQS" },
              { id: "Workers", type: "Service", label: "Worker Pool" },
            ],
            edges: [
              {
                id: "Client-API",
                from: "Client",
                to: "API-Svc",
                description: "Client submits job definitions (Cron/One-time).",
                weight: 5,
                hints: [
                  {
                    id: "hint-crud",
                    title: "CRUD Layer",
                    text: "Simple stateless API to validate and store the job request.",
                    href: "/learn/microservices#stateless-services-and-horizontal-scaling",
                  },
                ],
              },
              {
                id: "API-DB",
                from: "API-Svc",
                to: "DB-Jobs",
                description: "Store job metadata and schedule. Index by 'NextRunTime'.",
                weight: 5,
                hints: [
                  {
                    id: "hint-indexing",
                    title: "Query Efficiency",
                    text: "We need to quickly find jobs due 'now'. Indexing by time is crucial.",
                    href: "/learn/cron-architecture#cron-expression-parsing",
                  },
                ],
              },
              {
                id: "Coordinator-DB",
                from: "Coordinator",
                to: "DB-Jobs",
                description:
                  "Coordinator polls DB for jobs where NextRunTime <= Now. Uses Leader Election to avoid duplicates.",
                weight: 10,
                hints: [
                  {
                    id: "hint-leader-election",
                    title: "Single Poller",
                    text: "If multiple servers poll the DB, they might pick up the same job. Use Leader Election (ZooKeeper/Etcd) so only one node polls.",
                    href: "/learn/leader-election#what-is-leader-election",
                  },
                ],
              },
              {
                id: "Coordinator-Queue",
                from: "Coordinator",
                to: "Message-Queue",
                description: "Push 'Due' jobs to a Message Queue for asynchronous execution.",
                weight: 5,
                hints: [
                  {
                    id: "hint-async-exec",
                    title: "Decoupling",
                    text: "The Scheduler shouldn't run the job. It just queues it up.",
                    href: "/learn/message-queues#the-core-concept-decouple-producers-from-consumers",
                  },
                ],
              },
              {
                id: "Queue-Workers",
                from: "Message-Queue",
                to: "Workers",
                description:
                  "Workers claim jobs and execute them. On success, update DB status. On fail, retry (DLQ).",
                weight: 5,
                hints: [
                  {
                    id: "hint-worker-logic",
                    title: "Execution Logic",
                    text: "Workers are dumb. They just take a task, run it, and report back.",
                    href: "/learn/message-queues#the-core-concept-decouple-producers-from-consumers",
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};
