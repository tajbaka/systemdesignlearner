// Global window extensions
declare global {
  interface Window {
    _runSimulation?: () => Promise<void>;
  }
}

export {};
