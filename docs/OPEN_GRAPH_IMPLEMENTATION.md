# Open Graph Implementation for Rich Link Previews

This document describes the Open Graph (OG) meta tags implementation that enables rich link previews with dynamic thumbnails when sharing designs and practice sessions on social media platforms.

## Overview

The implementation generates beautiful preview cards with scores, design stats, and progress information when links are shared on LinkedIn, Twitter, Facebook, and other platforms that support Open Graph protocol.

## Architecture

### 1. Dynamic Metadata Generation

**For Sandbox (/play) Pages:**

- Location: `/app/play/layout.tsx`
- Generates metadata based on the `s` query parameter
- Displays component count, connection count, and scenario name
- Uses Next.js `generateMetadata` function for server-side rendering

**For Practice Pages:**

- Location: `/app/practice/[slug]/layout.tsx`
- Generates metadata based on the full practice session state
- Displays scores, grades, completed steps, and design stats
- Validates that the shared state matches the expected slug

### 2. Dynamic OG Image Generation

**Sandbox OG Images:**

- Endpoint: `/api/og/route.tsx`
- Generates 1200x630 images showing:
  - Scenario name
  - Component count
  - Connection count
  - List of component types
- Uses Next.js `ImageResponse` API (Edge runtime)

**Practice Session OG Images:**

- Endpoint: `/api/og/practice/route.tsx`
- Generates 1200x630 images showing:
  - Grade badge (A+, A, B, C, D with colors)
  - Total score out of 100
  - Completed steps count
  - Component and connection stats
  - Completed steps list with checkmarks
- Uses Next.js `ImageResponse` API (Edge runtime)

### 3. UI Enhancements

**ScoreShareStep Component:**

- Location: `/components/practice/steps/ScoreShareStep.tsx`
- Added visual indicator for rich preview support
- Updated to share full practice session (with scores) instead of just design
- Shares to `/practice/[slug]?s=...` with encoded practice state

## Implementation Details

### Share URL Format

**Sandbox Shares:**

```
https://systemdesignsandbox.com/play?s=<encoded_design>
```

**Practice Session Shares:**

```
https://systemdesignsandbox.com/practice/url-shortener?s=<encoded_practice_state>
```

### OG Image URL Format

**Sandbox:**

```
https://systemdesignsandbox.com/api/og?s=<encoded_design>
```

**Practice:**

```
https://systemdesignsandbox.com/api/og/practice?s=<encoded_practice_state>
```

### Design Encoding

Both share types use the `encodeDesign()` and `decodeDesign()` functions from `/lib/shareLink.ts`:

- JSON → Pako deflate → Base64 (URL-safe)
- Enables zero-backend sharing with all state in URL

## Open Graph Tags

The implementation sets the following Open Graph meta tags:

```html
<meta property="og:title" content="System Design: [Scenario Name]" />
<meta property="og:description" content="[Dynamic description with stats]" />
<meta property="og:image" content="https://systemdesignsandbox.com/api/og?s=..." />
<meta property="og:url" content="https://systemdesignsandbox.com/play?s=..." />
<meta property="og:type" content="website" />
```

Plus Twitter Card tags:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="..." />
```

## Testing

### Local Testing

1. **Test OG Image Generation:**

   ```bash
   # Start dev server
   npm run dev

   # Visit OG endpoints directly
   http://localhost:3000/api/og
   http://localhost:3000/api/og/practice
   ```

2. **Test with Share Parameter:**
   - Complete a practice session
   - Click "Share results" button
   - Visit the copied URL
   - View page source to see OG tags

### Production Testing

Use these tools to validate Open Graph tags:

1. **LinkedIn Post Inspector:**
   - https://www.linkedin.com/post-inspector/
   - Enter your share URL
   - See the preview card

2. **Facebook Sharing Debugger:**
   - https://developers.facebook.com/tools/debug/
   - Enter your share URL
   - View and refresh cache

3. **Twitter Card Validator:**
   - https://cards-dev.twitter.com/validator
   - Enter your share URL
   - Preview the card

4. **Open Graph Debugger:**
   - https://www.opengraph.xyz/
   - Enter your share URL
   - See all OG tags

## Error Handling

- If `s` parameter is missing: Returns default OG image
- If decoding fails: Returns default metadata with fallback image
- If image generation fails: Returns error image with warning icon
- All errors are logged to console for debugging

## Caching

- OG images are generated on-demand (Edge runtime)
- Social platforms cache OG images for 7-30 days
- Use Facebook Debugger to force refresh cache
- No server-side caching implemented (stateless generation)

## Visual Features

### Practice Session OG Cards Include:

- **Grade Badge**: Color-coded (emerald for A+/A, cyan for B, amber for C, red for D)
- **Score Display**: Large score out of 100
- **Completion Stats**: Steps completed, components, connections
- **Completed Steps List**: Checkmarks for each completed step
- **Gradient Background**: Dark theme with subtle dot pattern
- **Brand Colors**: Emerald and cyan gradient for headers

### Design Sandbox OG Cards Include:

- **Scenario Name**: Formatted title
- **Component Count**: With emerald accent
- **Connection Count**: With cyan accent
- **Component Types**: Pills showing up to 6 types
- **Gradient Background**: Consistent with practice cards

## References

- [Next.js OG Image Generation](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
