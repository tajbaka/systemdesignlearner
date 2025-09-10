export const track = (name: string, props?: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== "undefined" && (window as any).plausible)
    (window as any).plausible(name, { props });
};
