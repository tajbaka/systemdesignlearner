# Speech to Text Integration

This document explains how to use and test the speech-to-text features integrated into the practice steps.

## Overview

We support two OpenAI-powered speech-to-text implementations:

1. **Whisper Direct API** (Default) - Simpler, faster startup, batch-only transcription
2. **Realtime API** (Legacy) - WebRTC-based streaming with interim transcripts
3. **Web Speech API** (Optional) - Browser-native fallback (Chrome only)

The default implementation uses the OpenAI Whisper API directly via REST for simplicity and performance.

## Architecture

### Whisper Direct (Default)

1. **Server Route** (`app/api/transcribe/route.ts`)
   - Proxies audio files to OpenAI Whisper API
   - Runs server-side only with your `OPENAI_API_KEY`
   - Handles file size validation (25 MB max)

2. **Hook** (`hooks/useWhisperStt.ts`)
   - Uses MediaRecorder for audio capture
   - Records to blob, uploads on stop
   - Fast startup (~500ms vs 1500-2800ms)
   - Batch-only (no interim transcripts)

### Realtime API (Legacy)

1. **Server Route** (`app/api/realtime/route.ts`)
   - Mints ephemeral session tokens from OpenAI
   - Tokens expire automatically for security

2. **WebRTC Hook** (`hooks/useRealtimeStt.ts`)
   - Manages peer connection to OpenAI
   - Handles audio capture and data channels
   - Provides interim and final transcript states
   - Slower startup but supports streaming

### Shared Components

3. **UI Component** (`components/practice/PushToTalk.tsx`)
   - Push to talk button with hold or toggle modes
   - Shows live interim transcripts (Realtime API only)
   - Keyboard shortcut: Space to start/stop when focused
   - Cmd/Ctrl+M to switch between hold and toggle modes
   - Automatically selects implementation based on feature flags

4. **Bridge Component** (`components/practice/VoiceCaptureBridge.tsx`)
   - Integrates PushToTalk with existing textarea inputs
   - Appends final transcripts to the current value
   - Already integrated into Functional and Non-Functional Requirements steps

## Environment Setup

### Required

Set your OpenAI API key in `.env` or `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-...
```

### Optional: Choose Implementation

**Whisper Direct API (Default, Recommended):**
```bash
NEXT_PUBLIC_USE_WHISPER_DIRECT=1  # or omit (defaults to 1)
```
- Faster startup (~500ms)
- Simpler implementation
- No interim transcripts (batch only)
- Same transcription quality

**Realtime API (Legacy):**
```bash
NEXT_PUBLIC_USE_WHISPER_DIRECT=0
```
- Slower startup (~1500-2800ms)
- Supports interim transcripts
- More complex WebRTC implementation
- Use if you need streaming transcription

### Optional: Web Speech API Fallback

To enable the browser's built-in speech recognition (Chrome only):

```bash
NEXT_PUBLIC_ENABLE_WEB_SPEECH=1
```

This is disabled by default. Note: Web Speech API takes priority over both Whisper implementations when enabled.

## Vercel Deployment

1. Set the `OPENAI_API_KEY` environment variable in your Vercel project settings
2. Deploy normally. The API route is marked as `dynamic = "force-dynamic"`
3. No additional configuration needed

## Local Testing

### Basic Test

1. Start the development server:
```bash
pnpm dev
```

2. Navigate to a practice step page (Functional or Non-Functional Requirements)

3. Click and hold the microphone button in the textarea

4. Speak your answer

5. Release the button to stop recording

6. Verify:
   - Interim text appears within 300-800ms while speaking
   - Final text is appended to the textarea when you stop
   - Multiple recordings accumulate in the same textarea

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

## Browser Compatibility

**WebRTC Path** (default):
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

**Web Speech API Fallback** (optional):
- Chrome/Edge only
- Must enable with `NEXT_PUBLIC_ENABLE_WEB_SPEECH=1`

## Performance Expectations

### Whisper Direct API (Default)

- **Startup Latency**: ~500ms (mic permission + setup)
- **Transcription Latency**: 200-1000ms after recording stops
- **Accuracy**: High quality (Whisper-1 model)
- **Interim Transcripts**: No (batch only)
- **Cost**: $6.00 per 1000 minutes

### Realtime API (Legacy)

- **Startup Latency**: 1500-2800ms (WebRTC negotiation + token fetch)
- **Transcription Latency**: 300-800ms from speech to interim text
- **Accuracy**: High quality (Whisper-1 model)
- **Interim Transcripts**: Yes (streaming)
- **Cost**: $6.00 per 1000 minutes + WebRTC overhead

### Both Implementations

- **Connection**: Direct browser to OpenAI, no server proxy for audio
- **Browser Support**: Chrome, Firefox, Safari (all major browsers)
- **Cost Optimization**: Push to talk avoids transcribing silence

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
4. Verify API route is accessible at `/api/realtime`

### Interim text not showing

This is expected behavior during very short utterances. Speak for at least 1-2 seconds to see interim results.

## Code Integration

To add speech to text to other textarea components:

```tsx
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";

function MyComponent() {
  const [value, setValue] = useState("");

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full pr-14"
      />
      <div className="absolute bottom-3 right-3">
        <VoiceCaptureBridge
          value={value}
          onChange={setValue}
          stepId="my-unique-step-id"
        />
      </div>
    </div>
  );
}
```

## Security Notes

- API keys are never exposed to the browser
- Ephemeral tokens expire automatically (Realtime API)
- CORS restricted to allowed origins
- Microphone access requires user permission
- No audio is stored or processed on your servers
- Audio files are proxied through API routes to protect keys

## Migration Guide: Realtime API → Whisper Direct

If you're currently using the Realtime API and want to switch to Whisper Direct:

1. **Set the feature flag:**
   ```bash
   NEXT_PUBLIC_USE_WHISPER_DIRECT=1
   ```

2. **Test locally:**
   - Start dev server: `npm run dev`
   - Navigate to a practice step
   - Test recording and transcription
   - Verify startup is faster (~500ms vs 1500-2800ms)

3. **Deploy to production:**
   - Set `NEXT_PUBLIC_USE_WHISPER_DIRECT=1` in Vercel environment variables
   - Deploy and monitor for issues

4. **Key Differences to Communicate:**
   - Users won't see interim transcripts while speaking
   - They'll see a processing indicator instead
   - Final transcript appears after they release the mic button
   - Overall experience is faster and more reliable

5. **Rollback if needed:**
   - Set `NEXT_PUBLIC_USE_WHISPER_DIRECT=0`
   - Redeploy (~2 minutes)

## Performance Comparison

| Feature | Whisper Direct | Realtime API |
|---------|---------------|--------------|
| Startup Time | ~500ms | 1500-2800ms |
| Interim Transcripts | ❌ No | ✅ Yes |
| Code Complexity | Low (150 lines) | High (680 lines) |
| Transcription Quality | Same (Whisper-1) | Same (Whisper-1) |
| Cost | Same | Same |
| Reliability | Higher | Lower (WebRTC can be finicky) |
| Browser Support | Excellent | Good |

**Recommendation:** Use Whisper Direct unless you specifically need interim transcripts during speech.
