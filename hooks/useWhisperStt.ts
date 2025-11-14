"use client";

import { useCallback, useRef, useState } from "react";
import type { SttHookOptions, SttHookState } from "@/lib/stt-types";
import { logger } from "@/lib/logger";

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: 16000, // Whisper prefers 16kHz
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function useWhisperStt(options: SttHookOptions): SttHookState {
  const { onFinal } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const shouldCancelRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (err) {
        logger.error("Error closing audio context:", err);
      }
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        logger.error("Error stopping media stream:", err);
      }
      mediaStreamRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (isRecording || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    setInterimText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best supported mime type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      let selectedMimeType = "";
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error("No supported audio mime type found");
      }

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);

        // Check if this was a cancellation
        if (shouldCancelRef.current) {
          shouldCancelRef.current = false;
          cleanup();
          return;
        }

        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: selectedMimeType,
          });

          // Check 25MB limit
          const maxSize = 25 * 1024 * 1024; // 25 MB
          if (audioBlob.size > maxSize) {
            throw new Error("Recording too long (max 25 MB)");
          }

          // Convert to file
          const audioFile = new File([audioBlob], "recording.webm", {
            type: selectedMimeType,
          });

          // Send to transcription API
          const formData = new FormData();
          formData.append("file", audioFile);
          formData.append("model", "whisper-1");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Transcription failed");
          }

          const data = await response.json();
          const transcript = data.text?.trim() || "";

          if (transcript) {
            setFinalText((prev) => (prev ? `${prev} ${transcript}` : transcript));

            if (onFinal) {
              if (typeof queueMicrotask === "function") {
                queueMicrotask(() => onFinal(transcript));
              } else {
                setTimeout(() => onFinal(transcript), 0);
              }
            }
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

      recorder.onerror = (event) => {
        logger.error("MediaRecorder error:", event);
        setError("Recording error");
        cleanup();
      };

      // Set up audio analysis for waveform visualization
      try {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudioLevel = () => {
          if (!analyserRef.current) {
            return;
          }

          analyser.getByteFrequencyData(dataArray);

          // Calculate average level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalizedLevel = average / 255; // Normalize to 0-1

          setAudioLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch (err) {
        logger.error("Failed to set up audio analysis:", err);
        // Continue without audio analysis - not critical
      }

      // Start recording
      recorder.start(100); // Collect data every 100ms
      setIsConnecting(false);
      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      logger.error("Failed to start recording:", err);
      setError(message);
      setIsConnecting(false);
      cleanup();
    }
  }, [isRecording, isConnecting, cleanup, onFinal]);

  const stop = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) {
      return;
    }

    shouldCancelRef.current = false; // Ensure we transcribe
    try {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      logger.error("Error stopping recorder:", err);
      setError("Failed to stop recording");
      cleanup();
    }
  }, [isRecording, cleanup]);

  const cancel = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) {
      return;
    }

    shouldCancelRef.current = true; // Flag to skip transcription
    try {
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      logger.error("Error canceling recorder:", err);
      cleanup();
    }
  }, [isRecording, cleanup]);

  return {
    isRecording,
    isConnecting,
    isProcessing,
    interimText, // Always empty for Whisper (batch only)
    finalText,
    error,
    audioLevel,
    start,
    stop,
    cancel,
  };
}
