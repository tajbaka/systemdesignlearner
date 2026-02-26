## Introduction

You're in your system design interview, designing a video streaming platform like YouTube or Netflix. You say: "The user uploads a video, we store it in S3, and when someone wants to watch it, we serve the file."

The interviewer leans in: "A user on a 3G connection in Mumbai tries to watch a 4K video that's 8GB. What happens?"

You know the answer: it buffers forever, eats their data plan, and they leave. But you're not sure how to fix it, because you've been thinking about video as a file, not as a stream.

Adaptive bitrate streaming is the technology behind every major video platform. It's how Netflix serves 200 million users across wildly different devices and network conditions without buffering. And it comes up constantly in system design interviews for anything involving video: YouTube, Netflix, Twitch, TikTok, even video calls.

Here's how it works.

---

## Why Not Just Serve the File?

Let's start with the naive approach: store the video as a single file and serve it when requested.

```
Naive approach:

User clicks play
  → Server sends entire 2GB video file
  → Browser downloads and plays

Problems:
  1. User must download 2GB before watching (or wait for buffering)
  2. Slow connections can't keep up with playback
  3. Mobile user on 3G gets the same 4K file as desktop on fiber
  4. Seeking to minute 45 still requires downloading from the start
  5. Network hiccup at minute 30 = start over
```

This breaks down in three specific ways.

**File size.** A two-hour movie at 1080p is roughly 4-8GB. At 4K, it can hit 15-20GB. Serving this as a single download means the user waits minutes or hours before playback starts. HTTP range requests help with seeking, but they don't solve the bandwidth problem.

**Variable bandwidth.** A user's connection speed changes constantly. They walk from Wi-Fi to cellular. The train enters a tunnel. Their roommate starts a download. A single high-bitrate file can't adapt to these changes, so the player either buffers or fails.

**Device compatibility.** A 4K video is wasted on a phone with a 6-inch 720p screen. You're burning bandwidth and battery for quality the user literally cannot see. Different devices need different quality levels.

The solution to all three problems is the same: don't serve a single file. Break it into chunks, encode it at multiple quality levels, and let the player pick what it needs.

---

## Chunk-Based Delivery

The foundation of modern video streaming is breaking a video into small, independent segments (also called chunks or fragments). Each segment is typically 2-10 seconds long.

```
Original video (2 hours):

[ ---- full video file: 4GB ---- ]

Chunked video (2 hours, 6-second segments):

[seg001][seg002][seg003][seg004]...[seg1200]
  6s      6s      6s      6s          6s

Each segment is a standalone, playable video file (~2-5MB at 1080p).
```

Why does this matter?

**Instant playback.** The player only needs to download the first segment to start playing. That's 2-5MB instead of 4GB. Playback starts in under a second.

**Seeking.** Want to skip to minute 45? The player calculates which segment that corresponds to (segment 450 for 6-second chunks) and requests it directly. No downloading everything in between.

**Resilience.** If the network drops during segment 200, the player retries just that one segment. It doesn't start over from the beginning.

**Adaptive quality.** This is the big one. Since each segment is independent, the player can request segment 200 at 1080p and segment 201 at 480p if the bandwidth drops. Each segment can be a different quality level. This is what enables adaptive bitrate streaming.

**Parallel delivery.** Segments can be cached independently on [CDN edge servers](/learn/cdn). Popular segments stay hot in cache. Different segments can be served from different edge locations.

The segment duration is a trade-off:

```
Short segments (2 seconds):
  + Faster quality switching (adapts to bandwidth changes quickly)
  + Lower latency for live streaming
  - More HTTP requests (overhead)
  - More manifest entries (larger manifest file)
  - Less efficient compression (fewer frames per segment)

Long segments (10 seconds):
  + Fewer HTTP requests
  + Better compression efficiency
  + Smaller manifest files
  - Slower quality switching
  - Higher latency for live streams

Industry standard: 4-6 seconds for VOD, 2-4 seconds for live.
```

---

## HLS vs DASH

Two protocols dominate video streaming today: HLS and DASH. Both use the same fundamental approach (chunked delivery with a manifest), but they differ in format and ecosystem.

### HLS (HTTP Live Streaming)

