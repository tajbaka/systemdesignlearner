"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SttHookOptions, SttHookState } from "@/lib/stt-types";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export function useWebSpeechStt(options: SttHookOptions): SttHookState {
  const { stepId, onInterim, onFinal } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentStepIdRef = useRef(stepId);

  useEffect(() => {
    currentStepIdRef.current = stepId;
  }, [stepId]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        logger.error("Error stopping recognition:", err);
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText("");
  }, []);

  const start = useCallback(async () => {
    if (isRecording) return;

    setError(null);
    setInterimText("");

    if (!window.webkitSpeechRecognition) {
      setError("Speech recognition not supported");
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        logger.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          setError("No speech detected");
        } else if (event.error === "not-allowed") {
          setError("Microphone access denied");
        } else {
          setError("Recognition error");
        }
        cleanup();
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
          onInterim?.(interim);
        }

        if (final.trim()) {
          setFinalText((prev) => {
            const next = prev ? `${prev} ${final.trim()}` : final.trim();
            onFinal?.(next);
            return next;
          });
        }
      };

      recognition.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      cleanup();
    }
  }, [isRecording, cleanup, onInterim, onFinal]);

  const stop = useCallback(() => {
    if (!isRecording) return;

    const current = interimText.trim();
    if (current) {
      setFinalText((prev) => {
        const next = prev ? `${prev} ${current}` : current;
        onFinal?.(next);
        return next;
      });
      setInterimText("");
    }

    cleanup();
  }, [isRecording, interimText, cleanup, onFinal]);

  const cancel = useCallback(() => {
    if (!isRecording || !recognitionRef.current) return;

    try {
      // Use abort() to cancel without triggering final results
      recognitionRef.current.abort();
    } catch (err) {
      logger.error("Error aborting recognition:", err);
    }

    cleanup();
  }, [isRecording, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    interimText,
    finalText,
    error,
    start,
    stop,
    cancel,
  };
}
