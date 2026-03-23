import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendNewsletterConfirmation } from "@/lib/email";
import { logger } from "@/lib/logger";
import { subscribeSchema, parseRequest } from "@/app/api/types";
import { captureServerError } from "@/lib/posthog-server";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequest(request, subscribeSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email } = parsed.data;

    // Check if email already exists
    const { data: existing } = await supabase
      .from("email_subscriptions")
      .select("id")
      .eq("email", email)
      .eq("type", "newsletter")
      .single();

    if (existing) {
      return NextResponse.json({ message: "Already subscribed!" }, { status: 200 });
    }

    // Insert new subscription
    const { error } = await supabase.from("email_subscriptions").insert({
      email,
      type: "newsletter",
    });

    if (error) {
      // Handle specific error cases
      if (error.code === "23505" && error.message.includes("email_subscriptions_email_type_key")) {
        return NextResponse.json({ message: "Already subscribed!" }, { status: 200 });
      }

      // Log only unhandled errors
      logger.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    // Send newsletter confirmation email
    // We await this to prevent the serverless function from freezing/terminating
    // before the email request is sent. We catch errors so the subscription
    // succeeds even if the email service is down.
    try {
      await sendNewsletterConfirmation({
        to: email,
      });
    } catch (emailError) {
      logger.error("Failed to send newsletter confirmation email:", emailError);
      // We don't fail the request if email fails, as the subscription is saved
    }

    return NextResponse.json({ message: "Successfully subscribed!" }, { status: 200 });
  } catch (error) {
    logger.error("Subscription error:", error);
    captureServerError(error, { route: "POST /api/subscribe" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
