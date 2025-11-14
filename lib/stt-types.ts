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
  audioLevel: number; // 0-1 value representing current audio level for waveform
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
};
