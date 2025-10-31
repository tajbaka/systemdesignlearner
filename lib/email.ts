import { Resend } from 'resend';
import { render } from '@react-email/components';
import FeedbackConfirmationEmail from '@/emails/feedback-confirmation';
import NewsletterConfirmationEmail from '@/emails/newsletter-confirmation';
import { logger } from '@/lib/logger';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email (configure this in your Resend dashboard)
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export interface SendFeedbackConfirmationParams {
  to: string;
  name?: string;
  feedback: string;
}

export interface SendNewsletterConfirmationParams {
  to: string;
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
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured. Skipping email send.');
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(
      FeedbackConfirmationEmail({ name, feedback })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Thank you for your feedback! - System Design Sandbox',
      html: emailHtml,
    });

    if (error) {
      logger.error('Failed to send feedback confirmation email:', error);
      return { success: false, error: error.message };
    }

    logger.log('Feedback confirmation email sent:', data);
    return { success: true, data };
  } catch (error) {
    logger.error('Error sending feedback confirmation email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sends a newsletter subscription confirmation email to the user
 */
export async function sendNewsletterConfirmation({
  to,
}: SendNewsletterConfirmationParams) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured. Skipping email send.');
      return { success: false, error: 'Email service not configured' };
    }

    const emailHtml = await render(
      NewsletterConfirmationEmail({ email: to })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Welcome to System Design Sandbox Newsletter! 🎉',
      html: emailHtml,
    });

    if (error) {
      logger.error('Failed to send newsletter confirmation email:', error);
      return { success: false, error: error.message };
    }

    logger.log('Newsletter confirmation email sent:', data);
    return { success: true, data };
  } catch (error) {
    logger.error('Error sending newsletter confirmation email:', error);
    return { success: false, error: String(error) };
  }
}