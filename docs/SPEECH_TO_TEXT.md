# Speech to Text Integration

This document explains how to use and test the OpenAI Realtime speech to text feature integrated into the practice steps.

## Overview

The speech to text feature uses OpenAI Realtime mini over WebRTC for low latency streaming transcription. The browser connects directly to OpenAI using an ephemeral token, avoiding server streaming costs.

## Architecture

1. **Server Route** (`app/api/realtime/route.ts`)
   - Mints ephemeral session tokens from OpenAI
   - Runs server side only with your `OPENAI_API_KEY`
   - Tokens expire automatically for security

2. **WebRTC Hook** (`hooks/useRealtimeStt.ts`)
   - Manages peer connection to OpenAI
   - Handles audio capture and data channels
   - Provides interim and final transcript states

3. **UI Component** (`components/practice/PushToTalk.tsx`)
   - Push to talk button with hold or toggle modes
   - Shows live interim transcripts
   - Keyboard shortcut: Space to start/stop when focused
   - Cmd/Ctrl+M to switch between hold and toggle modes

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

### Optional: Web Speech API Fallback

To enable the browser's built-in speech recognition (Chrome only) as a fallback for local testing:

```bash
NEXT_PUBLIC_ENABLE_WEB_SPEECH=1
```

This is disabled by default. The WebRTC path is recommended for production.

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

- **Latency**: 300-800ms from speech to interim text
- **Accuracy**: High quality transcription from OpenAI Whisper
- **Connection**: Direct browser to OpenAI, no server proxy
- **Cost**: Only charged for actual audio sent (push to talk avoids silence costs)

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
- Ephemeral tokens expire automatically
- CORS restricted to allowed origins
- Microphone access requires user permission
- No audio is stored or processed on your servers
