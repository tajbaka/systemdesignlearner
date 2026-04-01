import { createHmac } from "crypto";

// Always use production URL — emails land in real inboxes regardless of environment
const BASE_URL = "https://www.systemdesignlearner.com";

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET or CLERK_SECRET_KEY is required for unsubscribe tokens");
  }
  return secret;
}

export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", getSecret()).update(email).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  return expected === token;
}

export function getUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
