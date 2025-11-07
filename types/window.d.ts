// Global window extensions
declare global {
  interface Window {
    _runSimulation?: () => Promise<void>;
    _clearWaitingForSimulation?: () => void;
  }
}

export {};
