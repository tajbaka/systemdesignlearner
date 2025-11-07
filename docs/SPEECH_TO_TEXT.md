# Speech to Text Integration

This document explains how to use and test the speech-to-text features integrated into the practice steps.

## Overview

We support two speech-to-text implementations:

1. **Whisper Direct API** (Default) - Fast, simple, and accurate transcription via OpenAI Whisper
2. **Web Speech API** (Optional) - Browser-native fallback (Chrome only)

The default implementation uses the OpenAI Whisper API directly via REST for optimal performance.

## Architecture

### Whisper Direct API (Default)

1. **Server Route** (`app/api/transcribe/route.ts`)
   - Proxies audio files to OpenAI Whisper API
   - Runs server-side only with your `OPENAI_API_KEY`
   - Handles file size validation (25 MB max)

2. **Hook** (`hooks/useWhisperStt.ts`)
   - Uses MediaRecorder for audio capture
   - Records to blob, uploads on stop
   - Fast startup (~175ms)
   - Batch-only (no interim transcripts)

### Web Speech API (Optional Fallback)

3. **Hook** (`hooks/useWebSpeechStt.ts`)
   - Browser-native speech recognition (Chrome only)
   - No server required
   - Enabled with `NEXT_PUBLIC_ENABLE_WEB_SPEECH=1`

### UI Components

4. **PushToTalk Component** (`components/practice/PushToTalk.tsx`)
   - Push to talk button with hold or toggle modes
   - Keyboard shortcut: Space to start/stop when focused
   - Cmd/Ctrl+M to switch between hold and toggle modes
   - Automatically selects implementation (Web Speech or Whisper)

5. **Bridge Component** (`components/practice/VoiceCaptureBridge.tsx`)
   - Integrates PushToTalk with existing textarea inputs
   - Appends final transcripts to the current value
   - Integrated into practice step forms

## Environment Setup

### Required

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

## Browser Compatibility

**Whisper Direct** (default):
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

**Web Speech API** (optional):
- Chrome/Edge only
- Must enable with `NEXT_PUBLIC_ENABLE_WEB_SPEECH=1`

## Performance Expectations

### Whisper Direct API (Default)

- **Startup Latency**: ~175ms (mic permission + setup)
- **Transcription Latency**: 500-2000ms after recording stops (depends on audio length)
- **Accuracy**: High quality (Whisper-1 model)
- **Interim Transcripts**: No (batch only)
- **Cost**: $6.00 per 1000 minutes
- **Browser Support**: Chrome, Firefox, Safari (all major browsers)
- **Connection**: Audio uploaded to server, server calls OpenAI
- **Max Recording**: 25 MB per file

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
- CORS restricted to allowed origins
- Microphone access requires user permission
- Audio files are temporarily processed, not stored
- Audio files are proxied through API routes to protect keys
