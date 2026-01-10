"use client";

import { useCallback } from "react";
import { PushToTalk } from "./PushToTalk";

type VoiceCaptureBridgeProps = {
  value: string;
  onChange: (next: string) => void;
  stepId: string;
  disabled?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
};

export function VoiceCaptureBridge({
  value,
  onChange,
  stepId,
  disabled,
  onRecordingChange,
}: VoiceCaptureBridgeProps) {
  const handleFinal = useCallback(
    (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;

      const next = value.trim() ? `${value.trim()} ${trimmed}` : trimmed;

      onChange(next);
    },
    [value, onChange]
  );

  return (
    <PushToTalk
      onFinal={handleFinal}
      disabled={disabled}
      stepId={stepId}
      onRecordingChange={onRecordingChange}
    />
  );
}
