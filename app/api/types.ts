/**
 * API request validation schemas using Zod.
 * Provides type-safe parsing with detailed error messages.
 */

import { z } from "zod";

/** Email validation with proper format check */
export const emailSchema = z.string().email("Valid email is required");

/** Feedback submission schema */
export const feedbackSchema = z.object({
  email: emailSchema,
  name: z.string().optional(),
  feedback: z
    .string()
    .min(1, "Feedback is required")
    .transform((s) => s.trim()),
  contact_ok: z.boolean().default(false),
  marketing_ok: z.boolean().default(false),
  source: z.string().default("landing"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

/** Newsletter subscription schema */
export const subscribeSchema = z.object({
  email: emailSchema,
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

/** Iterative feedback request schemas */
const supportedIterativeStep = z.enum(["functional", "nonFunctional", "api"]);

const getFeedbackSchema = z.object({
  action: z.literal("get_feedback"),
  slug: z.string().min(1, "Slug is required"),
  stepId: supportedIterativeStep,
  userContent: z.string(),
  previousQuestion: z.string().nullable().optional(),
});

const evaluateRevisionSchema = z.object({
  action: z.literal("evaluate_revision"),
  slug: z.string().min(1, "Slug is required"),
  stepId: supportedIterativeStep,
  userContent: z.string(),
  topicId: z.string(),
  previousContent: z.string(),
  previousQuestion: z.string(),
});

const sharpenQuestionSchema = z.object({
  action: z.literal("sharpen_question"),
  slug: z.string().min(1, "Slug is required"),
  stepId: supportedIterativeStep,
  userContent: z.string(),
  topicId: z.string(),
  previousQuestion: z.string().nullable().optional(),
});

export const iterativeFeedbackSchema = z.discriminatedUnion("action", [
  getFeedbackSchema,
  evaluateRevisionSchema,
  sharpenQuestionSchema,
]);

export type IterativeFeedbackInput = z.infer<typeof iterativeFeedbackSchema>;

/**
 * Parse request JSON with Zod schema.
 * Returns { success: true, data } on success, { success: false, error } on failure.
 */
export async function parseRequest<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => issue.message).join(", ");
      return { success: false, error: errors };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
}
