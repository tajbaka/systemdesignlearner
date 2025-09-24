import { Buffer } from "node:buffer";
import type { HighLevelChoice } from "./types";

const encodeBase64 = (input: string): string => {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(input);
  }

  return Buffer.from(input, "utf-8").toString("base64");
};

export const encodeDesign = (preset: HighLevelChoice): string => {
  const payload = {
    preset: preset.presetId,
    components: preset.components,
    notes: preset.notes ?? [],
  };

  return encodeBase64(JSON.stringify(payload));
};
