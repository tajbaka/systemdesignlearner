"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Shared types for speech-to-text hooks
export type SttHookState = {
  isRecording: boolean;
  isConnecting?: boolean;
  isProcessing?: boolean;
  interimText: string;
  finalText: string;
  error: string | null;
  audioLevel: number; // 0-1 value representing current audio level for waveform
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
};

// Web Speech API type definitions
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

type SttProvider = "whisper" | "webSpeech";

type UseSpeechToTextOptions = {
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  provider?: SttProvider;
};

// Constants
const AUDIO_LEVEL_UPDATE_INTERVAL_MS = 50;
const AUDIO_MIME_TYPE = "audio/webm;codecs=opus";

/**
 * Get the SpeechRecognition constructor from the window object if available
 */
function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;

  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return win.SpeechRecognition || win.webkitSpeechRecognition;
}

/**
 * Detect the best available STT provider based on environment and browser support
 */
function detectProvider(): SttProvider {
  // Check if Web Speech is enabled via env var and available in browser
  const webSpeechEnabled =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_WEB_SPEECH === "1";

  if (webSpeechEnabled && getSpeechRecognitionConstructor()) {
    return "webSpeech";
  }

  return "whisper";
}

/**
 * Unified speech-to-text hook that supports both Whisper API and Web Speech API
 */
export function useSpeechToText(options: UseSpeechToTextOptions = {}): SttHookState {
  const { onFinal, onInterim, provider: providerProp } = options;
  const provider = providerProp ?? detectProvider();

  // Shared state
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onInterimRef.current = onInterim;
  }, [onFinal, onInterim]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  /**
   * Calculate audio level from analyser node
   */
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) for audio level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = Math.min(1, rms / 128); // Normalize to 0-1

    setAudioLevel(level);
  }, []);

  /**
   * Start audio level monitoring
   */
  const startAudioLevelMonitoring = useCallback(
    (stream: MediaStream) => {
      try {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        const updateLevel = () => {
          updateAudioLevel();
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        // Use interval for more consistent updates
        const intervalId = setInterval(updateLevel, AUDIO_LEVEL_UPDATE_INTERVAL_MS);
        animationFrameRef.current = intervalId;
      } catch {
        // Audio level monitoring is optional, don't fail recording
      }
    },
    [updateAudioLevel]
  );

  /**
   * Stop audio level monitoring
   */
  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      if (typeof animationFrameRef.current === "number") {
        cancelAnimationFrame(animationFrameRef.current);
      } else {
        clearInterval(animationFrameRef.current);
      }
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  /**
   * Stop media stream tracks
   */
  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * Transcribe audio using Whisper API
   */
  const transcribeWithWhisper = useCallback(async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const response = await fetch("/api/v2/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Transcription failed" }));
      throw new Error(errorData.error || "Transcription failed");
    }

    const data = await response.json();
    return data.text as string;
  }, []);

  /**
   * Start recording with Whisper provider (batch transcription)
   */
  const startWhisper = useCallback(async () => {
    if (isRecording || isProcessing) return;

    setError(null);
    setIsConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start audio level monitoring
      startAudioLevelMonitoring(stream);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
        ? AUDIO_MIME_TYPE
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        stopAudioLevelMonitoring();
        stopMediaStream();

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size > 0) {
            const transcript = await transcribeWithWhisper(audioBlob);

            if (transcript) {
              setFinalText(transcript);
              onFinalRef.current?.(transcript);
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Transcription failed";
          setError(message);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.onerror = () => {
        setError("Recording failed");
        setIsRecording(false);
        stopAudioLevelMonitoring();
        stopMediaStream();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      stopAudioLevelMonitoring();
      stopMediaStream();
    } finally {
      setIsConnecting(false);
    }
  }, [
    isRecording,
    isProcessing,
    startAudioLevelMonitoring,
    stopAudioLevelMonitoring,
    stopMediaStream,
    transcribeWithWhisper,
  ]);

  /**
   * Stop Whisper recording
   */
  const stopWhisper = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  /**
   * Cancel Whisper recording without transcription
   */
  const cancelWhisper = useCallback(() => {
    if (mediaRecorderRef.current) {
      // Remove onstop handler to prevent transcription
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setInterimText("");
    stopAudioLevelMonitoring();
    stopMediaStream();
  }, [stopAudioLevelMonitoring, stopMediaStream]);

  /**
   * Start recording with Web Speech API (real-time transcription)
   */
  const startWebSpeech = useCallback(async () => {
    if (isRecording) return;

    setError(null);
    setIsConnecting(true);

    try {
      const SpeechRecognitionCtor = getSpeechRecognitionConstructor();

      if (!SpeechRecognitionCtor) {
        throw new Error("Web Speech API not supported");
      }

      // Request microphone for audio level monitoring
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startAudioLevelMonitoring(stream);

      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
          onInterimRef.current?.(interim);
        }

        if (final) {
          setFinalText((prev) => prev + final);
          setInterimText("");
          onFinalRef.current?.(final);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Ignore no-speech errors during continuous recognition
        if (event.error === "no-speech") return;

        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
        stopAudioLevelMonitoring();
        stopMediaStream();
      };

      recognition.onend = () => {
        // Only handle unexpected end (not manual stop)
        if (isRecordingRef.current) {
          setIsRecording(false);
          stopAudioLevelMonitoring();
          stopMediaStream();
        }
      };

      recognition.start();
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start speech recognition";
      setError(message);
      stopAudioLevelMonitoring();
      stopMediaStream();
    } finally {
      setIsConnecting(false);
    }
  }, [isRecording, startAudioLevelMonitoring, stopAudioLevelMonitoring, stopMediaStream]);

  /**
   * Stop Web Speech recognition
   */
  const stopWebSpeech = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText("");
    stopAudioLevelMonitoring();
    stopMediaStream();
  }, [stopAudioLevelMonitoring, stopMediaStream]);

  /**
   * Cancel Web Speech recognition
   */
  const cancelWebSpeech = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText("");
    stopAudioLevelMonitoring();
    stopMediaStream();
  }, [stopAudioLevelMonitoring, stopMediaStream]);

  /**
   * Public start method
   */
  const start = useCallback(async () => {
    if (provider === "webSpeech") {
      await startWebSpeech();
    } else {
      await startWhisper();
    }
  }, [provider, startWebSpeech, startWhisper]);

  /**
   * Public stop method
   */
  const stop = useCallback(() => {
    if (provider === "webSpeech") {
      stopWebSpeech();
    } else {
      stopWhisper();
    }
  }, [provider, stopWebSpeech, stopWhisper]);

  /**
   * Public cancel method
   */
  const cancel = useCallback(() => {
    if (provider === "webSpeech") {
      cancelWebSpeech();
    } else {
      cancelWhisper();
    }
  }, [provider, cancelWebSpeech, cancelWhisper]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    isRecording,
    isConnecting,
    isProcessing,
    interimText,
    finalText,
    error,
    audioLevel,
    start,
    stop,
    cancel,
  };
}
