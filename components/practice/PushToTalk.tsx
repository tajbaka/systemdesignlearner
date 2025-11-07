"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeStt } from "@/hooks/useRealtimeStt";
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
};

export function PushToTalk({ onFinal, disabled, stepId }: PushToTalkProps) {
  const [mode, setMode] = useState<"hold" | "toggle">("toggle");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const useWebSpeech =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_ENABLE_WEB_SPEECH === "1";

  const useWhisperDirect =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_USE_WHISPER_DIRECT === "1";

  const realtimeStt = useRealtimeStt({
    stepId,
    onFinal,
  });

  const webSpeechStt = useWebSpeechStt({
    stepId,
    onFinal,
  });

  const whisperStt = useWhisperStt({
    stepId,
    onFinal,
  });

  // Priority: Web Speech > Whisper Direct > Realtime API
  const sttHook = useWebSpeech
    ? webSpeechStt
    : useWhisperDirect
      ? whisperStt
      : realtimeStt;

  const { isRecording, isConnecting, isProcessing, interimText, error, start, stop } =
    sttHook;

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

  return (
    <div className="flex flex-col items-end gap-2">
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
            : isRecording
            ? "Stop recording"
            : "Record your answer"
        }
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
          isRecording
            ? "animate-pulse border-red-500 bg-red-900 text-red-100 hover:bg-red-800"
            : isConnecting || isProcessing
            ? "border-yellow-400/40 bg-yellow-950/40 text-yellow-200"
            : "border-blue-400/40 bg-blue-950/40 text-blue-200 hover:bg-blue-900/60"
        }`}
      >
        {isConnecting || isProcessing ? <LoadingSpinner /> : <MicIcon />}
      </button>

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
