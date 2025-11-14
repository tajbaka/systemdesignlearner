// Global window extensions
declare global {
  interface Window {
    _runSimulation?: () => Promise<void>;
    _clearWaitingForSimulation?: () => void;
    _apiMobileEditorClose?: () => void;
    _apiMobileEditorVoiceValue?: string;
    _apiMobileEditorVoiceOnChange?: (value: string) => void;
  }
}

export {};
