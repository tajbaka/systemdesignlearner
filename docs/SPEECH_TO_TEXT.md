# Speech-to-Text Integration Guide

**Complete documentation for speech-to-text features in practice mode.**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Migration History](#migration-history)
4. [Setup & Configuration](#setup--configuration)
5. [Usage & Testing](#usage--testing)
6. [Integration Guide](#integration-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview

We support two speech-to-text implementations:

1. **Whisper Direct API** (Default) - Fast, simple, and accurate transcription via OpenAI Whisper
2. **Web Speech API** (Optional) - Browser-native fallback (Chrome only)

The default implementation uses the OpenAI Whisper API directly via REST for optimal performance.

### Why Whisper Direct API?

✅ **60-80% faster startup** (550ms vs 1500-2800ms)
✅ **80% less code** (150 lines vs 680 lines)
✅ **Simpler architecture** (REST vs WebRTC)
✅ **Same accuracy** (Whisper-1)
✅ **Lower maintenance burden**

Trade-off:
❌ **No interim transcripts** (batch only)

---

## Architecture

### Whisper Direct API (Default)

#### 1. Server Route (`app/api/transcribe/route.ts`)

- Proxies audio files to OpenAI Whisper API
- Runs server-side only with your `OPENAI_API_KEY`
- Handles file size validation (25 MB max)

#### 2. Hook (`hooks/useWhisperStt.ts`)

- Uses MediaRecorder for audio capture
- Records to blob, uploads on stop
- Fast startup (~175ms)
- Batch-only (no interim transcripts)

### Web Speech API (Optional Fallback)

#### 3. Hook (`hooks/useWebSpeechStt.ts`)

- Browser-native speech recognition (Chrome only)
- No server required
- Enabled with `NEXT_PUBLIC_ENABLE_WEB_SPEECH=1`

### UI Components

#### 4. PushToTalk Component (`components/practice/PushToTalk.tsx`)

- Push to talk button with hold or toggle modes
- Keyboard shortcut: Space to start/stop when focused
- Cmd/Ctrl+M to switch between hold and toggle modes
- Automatically selects implementation (Web Speech or Whisper)

#### 5. Bridge Component (`components/practice/VoiceCaptureBridge.tsx`)

- Integrates PushToTalk with existing textarea inputs
- Appends final transcripts to the current value
- Integrated into practice step forms

---

## Migration History

### Previous Architecture (Realtime API)

**What We Used Before:**

- GPT-4o Realtime API (`gpt-4o-realtime-preview-2024-12-17`)
- Whisper-1 for transcription (via `input_audio_transcription` config)
- WebRTC peer connections
- Complex 680-line implementation

**Problems with Realtime API:**

1. **Over-engineered**: Using a conversational AI API for simple transcription
2. **High Latency**: WebRTC negotiation added ~1.5-2 seconds before recording starts
3. **Complex Code**: 680 lines managing peer connections, data channels, session state
4. **Higher Cost**: Realtime API pricing vs standard Whisper API
5. **Overkill Features**: We didn't use text-to-speech, turn detection, or conversation features

**Migration Flow:**

```
User clicks mic
    ↓
Request mic permission (~500ms)
    ↓
Fetch ephemeral token from /api/realtime (~200-800ms)
    ↓
Establish WebRTC peer connection (~500-1000ms)
    ↓
Create data channel + wait for open (~200-500ms)
    ↓
Send session.update with Whisper-1 config
    ↓
Ready to record (Total: ~1500-2800ms)
```

### Current Architecture (Whisper API)

**Simplified Flow:**

```
User clicks mic
    ↓
Request mic permission (~500ms, can be pre-requested)
    ↓
Start MediaRecorder immediately
    ↓
Ready to record (Total: ~500ms)
    ↓
User speaks
    ↓
User releases mic
    ↓
Stop recording + convert to file
    ↓
POST to /api/transcribe (~300-1000ms depending on audio length)
    ↓
Return final transcript
```

### Trade-off Comparison

| Aspect                | Realtime API (Old)        | Whisper API (Current) |
| --------------------- | ------------------------- | --------------------- |
| **Startup Latency**   | 1500-2800ms               | ~500ms                |
| **Code Complexity**   | 680 lines                 | ~150 lines            |
| **Streaming**         | Real-time interim results | No (batch only)       |
| **Accuracy**          | Whisper-1                 | Whisper-1 (same)      |
| **Cost per 1000 min** | $6.00                     | $6.00                 |
| **Max Audio Length**  | Unlimited streaming       | 25 MB per file        |
| **Browser Support**   | Chrome/Firefox/Safari     | Chrome/Firefox/Safari |

**Status:** Migration complete ✅. All Realtime API code has been removed.

---

## Setup & Configuration

### Required Environment Variables

Set your OpenAI API key in `.env` or `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-...
```

### Optional: Web Speech API Fallback

To enable the browser's built-in speech recognition (Chrome only):

```bash
NEXT_PUBLIC_ENABLE_WEB_SPEECH=1
```

This is disabled by default. Note: Web Speech API takes priority over Whisper Direct when enabled.

### Vercel Deployment

1. Set the `OPENAI_API_KEY` environment variable in your Vercel project settings
2. Deploy normally. The API route is marked as `dynamic = "force-dynamic"`
3. No additional configuration needed

---

## Usage & Testing

### Local Testing

#### Basic Test

1. Start the development server:

```bash
pnpm dev
```

2. Navigate to a practice step page (Functional or Non-Functional Requirements)

3. Click and hold the microphone button in the textarea

4. Speak your answer

5. Release the button to stop recording

6. Verify:
   - Final text is appended to the textarea when you stop recording
   - Multiple recordings accumulate in the same textarea
   - Transcription typically completes within 500-2000ms after stopping

### Testing Modes

**Hold Mode** (default):

- Press and hold the mic button
- Speak while holding
- Release to stop

**Toggle Mode**:

- Click the "Hold mode" text below the button to switch
- Click mic button once to start
- Click again to stop
- Or use Space key when button is focused

### Keyboard Shortcuts

- **Space**: Start/stop recording (when button is focused)
- **Cmd/Ctrl+M**: Switch between hold and toggle modes

### Error Testing

1. **No microphone permission**:
   - Deny microphone access when prompted
   - Should show "Microphone access denied" error

2. **No API key**:
   - Remove `OPENAI_API_KEY` from environment
   - Should show connection error

3. **Network failure**:
   - Disconnect internet while recording
   - Should show "Connection lost" error

---

## Integration Guide

### Adding Speech-to-Text to Components

To add speech to text to other textarea components:

```tsx
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";

function MyComponent() {
  const [value, setValue] = useState("");

  return (
    <div className="relative">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} className="w-full pr-14" />
      <div className="absolute bottom-3 right-3">
        <VoiceCaptureBridge value={value} onChange={setValue} stepId="my-unique-step-id" />
      </div>
    </div>
  );
}
```

### Browser Compatibility

**Whisper Direct** (default):

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

**Web Speech API** (optional):

- Chrome/Edge only
- Must enable with `NEXT_PUBLIC_ENABLE_WEB_SPEECH=1`

### Performance Expectations

#### Whisper Direct API (Default)

- **Startup Latency**: ~175ms (mic permission + setup)
- **Transcription Latency**: 500-2000ms after recording stops (depends on audio length)
- **Accuracy**: High quality (Whisper-1 model)
- **Interim Transcripts**: No (batch only)
- **Cost**: $6.00 per 1000 minutes
- **Browser Support**: Chrome, Firefox, Safari (all major browsers)
- **Connection**: Audio uploaded to server, server calls OpenAI
- **Max Recording**: 25 MB per file

#### Latency Breakdown

```
User clicks mic:        0ms
Mic permission:         ~500ms (can be pre-requested)
Start recording:        ~50ms
----------------
Ready to record:        ~550ms (vs 1500-2800ms with Realtime API)

User speaks:            variable
User releases:          0ms
Process audio:          ~100ms
Upload to API:          ~200-400ms (depends on audio length)
Whisper processing:     ~200-600ms (depends on audio length)
----------------
Total to transcript:    ~500-1100ms after recording stops
```

---

## Troubleshooting

### Mic button does nothing

1. Check browser console for errors
2. Verify `OPENAI_API_KEY` is set
3. Check microphone permissions in browser settings
4. Try refreshing the page

### Poor transcription quality

1. Check microphone input levels
2. Reduce background noise
3. Speak clearly at normal pace
4. Ensure stable internet connection

### Connection errors

1. Verify API key is valid
2. Check network connectivity
3. Look for CORS errors in console
4. Verify API route is accessible at `/api/transcribe`

### Common Issues

**Issue**: Recording starts but never stops

- Check that you're releasing the button in hold mode
- Try switching to toggle mode with Cmd/Ctrl+M

**Issue**: Transcript is empty

- Ensure you spoke clearly
- Check microphone levels in system settings
- Verify internet connection during upload

**Issue**: "Microphone access denied"

- Check browser permissions in settings
- Click the lock icon in address bar to manage permissions
- Try a different browser if Safari is blocking

---

## Security Notes

- API keys are never exposed to the browser
- CORS restricted to allowed origins
- Microphone access requires user permission
- Audio files are temporarily processed, not stored
- Audio files are proxied through API routes to protect keys

---

## Migration Notes (For Reference)

### Files Removed (Realtime API)

- `app/api/realtime/route.ts` - Token minting server route
- `hooks/useRealtimeStt.ts` - WebRTC peer connection management (680 lines)

### Files Added (Whisper API)

- `app/api/transcribe/route.ts` - Simple REST proxy to Whisper API
- `hooks/useWhisperStt.ts` - MediaRecorder-based implementation

### Files Updated

- `components/practice/PushToTalk.tsx` - Switched from Realtime to Whisper hook
- `components/practice/VoiceCaptureBridge.tsx` - Updated integration

### Why We Migrated

The Realtime API was designed for conversational AI applications with features like:

- Real-time bidirectional communication
- Text-to-speech output
- Turn detection for conversations
- Function calling during conversation

**We only needed:** Simple speech-to-text transcription

**Result:** By switching to the direct Whisper API, we achieved:

- 60-80% faster startup
- 80% less code to maintain
- Identical transcription quality
- Same cost structure
- Simpler debugging and error handling

---

## Alternative Considered: Deepgram Nova-3

If switching providers is an option, Deepgram offers:

- **36% better accuracy** than Whisper
- **200ms latency** (vs 500-1100ms)
- **Streaming support** (keep interim transcripts)
- **$4.30 per 1000 minutes** (cheaper)

Trade-off: Adds dependency on another service.

**Recommendation:** Current Whisper API implementation is working well. Consider Deepgram only if streaming/interim transcripts become a critical requirement.

---

**Status:** Whisper Direct API implementation complete ✅. Migration from Realtime API successful. All features working as expected.