Created by Apple in 2009. Originally Apple-only, now supported everywhere. Uses `.m3u8` manifest files (playlist format) and `.ts` (MPEG-2 Transport Stream) or `.fmp4` (fragmented MP4) segments.

```
HLS structure:

master.m3u8 (master playlist)
  ├── 360p/playlist.m3u8
  │     ├── segment-001.ts
  │     ├── segment-002.ts
  │     └── ...
  ├── 720p/playlist.m3u8
  │     ├── segment-001.ts
  │     ├── segment-002.ts
  │     └── ...
  └── 1080p/playlist.m3u8
        ├── segment-001.ts
        ├── segment-002.ts
        └── ...
```

The master playlist lists all available quality levels. Each quality level has its own playlist that lists the actual segment URLs. The player reads the master playlist, picks a quality level, and starts downloading segments from that level's playlist.

### DASH (Dynamic Adaptive Streaming over HTTP)

An open international standard (ISO/IEC 23009-1). Published in 2012. Uses `.mpd` manifest files (XML-based Media Presentation Description) and `.m4s` (fragmented MP4) segments.

```
DASH structure:

manifest.mpd (media presentation description)
  ├── 360p/
  │     ├── init.m4s
  │     ├── segment-001.m4s
  │     ├── segment-002.m4s
  │     └── ...
  ├── 720p/
  │     ├── init.m4s
  │     ├── segment-001.m4s
  │     ├── segment-002.m4s
  │     └── ...
  └── 1080p/
        ├── init.m4s
        ├── segment-001.m4s
        ├── segment-002.m4s
        └── ...
```

DASH has an explicit initialization segment (`init.m4s`) that contains codec and track metadata. HLS includes this information either in the playlist or in each segment header.

### Quick Comparison

| Aspect              | HLS                                    | DASH                             |
| ------------------- | -------------------------------------- | -------------------------------- |
| **Created by**      | Apple (2009)                           | MPEG/ISO standard (2012)         |
| **Manifest format** | `.m3u8` (text playlist)                | `.mpd` (XML)                     |
| **Segment format**  | `.ts` or `.fmp4`                       | `.m4s` (fragmented MP4)          |
| **DRM support**     | FairPlay (Apple ecosystem)             | Widevine, PlayReady, ClearKey    |
| **Browser support** | Native on Safari/iOS, JS on rest       | No native support, JS everywhere |
| **Latency**         | 6-30s typical, LL-HLS for ~2s          | 3-15s typical, LL-DASH for ~2s   |
| **Adoption**        | Dominant for mobile/OTT                | Common for web, Android          |
| **Open standard**   | No (Apple proprietary, widely adopted) | Yes (ISO standard)               |

**What to say in an interview:**

"For broad compatibility, I'd support both HLS and DASH. In practice, most platforms generate both from the same source segments since HLS with fMP4 and DASH with fMP4 use the same underlying segment format. The main difference is the manifest file. We'd store one set of video segments and generate both `.m3u8` and `.mpd` manifests."

This is a strong answer because it shows you understand that the protocols are more similar than different, and that supporting both doesn't mean doubling your storage.

---

## Adaptive Bitrate Streaming

This is the core concept interviewers want to hear. Adaptive bitrate streaming (ABR) means the video player dynamically switches between quality levels during playback based on current network conditions.

Here's the flow:

```
Adaptive Bitrate Streaming Flow:

1. Player fetches master manifest
   Player ──GET──→ CDN: master.m3u8
   CDN ──────────→ Player: list of quality levels

2. Player estimates bandwidth, picks initial quality
   Available bandwidth: ~5 Mbps → picks 720p (needs ~3 Mbps)

3. Player downloads segments at chosen quality
   Player ──GET──→ CDN: 720p/segment-001.ts  (downloaded in 0.8s)
   Player ──GET──→ CDN: 720p/segment-002.ts  (downloaded in 0.9s)
   Player ──GET──→ CDN: 720p/segment-003.ts  (downloaded in 0.7s)

4. Bandwidth drops (user switches to cellular)
   Player ──GET──→ CDN: 720p/segment-004.ts  (downloaded in 2.5s!)

5. Player detects slower download, switches DOWN
   Player ──GET──→ CDN: 360p/segment-005.ts  (downloaded in 0.4s)
   Player ──GET──→ CDN: 360p/segment-006.ts  (downloaded in 0.3s)

6. Bandwidth recovers
   Player ──GET──→ CDN: 360p/segment-007.ts  (downloaded in 0.2s)

7. Player detects spare bandwidth, switches UP
   Player ──GET──→ CDN: 720p/segment-008.ts  (downloaded in 0.9s)
```

