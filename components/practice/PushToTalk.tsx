"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSpeechStt } from "@/hooks/useWebSpeechStt";
import { useWhisperStt } from "@/hooks/useWhisperStt";
import { logger } from "@/lib/logger";

const MicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
    <path
      d="M12 3a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 11a7 7 0 0 1-14 0M12 21v-3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
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
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_ENABLE_WEB_SPEECH === "1";

  const webSpeechStt = useWebSpeechStt({
    stepId,
    onFinal,
  });

  const whisperStt = useWhisperStt({
    stepId,
    onFinal,
  });

  // Use Web Speech API if enabled (Chrome only), otherwise use Whisper Direct
  const { isRecording, isConnecting, isProcessing, interimText, error, start, stop, cancel } =
    useWebSpeech ? webSpeechStt : whisperStt;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || mode !== "hold") return;
    e.preventDefault(); // Prevent click from firing
    logger.log("Mouse down - starting recording");
    start();
  }, [disabled, mode, start]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (disabled || mode !== "hold") return;
    e.preventDefault();
    logger.log("Mouse up - stopping recording");
    stop();
  }, [disabled, mode, stop]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || mode !== "hold" || !isRecording) return;
    logger.log("Mouse leave - stopping recording");
    stop();
  }, [disabled, mode, isRecording, stop]);

  const handleClick = useCallback((e: React.MouseEvent) => {
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
  }, [disabled, mode, isRecording, start, stop]);

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
    <div className="flex flex-col items-end gap-2">
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
        // Two icon buttons when recording - replace the mic button
        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Delete recording"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors text-zinc-200 border border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Stop and transcribe"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-all text-white shadow-lg shadow-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <rect x="4" y="4" width="8" height="8" rx="1" />
            </svg>
          </button>
        </div>
      )}

      {isRecording && interimText && (
        <div className="max-w-xs rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300 shadow-lg">
          {interimText}
        </div>
      )}

      {error && (
        <div className="max-w-xs rounded-lg border border-red-700/50 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
