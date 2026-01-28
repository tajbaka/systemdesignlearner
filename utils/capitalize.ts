/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @param fallback - Optional fallback value if str is null/undefined/empty
 * @returns Capitalized string or fallback
 */
export function capitalize(str: string | null | undefined, fallback = "Unknown"): string {
  if (!str) return fallback;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
