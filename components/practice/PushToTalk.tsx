"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSpeechStt } from "@/hooks/useWebSpeechStt";
import { useWhisperStt } from "@/hooks/useWhisperStt";
import { logger } from "@/lib/logger";
import { VoiceWaveform } from "./VoiceWaveform";

const MicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
    <path
      d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

type PushToTalkProps = {
  onFinal: (text: string) => void;
  disabled?: boolean;
  stepId: string;
  onRecordingChange?: (isRecording: boolean) => void;
};

export function PushToTalk({ onFinal, disabled, stepId, onRecordingChange }: PushToTalkProps) {
  const [mode, setMode] = useState<"hold" | "toggle">("toggle");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const useWebSpeech =
    typeof window !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_WEB_SPEECH === "1";

  const webSpeechStt = useWebSpeechStt({
    stepId,
    onFinal,
  });

  const whisperStt = useWhisperStt({
    stepId,
    onFinal,
  });

  // Use Web Speech API if enabled (Chrome only), otherwise use Whisper Direct
  const {
    isRecording,
    isConnecting,
    isProcessing,
    interimText,
    error,
    audioLevel,
    start,
    stop,
    cancel,
  } = useWebSpeech ? webSpeechStt : whisperStt;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || mode !== "hold") return;
      e.preventDefault(); // Prevent click from firing
      logger.log("Mouse down - starting recording");
      start();
    },
    [disabled, mode, start]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || mode !== "hold") return;
      e.preventDefault();
      logger.log("Mouse up - stopping recording");
      stop();
    },
    [disabled, mode, stop]
  );

  const handleMouseLeave = useCallback(() => {
    if (disabled || mode !== "hold" || !isRecording) return;
    logger.log("Mouse leave - stopping recording");
    stop();
  }, [disabled, mode, isRecording, stop]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      // In hold mode, prevent click from interfering with pointer events
      if (mode === "hold") {
        e.preventDefault();
        return;
      }

      // Toggle mode logic
      if (isRecording) {
        stop();
      } else {
        start();
      }
    },
    [disabled, mode, isRecording, start, stop]
  );

  const handleCancel = useCallback(() => {
    if (!isRecording) return;
    logger.log("Canceling recording - discarding audio");
    cancel();
  }, [isRecording, cancel]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;
      if (event.key === " " && !event.repeat) {
        event.preventDefault();
        if (isRecording) {
          stop();
        } else {
          start();
        }
      }
      if (event.key === "m" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setMode((prev) => (prev === "hold" ? "toggle" : "hold"));
      }
    },
    [disabled, isRecording, start, stop]
  );

  useEffect(() => {
    return () => {
      if (isRecording) {
        stop();
      }
    };
  }, [isRecording, stop]);

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  return (
    <div className="relative flex flex-col items-end gap-2">
      {!isRecording ? (
        // Single microphone button when not recording
        <div className="relative group">
          <button
            ref={buttonRef}
            type="button"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            disabled={disabled || isConnecting || isProcessing}
            aria-label={
              isConnecting
                ? "Connecting..."
                : isProcessing
                  ? "Processing..."
                  : "Dictate your answer"
            }
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              isConnecting || isProcessing
                ? "border-blue-400/40 bg-blue-950/40 text-blue-200 cursor-wait"
                : "border-blue-400/40 bg-blue-950/40 text-blue-200 hover:bg-blue-900/60 hover:border-blue-400/60 hover:scale-105"
            }`}
          >
            {isConnecting || isProcessing ? <LoadingSpinner /> : <MicIcon />}
          </button>

          {/* Tooltip - shows on hover when not recording */}
          {!isConnecting && !isProcessing && !disabled && (
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block animate-in fade-in slide-in-from-bottom-1 duration-200">
              <div className="relative whitespace-nowrap rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 shadow-lg border border-zinc-700">
                Dictate
                <div className="absolute top-full right-4 -mt-1 h-2 w-2 rotate-45 border-b border-r border-zinc-700 bg-zinc-800"></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Buttons in same position as mic/next, with waveform to the left
        <div className="relative flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Waveform - positioned to the left of the buttons */}
          <div className="absolute right-full mr-3 sm:mr-0.5 h-10 w-[150px] sm:w-[200px]">
            <VoiceWaveform audioLevel={audioLevel} isActive={isRecording} />
          </div>

          {/* Cancel button (X) - replaces mic button position */}
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel recording"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors text-zinc-400 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>

          {/* Stop/Confirm button (checkmark) - replaces next button position */}
          <button
            type="button"
            onClick={stop}
            aria-label="Stop and transcribe"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-500 bg-transparent hover:bg-blue-500/10 transition-all text-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 8l3 3l7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Error message - positioned absolutely above the record button */}
      {error && (
        <div className="absolute bottom-full right-0 mb-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="w-32 rounded-lg border border-red-700/50 bg-red-950/80 backdrop-blur-sm px-3 py-2 text-xs text-red-200 shadow-lg">
            {error}
          </div>
        </div>
      )}

      {isRecording && interimText && (
        <div className="max-w-xs rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300 shadow-lg">
          {interimText}
        </div>
      )}
    </div>
  );
}
