import { z } from "zod";

// ============================================================================
// Functional / Non-Functional Input
// ============================================================================

export const TextRequirementSchema = z.object({
  textField: z.object({
    id: z.string(),
    value: z.string().min(1, "Input cannot be empty"),
  }),
});

export type TextRequirementInput = z.infer<typeof TextRequirementSchema>;

// ============================================================================
// API Input
// ============================================================================

const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]);

export const EndpointItemSchema = z.object({
  id: z.string(),
  method: z.object({
    id: z.string(),
    value: HttpMethodSchema,
  }),
  path: z.object({
    id: z.string(),
    value: z.string(),
  }),
  description: z.object({
    id: z.string(),
    value: z.string(),
  }),
});

export const ApiDefinitionSchema = z.object({
  endpoints: z.array(EndpointItemSchema),
});

export type ApiDefinitionInput = z.infer<typeof ApiDefinitionSchema>;
