export type TranscriptDelta = {
  type: "transcript.delta";
  delta: string;
  item_id: string;
};

export type TranscriptDone = {
  type: "transcript.done";
  transcript: string;
  item_id: string;
};

export type ConversationItemCreated = {
  type: "conversation.item.created";
  item: {
    id: string;
    type: "message";
    role: "user" | "assistant";
    content?: Array<{
      type: string;
      transcript?: string;
    }>;
  };
};

export type InputAudioBufferCommitted = {
  type: "input_audio_buffer.committed";
  item_id: string;
};

export type InputAudioBufferSpeechStarted = {
  type: "input_audio_buffer.speech_started";
  audio_start_ms: number;
  item_id: string;
};

export type InputAudioBufferSpeechStopped = {
  type: "input_audio_buffer.speech_stopped";
  audio_end_ms: number;
  item_id: string;
};

export type RealtimeEvent =
  | TranscriptDelta
  | TranscriptDone
  | ConversationItemCreated
  | InputAudioBufferCommitted
  | InputAudioBufferSpeechStarted
  | InputAudioBufferSpeechStopped
  | { type: string };

export type RealtimeSessionToken = {
  client_secret: string;
  expires_at: number;
};

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
