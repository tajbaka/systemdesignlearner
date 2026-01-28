"use client";

import { useCallback } from "react";
import { VoiceButton } from "./VoiceButton";

type VoiceInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Bridge component that appends voice transcripts to a text value
 */
export function VoiceInput({ value, onChange, disabled = false, className = "" }: VoiceInputProps) {
  const handleTranscript = useCallback(
    (text: string) => {
      // Append transcript to existing value with proper spacing
      const trimmedValue = value.trimEnd();
      const separator = trimmedValue.length > 0 ? " " : "";
      const newValue = trimmedValue + separator + text;
      onChange(newValue);
    },
    [value, onChange]
  );

  return <VoiceButton onTranscript={handleTranscript} disabled={disabled} className={className} />;
}
