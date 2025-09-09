import { deflate, inflate } from "pako";

export function encodeDesign(obj: unknown) {
  const json = JSON.stringify(obj);
  const bytes = deflate(json);
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, "");
}

export function decodeDesign<T = unknown>(str: string): T {
  const bin = atob(str);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const json = inflate(bytes, { to: "string" }) as string;
  return JSON.parse(json) as T;
}


