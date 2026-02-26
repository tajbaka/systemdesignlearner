import { buildLinks } from "./article-links";

export const YOUTUBE_PROBLEM = {
  slug: "design-youtube",
  category: "backend" as const,
  version: {
    versionNumber: 1,
    title: "Design YouTube",
    description:
      "Design a video sharing platform capable of ingesting massive video uploads, processing them into various formats, and delivering adaptive bitrate streaming globally with minimal buffering.",
    difficulty: "hard" as const,
    timeToComplete: "60 min",
    topic: "System Design",
    links: buildLinks(["cdn", "video-streaming", "async-processing", "system-design-structure"]),
    isCurrent: true,
  },
  steps: [
    {
      stepType: "functional" as const,
      order: 0,
      title: "Functional Requirements",
      description: "Define the core capabilities of the Video Platform",
      required: true,
      data: {
        scoreWeight: 30,
        requirements: [
          {
            id: "upload-video",
            label: "Upload & Process Video",
            description:
              "Users can upload videos. The system must transcode them into multiple resolutions and formats for different devices.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Upload raw video via Presigned URLs, then trigger a transcoding pipeline to generate 360p, 720p, 1080p, and 4K chunks.",
              },
            ],
            hints: [
              {
                id: "hint-transcoding",
                title: "Device Compatibility",
                text: "A 4K video uploaded from an iPhone needs to play on a 10-year-old Android phone. We must transcode the video into different formats and resolutions.",
                href: "/learn/video-streaming",
              },
            ],
            evaluationCriteria:
              "User mentions the need to transcode/process the raw uploaded video into various formats and resolutions.",
            feedbackOnMissing:
              "We can't just serve the raw 10GB file the user uploaded. How do we make it playable for users with slow internet?",
          },
          {
            id: "stream-video",
            label: "Stream Video (Playback)",
            description:
              "Users can watch videos smoothly, adjusting to their network speed in real-time.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Serve video chunks using Adaptive Bitrate Streaming protocols like HLS or MPEG-DASH.",
              },
            ],
            hints: [
              {
                id: "hint-streaming-protocol",
                title: "Streaming Protocols",
                text: "We don't send the whole MP4 file at once. We break it into 2-10 second chunks. What protocols do this? (HLS/DASH).",
                href: "/learn/video-streaming",
              },
            ],
            evaluationCriteria:
              "User specifies chunk-based streaming (HLS/DASH) to allow dynamic quality adjustments.",
            feedbackOnMissing:
              "If a user's Wi-Fi drops to 3G speeds while watching, how does the video keep playing without buffering? We need Adaptive Bitrate Streaming.",
          },
          {
            id: "view-stats",
            label: "View Counts & Metadata",
            description:
              "Display video titles, descriptions, likes, and rapidly updating view counts.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Store metadata in a fast DB. Batch view count updates asynchronously to handle viral scale.",
              },
            ],
            hints: [
              {
                id: "hint-view-counts",
                title: "Viral Videos",
                text: "If a video gets 1 million views in an hour, updating a SQL row 1M times will lock the database. How do we aggregate these?",
                href: "/learn/database-caching",
              },
            ],
            evaluationCriteria:
              "User identifies the challenge of high-frequency writes for view counts and suggests batching or eventual consistency.",
            feedbackOnMissing:
              "Updating the view count in the database for every single viewer will crash the system on viral videos. How do we optimize this?",
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
            id: "low-latency-playback",
            label: "Low Latency Playback (No Buffering)",
            description:
              "Videos must start playing instantly and rarely buffer, regardless of the user's geographic location.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Heavily cache video chunks at the edge using Content Delivery Networks (CDNs).",
              },
            ],
            hints: [
              {
                id: "hint-cdn",
                title: "Geographic Distance",
                text: "If the video is in a server in Virginia, a user in Tokyo will experience buffering. Where should the video be stored?",
                href: "/learn/cdn",
              },
            ],
            evaluationCriteria:
              "User explicitly features a CDN architecture to serve video content close to the user.",
            feedbackOnMissing:
              "To make videos start instantly globally, we cannot serve them from a central database. We must use a CDN.",
          },
          {
            id: "high-throughput",
            label: "High Throughput (Storage & Uploads)",
            description:
              "The system must handle massive amounts of incoming video data and store petabytes/exabytes of content securely.",
            weight: 10,
            required: true,
            solutions: [
              {
                text: "Use highly scalable Object Storage (e.g., S3) for both raw uploads and transcoded chunks.",
              },
            ],
            hints: [
              {
                id: "hint-object-storage",
                title: "Storing Petabytes",
                text: "Video files are massive. We don't store them in SQL or normal file systems. We use cloud Object Storage.",
                href: "/learn/storage-types",
              },
            ],
            evaluationCriteria:
              "User selects Object Storage (S3/GCS) as the primary storage mechanism for video files.",
            feedbackOnMissing:
              "Where do we actually put the video files? Relational databases are terrible for this. Think AWS S3.",
          },
        ],
      },
    },
    {
      stepType: "api" as const,
      order: 2,
      title: "API Design",
      description: "Design the API Interface for uploading and watching",
      required: true,
      data: {
        scoreWeight: 20,
        requirements: [
          {
            id: "upload-video-api",
            scope: "endpoint",
            label: "Init Video Upload",
            description:
              "Endpoint to start an upload, returning a secure URL to push the raw video bytes to.",
            weight: 10,
            required: true,
            method: "POST",
            correctPath: "/api/v1/videos/upload",
            solutions: [
              {
                text: "POST /videos/upload. Body: { title, format, size }. Returns: { videoId, presignedUrl }.",
              },
            ],
            hints: [
              {
                id: "hint-presigned-url",
                title: "Bypass App Servers",
                text: "Don't send a 5GB video through your Node.js API. Get a temporary token to upload directly to S3.",
                href: "/learn/presigned-urls",
              },
            ],
            evaluationCriteria:
              "User designs an endpoint that issues a Presigned URL for direct-to-storage uploads.",
            feedbackOnMissing:
              "Proxying large video uploads through our API servers will consume all our bandwidth. How do clients upload directly to storage?",
          },
          {
            id: "get-video-manifest",
            scope: "endpoint",
            label: "Get Video Manifest",
            description:
              "Endpoint to retrieve the HLS/DASH manifest file required to start streaming the video.",
            weight: 10,
            required: true,
            method: "GET",
            correctPath: "/api/v1/videos/{id}/manifest",
            solutions: [
              {
                text: "GET /videos/{id}/manifest. Returns the URL to the .m3u8 (HLS) or .mpd (DASH) file on the CDN.",
              },
            ],
            hints: [
              {
                id: "hint-manifest",
                title: "The Playlist",
                text: "The video player needs a 'playlist' that tells it where all the 1080p, 720p, and 480p chunks are located.",
                href: "/learn/video-streaming",
              },
            ],
            evaluationCriteria:
              "User defines an endpoint to fetch the streaming manifest/playlist file.",
            feedbackOnMissing:
              "How does the video player know what resolutions are available and where to download the chunks?",
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
              { id: "API-Gateway", type: "APIGateway" },
              { id: "Metadata-DB", type: "Database", label: "Metadata SQL/NoSQL" },
              { id: "Raw-Storage", type: "Database", label: "Raw Object Store" },
              {
                id: "Transcoding-DAG",
                type: "Service",
                label: "Worker Queue / DAG",
              },
              {
                id: "Processed-Storage",
                type: "Database",
                label: "Transcoded Store",
              },
              { id: "CDN", type: "Cache", label: "Content Delivery Network" },
            ],
            edges: [
              {
                id: "Client-RawStorage",
                from: "Client",
                to: "Raw-Storage",
                description:
                  "Client uploads raw video directly to Object Storage using a Presigned URL.",
                weight: 5,
                hints: [
                  {
                    id: "hint-direct-s3",
                    title: "Direct Upload",
                    text: "Save API bandwidth by having the client push data directly to the raw storage bucket.",
                    href: "/learn/presigned-urls",
                  },
                ],
              },
              {
                id: "RawStorage-Transcoder",
                from: "Raw-Storage",
                to: "Transcoding-DAG",
                description:
                  "Upload triggers an event. Transcoding DAG orchestrates parallel workers to extract audio, generate thumbnails, and encode chunks (1080p, 720p, etc).",
                weight: 10,
                hints: [
                  {
                    id: "hint-dag",
                    title: "Parallel Processing",
                    text: "Processing a 2-hour video takes too long linearly. Use a Directed Acyclic Graph (DAG) to split the video and process chunks in parallel.",
                    href: "/learn/async-processing",
                  },
                ],
              },
              {
                id: "Transcoder-ProcessedStorage",
                from: "Transcoding-DAG",
                to: "Processed-Storage",
                description:
                  "Workers save transcoded HLS/DASH chunks (.ts/.m4s) and manifests to the Processed Object Storage.",
                weight: 5,
                hints: [
                  {
                    id: "hint-save-chunks",
                    title: "Saving Formats",
                    text: "The final output is hundreds of small video chunks and a manifest file, stored back in S3.",
                    href: "/learn/storage-types",
                  },
                ],
              },
              {
                id: "ProcessedStorage-CDN",
                from: "Processed-Storage",
                to: "CDN",
                description:
                  "CDN pulls transcoded chunks and manifests from the Processed Storage to cache them at edge locations.",
                weight: 5,
                hints: [
                  {
                    id: "hint-cdn-pull",
                    title: "Edge Caching",
                    text: "The CDN acts as a global cache in front of your Object Storage to serve videos fast.",
                    href: "/learn/cdn",
                  },
                ],
              },
              {
                id: "Client-CDN",
                from: "Client",
                to: "CDN",
                description:
                  "Client video player downloads the manifest and streams chunks directly from the nearest CDN node.",
                weight: 5,
                hints: [
                  {
                    id: "hint-stream-client",
                    title: "Streaming",
                    text: "The user's device requests chunks sequentially from the CDN based on network conditions.",
                    href: "/learn/video-streaming",
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
