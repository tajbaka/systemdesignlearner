import { Resend } from "resend";
import { render } from "@react-email/components";
import FeedbackConfirmationEmail from "@/emails/feedback-confirmation";
import NewsletterConfirmationEmail from "@/emails/newsletter-confirmation";
import NewProblemEmail from "@/emails/new-problem";
import ProblemReminderEmail from "@/emails/problem-reminder";
import { logger } from "@/lib/logger";
import { getUnsubscribeUrl } from "@/lib/unsubscribe";

// Default sender email (configure this in your Resend dashboard)
const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

/**
 * Get Resend client instance
 * Returns null if RESEND_API_KEY is not configured (e.g., in dev mode)
 */
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("RESEND_API_KEY not configured");
    }
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export interface SendFeedbackConfirmationParams {
  to: string;
  name?: string;
  feedback: string;
}

export interface SendNewsletterConfirmationParams {
  to: string;
}

export interface SendNewProblemNotificationParams {
  to: string;
  problemTitle: string;
  problemDescription: string;
  problemDifficulty: "easy" | "medium" | "hard";
  problemSlug: string;
  timeToComplete: string;
}

export interface SendProblemReminderParams {
  to: string;
  problemTitle: string;
  problemDifficulty: "easy" | "medium" | "hard";
  problemSlug: string;
}

/**
 * Sends a feedback confirmation email to the user
 */
export async function sendFeedbackConfirmation({
  to,
  name,
  feedback,
}: SendFeedbackConfirmationParams) {
  try {
    // Check if Resend API key is configured
    const resend = getResendClient();
    if (!resend) {
      logger.warn("RESEND_API_KEY not configured. Skipping email send.");
      return { success: false, error: "Email service not configured" };
    }

    const emailHtml = await render(FeedbackConfirmationEmail({ name, feedback }));

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Thank you for your feedback! - System Design Sandbox",
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send feedback confirmation email:", error);
      return { success: false, error: error.message };
    }

    logger.log("Feedback confirmation email sent:", data);
    return { success: true, data };
  } catch (error) {
    logger.error("Error sending feedback confirmation email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sends a newsletter subscription confirmation email to the user
 */
export async function sendNewsletterConfirmation({ to }: SendNewsletterConfirmationParams) {
  try {
    // Check if Resend API key is configured
    const resend = getResendClient();
    if (!resend) {
      logger.warn("RESEND_API_KEY not configured. Skipping email send.");
      return { success: false, error: "Email service not configured" };
    }

    const emailHtml = await render(NewsletterConfirmationEmail({ email: to }));

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Welcome to System Design Sandbox Newsletter! 🎉",
      html: emailHtml,
    });

    if (error) {
      logger.error("Failed to send newsletter confirmation email:", error);
      return { success: false, error: error.message };
    }

    logger.log("Newsletter confirmation email sent:", data);
    return { success: true, data };
  } catch (error) {
    logger.error("Error sending newsletter confirmation email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sends a new problem notification email to the user
 */
export async function sendNewProblemNotification({
  to,
  problemTitle,
  problemDescription,
  problemDifficulty,
  problemSlug,
  timeToComplete,
}: SendNewProblemNotificationParams) {
  try {
    const resend = getResendClient();
    if (!resend) {
      logger.warn("RESEND_API_KEY not configured. Skipping email send.");
      return { success: false, error: "Email service not configured" };
    }

    const unsubscribeUrl = getUnsubscribeUrl(to);

    const emailHtml = await render(
      NewProblemEmail({
        problemTitle,
        problemDescription,
        problemDifficulty,
        problemSlug,
        timeToComplete,
        recipientEmail: to,
        unsubscribeUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `New Challenge: ${problemTitle} - System Design Sandbox`,
      html: emailHtml,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logger.error("Failed to send new problem notification email:", error);
      return { success: false, error: error.message };
    }

    logger.log("New problem notification email sent:", data);
    return { success: true, data };
  } catch (error) {
    logger.error("Error sending new problem notification email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sends a reminder email for a problem the user hasn't tried yet
 */
export async function sendProblemReminder({
  to,
  problemTitle,
  problemDifficulty,
  problemSlug,
}: SendProblemReminderParams) {
  try {
    const resend = getResendClient();
    if (!resend) {
      logger.warn("RESEND_API_KEY not configured. Skipping email send.");
      return { success: false, error: "Email service not configured" };
    }

    const unsubscribeUrl = getUnsubscribeUrl(to);

    const emailHtml = await render(
      ProblemReminderEmail({
        problemTitle,
        problemDifficulty,
        problemSlug,
        recipientEmail: to,
        unsubscribeUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reminder: ${problemTitle} is waiting for you - System Design Sandbox`,
      html: emailHtml,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      logger.error("Failed to send problem reminder email:", error);
      return { success: false, error: error.message };
    }

    logger.log("Problem reminder email sent:", data);
    return { success: true, data };
  } catch (error) {
    logger.error("Error sending problem reminder email:", error);
    return { success: false, error: String(error) };
  }
}
