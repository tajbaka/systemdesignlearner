export const VALID_SLUGS = {
  URL_SHORTENER: "url-shortener",
  PASTEBIN: "pastebin",
} as const;

export const PRACTICE_IMAGE_URLS = {
  [VALID_SLUGS.URL_SHORTENER]: "/desktop-url-shortener-practice.gif",
  [VALID_SLUGS.PASTEBIN]: "/desktop-pastebin-practice.gif",
} as const;
