import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendFeedbackConfirmation } from "@/lib/email";
import { logger } from "@/lib/logger";
import { feedbackSchema, parseRequest } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequest(request, feedbackSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { email, name, feedback, contact_ok, marketing_ok, source } = parsed.data;

    // Get client information for provenance
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const ipSha256 = ip
      ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)).then((hash) =>
          Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        )
      : null;

    // Insert feedback submission
    const { error: feedbackError } = await supabase.from("feedback_submissions").insert({
      email,
      name: name || null,
      feedback,
      contact_ok,
      marketing_ok,
      source,
      referrer,
      user_agent: userAgent,
      ip_sha256: ipSha256,
    });

    if (feedbackError) {
      logger.error("Supabase feedback error:", feedbackError);
      return NextResponse.json(
        { error: "Failed to submit feedback. Please try again." },
        { status: 500 }
      );
    }

    // Add to email subscriptions with consent flags
    const { data: existingFeedback } = await supabase
      .from("email_subscriptions")
      .select("id")
      .eq("email", email)
      .eq("type", "feedback")
      .single();

    if (!existingFeedback) {
      await supabase.from("email_subscriptions").insert({
        email,
        name: name || null,
        type: "feedback",
        contact_ok,
        marketing_ok,
      });
    }

    // If they opted into marketing, also subscribe them to newsletter
    if (marketing_ok) {
      const { data: existingNewsletter } = await supabase
        .from("email_subscriptions")
        .select("id")
        .eq("email", email)
        .eq("type", "newsletter")
        .single();

      if (!existingNewsletter) {
        await supabase.from("email_subscriptions").insert({
          email,
          name: name || null,
          type: "newsletter",
          contact_ok,
          marketing_ok,
        });
      }
    }

    // Send feedback confirmation email
    // Note: This runs asynchronously and won't block the response
    // If email fails, the feedback is still saved successfully
    sendFeedbackConfirmation({
      to: email,
      name: name || undefined,
      feedback,
    }).catch((error) => {
      logger.error("Failed to send feedback confirmation email:", error);
    });

    return NextResponse.json({ message: "Thank you for your feedback!" }, { status: 200 });
  } catch (error) {
    logger.error("Feedback submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