The key insight: **the server has no idea what quality the player is watching.** The player makes all the decisions. It measures how long each segment takes to download, estimates available bandwidth, and picks the best quality level for the next segment. The server (or CDN) just serves whatever file is requested.

This is why it works at scale: no server-side per-user state, no real-time bandwidth negotiation, no custom protocols. It's all plain HTTP requests for static files, which means it works perfectly with standard [CDN caching](/learn/cdn).

### How the Player Decides

The ABR algorithm running in the player considers several signals:

```
ABR Decision Inputs:

1. Download throughput
   - How fast did the last N segments download?
   - Weighted average (recent segments matter more)

2. Buffer level
   - How many seconds of video are buffered ahead?
   - Buffer full (30s ahead)? → safe to try higher quality
   - Buffer low (3s ahead)? → drop quality immediately

3. Segment size at each quality level
   - 360p segment: ~0.5MB
   - 720p segment: ~2MB
   - 1080p segment: ~4MB
   - Can I download the next segment before I need to play it?

Decision logic (simplified):

IF buffer < 5 seconds THEN
    switch to lowest quality (avoid buffering at all costs)
ELSE IF throughput > 1.5x next-higher-quality bitrate THEN
    switch up one level (conservative: need 1.5x headroom)
ELSE IF throughput < 0.8x current-quality bitrate THEN
    switch down one level
ELSE
    stay at current quality
```

Real ABR algorithms (like BOLA, MPC, or the ones Netflix and YouTube use) are more sophisticated, but this captures the core idea.

---

## The Bitrate Ladder

When you encode a video for streaming, you don't just pick one quality level. You create a "bitrate ladder": multiple versions of the same video at different resolutions and bitrates.

Here's a typical bitrate ladder for a video streaming service:

```
Resolution   Bitrate      Bandwidth Needed    Use Case
─────────────────────────────────────────────────────────────
240p         400 Kbps     ~0.5 Mbps           Very slow connections, tiny screens
360p         800 Kbps     ~1.0 Mbps           Mobile on 3G
480p (SD)    1.5 Mbps     ~2.0 Mbps           Mobile on decent connection
720p (HD)    3.0 Mbps     ~4.0 Mbps           Tablets, laptops
1080p (FHD)  5.0 Mbps     ~6.5 Mbps           Desktops, smart TVs
1440p (2K)   8.0 Mbps     ~10 Mbps            High-end monitors
2160p (4K)   16.0 Mbps    ~20 Mbps            4K TVs, fiber connections
```

The "bandwidth needed" column is higher than the bitrate because of protocol overhead (HTTP headers, TCP, TLS) and the need for headroom so the player doesn't buffer.

### Choosing the Right Rungs

Not every video needs every rung of the ladder. The decision depends on content type and audience:

**Content-aware encoding.** A talking-head video (a lecture, a podcast) has very little motion. You can encode it at much lower bitrates than an action movie with lots of scene changes and fast movement. Netflix uses per-title encoding where they analyze each video and create a custom bitrate ladder.

```
Action movie bitrate ladder:
  240p @ 400 Kbps
  360p @ 900 Kbps
  480p @ 1.8 Mbps
  720p @ 3.5 Mbps
  1080p @ 6.0 Mbps
  4K   @ 18.0 Mbps

Lecture video bitrate ladder:
  240p @ 200 Kbps
  360p @ 400 Kbps
  480p @ 800 Kbps
  720p @ 1.5 Mbps
  1080p @ 2.5 Mbps
  (No 4K — unnecessary for slides and a talking head)
```

**In an interview**, you don't need to memorize exact bitrates. What matters is that you mention:

