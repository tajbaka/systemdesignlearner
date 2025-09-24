import type { HighLevelChoice } from "./types";

export const encodeDesign = (preset: HighLevelChoice): string => {
  const payload = {
    preset: preset.presetId,
    components: preset.components,
    notes: preset.notes ?? [],
  };

  const json = JSON.stringify(payload);
  return btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};
