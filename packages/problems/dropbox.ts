import { buildLinks } from "./article-links";

export const DROPBOX_PROBLEM = {
  slug: "design-dropbox",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Design Dropbox (Google Drive)",
    description:
      "Design a cloud file hosting service that allows users to securely store, synchronize, and share files across multiple devices.",
    difficulty: "hard" as const,
    timeToComplete: "60 min",
    topic: "System Design",
    links: buildLinks(["storage-types", "delta-sync", "presigned-urls", "system-design-structure"]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define the core capabilities of the File Sync Service",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "upload-download",
            label: "Upload & Download Files",
            description: "Users can upload and download files of varying sizes securely.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Support file upload/download. Use Presigned URLs to offload heavy data transfers from the app servers directly to Object Storage (S3).",
              },
            ],
            hints: [
              {
                id: "hint-presigned",
                title: "Bypassing the Server",
                text: "If a user uploads a 5GB video, it shouldn't pass through our Node/Python backend. How do clients upload directly to AWS S3 securely?",
                href: "/learn/presigned-urls",
              },
            ],
            evaluationCriteria:
              "User mentions uploading files and ideally identifies the bottleneck of proxying large files through an app server.",
            feedbackOnMissing:
              "How do files actually get into the cloud? Standard HTTP POST to our API will crash our servers on big files.",
          },
          {
            id: "delta-sync",
            label: "Delta Sync (Block-Level)",
            description:
              "When a user modifies a file, only upload the parts (blocks/chunks) that changed, not the entire file.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Client splits files into smaller chunks (e.g., 4MB). Only modified chunks are uploaded. Uses hashes to detect changes.",
              },
            ],
            hints: [
              {
                id: "hint-chunking",
                title: "Bandwidth Optimization",
                text: "If I change 1 sentence in a 1GB text file, I shouldn't upload 1GB again. How do we break the file down?",
                href: "/learn/delta-sync",
              },
            ],
            evaluationCriteria:
              "User specifies a chunking/block-syncing mechanism to optimize bandwidth.",
            feedbackOnMissing:
              "Uploading whole files on every small edit wastes user data and our storage. How do we sync just the changes?",
          },
          {
            id: "cross-device-sync",
            label: "Cross-Device Synchronization",
            description:
              "Changes made on one device should automatically sync to the user's other online devices.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Use long-polling or WebSockets to notify other devices of metadata changes so they can download the new chunks.",
              },
            ],
            hints: [
              {
                id: "hint-notification",
                title: "Live Updates",
                text: "If I edit a file on my laptop, how does my phone know to download the new version?",
                href: "/learn/websockets-realtime",
              },
            ],
            evaluationCriteria:
              "User details a mechanism for pushing update notifications to clients.",
            feedbackOnMissing: "How do other devices figure out that a file was changed?",
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
            id: "durability",
            label: "Extreme Durability",
            description: "Files must never be lost. Target 99.999999999% (11 9s) durability.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Store chunks in highly durable Object Storage (e.g., AWS S3) with cross-region replication.",
              },
            ],
            hints: [
              {
                id: "hint-s3",
                title: "Storage Choice",
                text: "We don't build our own hard drives. We rely on cloud providers. Which service gives us 11 9s of durability?",
                href: "/learn/database-caching",
              },
            ],
            evaluationCriteria:
              "User emphasizes Durability over Availability and chooses a robust object store.",
            feedbackOnMissing:
              "If the server crashes, we can reboot. If we lose a user's wedding photos, they are gone forever. How do we prevent data loss?",
          },
          {
            id: "acid-metadata",
            label: "ACID Metadata Consistency",
            description:
              "File metadata (name, version, chunks mapping) must be strongly consistent.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Use a Relational Database (SQL) for metadata to ensure ACID properties during file updates and conflict resolution.",
              },
            ],
            hints: [
              {
                id: "hint-acid-db",
                title: "Metadata Storage",
                text: "If two devices update the same file at the exact same time, we need strict transaction control. SQL databases are great for this.",
                href: "/learn/database-caching",
              },
            ],
            evaluationCriteria:
              "User specifies a strong consistency model (typically SQL) for managing file metadata.",
            feedbackOnMissing:
              "If we use an eventually consistent DB for metadata, a user might see old file versions. We need strong consistency.",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for syncing",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "get-presigned-url",
            scope: "endpoint",
            label: "Get Upload URL",
            description:
              "Endpoint to request a temporary URL to upload a file chunk directly to storage.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/files/upload-url",
            solutions: [
              {
                text: "POST /upload-url. Body: { fileId, chunkHash, size }. Returns: S3 Presigned URL.",
              },
            ],
            hints: [
              {
                id: "hint-chunk-hash",
                title: "Deduplication",
                text: "Send the hash of the chunk first. If the server already has this chunk (from another user), it can say 'Skip upload'.",
                href: "/learn/system-design-structure",
              },
            ],
            evaluationCriteria:
              "User defines an endpoint that returns a direct-to-storage upload URL.",
            feedbackOnMissing:
              "How does the client know WHERE to upload the raw file bytes securely?",
          },
          {
            id: "commit-metadata",
            scope: "endpoint",
            label: "Commit Metadata",
            description:
              "Once chunks are uploaded, update the metadata database to form the complete file.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/files/{id}/commit",
            solutions: [
              {
                text: "POST /commit. Body: { fileId, version, chunks: ['hash1', 'hash2'] }. Links chunks to the file version.",
              },
            ],
            hints: [
              {
                id: "hint-commit",
                title: "Assembling the Chunks",
                text: "Storage just has a bunch of random blocks. The server needs a list telling it 'File A = Block 1 + Block 2'.",
                href: "/learn/delta-sync",
              },
            ],
            evaluationCriteria:
              "User defines an endpoint to finalize the upload and update the file's chunk map.",
            feedbackOnMissing:
              "The chunks are in S3, but how does the database know which chunks make up the file?",
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
              { id: "Client", type: "Client", label: "Client (Watcher/Chunker)" },
              { id: "API-Svc", type: "Service", label: "Metadata API Svc" },
              { id: "Block-Store", type: "Database", label: "Object Storage (S3)" },
              { id: "Meta-DB", type: "Database", label: "Metadata DB (SQL)" },
              { id: "Message-Queue", type: "Queue", label: "Kafka/RabbitMQ" },
              { id: "Sync-Svc", type: "Service", label: "Notification/Sync Svc" },
            ],
            edges: [
              {
                id: "Client-BlockStore",
                from: "Client",
                to: "Block-Store",
                description:
                  "Client uploads/downloads encrypted chunks directly to/from S3 using Presigned URLs.",
                weight: 10,
                hints: [
                  {
                    id: "hint-direct-upload",
                    title: "Bypass the API",
                    text: "The heaviest traffic is the actual file data. Route this directly to S3.",
                    href: "/learn/presigned-urls",
                  },
                ],
              },
              {
                id: "Client-API",
                from: "Client",
                to: "API-Svc",
                description:
                  "Client talks to API for metadata operations (get URLs, commit changes, deduplication checks).",
                weight: 5,
                hints: [
                  {
                    id: "hint-metadata-traffic",
                    title: "Lightweight Traffic",
                    text: "The API server only handles lightweight JSON requests (hashes, filenames).",
                    href: "/learn/microservices",
                  },
                ],
              },
              {
                id: "API-DB",
                from: "API-Svc",
                to: "Meta-DB",
                description:
                  "Stores user info, file hierarchy, permissions, and File-to-Chunk mapping.",
                weight: 5,
                hints: [
                  {
                    id: "hint-relational",
                    title: "Relational Structure",
                    text: "Files have parents (folders), owners, and versions. SQL is perfect for this hierarchy.",
                    href: "/learn/database-caching",
                  },
                ],
              },
              {
                id: "API-Queue",
                from: "API-Svc",
                to: "Message-Queue",
                description:
                  "When a file is committed, publish a 'FileUpdated' event to the queue.",
                weight: 5,
                hints: [
                  {
                    id: "hint-event-driven",
                    title: "Async Notification",
                    text: "We need to tell other devices about the change. Put the event on a queue.",
                    href: "/learn/message-queues",
                  },
                ],
              },
              {
                id: "Queue-Sync",
                from: "Message-Queue",
                to: "Sync-Svc",
                description:
                  "Sync Service consumes events and pushes notifications to connected devices via WebSockets/Long Polling.",
                weight: 5,
                hints: [
                  {
                    id: "hint-sync-push",
                    title: "Push to Devices",
                    text: "The Sync Service maintains open connections to clients to instantly push update signals.",
                    href: "/learn/websockets-realtime",
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