1. Multiple quality levels exist (not just one file per video)
2. The bitrate ladder is a storage multiplier (each rung is a full copy of the video)
3. The trade-off between more rungs (smoother quality transitions) and storage/encoding cost

**Storage math to mention:**

```
One 2-hour video:
  6 quality levels × average 3GB each = ~18GB of stored video

For a platform with 1 million videos:
  18GB × 1,000,000 = 18 PB (petabytes)

This is why object storage matters:
  S3 at $0.02/GB = $360,000/month for 18PB
  SQL at $0.20/GB = $3,600,000/month for 18PB
```

This naturally leads to a discussion of [storage types](/learn/storage-types) and why object storage is the right choice for video content.

---

## Transcoding Pipelines

Raw uploaded video can't be streamed directly. It needs to be transcoded: converted from its original format into the multiple quality levels and segment formats required for adaptive streaming.

Transcoding is computationally expensive. A single 1080p video might take 2-10 minutes to transcode on a powerful machine. A 4K video can take 30-60 minutes. And you need to do this for every rung of the bitrate ladder.

### What Transcoding Does

```
Input:
  raw-upload.mp4 (4K, 20GB, H.264, 60fps)

Transcoding pipeline output:

  ├── 240p/
  │     ├── segment-001.ts  (240p, 400kbps, H.264)
  │     ├── segment-002.ts
  │     └── ... (720 segments for 2-hour video at 6s each)
  │
  ├── 360p/
  │     ├── segment-001.ts  (360p, 800kbps, H.264)
  │     └── ...
  │
  ├── 480p/
  │     ├── segment-001.ts
  │     └── ...
  │
  ├── 720p/
  │     ├── segment-001.ts
  │     └── ...
  │
  ├── 1080p/
  │     ├── segment-001.ts
  │     └── ...
  │
  ├── 4K/
  │     ├── segment-001.ts
  │     └── ...
  │
  ├── master.m3u8       (HLS master manifest)
  ├── 240p/playlist.m3u8
  ├── 360p/playlist.m3u8
  │   ...
  └── manifest.mpd      (DASH manifest)
```

### DAG-Based Parallel Processing

Transcoding a video into multiple quality levels is a perfect use case for parallel task execution using a directed acyclic graph (DAG). Each quality level is independent, so they can all be processed simultaneously.

![Transcoding DAG Pipeline](diagram:video-transcoding-dag)

Each transcode job is an independent task that can run on a different worker machine. The DAG defines the dependencies: you can't generate manifests until all transcode jobs finish, and you can't mark the video as "ready" until manifests are uploaded.

This is a great place to mention [message queues](/learn/message-queues) in an interview. The upload service puts a message on a queue, and a fleet of transcode workers picks up the work. A [DAG orchestrator](/learn/async-processing) manages the pipeline, tracking which steps are complete and triggering downstream steps when their dependencies are met.

**Why this matters for interviews:** Interviewers love to ask about the upload-to-playback pipeline because it touches so many concepts: async processing, task orchestration, parallel execution, and failure handling. You should be able to sketch this DAG on a whiteboard.

### Handling Failures

Transcoding jobs fail. Machines crash. Disk fills up. The codec hits a corrupted frame.

```
Failure handling strategies:

1. Retry with exponential backoff
   - Transcode 720p failed → retry in 10s → 20s → 40s
   - Max 3 retries, then mark as failed

2. Checkpoint progress
   - Track which segments are complete
   - On retry, skip already-finished segments
   - Don't re-transcode 700 segments because segment 701 failed

3. Partial availability
   - 240p, 360p, 480p done but 1080p failed?
   - Make the video available in lower qualities while retrying 1080p
   - Better than making the user wait for all qualities

4. Dead letter queue
   - After max retries, send to DLQ for manual investigation
   - Alert the engineering team
   - Don't silently drop failed videos
```

---

## The Full Picture: Upload to Playback

Here's the end-to-end flow from a creator uploading a video to a viewer watching it. This is the kind of complete picture that impresses interviewers.

### Upload Path

