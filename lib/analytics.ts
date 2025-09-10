declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, unknown> }
    ) => void;
  }
}

export const track = (name: string, props?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible(name, { props });
  }
};
