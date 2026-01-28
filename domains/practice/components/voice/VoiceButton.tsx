"use client";

import { useCallback } from "react";
import { useSpeechToText } from "@/domains/practice/hooks/useSpeechToText";
import { VoiceWaveform } from "./VoiceWaveform";

type VoiceButtonProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Voice recording button with waveform visualization
 */
export function VoiceButton({ onTranscript, disabled = false, className = "" }: VoiceButtonProps) {
  const { isRecording, isConnecting, isProcessing, audioLevel, error, start, stop } =
    useSpeechToText({
      onFinal: onTranscript,
    });

  const handleClick = useCallback(async () => {
    if (isRecording) {
      stop();
    } else {
      await start();
    }
  }, [isRecording, start, stop]);

  const isLoading = isConnecting || isProcessing;
  const isDisabled = disabled || isLoading;

  // Determine button state for styling
  const getButtonStyles = () => {
    if (isRecording) {
      return "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30";
    }
    if (isDisabled) {
      return "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 cursor-not-allowed";
    }
    return "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-blue-400/50 hover:text-blue-400";
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ${getButtonStyles()}`}
        aria-label={isRecording ? "Stop recording" : "Start voice input"}
        title={error || (isRecording ? "Click to stop recording" : "Click to start voice input")}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : isRecording ? (
          <VoiceWaveform audioLevel={audioLevel} isActive={true} />
        ) : (
          <MicrophoneIcon />
        )}
      </button>

      {error && (
        <span className="text-xs text-red-400 max-w-[120px] text-center truncate">{error}</span>
      )}
    </div>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