```
Upload Flow:

Creator                API Server           Object Storage        Queue
  │                        │                      │                  │
  │──POST /upload─────────→│                      │                  │
  │                        │                      │                  │
  │←─presigned upload URL──│                      │                  │
  │                        │                      │                  │
  │──PUT (raw video)──────────────────────────────→│                  │
  │                        │                      │                  │
  │──POST /upload/complete→│                      │                  │
  │                        │──store metadata──→ DB│                  │
  │                        │──enqueue transcode──────────────────────→│
  │                        │                      │                  │
  │←─202 Accepted──────────│                      │                  │
  │  (video processing)    │                      │                  │
```

The upload uses [presigned URLs](/learn/presigned-urls) so the creator uploads directly to object storage, keeping the video data off your API servers. The API server only handles metadata and triggers the transcode pipeline.

### Transcode Path

```
Transcode Flow:

Queue          Transcode Workers         Object Storage          DB
  │                  │                        │                   │
  │──job: video_123──→│                        │                   │
  │                  │──GET raw video─────────→│                   │
  │                  │←─raw video data─────────│                   │
  │                  │                        │                   │
  │                  │  [transcode 240p]       │                   │
  │                  │  [transcode 360p]  (parallel)               │
  │                  │  [transcode 720p]       │                   │
  │                  │  [transcode 1080p]      │                   │
  │                  │                        │                   │
  │                  │──PUT segments──────────→│                   │
  │                  │──PUT manifests─────────→│                   │
  │                  │                        │                   │
  │                  │──UPDATE status: ready──────────────────────→│
  │                  │                        │                   │
```

### Playback Path

```
Playback Flow:

Viewer              CDN Edge              Object Storage           DB
  │                    │                       │                    │
  │──GET /video/123───────────────────────────────────────────────→│
  │←─video metadata + manifest URL─────────────────────────────────│
  │                    │                       │                    │
  │──GET master.m3u8──→│                       │                    │
  │                    │──cache MISS───────────→│                    │
  │                    │←─master.m3u8──────────│                    │
  │←─master.m3u8──────│  (cached for next)     │                    │
  │                    │                       │                    │
  │  [player picks 720p based on bandwidth]    │                    │
  │                    │                       │                    │
  │──GET 720p/seg001──→│                       │                    │
  │                    │──cache MISS───────────→│                    │
  │                    │←─segment data─────────│                    │
  │←─segment data──────│  (cached)             │                    │
  │                    │                       │                    │
  │──GET 720p/seg002──→│                       │                    │
  │←─segment data──────│  (cache HIT, fast!)   │                    │
  │                    │                       │                    │
  │  [bandwidth drops] │                       │                    │
  │                    │                       │                    │
  │──GET 360p/seg003──→│                       │                    │
  │←─segment data──────│                       │                    │
  │                    │                       │                    │
```

The CDN is critical here. Popular videos have their segments cached at edge locations worldwide. A viral video might be served entirely from CDN cache, with zero requests hitting your origin storage. This is the power of combining [object storage](/learn/storage-types) with [CDN caching](/learn/cdn).

### The Complete Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UPLOAD PATH                          │
│                                                         │
│  Creator → API → Presigned URL → S3 (raw video)        │
│                    │                                    │
│                    └→ Metadata → PostgreSQL              │
│                    └→ Transcode Job → Message Queue      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  TRANSCODE PATH                         │
│                                                         │
│  Queue → Worker Fleet (DAG orchestration)               │
│    │                                                    │
│    ├→ Validate input                                    │
│    ├→ Transcode 240p, 360p, 480p, 720p, 1080p (||)     │
│    ├→ Generate thumbnails                               │
│    ├→ Generate HLS + DASH manifests                     │
│    ├→ Upload segments + manifests → S3                  │
│    └→ Update status in DB → "ready"                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                  PLAYBACK PATH                          │
│                                                         │
│  Viewer → CDN Edge → S3 Origin (cache miss only)        │
│    │                                                    │
│    ├→ Fetch manifest (master.m3u8 or manifest.mpd)      │
│    ├→ Player picks quality based on bandwidth           │
│    ├→ Fetch segments at chosen quality                  │
│    └→ Adaptive switching as conditions change           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Live Streaming: A Quick Note

Most interview questions focus on video-on-demand (VOD), but you might get asked about live streaming. The core architecture is the same (chunked delivery + manifests + CDN), with a few key differences:

