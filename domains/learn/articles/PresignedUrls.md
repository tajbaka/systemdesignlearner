## Introduction

You're designing a file upload system. You tell the interviewer: "The client sends the file to our API server, and the server uploads it to S3."

The interviewer pushes back: "You have 50,000 users uploading 10MB files concurrently. That's 500GB flowing through your API servers. How many servers do you need just to proxy bytes?"

And now you're stuck, because you made your application server a middleman for every byte of data. There's a better pattern: presigned URLs.

---

## What Are Presigned URLs

A presigned URL is a temporary, pre-authenticated URL that grants time-limited access to a specific object in [object storage](/learn/object-storage-cdn) (like Amazon S3). The URL contains an embedded cryptographic signature, an expiration time, and the exact operation it allows (GET, PUT). Anyone with the URL can perform that operation, no AWS credentials required.

**The key insight:** Presigned URLs let clients interact directly with object storage, bypassing your application server entirely for the actual data transfer. Your server only handles the lightweight work of generating the URL.

```
Without presigned URLs:
  Client → Your Server → S3 → Your Server → Client
  (Your server proxies every byte)

With presigned URLs:
  Client → Your Server: "I need to upload a file"
  Your Server → Client: "Here's a signed URL, valid for 15 minutes"
  Client → S3 directly: uploads/downloads the file
  (Your server never touches the file data)
```

---

## How They Work

Your server uses its AWS credentials to create a signed request, embedded in the URL as query parameters.

```
https://my-bucket.s3.amazonaws.com/uploads/user-123/photo.jpg
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIA.../20240115/us-east-1/s3/aws4_request
  &X-Amz-Expires=900
  &X-Amz-Signature=abc123...
```

The URL encodes exactly which object can be accessed, for how long, and what operation is allowed. If anyone tampers with it (changes the key, extends the expiration), the signature becomes invalid and S3 rejects the request. The client never sees or needs AWS credentials.

---

## Upload Flow with Presigned URLs

This is the most common interview scenario. A client needs to upload a file to your system.

```
1. Client → API Server: "I want to upload profile-photo.jpg (2MB, image/jpeg)"
2. API Server validates: authenticated? file type allowed? size within limits?
3. API Server generates a presigned PUT URL:
   - Key: "uploads/user-123/profile-photo.jpg"
   - Expires: 15 minutes, Content-Type: image/jpeg
4. API Server → Client: returns the presigned URL
5. Client → S3: PUT request directly to the presigned URL
6. S3 validates the signature and accepts the upload
7. Client → API Server: "Upload complete, here's the key"
8. API Server stores metadata in the database
```

Your API server handles two small JSON requests (steps 1 and 7). The heavy lifting, transferring the actual file bytes, happens directly between the client and S3.

---

## Download Flow with Presigned URLs

For private files, presigned GET URLs let you control access without proxying data.

```
1. Client → API Server: "I want to download file abc-456"
2. API Server checks permissions (does this user have access?)
3. API Server generates a presigned GET URL (expires: 1 hour)
4. API Server → Client: returns the presigned URL (or 302 redirect)
5. Client → S3: GET request directly to the presigned URL
```

**Presigned GET URLs vs. CDN:** For read-heavy public content, a [CDN in front of S3](/learn/object-storage-cdn) is better since CDNs cache at the edge. Use presigned GET URLs when content is private and needs per-request access control. For high-traffic private content, consider CloudFront signed URLs or signed cookies, which combine CDN caching with access control.

---

## Security Considerations

Presigned URLs are bearer tokens: anyone who has the URL can use it. Security depends on tight constraints.

**Expiration times:** Keep them short. 5-15 minutes for uploads, 15 minutes to 1 hour for downloads. Never hours or days. If the URL leaks, you've given away access for the entire duration.

**Scope to specific keys:** Each URL targets a single object key. Generate the key server-side using a combination of user ID and UUID. Never let the client choose the S3 key, or they could overwrite other users' files.

**Content restrictions:** Enforce content-type (image/jpeg, application/pdf) and maximum file size server-side. This prevents users from uploading executables or abusing storage.

**Post-upload validation:** Even with URL constraints, validate files after they land in S3. Use an S3 event notification to verify file type or scan for malware.

---

## When to Use Presigned URLs

**Use presigned URLs when:**

- Files are large (images, videos, documents) and bandwidth savings matter
- You have high upload concurrency that would overwhelm your API servers
- Files are private and need per-request access control for downloads

**Skip presigned URLs when:**

- Files are small (a few KB), where the extra round trip isn't worth it
- You need to process files before storing them (compression, validation that can't be async)
- Your [storage layer](/learn/storage-types) isn't S3-compatible
- Content is public and read-heavy, where a CDN is simpler

**The bandwidth math:**

```
Without presigned URLs (proxied):
  50,000 uploads × 10MB = 500GB through your servers

With presigned URLs:
  Your servers handle: 50,000 × ~1KB JSON = 50MB
  That's a 10,000x reduction in bandwidth through your app tier.
```

---

## Common Interview Mistakes

### Mistake 1: Proxying all uploads through your server

"The client sends the file to our API, and we forward it to S3."

**Problem:** Your API servers become a bottleneck for all file data. They need massive bandwidth, and every upload ties up a connection and memory.

**Better:** Use presigned URLs so clients upload directly to S3. Your server never touches the file bytes.

### Mistake 2: Using presigned URLs for public, read-heavy content

"I'll generate a presigned GET URL for every image on the page."

**Problem:** Each URL requires a server round trip, and you lose CDN caching since each URL is unique.

**Better:** Use a CDN for public content. Reserve presigned GET URLs for private, access-controlled files.

### Mistake 3: Long expiration times

"I'll set the URL to expire in 24 hours so the client doesn't have to rush."

**Problem:** If the URL leaks (browser history, logs, shared links), anyone can access that resource for the full duration.

**Better:** Keep expirations short (5-15 minutes for uploads). The client can always request a new URL.

### Mistake 4: Letting clients choose the S3 key

"The client sends the filename and we use that as the S3 key."

**Problem:** Malicious users can overwrite other users' files or perform path traversal attacks.

**Better:** Generate the key server-side using user ID, UUID, and timestamp. The client has no control over where the file lands.

---

## Summary: What to Remember

- **Presigned URLs** are temporary, pre-authenticated URLs that grant time-limited access to a specific S3 object
- Clients upload and download directly to/from object storage, **bypassing your server** for data transfer
- **Upload flow:** client requests URL, server generates presigned PUT URL, client uploads to S3, notifies server
- **Download flow:** server generates presigned GET URL, client downloads from S3
- **Security:** short expirations, server-generated keys, content-type restrictions
- For public read-heavy content, prefer a [CDN](/learn/object-storage-cdn). For private content at scale, consider CloudFront signed URLs

**Interview golden rule:**

```
Never proxy large files through your application servers.
Use presigned URLs to let clients talk directly to object storage,
and explain the security controls that make this safe.
```
