// Shared types for speech-to-text hooks
export type SttHookOptions = {
  stepId: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
};

export type SttHookState = {
  isRecording: boolean;
  isConnecting?: boolean;
  isProcessing?: boolean;
  interimText: string;
  finalText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
};