```
VOD vs Live Streaming:

                        VOD                     Live
────────────────────────────────────────────────────────
Segments available    All at once              One at a time
Manifest             Static (all segments)     Dynamic (updates every few seconds)
Segment duration      4-6 seconds              2-4 seconds (lower latency)
CDN caching           Long TTL (hours/days)    Short TTL (seconds)
Encoding              Offline (not time-bound) Real-time (must keep up)
Seeking               Full seek bar            Limited (live edge + DVR window)
```

For live streaming, the manifest file is constantly updated as new segments are produced. The player polls the manifest every few seconds to discover new segments. The encoder must produce segments faster than real-time, which constrains the complexity of encoding you can do.

**Interview tip:** If asked about live streaming, mention that the same HLS/DASH infrastructure works, but the encoder runs in real-time, the manifests are dynamic, and the CDN TTLs are much shorter. This shows you understand the fundamental architecture is shared.

---

## Common Interview Mistakes

### Mistake 1: Serving the Entire File

"The user requests the video, and we stream the MP4 file from S3."

**Problem:** A single 4K file doesn't adapt to bandwidth. Users on slow connections buffer endlessly. Users on mobile waste data and battery downloading 4K when their screen is 720p. Seeking requires downloading from the beginning.

**Better:** "We break the video into 4-6 second segments and encode at multiple quality levels. The player fetches segments individually and switches quality adaptively."

### Mistake 2: Forgetting the Manifest

"We encode the video into chunks and the player just downloads them in order."

**Problem:** How does the player know what quality levels exist? What are the segment URLs? How long is each segment? Without a manifest, the player has no map of the content.

**Better:** "The player first fetches a manifest file (`.m3u8` for HLS or `.mpd` for DASH) that lists all available quality levels and their segment URLs. This is the entry point for playback."

### Mistake 3: Ignoring the Transcoding Pipeline

"The user uploads a video and it's immediately available for streaming."

**Problem:** Raw uploads are in arbitrary formats (MOV, AVI, MKV) at arbitrary resolutions. They need to be transcoded into multiple quality levels and segmented. This takes minutes to hours for long videos.

**Better:** "After upload, the video enters an async transcoding pipeline. We use a [message queue](/learn/message-queues) to decouple the upload from processing. A fleet of transcode workers generates all quality levels in parallel, then produces the manifests. The video becomes available once transcoding completes."

### Mistake 4: Not Mentioning CDN

"Segments are served directly from S3."

**Problem:** S3 has limited throughput per prefix and higher latency for global users. A viral video would hammer your origin. Global latency would be poor.

**Better:** "We serve all segments through a [CDN](/learn/cdn). Video segments are ideal for CDN caching because they're static, immutable, and read-heavy. Popular content is served entirely from edge cache with zero origin load."

---

## Summary: What to Remember

**The core pattern:**

- Video is broken into 2-10 second segments
- Each segment is encoded at multiple quality levels (the bitrate ladder)
- A manifest file describes all available qualities and segment URLs
- The player adaptively switches quality based on bandwidth and buffer level
- Everything is served over plain HTTP, cached at [CDN edges](/learn/cdn)

**The two protocols:**

- HLS (Apple): `.m3u8` manifests, `.ts` or `.fmp4` segments, dominant on mobile
- DASH (open standard): `.mpd` manifests, `.m4s` segments, common on web
- In practice, support both; they share the same underlying segment format with fMP4

**The pipeline:**

- Upload: creator uploads raw video to [object storage](/learn/storage-types) via presigned URL
- Transcode: async workers process video into multiple quality levels in parallel (DAG)
- Store: segments + manifests stored in object storage
- Deliver: CDN caches and serves segments globally

**The numbers:**

- Segment duration: 4-6 seconds (VOD), 2-4 seconds (live)
- Typical bitrate ladder: 400 Kbps (240p) to 16 Mbps (4K)
- Storage multiplier: ~6x for a standard bitrate ladder
- CDN cache hit: ~10-30ms vs origin: ~200-300ms

**Interview golden rule:**

```
Video streaming is not about serving a file.
It's about serving the right chunks at the right quality at the right time.
Mention segments, manifests, adaptive bitrate, transcoding, and CDN.
```
