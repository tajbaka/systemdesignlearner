## Introduction

The interviewer says: "Design YouTube."

You think, "Just upload videos and stream them back." Then they follow up: "How do you transcode a 4K video into six different resolutions without blocking the user for 30 minutes? How do you serve video to 100 million concurrent viewers across 190 countries? What happens when a video goes viral and gets 10 million views in an hour?"

And now you realize this isn't about storing files. It's about [presigned URLs](/learn/presigned-urls) for direct-to-storage uploads, [asynchronous processing DAGs](/learn/async-processing) for parallel transcoding, [adaptive bitrate streaming](/learn/video-streaming) so viewers get the best quality their connection can handle, and [CDN edge caching](/learn/cdn) to serve video chunks from servers milliseconds away from every user. YouTube is a pipeline problem: raw video goes in, dozens of optimized formats come out, and a global delivery network gets them to viewers instantly.

Here's how to design a video sharing platform that handles massive uploads, transcodes into multiple formats, and delivers adaptive bitrate streaming globally.

---

## Functional Requirements

**1. Upload & Process Video**

- Users upload raw video files (potentially multi-gigabyte) directly to [object storage](/learn/storage-types) via [presigned URLs](/learn/presigned-urls), bypassing the application server entirely
- Upload completion triggers an asynchronous transcoding pipeline that processes the raw video into multiple resolutions: 360p, 720p, 1080p, and 4K
- The pipeline is a [DAG (Directed Acyclic Graph)](/learn/async-processing) -- split the video into segments, encode each resolution in parallel, generate HLS/DASH manifests, and write the output to processed storage
- Users see an "uploading" then "processing" status. The video becomes available for playback only after transcoding completes
- Metadata (title, description, tags, thumbnail) is stored in the database alongside the video ID

**2. Stream Video (Playback)**

- Video playback uses [Adaptive Bitrate Streaming](/learn/video-streaming) via HLS (HTTP Live Streaming) or DASH (Dynamic Adaptive Streaming over HTTP)
- The client requests a manifest file that lists all available quality levels and their chunk URLs
- The video player automatically switches between quality levels based on the viewer's current bandwidth -- buffering on a slow connection triggers a downshift to 360p, while a fast connection gets 4K
- Video chunks are served from [CDN](/learn/cdn) edge locations, not from origin servers -- this is critical for low latency playback worldwide
- Chunks are small (2-10 second segments), so the player can adapt quality on a per-chunk basis

**3. View Counts & Metadata**

- Every video has metadata: title, description, upload date, like count, and view count
- View counts are high-frequency writes -- a viral video can get thousands of views per second
- Updating a SQL counter on every single view would create a write bottleneck and row-level lock contention
- Instead, view events are batched asynchronously: collect view events in a [message queue](/learn/message-queues), aggregate them in a background worker, and flush the count to the database periodically (e.g., every 5-10 seconds)
- View counts are eventually consistent -- the displayed count may lag real views by a few seconds, which is perfectly acceptable

That's the core. A video platform answers: "How does a raw upload become a streamable video?", "How does the player adapt to network conditions?", and "How do you handle millions of concurrent writes for view counts?"

Notice how this follows the [system design structure](/learn/system-design-structure): start with the most important user-facing requirements before diving into technical details. The interviewer wants to see that you can scope the problem before designing the solution.

---

## Non-Functional Requirements

**Low Latency Playback**

- Video chunks must be served from [CDN edge locations](/learn/cdn) close to the viewer -- a user in Tokyo should hit a Tokyo edge server, not an origin in Virginia
- First-chunk latency (time to start playing) should be under 200ms for CDN-cached content
- Pull-based CDN: when a chunk is requested for the first time at an edge location, the CDN pulls it from origin, caches it, and serves all subsequent requests locally
- Popular videos are automatically cached at every edge location; long-tail videos may require an origin fetch on first request

**High Throughput (Storage & Uploads)**

