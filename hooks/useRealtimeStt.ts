"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RealtimeEvent,
  RealtimeSessionToken,
  SttHookOptions,
  SttHookState,
} from "@/lib/realtime/types";
import { logger } from "@/lib/logger";

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: 24000,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function useRealtimeStt(options: SttHookOptions): SttHookState {
  const { stepId, onInterim, onFinal } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentStepIdRef = useRef(stepId);
  const sessionIdRef = useRef(0);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(isRecording);
  const interimTextRef = useRef(interimText);
  const processedItemIdsRef = useRef<Set<string>>(new Set());
  const processedTranscriptsRef = useRef<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);
  const readyTimeRef = useRef<number>(0);
  const preWarmTokenRef = useRef<{
    token: RealtimeSessionToken;
    fetchedAt: number;
  } | null>(null);
  const isPreWarmingRef = useRef(false);

  useEffect(() => {
    currentStepIdRef.current = stepId;
  }, [stepId]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  const clearCleanupTimeout = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (err) {
        logger.error("Error closing data channel:", err);
      }
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (err) {
        logger.error("Error closing peer connection:", err);
      }
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        logger.error("Error stopping media stream:", err);
      }
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setIsConnecting(false);
    setIsProcessing(false);
    isRecordingRef.current = false;
    sessionIdRef.current = 0;
    setInterimText("");
    clearCleanupTimeout();
    processedItemIdsRef.current.clear();
    processedTranscriptsRef.current.clear();
  }, [clearCleanupTimeout]);

  const pushFinalTranscript = useCallback(
    (transcript: string, sourceId?: string, priority: "high" | "low" = "low") => {
      const trimmed = transcript.trim();
      if (!trimmed) {
        return;
      }

      const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (sourceId) {
        if (processedItemIdsRef.current.has(sourceId)) {
          return;
        }
        processedItemIdsRef.current.add(sourceId);
      }

      const existingEntry = processedTranscriptsRef.current.has(normalized);

      if (existingEntry && priority === "low") {
        return;
      }

      processedTranscriptsRef.current.add(normalized);

      setFinalText((prev) => {
        if (existingEntry && priority === "high") {
          const prevWords = prev.split(/\s+/);
          const lastSegmentNormalized = prevWords[prevWords.length - 1]
            ?.toLowerCase()
            .replace(/[^a-z0-9]/g, "");

          if (lastSegmentNormalized === normalized) {
            prevWords.pop();
            const updated = prevWords.length > 0
              ? `${prevWords.join(" ")} ${trimmed}`
              : trimmed;

            readyTimeRef.current = 0;
            return updated;
          }
        }

        const next = prev ? `${prev} ${trimmed}` : trimmed;
        readyTimeRef.current = 0;
        return next;
      });

      if (onFinal) {
        if (typeof queueMicrotask === "function") {
          queueMicrotask(() => onFinal(trimmed));
        } else {
          setTimeout(() => onFinal(trimmed), 0);
        }
      }

      setInterimText("");
      setIsProcessing(false);
      clearCleanupTimeout();

      if (!isRecordingRef.current) {
        cleanup();
      }
    },
    [cleanup, clearCleanupTimeout, onFinal]
  );

  const appendInterimTranscript = useCallback(
    (delta: string) => {
      if (!delta) {
        return;
      }
      setInterimText((prev) => {
        const next = prev + delta;
        onInterim?.(next.trim());
        return next;
      });
    },
    [onInterim]
  );

  const extractTranscript = useCallback((source: unknown): string | null => {
    if (!source) {
      return null;
    }

    if (typeof source === "string") {
      return source;
    }

    if (typeof source === "object") {
      const candidate = source as Record<string, unknown>;

      if (typeof candidate.transcript === "string") {
        return candidate.transcript;
      }

      if (typeof candidate.text === "string") {
        return candidate.text;
      }

      if (
        candidate.text &&
        typeof (candidate.text as Record<string, unknown>).value === "string"
      ) {
        return (candidate.text as Record<string, unknown>).value as string;
      }

      if (typeof candidate.value === "string") {
        return candidate.value;
      }

      if (
        candidate.delta &&
        typeof (candidate.delta as Record<string, unknown>).value === "string"
      ) {
        return (candidate.delta as Record<string, unknown>).value as string;
      }

      if (Array.isArray(candidate.output)) {
        for (const entry of candidate.output) {
          const extracted = extractTranscript(entry);
          if (extracted) {
            return extracted;
          }
        }
      }

      if (Array.isArray(candidate.content)) {
        for (const entry of candidate.content) {
          const extracted = extractTranscript(entry);
          if (extracted) {
            return extracted;
          }
        }
      }

      if (
        candidate.message &&
        typeof (candidate.message as Record<string, unknown>).content ===
          "string"
      ) {
        return (candidate.message as Record<string, unknown>)
          .content as string;
      }
    }

    return null;
  }, []);

  const preWarmToken = useCallback(async () => {
    if (isPreWarmingRef.current || preWarmTokenRef.current) {
      return;
    }

    isPreWarmingRef.current = true;

    try {
      const tokenResponse = await fetch("/api/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text().catch(() => "Unable to read error");
        // Only log in development - pre-warming is a performance optimization, not critical
        if (process.env.NODE_ENV === "development") {
          logger.warn(
            `Pre-warm: Session token unavailable (${tokenResponse.status})`,
            errorText
          );
        }
        isPreWarmingRef.current = false;
        return;
      }

      const tokenData = (await tokenResponse.json()) as RealtimeSessionToken;
      preWarmTokenRef.current = {
        token: tokenData,
        fetchedAt: Date.now(),
      };
      isPreWarmingRef.current = false;
    } catch (err) {
      // Silently fail - pre-warming is optional, token will be fetched when actually needed
      if (process.env.NODE_ENV === "development") {
        logger.warn("Pre-warm token fetch failed:", err);
      }
      isPreWarmingRef.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    if (isRecording || isConnecting) {
      return;
    }

    startTimeRef.current = performance.now();
    setIsConnecting(true);
    setError(null);
    setInterimText("");

    try {
      sessionIdRef.current += 1;
      const sessionId = sessionIdRef.current;
      processedItemIdsRef.current.clear();
      processedTranscriptsRef.current.clear();

      // Check if we have a pre-fetched token (valid for ~60s)
      const preWarmedToken = preWarmTokenRef.current;
      const tokenAge = preWarmedToken
        ? Date.now() - preWarmedToken.fetchedAt
        : null;
      const usePreWarmedToken =
        preWarmedToken && tokenAge !== null && tokenAge < 55000; // Use if less than 55s old

      let stream: MediaStream;
      let tokenData: RealtimeSessionToken;

      if (usePreWarmedToken) {
        preWarmTokenRef.current = null; // Consume the token

        // Only need to get media stream
        stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
        });
        tokenData = preWarmedToken.token;

        // Start pre-fetching next token
        setTimeout(() => preWarmToken(), 100);
      } else {
        if (preWarmedToken) {
          preWarmTokenRef.current = null;
        }

        // Parallelize media and token fetch for faster startup
        const [streamResult, tokenResponse] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
          }),
          fetch("/api/realtime", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        stream = streamResult;

        if (!tokenResponse.ok) {
          throw new Error("Failed to get session token");
        }

        tokenData = (await tokenResponse.json()) as RealtimeSessionToken;
      }

      mediaStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setError("Connection lost");
          cleanup();
        }
      };

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track available");
      }

      pc.addTrack(audioTrack, stream);

      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        logger.info("Data channel opened");

        // Send session update to enable transcription
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text"],
            instructions:
              "You are a speech-to-text transcription service. Your only job is to transcribe the user's speech. Do not respond, do not answer questions, do not engage in conversation. Only transcribe exactly what you hear.",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: null,
          },
        };

        dc.send(JSON.stringify(sessionUpdate));
        clearCleanupTimeout();

        setIsConnecting(false);
        setIsRecording(true);
        isRecordingRef.current = true;
      };

      dc.onclose = () => {
        logger.info("Data channel closed");
      };

      dc.onerror = (err) => {
        logger.error("Data channel error:", err);
        setError("Data channel error");
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RealtimeEvent;

           if (sessionId !== sessionIdRef.current) {
             return;
           }

          // Ignore assistant response events since we only do transcription
          if (msg.type.startsWith("response.text") || msg.type.startsWith("response.audio_transcript")) {
            return;
          }

          if (msg.type === "input_audio_buffer.speech_started") {
            setInterimText("");
            clearCleanupTimeout();
          } else if (msg.type === "input_audio_buffer.speech_stopped") {
            setIsProcessing(true);
          } else if (msg.type === "transcript.delta") {
            const delta =
              typeof (msg as any).delta === "string"
                ? (msg as any).delta
                : extractTranscript((msg as any).delta);
            if (typeof delta === "string") {
              appendInterimTranscript(delta);
            }
          } else if (msg.type === "transcript.done") {
            const transcriptContent =
              typeof (msg as any).transcript === "string"
                ? (msg as any).transcript
                : extractTranscript((msg as any).transcript);
            const itemId =
              typeof (msg as any).item_id === "string"
                ? (msg as any).item_id
                : undefined;
            if (transcriptContent) {
              pushFinalTranscript(transcriptContent, itemId);
            }
          } else if (msg.type === "conversation.item.created") {
            const item = (msg as any).item;
            if (!item || item.role !== "user") {
              return;
            }
            const content = Array.isArray(item?.content) ? item.content : [];
            const transcriptContent = content
              .map((entry: unknown) => extractTranscript(entry))
              .find(
                (value: string | null) =>
                  typeof value === "string" && value.trim().length > 0
              );
            if (transcriptContent) {
              const sourceId =
                typeof item?.id === "string" ? (item.id as string) : undefined;
              pushFinalTranscript(transcriptContent, sourceId);
            }
          } else if (msg.type === "conversation.item.input_audio_transcription.completed") {
            const transcriptContent = (msg as any).transcript;
            const itemId =
              typeof (msg as any).item_id === "string"
                ? (msg as any).item_id
                : undefined;
            if (transcriptContent) {
              pushFinalTranscript(transcriptContent, itemId, "low");
            }
          } else if (msg.type === "conversation.item.input_audio_transcription.failed") {
            const errorMessage =
              typeof (msg as any)?.error?.message === "string"
                ? (msg as any).error.message
                : "Transcription failed";
            logger.error("Transcription failed:", msg);
            setError(errorMessage);
          } else if (msg.type === "response.audio_transcript.delta") {
            const delta = (msg as any).delta;
            if (typeof delta === "string" && delta.trim()) {
              appendInterimTranscript(delta);
            }
          } else if (msg.type === "response.audio_transcript.done") {
            const transcript = (msg as any).transcript;
            const responseId = (msg as any).response_id || (msg as any).item_id;
            if (typeof transcript === "string" && transcript.trim()) {
              pushFinalTranscript(transcript, responseId);
            }
          }
        } catch (err) {
          logger.error("Failed to parse event:", err);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(
        `${baseUrl}?model=${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.client_secret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error("SDP exchange failed");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      logger.error("Failed to start recording:", err);
      setError(message);
      cleanup();
    }
  }, [
    isRecording,
    isConnecting,
    cleanup,
    clearCleanupTimeout,
    pushFinalTranscript,
    extractTranscript,
    appendInterimTranscript,
    preWarmToken,
  ]);

  const stop = useCallback(() => {
    if (!isRecording) {
      return;
    }

    readyTimeRef.current = performance.now();
    setIsRecording(false);
    setIsProcessing(true);
    isRecordingRef.current = false;

    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open"
    ) {
      try {
        dataChannelRef.current.send(
          JSON.stringify({ type: "input_audio_buffer.commit" })
        );
        dataChannelRef.current.send(
          JSON.stringify({ type: "response.create" })
        );
      } catch (err) {
        logger.error("Failed to request transcription:", err);
      }
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        logger.error("Error stopping tracks during stop:", err);
      }
    }

    clearCleanupTimeout();

    cleanupTimeoutRef.current = setTimeout(() => {
      const fallback = interimTextRef.current.trim();
      if (fallback) {
        pushFinalTranscript(fallback);
      } else {
        cleanup();
      }
    }, 4000);
  }, [clearCleanupTimeout, cleanup, isRecording, pushFinalTranscript]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Pre-fetch token on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      preWarmToken();
    }, 500); // Small delay to avoid blocking initial render

    return () => clearTimeout(timer);
  }, [preWarmToken]);

  return {
    isRecording,
    isConnecting,
    isProcessing,
    interimText,
    finalText,
    error,
    start,
    stop,
  };
}
