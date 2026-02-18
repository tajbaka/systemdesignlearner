import { z } from "zod";

// ============================================================================
// Enums (matching database)
// ============================================================================

export const ProblemCategorySchema = z.enum(["backend", "frontend"]);
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export const UserProblemStatusSchema = z.enum(["in_progress", "completed"]);

// ============================================================================
// Response Schemas
// ============================================================================

export const UserProblemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: UserProblemStatusSchema,
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const ProblemLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const ProblemSimpleResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  category: ProblemCategorySchema,
  // Current version fields (flattened)
  title: z.string().nullable(),
  description: z.string().nullable(),
  difficulty: DifficultySchema.nullable(),
  timeToComplete: z.string().nullable(),
  topic: z.string().nullable(),
  links: z.array(ProblemLinkSchema).nullable(),
  status: UserProblemStatusSchema.nullable(),
  totalSteps: z.number().nullable(),
  completedSteps: z.number().nullable(),
});

export const ProblemResponseSchema = ProblemSimpleResponseSchema.extend({
  versionNumber: z.number(),
  userProblem: UserProblemSchema.nullable(),
});

// API Response wrappers
export const GetProblemResponseSchema = z.object({
  data: ProblemResponseSchema,
});

export const GetProblemsResponseSchema = z.object({
  data: z.array(ProblemSimpleResponseSchema),
});

// ============================================================================
// Problem Step Schemas
// ============================================================================

export const ProblemStepTypeSchema = z.enum([
  "functional",
  "nonFunctional",
  "api",
  "highLevelDesign",
]);

export const UserProblemStepSchema = z.object({
  id: z.string().uuid(),
  userProblemId: z.string().uuid(),
  status: z.enum(["in_progress", "completed"]),
  data: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const ProblemStepWithUserStepSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  stepType: ProblemStepTypeSchema,
  order: z.number(),
  required: z.boolean(),
  scoreWeight: z.number(),
  data: z.record(z.string(), z.unknown()).nullable(),
  userStep: UserProblemStepSchema.nullable(),
});

export const GetProblemStepsResponseSchema = z.object({
  data: z.array(ProblemStepWithUserStepSchema),
});

// ============================================================================
// Type Exports
// ============================================================================
export type ProblemCategory = z.infer<typeof ProblemCategorySchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type UserProblem = z.infer<typeof UserProblemSchema>;
export type ProblemLink = z.infer<typeof ProblemLinkSchema>;
export type ProblemSimpleResponse = z.infer<typeof ProblemSimpleResponseSchema>;
export type ProblemResponse = z.infer<typeof ProblemResponseSchema>;
export type GetProblemResponse = z.infer<typeof GetProblemResponseSchema>;
export type GetProblemsResponse = z.infer<typeof GetProblemsResponseSchema>;
export type ProblemStepType = z.infer<typeof ProblemStepTypeSchema>;
export type UserProblemStep = z.infer<typeof UserProblemStepSchema>;
export type ProblemStepWithUserStep = z.infer<typeof ProblemStepWithUserStepSchema>;
export type GetProblemStepsResponse = z.infer<typeof GetProblemStepsResponseSchema>;
