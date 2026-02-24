import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/packages/drizzle";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { logger } from "@/lib/logger";

/**
 * Handles both:
 * - GET: user clicks unsubscribe link in email → processes and redirects to confirmation page
 * - POST: email client one-click unsubscribe (RFC 8058) → processes and returns 200
 */

async function handleUnsubscribe(email: string, token: string) {
  if (!verifyUnsubscribeToken(email, token)) {
    return { error: "Invalid unsubscribe link", status: 401 };
  }

  const updated = await db
    .update(profiles)
    .set({ newProblemEmailsEnabled: false, updatedAt: new Date() })
    .where(eq(profiles.email, email))
    .returning({ id: profiles.id });

  if (updated.length === 0) {
    logger.warn("Unsubscribe: no profile found for email:", email);
  }

  return { success: true };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
  }

  const result = await handleUnsubscribe(email, token);

  if ("error" in result) {
    return NextResponse.redirect(new URL("/unsubscribe?error=invalid", request.url));
  }

  return NextResponse.redirect(new URL("/unsubscribe?success=true", request.url));
}

export async function POST(request: NextRequest) {
  try {
    // RFC 8058 one-click: email client POSTs with body "List-Unsubscribe=One-Click"
    // But we also accept JSON for flexibility
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
    }

    const result = await handleUnsubscribe(email, token);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