- Raw video uploads go directly to [object storage](/learn/storage-types) (S3) via [presigned URLs](/learn/presigned-urls) -- the application server never touches the video bytes
- Object storage handles unlimited concurrent uploads without application-level scaling
- A single popular video transcoded into 4 resolutions with 10-second chunks can produce thousands of chunk files -- object storage handles this natively
- Transcoded chunks are stored in a separate bucket optimized for CDN pull access with appropriate cache headers
- Storage math: a 10-minute video at 1080p is roughly 500 MB raw. Transcoded into 4 resolutions, the total stored size is approximately 1.5 GB (lower resolutions are smaller). At 500 hours of video uploaded per minute (YouTube's actual rate), that's roughly 4.5 TB of new processed storage per hour

**Availability and Fault Tolerance**

- Playback must be highly available -- users expect videos to load 99.99% of the time
- The CDN provides natural redundancy: if one edge location fails, requests route to the next nearest edge
- The transcoding pipeline is built on a durable [message queue](/learn/message-queues), so in-progress jobs survive worker failures and are automatically retried
- Metadata reads are served from a [caching layer](/learn/database-caching) (Redis) in front of the database, so database downtime doesn't immediately break the read path

---

## API Design

**Initiate video upload**

```
POST /api/v1/videos/upload

Request Body:
{
  "title": "My Vacation Video",
  "description": "Summer trip highlights",
  "tags": ["travel", "vacation"],
  "contentType": "video/mp4",
  "fileSizeBytes": 2147483648
}

Response:
{
  "videoId": "vid-8a3f2b",
  "uploadUrl": "https://raw-storage.s3.amazonaws.com/vid-8a3f2b?X-Amz-Signature=...",
  "expiresIn": 3600,
  "status": "awaiting_upload"
}

Status: 201 Created
```

The client receives a [presigned URL](/learn/presigned-urls) pointing directly to object storage. The client uploads the raw video file via HTTP PUT to this URL -- the video bytes never pass through the application server. For large files (> 100 MB), the client uses multipart upload: split the file into parts, upload each part in parallel to separate presigned URLs, then send a completion request.

**Get video manifest for streaming**

```
GET /api/v1/videos/{videoId}/manifest

Response:
{
  "videoId": "vid-8a3f2b",
  "status": "ready",
  "title": "My Vacation Video",
  "manifestUrl": "https://cdn.example.com/vid-8a3f2b/master.m3u8",
  "thumbnailUrl": "https://cdn.example.com/vid-8a3f2b/thumb.jpg",
  "duration": 645,
  "availableQualities": ["360p", "720p", "1080p", "4K"]
}

Status: 200 OK
```

**Key fields:**

- `videoId`: Unique identifier for the video
- `uploadUrl`: Presigned URL for direct-to-storage upload (expires after `expiresIn` seconds)
- `manifestUrl`: URL to the HLS/DASH master manifest, served from the CDN
- `contentType`: MIME type of the raw upload (used to validate format support)
- `fileSizeBytes`: Declared file size for upload validation and storage quota checks
- `availableQualities`: Resolutions the video was transcoded into
- `status`: One of `awaiting_upload`, `processing`, `ready`, `failed`

---

## High Level Design

Here's the overall architecture:

![YouTube High-level Design](diagram:youtube)

### Key Components

**1. API Gateway**

- Handles authentication, rate limiting, and request routing
- For uploads: generates a [presigned URL](/learn/presigned-urls) pointing to the raw object store and returns it to the client -- the API server never receives the video bytes
- For playback: returns the CDN-hosted manifest URL so the client streams directly from edge servers
- For metadata: serves video title, description, view count, and like count from the [database cache](/learn/database-caching)

**2. Raw Object Store (S3)**

- Receives raw video uploads directly from clients via presigned URLs
- Stores the original, unprocessed video file in its full resolution
- Configured with an event notification (S3 Event or similar) that fires when an upload completes, triggering the transcoding pipeline
- Raw files are retained for re-processing if needed (e.g., adding a new resolution tier later)
- See [storage types](/learn/storage-types) for why object storage is the right choice for large binary files

**3. Worker Queue / Transcoding DAG**

- An [asynchronous processing pipeline](/learn/async-processing) implemented as a DAG (Directed Acyclic Graph)
- Stages: split raw video into segments, encode each segment at each resolution in parallel, generate HLS/DASH manifests, extract thumbnails, and write all outputs to processed storage
- Work is distributed via a [message queue](/learn/message-queues) (SQS, Kafka, or a workflow engine like Temporal)
- Each step is idempotent -- if a worker crashes mid-encode, the step is retried from the beginning of that segment
- Horizontal scaling: add more encoding workers during peak upload hours, scale down during off-peak

**4. Processed Object Store**

- Stores the output of the transcoding pipeline: video chunks (2-10 second segments) at each resolution, HLS/DASH manifest files, and thumbnails
- Organized by video ID: `/vid-8a3f2b/360p/chunk_001.ts`, `/vid-8a3f2b/1080p/chunk_042.ts`, `/vid-8a3f2b/master.m3u8`
- This is the origin for the CDN -- the CDN pulls chunks from this store on cache miss
- Cache-Control headers are set for long TTLs since transcoded chunks are immutable

**5. CDN (Content Delivery Network)**

- A global network of [edge servers](/learn/cdn) that cache and serve video chunks close to viewers
- Pull-based model: when a viewer requests a chunk that isn't cached at their nearest edge, the CDN pulls it from the processed object store, caches it, and serves it
- Popular videos end up cached at every edge location worldwide; long-tail videos may only be cached at a few edges
- This is the single most important component for playback performance -- without a CDN, every viewer would fetch chunks from a single origin region

**6. Metadata Database**

- Stores video metadata: title, description, upload date, uploader ID, status, duration, available qualities
- Also stores aggregated view counts, like counts, and comment counts
- A relational database ([PostgreSQL](/learn/database-caching)) works well here -- video metadata is structured and benefits from strong consistency for writes
- Read-heavy access patterns are handled with a caching layer (Redis) in front of the database

### Why This Architecture

**Why presigned URLs instead of proxying uploads through the API server?** A 2 GB video upload through your API server would consume a server thread for minutes, exhaust memory, and create a bandwidth bottleneck. [Presigned URLs](/learn/presigned-urls) let the client upload directly to object storage at full speed. Your API server only generates a signed URL (milliseconds of work) and never touches the video bytes.

**Why a DAG instead of a single transcoding job?** A single job that sequentially encodes 360p, then 720p, then 1080p, then 4K takes 4x longer than necessary. A [DAG](/learn/async-processing) splits the work: first segment the video, then encode all resolutions in parallel. Each segment at each resolution is an independent task -- a 10-minute video with 4 resolutions produces 240+ parallel encoding tasks. This turns a 2-hour sequential job into a 30-minute parallel one.

**Why a CDN for video chunks?** A single origin server in one region serving video to global viewers means 200ms+ latency per chunk request for distant users. With 300+ chunks in a typical video, that latency compounds into constant buffering. A [CDN](/learn/cdn) serves chunks from edge locations 10-30ms away from most viewers. For a platform like YouTube where 80% of views are on the top 20% of videos, CDN cache hit rates are extremely high.

**Why batch view counts instead of updating in real-time?** A viral video with 10,000 views per second means 10,000 SQL UPDATE statements per second on a single row -- guaranteed lock contention and database degradation. Batching view events through a [message queue](/learn/message-queues) and flushing aggregated counts every few seconds reduces 10,000 writes to 1 write, with only a few seconds of eventual consistency.

**Why separate raw and processed storage buckets?** Raw uploads are write-once, read-rarely (only read by the transcoding pipeline). Processed chunks are write-once, read-millions (served to every viewer via the CDN). Different access patterns justify different storage configurations. The raw bucket has no CDN integration and uses cheaper storage tiers (e.g., S3 Infrequent Access after 30 days). The processed bucket has CDN-optimized access, public read permissions, and long cache headers.

---

## Detailed Design

### Transcoding Pipeline (DAG Architecture)

The transcoding pipeline is the most complex component. It transforms a single raw video into dozens of streamable outputs using a multi-stage [DAG](/learn/async-processing):

```
                    ┌──────────────┐
                    │  Raw Video   │
                    │  (S3 Event)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Splitter   │
                    │ (segment into│
                    │  10s chunks) │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐ ┌────▼──────┐ ┌─────▼─────┐
     │ Encode 360p │ │Encode 720p│ │Encode 1080p│ ...4K
     │ (parallel)  │ │(parallel) │ │ (parallel) │
     └──────┬──────┘ └────┬──────┘ └─────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼───────┐
                    │  Manifest    │
                    │  Generator   │
                    │ (HLS/DASH)   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Processed   │
                    │  Store (S3)  │
                    └──────────────┘
```

**Stage 1: Segmentation.** The raw video is split into 10-second segments. This enables parallel encoding -- each segment can be encoded independently at each resolution. The splitter also extracts audio tracks separately, since audio encoding is independent of video resolution and only needs to be done once (not per resolution).

**Stage 2: Parallel Encoding.** Each segment is encoded at every target resolution (360p, 720p, 1080p, 4K) in parallel. A 10-minute video with 10-second segments and 4 resolutions produces 60 segments x 4 resolutions = 240 independent encoding tasks. These tasks are pushed to a [message queue](/learn/message-queues) and processed by a pool of encoding workers.

Each encoding task is idempotent: encoding segment 42 at 720p always produces the same output, so retries are safe. If a worker crashes after encoding 50% of a segment, another worker picks up the entire task and starts over -- the output is written atomically, so no partial results are visible.

Encoding workers are the most resource-intensive component (CPU/GPU bound). In production, these are often GPU-accelerated instances. Scaling strategy: maintain a base pool of encoding workers and auto-scale during peak upload hours (e.g., evenings and weekends when creators publish content).

**Stage 3: Manifest Generation.** Once all segments at all resolutions are encoded, a manifest generator creates the HLS/DASH manifest files. The master manifest lists all available quality levels with their bandwidth requirements. Each quality level has its own variant playlist listing the chunk URLs in sequential order. The manifest also includes audio-only tracks for accessibility and bandwidth-constrained playback.

**Stage 4: Thumbnail Extraction.** In parallel with encoding, a thumbnail extractor samples frames from the video at regular intervals (e.g., every 30 seconds) and generates candidate thumbnails. The creator can select one or upload a custom thumbnail. A default thumbnail is selected automatically using a simple heuristic (highest contrast frame near the 25% mark of the video).

**Stage 5: Storage & Status Update.** All encoded chunks, manifest files, and thumbnails are written to the processed object store with immutable cache headers. The video status in the metadata database is updated from "processing" to "ready," and a notification is sent to the creator.

The entire pipeline typically completes in 1-3x the video's duration, depending on the available encoding worker capacity. For a 10-minute video, expect 10-30 minutes of processing time.

**Failure handling in the DAG:** Each stage tracks task completion in a coordination service (e.g., a database or workflow engine like Temporal). If encoding fails for segment 42 at 1080p, only that specific task is retried -- the other 239 tasks are unaffected. If the entire pipeline fails (e.g., corrupt input file), the video status is set to "failed" and the creator is notified to re-upload. The raw file is preserved for manual inspection.

**Codec selection:** Modern video platforms encode with multiple codecs: H.264 (universal browser support), H.265/HEVC (50% better compression, partial browser support), and AV1 (best compression, growing support). The trade-off is encoding cost vs bandwidth savings. H.264 is fast to encode but uses more bandwidth. AV1 takes 10-20x longer to encode but saves 30-50% bandwidth over H.264 -- for popular videos viewed millions of times, the encoding cost is easily justified by CDN bandwidth savings.

A practical strategy: encode all videos in H.264 immediately (fast, universal playback). For videos that exceed a view threshold (e.g., 10,000 views in the first 24 hours), retroactively encode in AV1 as well. The AV1 version is served to clients that support it, reducing bandwidth costs for the highest-traffic content. This avoids wasting expensive AV1 encoding on videos that nobody watches.

### Adaptive Bitrate Streaming

When a viewer clicks play, the player doesn't download a single video file. It uses [Adaptive Bitrate Streaming](/learn/video-streaming) to dynamically select the best quality for current network conditions.

**How it works:**

```
1. Player requests the master manifest:
   GET https://cdn.example.com/vid-8a3f2b/master.m3u8

2. Master manifest lists available quality levels:
   #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
   360p/playlist.m3u8
   #EXT-X-STREAM-INF:BANDWIDTH=2400000,RESOLUTION=1280x720
   720p/playlist.m3u8
   #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
   1080p/playlist.m3u8
   #EXT-X-STREAM-INF:BANDWIDTH=14000000,RESOLUTION=3840x2160
   4k/playlist.m3u8

3. Player estimates current bandwidth (e.g., 3 Mbps)
   → Selects 720p (requires 2.4 Mbps, fits within 3 Mbps)

4. Player fetches the 720p playlist:
   GET https://cdn.example.com/vid-8a3f2b/720p/playlist.m3u8

5. Playlist lists sequential chunks:
   #EXTINF:10.0,
   chunk_001.ts
   #EXTINF:10.0,
   chunk_002.ts
   ...

6. Player downloads chunks sequentially, measuring download speed.
   If bandwidth drops to 1 Mbps mid-video:
   → Switches to 360p for the next chunk
   If bandwidth improves to 6 Mbps:
   → Switches up to 1080p
```

**Why this matters for the interview:** The key insight is that the video is not a single file -- it's hundreds of small chunks, each available at multiple quality levels. The player independently chooses the quality for each chunk. This is why transcoding into multiple resolutions and segmenting into chunks is essential. Without this, you'd stream a single file and the viewer would either wait for buffering (if quality is too high) or watch a permanently low-quality stream (if quality is too low).

All chunk requests go to the [CDN](/learn/cdn). The CDN caches chunks at edge locations, so popular videos are served entirely from the edge with zero origin traffic.

**HLS vs DASH:** HLS (Apple) uses `.m3u8` playlists and `.ts` segments. DASH (industry standard) uses `.mpd` manifests and `.m4s` segments. In practice, most platforms generate both formats. HLS has better iOS/Safari support; DASH has better browser support via Media Source Extensions. The transcoding pipeline generates both manifest types from the same encoded chunks (the chunks themselves are codec-compatible across both protocols).

**Seeking and random access:** When a viewer seeks to a specific timestamp (e.g., jumps to 5:32 in a 10-minute video), the player calculates which chunk contains that timestamp (chunk 33, if chunks are 10 seconds), requests that chunk, and begins playback from the nearest keyframe. This is another reason chunks are small -- a 10-second chunk means the player at most downloads 10 seconds of unwanted video when seeking. Larger chunks (60 seconds) would waste bandwidth on seeks.

### View Count Aggregation

View counts are deceptively tricky at scale. A naive approach of `UPDATE videos SET views = views + 1` on every view request creates massive problems for popular videos.

**The problem:**

```
Viral video: 50,000 views per second

Naive approach:
  50,000 SQL UPDATE statements per second on a single row
  → Row-level lock contention
  → Database CPU spikes
  → Other queries slow down
  → Eventually the database becomes unresponsive
```

**The solution: batched aggregation**

```
┌────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│ Client │────→│ View Event   │────→│ Aggregator│────→│ Metadata │
│ (view) │     │ Queue (Kafka)│     │ Worker    │     │    DB    │
└────────┘     └──────────────┘     └──────────┘     └──────────┘

1. Client sends view event → API writes to message queue (fast, non-blocking)
2. Aggregator worker consumes events in micro-batches (every 5-10 seconds)
3. Worker groups events by video ID and counts them:
   vid-8a3f2b: 47,231 views in this batch
   vid-c4d9e1: 892 views in this batch
4. Worker issues ONE update per video:
   UPDATE videos SET views = views + 47231 WHERE id = 'vid-8a3f2b'
5. 50,000 writes/sec becomes 1 write every 5 seconds
```

**Trade-off:** View counts are eventually consistent. The displayed count may lag real views by 5-10 seconds. For a platform like YouTube, this is perfectly acceptable -- users don't notice if the view count says "1.2M" instead of "1,200,047." The important thing is that the count is monotonically increasing and durably stored.

For extremely viral videos, you can add a Redis counter as a fast-path cache: increment in Redis on every view (Redis handles 100K+ increments per second on a single key), and periodically flush the Redis counter to the database.

**Deduplication:** Not every page load should count as a view. Basic deduplication: if the same user ID (or IP + user-agent for anonymous users) sends multiple view events for the same video within a short window (e.g., 30 seconds), count it as one view. This deduplication happens in the aggregator worker, not at the API layer, to keep the write path fast.

**Read path for view counts:** When displaying view counts, read from a Redis cache (updated by the aggregator worker), not from the database. This keeps read latency at sub-millisecond levels even during viral spikes. The Redis value and the database value may differ by a few seconds -- that's fine.

**Like counts follow the same pattern:** Likes are less frequent than views, but for viral content the same batching approach applies. The difference is that likes require deduplication (a user can only like once), so the aggregator must check for duplicate user-video pairs. Unlike view counts, like state is per-user: the API must answer "did this user like this video?" quickly. A Redis set keyed by video ID and checked with SISMEMBER provides O(1) per-user like status lookups.

### Upload Flow

The upload flow uses [presigned URLs](/learn/presigned-urls) so the client uploads directly to object storage, completely bypassing the application server.

**Standard upload (small files < 100 MB):**

```
┌────────┐     ┌───────────┐     ┌─────────────┐
│ Client │────→│ API Server│     │ Raw Object  │
│        │     │           │     │ Store (S3)  │
└────┬───┘     └─────┬─────┘     └──────┬──────┘
     │               │                  │
     │  POST /upload  │                  │
     │──────────────→│                  │
     │               │  Generate        │
     │               │  presigned URL   │
     │  {uploadUrl}  │                  │
     │←──────────────│                  │
     │               │                  │
     │  PUT video bytes directly        │
     │─────────────────────────────────→│
     │               │                  │
     │               │    S3 Event      │
     │               │    (upload done) │
     │               │←─────────────────│
     │               │                  │
     │               │  Trigger         │
     │               │  transcoding DAG │
```

**Multipart upload (large files > 100 MB):**

For a 2 GB video, uploading as a single HTTP PUT is fragile -- any network interruption requires restarting from scratch. Multipart upload solves this:

1. Client requests an upload session from the API server
2. API server returns N presigned URLs (one per 100 MB part) plus an upload session ID
3. Client uploads each part in parallel to its presigned URL
4. Client sends a completion request to the API server with the list of part ETags
5. API server tells S3 to assemble the parts into a single object
6. S3 Event triggers the transcoding pipeline

Benefits: parallel upload of parts (faster), resume on failure (only re-upload the failed part), and progress tracking (each completed part is a progress milestone).

**Upload validation:** Before generating a presigned URL, the API server validates the request: is the content type a supported video format? Does the declared file size exceed the maximum (e.g., 128 GB)? Does the user have remaining storage quota? After upload completes, the system verifies the actual file size matches the declared size and runs a lightweight format validation (checking the file header) before triggering the transcoding pipeline. Corrupt or unsupported files are rejected early, before expensive transcoding work begins.

**Why not just use a regular file upload?** HTTP file uploads (multipart form data to your server) have a hard limit on most load balancers and reverse proxies (e.g., nginx defaults to 1 MB request body). You could increase this, but then your API server must buffer the entire file. With [presigned URLs](/learn/presigned-urls), S3 handles the upload -- it's designed to receive multi-gigabyte files efficiently with built-in checksums, retry logic, and parallel multipart support. Your API server stays lightweight and responsive.

**Upload progress and status:** The client can poll `GET /api/v1/videos/{videoId}` to check the video status. The status progresses through: `awaiting_upload` (presigned URL generated), `uploaded` (S3 event received), `processing` (transcoding in progress), `ready` (playback available), or `failed` (transcoding error). For a better UX, the status can include the pipeline progress (e.g., "encoding: 75% complete") by tracking completed DAG tasks against total tasks.

**Resumable uploads:** For very large files on unreliable connections (e.g., mobile uploads over cellular), multipart upload is essential. If the connection drops after uploading 15 of 20 parts, the client only needs to retry parts 16-20. The API server tracks which parts have been received (via S3's ListParts API) and tells the client which parts are still needed. This makes uploads resilient to network interruptions without restarting from scratch.

### CDN Architecture

The [CDN](/learn/cdn) is the most critical component for playback performance. Without it, every viewer worldwide would fetch video chunks from a single origin region.

**Pull-based CDN model:**

```
Viewer in Tokyo requests chunk_042.ts at 1080p:

1. Request hits Tokyo edge server
2. Edge checks local cache:
   a. Cache HIT  → Serve immediately (< 10ms)
   b. Cache MISS → Pull from origin, cache, then serve

Cache miss flow:
┌────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────────┐
│ Viewer │────→│ CDN Edge  │────→│ CDN Regional │────→│  Origin (S3) │
│ Tokyo  │     │  Tokyo    │     │  Shield      │     │  us-east-1   │
└────────┘     └───────────┘     └──────────────┘     └──────────────┘
                  10ms              50ms                  200ms
```

**Origin shield:** A mid-tier caching layer between edge servers and the origin. When 50 edge servers all experience a cache miss for the same chunk, the origin shield collapses those into a single origin fetch. Without an origin shield, a new popular video would generate thousands of simultaneous origin requests from edge servers worldwide.

**Cache warming for popular content:** When a video from a popular creator is published, proactively push the first few chunks to all major edge locations before any viewer requests them. This eliminates the "thundering herd" of cache misses when millions of subscribers are notified simultaneously.

**Cache headers:** Transcoded video chunks are immutable -- once `chunk_042.ts` is written, it never changes. Set `Cache-Control: public, max-age=31536000` (1 year). If re-transcoding is needed, generate new chunk filenames (cache busting via content hash in the filename).

**Cache hit rates:** For a platform like YouTube, the top 20% of videos account for 80%+ of views. These popular videos achieve near-100% cache hit rates at major edge locations. Long-tail videos (viewed once a week) have lower hit rates, but they also represent minimal traffic. Overall CDN cache hit rates of 95%+ are typical, meaning only 5% of chunk requests reach the origin.

**Cost optimization:** CDN egress is a major cost driver for video platforms. Strategies to manage it: (1) serve the lowest acceptable quality by default and let users opt into higher quality, reducing average chunk sizes; (2) use tiered CDN pricing where popular regions use premium CDNs and less-trafficked regions use cheaper alternatives; (3) negotiate custom CDN contracts at scale (YouTube runs its own CDN, Google Global Cache, deployed inside ISP networks).

**Multi-region origin:** For disaster recovery and reduced latency to the origin shield, replicate the processed object store across multiple regions. If the primary origin in us-east-1 goes down, the CDN automatically falls back to eu-west-1. Cross-region replication adds storage cost but eliminates single-region failure as a risk for playback availability.

**Byte-range requests:** CDN edge servers support HTTP byte-range requests, which allow the video player to request specific portions of a chunk rather than downloading the entire file. This is useful for seeking: when a viewer jumps to a new position, the player can request only the bytes from the nearest keyframe onward rather than downloading the entire chunk from the beginning.

### Metadata and Search

While not the core focus of a "Design YouTube" interview, it's worth mentioning how video discovery works at a high level:

- Video metadata (title, description, tags, uploader) is stored in the [relational database](/learn/database-caching) and replicated to a search index (Elasticsearch) for full-text search
- Popular and trending videos are computed asynchronously by aggregating view velocity (views per hour) and served from a [cache layer](/learn/database-caching) -- this list updates every few minutes, not in real-time
- Recommendations and personalized feeds are generated by separate ML services that read from the metadata store and user activity logs -- this is an entirely separate system from the video platform itself

Mention these briefly if the interviewer asks, but don't go deep unless prompted. The core of this problem is the upload-transcode-stream pipeline, not the recommendation engine.

**Notification on publish:** When a creator's video finishes processing and goes live, the system sends a notification to the creator's subscribers. For popular creators with millions of subscribers, this is a [fan-out](/learn/message-queues) problem in itself -- but it's out of scope for the core YouTube design. Mention it as an extension point if the interviewer asks about the end-to-end user experience.

---

## Common Interview Mistakes

### Mistake 1: Streaming the raw uploaded file directly

"The user uploads a video and other users can watch it immediately in its original format."

**Problem:** Raw uploaded videos are in arbitrary formats (MOV, AVI, MKV), at arbitrary resolutions (4K, 8K), and at arbitrary bitrates (50 Mbps+). Streaming a 50 Mbps raw file to a viewer on a 5 Mbps mobile connection means constant buffering. Streaming MKV to a browser that only supports HLS means no playback at all. A 4K video on a 360p phone screen wastes 90% of the bandwidth.

**Better:** Always transcode raw uploads into standardized [adaptive bitrate streaming](/learn/video-streaming) formats (HLS/DASH) at multiple resolutions. The player dynamically selects the appropriate quality for the viewer's device and network conditions. Explain that the transcoding pipeline is what makes YouTube usable on every device from phones on 3G to 4K smart TVs on fiber. Also mention that transcoding normalizes the container format -- no matter what format the creator uploads (MOV, AVI, WebM, MKV), the output is always standardized HLS/DASH chunks.

### Mistake 2: Processing video synchronously or without a DAG

"The API server receives the video, transcodes it, and returns the result."

**Problem:** Transcoding a 10-minute video takes 10-30 minutes of CPU-intensive work. Doing this synchronously in an API request handler means the request times out, the server thread is blocked for 30 minutes, and your API server can handle approximately 2 uploads before running out of resources. Even if you make it async but sequential (encode 360p, then 720p, then 1080p, then 4K), you're leaving 75% of your encoding capacity idle.

**Better:** Use an [asynchronous processing DAG](/learn/async-processing). The API server returns immediately with a "processing" status. The raw upload triggers a DAG that splits the video into segments and encodes all resolutions in parallel. A 10-minute video with 4 resolutions produces 240+ independent encoding tasks that run concurrently. Explain how this reduces processing time from 2 hours (sequential) to 30 minutes (parallel). Mention specific workflow orchestration tools (Temporal, AWS Step Functions, Airflow) to show you understand how DAGs are implemented in practice.

### Mistake 3: Forgetting about CDN for global delivery

"Video chunks are served from the application server or directly from S3."

**Problem:** S3 is in one region. A viewer in Mumbai fetching chunks from us-east-1 experiences 200ms+ latency per request. A 30-minute video has 180+ chunks -- that's 36 seconds of cumulative latency overhead just from network round trips. The viewer experiences constant buffering, slow start times, and a terrible experience. Multiply this by millions of concurrent viewers and your S3 egress costs are astronomical.

**Better:** Serve all video chunks from a [CDN](/learn/cdn). Edge servers in 200+ global locations cache chunks close to viewers -- Mumbai viewers hit a Mumbai edge server with 10ms latency. Explain pull-based CDN caching, origin shields for thundering herd protection, and cache warming for popular content. The CDN is not an optimization; it is a requirement. No video platform at scale works without one. Mention specific CDN providers (CloudFront, Cloudflare, Akamai) or explain that platforms at YouTube's scale run their own CDN infrastructure (Google Global Cache nodes deployed inside ISPs).

### Mistake 4: Updating view counts in real-time per-request in SQL

"Every time a user watches a video, increment the view count: `UPDATE videos SET views = views + 1`."

**Problem:** This works at 100 views per second. At 50,000 views per second on a viral video, you're issuing 50,000 UPDATE statements per second on a single row. PostgreSQL row-level locks serialize these writes, creating massive contention. The database spends all its time on lock management, query latency spikes, and other operations (metadata reads, uploads, search) degrade. You've turned a single popular video into a system-wide outage.

**Better:** Batch view events through a [message queue](/learn/message-queues). Collect view events in Kafka, aggregate them in micro-batches (every 5-10 seconds), and flush a single UPDATE per video per batch. 50,000 writes/second becomes 1 write every 5 seconds. The view count is eventually consistent (a few seconds behind), which is perfectly fine -- nobody notices if a viral video shows "2.3M views" instead of "2,300,047 views."

### Mistake 5: Not mentioning presigned URLs for upload

"The client uploads the video to the API server, which then stores it in S3."

**Problem:** A 2 GB video upload through your API server means the server receives 2 GB of data, holds it in memory or streams it to disk, then re-uploads it to S3. This consumes a server thread for minutes, uses gigabytes of memory or disk I/O, saturates the server's network bandwidth, and limits your upload capacity to a handful of concurrent users. You've made your API server a bottleneck for the heaviest operation in the system.

**Better:** Use [presigned URLs](/learn/presigned-urls). The API server generates a presigned URL (milliseconds of work, zero bandwidth) and returns it to the client. The client uploads directly to S3 at full speed, completely bypassing the API server. For large files, use multipart upload with multiple presigned URLs so parts upload in parallel and failed parts can be retried individually. Explain that this is how every production video platform handles uploads -- the API server's job is coordination and metadata management, not data transfer.

---

**Interview golden rule:**

Don't just say "upload videos and stream them back." Walk through the three pillars of a video platform: [presigned URLs](/learn/presigned-urls) for direct-to-storage uploads that bypass your servers entirely, a [transcoding DAG](/learn/async-processing) that splits and encodes video into multiple resolutions in parallel, and [adaptive bitrate streaming](/learn/video-streaming) via HLS/DASH with chunks served from a global [CDN](/learn/cdn). Then explain what happens when a creator uploads a 4K video -- how it flows from raw upload to processed chunks to edge-cached streams -- and how [batched view counting](/learn/message-queues) handles a video that goes from 0 to 10 million views in an hour without melting the database.

The interviewer will likely probe one area deeply. Be ready to go deep on the transcoding DAG (how many parallel tasks, how you handle failures, how long it takes), adaptive bitrate streaming (what's in the manifest, how the player switches quality, what chunk size to use), or the CDN layer (pull vs push, origin shields, cache warming). Having concrete numbers helps: chunk sizes (10 seconds), encoding parallelism (240 tasks for a 10-minute video), CDN cache hit rates (95%+), and view count flush intervals (5-10 seconds).
