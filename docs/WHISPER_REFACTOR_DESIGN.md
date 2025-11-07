# Speech-to-Text Refactor: Realtime API → Direct Whisper API

> **STATUS: MIGRATION COMPLETE** ✅
> This migration was successfully completed. All Realtime API code has been removed.
> The application now uses only the Direct Whisper API implementation.

## Executive Summary

This document outlines the design for refactoring our speech-to-text implementation from OpenAI's Realtime API (WebRTC-based) to OpenAI's direct Whisper API (REST-based). This change aims to reduce complexity, improve startup latency, and lower costs while maintaining transcription quality.

## Current Architecture

### What We're Using Now

**Model Stack:**
- GPT-4o Realtime API (`gpt-4o-realtime-preview-2024-12-17`)
- Whisper-1 for transcription (via `input_audio_transcription` config)

**Architecture:**
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
    ↓
Stream audio via WebRTC
    ↓
Receive interim/final transcripts via data channel
```

**Files Involved:**
- `app/api/realtime/route.ts` - Token minting server route
- `hooks/useRealtimeStt.ts` - WebRTC peer connection management (680 lines)
- `components/practice/PushToTalk.tsx` - UI component
- `components/practice/VoiceCaptureBridge.tsx` - Integration bridge

### Problems with Current Approach

1. **Over-engineered**: Using a conversational AI API for simple transcription
2. **High Latency**: WebRTC negotiation adds ~1.5-2 seconds before recording starts
3. **Complex Code**: 680 lines managing peer connections, data channels, session state
4. **Higher Cost**: Realtime API pricing vs standard Whisper API
5. **Overkill Features**: We don't use text-to-speech, turn detection, or conversation features

## Target Architecture

### Direct Whisper API Approach

**Model:**
- OpenAI Whisper API (`whisper-1` model via `/v1/audio/transcriptions`)

**Architecture:**
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

### Trade-offs

| Aspect | Current (Realtime API) | Target (Whisper API) |
|--------|------------------------|----------------------|
| **Startup Latency** | 1500-2800ms | ~500ms |
| **Code Complexity** | 680 lines | ~150 lines |
| **Streaming** | Real-time interim results | No (batch only) |
| **Accuracy** | Whisper-1 | Whisper-1 (same) |
| **Cost per 1000 min** | $6.00 (Realtime pricing) | $6.00 (Whisper pricing) |
| **Max Audio Length** | Unlimited streaming | 25 MB per file |
| **Browser Support** | Chrome/Firefox/Safari | Chrome/Firefox/Safari |

**Key Trade-off:** We lose interim transcripts during recording, but gain 60-80% faster startup and dramatically simpler code.

## Implementation Design

### 1. New Hook: `useWhisperStt.ts`

```typescript
// hooks/useWhisperStt.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { logger } from "@/lib/logger";

export type WhisperSttOptions = {
  stepId: string;
  onFinal: (text: string) => void;
};

export type WhisperSttState = {
  isRecording: boolean;
  isProcessing: boolean;
  finalText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
};

export function useWhisperStt(options: WhisperSttOptions): WhisperSttState {
  const { onFinal } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (isRecording) return;

    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Whisper prefers 16kHz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsProcessing(true);

        try {
          // Combine audio chunks into blob
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          // Convert to file
          const audioFile = new File([audioBlob], "recording.webm", {
            type: mimeType,
          });

          // Send to transcription API
          const formData = new FormData();
          formData.append("file", audioFile);
          formData.append("model", "whisper-1");
          formData.append("language", "en"); // Optional: can be auto-detected

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Transcription failed");
          }

          const data = await response.json();
          const transcript = data.text?.trim() || "";

          if (transcript) {
            setFinalText((prev) => (prev ? `${prev} ${transcript}` : transcript));
            onFinal(transcript);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Transcription failed";
          logger.error("Transcription error:", err);
          setError(message);
        } finally {
          setIsProcessing(false);
          cleanup();
        }
      };

      recorder.start();
      setIsRecording(true);
      logger.log("Recording started");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      logger.error("Start error:", err);
      setError(message);
    }
  }, [isRecording, onFinal]);

  const stop = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    logger.log("Stopping recording...");
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, [isRecording]);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    isProcessing,
    finalText,
    error,
    start,
    stop,
  };
}
```

### 2. New API Route: `/api/transcribe`

```typescript
// app/api/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel function timeout

