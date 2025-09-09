import { deflate, inflate } from "pako";

export function encodeDesign(obj: unknown) {
  const json = JSON.stringify(obj);
  const bytes = deflate(json);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return b64;
}

export function decodeDesign<T = unknown>(str: string): T {
  const urlSafe = (str || "").trim();
  const b64 = urlSafe.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const json = inflate(bytes, { to: "string" }) as string;
  return JSON.parse(json) as T;
}


