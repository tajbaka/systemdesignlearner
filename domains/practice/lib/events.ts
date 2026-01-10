/**
 * Typed event bus for cross-component communication.
 * Replaces window globals with a type-safe event system.
 */

// Event type definitions
export type PracticeEventMap = {
  // Simulation events
  "simulation:run": void;
  "simulation:clearWaiting": void;

  // API mobile editor events
  "apiEditor:open": { endpointId: string };
  "apiEditor:close": void;
  "apiEditor:stateChange": { editing: boolean; value?: string };
  "apiEditor:voiceChange": { value: string };
};

type EventCallback<T> = T extends void ? () => void : (data: T) => void;

// Use a simple Map for type-safe event storage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners = new Map<keyof PracticeEventMap, Set<EventCallback<any>>>();

/**
 * Subscribe to a typed event
 */
export function on<K extends keyof PracticeEventMap>(
  event: K,
  callback: EventCallback<PracticeEventMap[K]>
): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(callback);
  };
}

/**
 * Emit a typed event
 */
export function emit<K extends keyof PracticeEventMap>(
  event: K,
  ...args: PracticeEventMap[K] extends void ? [] : [PracticeEventMap[K]]
): void {
  const eventListeners = listeners.get(event);
  if (!eventListeners) return;

  eventListeners.forEach((callback) => {
    if (args.length === 0) {
      (callback as () => void)();
    } else {
      callback(args[0]);
    }
  });
}

/**
 * Subscribe to an event once
 */
export function once<K extends keyof PracticeEventMap>(
  event: K,
  callback: EventCallback<PracticeEventMap[K]>
): () => void {
  const unsubscribe = on(event, ((...args: unknown[]) => {
    unsubscribe();
    if (args.length === 0) {
      (callback as () => void)();
    } else {
      (callback as (data: PracticeEventMap[K]) => void)(args[0] as PracticeEventMap[K]);
    }
  }) as EventCallback<PracticeEventMap[K]>);

  return unsubscribe;
}

/**
 * Clear all listeners (useful for testing)
 */
export function clearAllListeners(): void {
  listeners.clear();
}