type WhisperResponse = {
  text: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 401 }
    );
  }

  try {
    // CORS check
    const origin = req.headers.get("origin") || "";
    const allowedOrigins = [
      "http://localhost:3000",
      "https://www.systemdesignsandbox.com",
    ];

    if (!allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const model = formData.get("model") as string || "whisper-1";
    const language = formData.get("language") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Check file size (25 MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large (max 25 MB)" },
        { status: 400 }
      );
    }

    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", model);
    if (language) {
      whisperFormData.append("language", language);
    }

    const startTime = Date.now();
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
      }
    );

    const duration = Date.now() - startTime;
    logger.log(`Whisper API responded in ${duration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Whisper API error:", errorText);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as WhisperResponse;

    return NextResponse.json(
      { text: data.text },
      {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    logger.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
```

### 3. Update PushToTalk Component

```typescript
// components/practice/PushToTalk.tsx (changes only)

// Add import
import { useWhisperStt } from "@/hooks/useWhisperStt";

// In component:
const whisperStt = useWhisperStt({
  stepId,
  onFinal,
});

// Use whisperStt instead of realtimeStt when not using web speech
const { isRecording, isProcessing, error, start, stop } =
  useWebSpeech ? webSpeechStt : whisperStt;

// Note: No interimText with Whisper API (batch only)
```

## Migration Plan

### Phase 1: Preparation (Low Risk)

1. **Create new hook**
   - Add `hooks/useWhisperStt.ts`
   - Add unit tests
   - Test in isolation

2. **Create new API route**
   - Add `app/api/transcribe/route.ts`
   - Test with curl/Postman
   - Verify CORS and error handling

3. **Add feature flag**
   ```typescript
   // .env.local
   NEXT_PUBLIC_USE_WHISPER_DIRECT=0  # Default: keep Realtime API
   ```

### Phase 2: Parallel Testing (Medium Risk)

4. **Add conditional logic to PushToTalk**
   ```typescript
   const useWhisperDirect = process.env.NEXT_PUBLIC_USE_WHISPER_DIRECT === "1";
   const sttHook = useWebSpeech
     ? webSpeechStt
     : useWhisperDirect
       ? whisperStt
       : realtimeStt;
   ```

5. **Deploy to staging**
   - Test with NEXT_PUBLIC_USE_WHISPER_DIRECT=1
   - Compare latency metrics
   - Verify transcription quality
   - Test error scenarios (no mic, network failure, large files)

6. **Canary rollout (10% of users)**
   - Enable for 10% of production traffic
   - Monitor error rates
   - Collect latency data
   - Gather user feedback

### Phase 3: Full Rollout (Higher Risk)

7. **Gradual rollout**
   - 25% → 50% → 75% → 100% over 1 week
   - Monitor key metrics at each step
   - Rollback plan: flip feature flag to 0

8. **Cleanup**
   - Remove old Realtime API code
   - Delete `hooks/useRealtimeStt.ts`
   - Delete `app/api/realtime/route.ts`
   - Remove feature flag
   - Update documentation

## Rollback Plan

If issues arise:

1. **Immediate rollback**: Set `NEXT_PUBLIC_USE_WHISPER_DIRECT=0` and redeploy (~2 minutes)
2. **Database**: No database changes, no rollback needed
3. **Monitoring**: Watch error rates, latency p95, user feedback
4. **Decision criteria**: Rollback if error rate >5% or latency p95 >3s

## Testing Strategy

### Unit Tests

```typescript
// __tests__/hooks/useWhisperStt.test.ts
describe("useWhisperStt", () => {
  it("starts recording and captures audio", async () => {
    // Mock MediaRecorder
    // Test start/stop flow
  });

  it("handles transcription errors gracefully", async () => {
    // Mock failed API call
    // Verify error state
  });

  it("respects 25MB file size limit", async () => {
    // Mock large audio file
    // Verify rejection
  });
});
```

### Integration Tests

```typescript
// __tests__/api/transcribe.test.ts
describe("/api/transcribe", () => {
  it("transcribes audio successfully", async () => {
    // Send real audio file
    // Verify response format
  });

  it("rejects files over 25MB", async () => {
    // Send large file
    // Verify 400 error
  });

  it("enforces CORS", async () => {
    // Send from invalid origin
    // Verify 403 error
  });
});
```

### Manual Testing Checklist

- [ ] Click mic → record → release → verify transcript
- [ ] Test with background noise
- [ ] Test with short utterances (<1 second)
- [ ] Test with long recordings (>30 seconds)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test with denied microphone permissions
- [ ] Test with slow network connection
- [ ] Test rapid start/stop cycles

## Performance Expectations

### Latency Breakdown (Whisper API)

```
User clicks mic:        0ms
Mic permission:         ~500ms (can be pre-requested)
Start recording:        ~50ms
----------------
Ready to record:        ~550ms (vs 1500-2800ms current)

User speaks:            variable
User releases:          0ms
Process audio:          ~100ms
Upload to API:          ~200-400ms (depends on audio length)
Whisper processing:     ~200-600ms (depends on audio length)
----------------
Total to transcript:    ~500-1100ms after recording stops
```

### Cost Comparison

**Current (Realtime API):**
- $6.00 per 1000 minutes of audio
- Additional WebRTC overhead (bandwidth, compute)

**Target (Whisper API):**
- $6.00 per 1000 minutes of audio
- No additional overhead

**Verdict:** Similar cost, but simpler architecture reduces maintenance burden.

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| No interim transcripts annoys users | Medium | Medium | Add visual indicator that processing is happening |
| 25MB file size limit hit | Low | Low | Warn users if recording >5 minutes |
| Whisper API rate limits | High | Low | Implement exponential backoff retry |
| Browser compatibility issues | Medium | Low | Test on all major browsers before rollout |
| Audio format conversion bugs | High | Medium | Extensive testing with different devices |

## Success Metrics

Track these metrics before/after migration:

1. **Startup Latency**: Time from mic click to recording start
   - Target: <1 second (from current 1.5-2.8s)

2. **Transcription Accuracy**: Word Error Rate (WER)
   - Target: Same as current (Whisper-1)

3. **Error Rate**: Failed transcriptions
   - Target: <2%

4. **User Satisfaction**: Feedback/ratings
   - Target: Maintain or improve

5. **Cost per Transcript**
   - Target: 20-30% reduction (less infrastructure complexity)

## Open Questions

1. **Do users actually value interim transcripts?**
   - Need to survey users or A/B test

2. **How long are typical recordings?**
   - Analyze current usage to ensure <25MB limit is fine

3. **What's our peak transcription load?**
   - Check if Whisper API rate limits will be an issue

4. **Should we add a progress indicator during processing?**
   - UX research needed

## Alternative Considered: Deepgram Nova-3

If we're willing to switch providers, Deepgram offers:

- **36% better accuracy** than Whisper
- **200ms latency** (vs 500-1100ms)
- **Streaming support** (keep interim transcripts)
- **$4.30 per 1000 minutes** (cheaper)

Trade-off: Adds dependency on another service.

**Recommendation:** Start with Whisper API refactor (lower risk), then consider Deepgram if we need streaming back.

## Conclusion

Refactoring to direct Whisper API offers:

✅ **60-80% faster startup** (550ms vs 1500-2800ms)
✅ **80% less code** (150 lines vs 680 lines)
✅ **Simpler architecture** (REST vs WebRTC)
✅ **Same accuracy** (Whisper-1)
✅ **Lower maintenance burden**

Trade-off:
❌ **No interim transcripts** (batch only)

**Recommended Action:** Proceed with phased migration starting with feature-flagged testing.

---

**Next Steps:**
1. Review and approve this design
2. Create implementation tickets
3. Start Phase 1 (low-risk preparation)
4. Schedule Phase 2 testing for next sprint
