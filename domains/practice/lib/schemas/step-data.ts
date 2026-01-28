import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

export const STEP_TYPES = ["functional", "nonFunctional", "api", "highLevelDesign"] as const;

// ============================================================================
// Step Record Types
// ============================================================================

export const StepRecordSchema = z.object({
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(["draft", "submitted", "evaluated"]),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
});

export type StepRecord = z.infer<typeof StepRecordSchema>;

// ============================================================================
// GET Session Schemas
// ============================================================================

export const GetSessionQuerySchema = z.object({
  scenarioSlug: z.string(),
});

export type GetSessionQuery = z.infer<typeof GetSessionQuerySchema>;

export const GetSessionResponseSchema = z.object({
  session: z
    .object({
      id: z.string().uuid(),
      maxVisitedStep: z.number(),
      currentStepType: z.string(),
      completedAt: z.string().nullable(),
    })
    .nullable(),
  steps: z.record(z.string(), StepRecordSchema),
});

export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;

// ============================================================================
// UPDATE Session Schemas
// ============================================================================

export const UpdateSessionRequestSchema = z.object({
  scenarioSlug: z.string(),
  maxVisitedStep: z.number().optional(),
  currentStepType: z.string().optional(),
});

export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;

export const UpdateSessionResponseSchema = z.object({
  success: z.boolean(),
  session: z.object({
    id: z.string().uuid(),
    maxVisitedStep: z.number(),
    currentStepType: z.string(),
    updatedAt: z.string(),
  }),
});

export type UpdateSessionResponse = z.infer<typeof UpdateSessionResponseSchema>;

// ============================================================================
// SAVE Step Schemas
// ============================================================================

export const SaveStepResponseSchema = z.object({
  success: z.boolean(),
  step: z.object({
    id: z.string().uuid(),
    stepType: z.enum(["functional", "nonFunctional", "api", "highLevelDesign"]),
    data: z.record(z.string(), z.unknown()),
    status: z.string(),
    updatedAt: z.string(),
  }),
});

export type SaveStepResponse = z.infer<typeof SaveStepResponseSchema>;
