import type { ProblemConfig } from "@/domains/practice/back-end/types";
import type { EvaluationStrategy, APIEvaluationResult } from "../types";
import { ApiDefinitionSchema, type ApiDefinitionInput } from "../validation";

// Type for extracted API information from user's description
export interface ExtractedApiInfo {
  mainAction: string;
  requestBody: string;
  responseFormat: string;
  successStatusCode: string;
  errorCases: string[];
}

interface AIResultItem {
  id: string;
  found?: boolean;
  met?: boolean; // Alias for found - AI sometimes uses this
  feedback?: string;
  relatedHintId?: string;
  // Schema-enforced fields for field highlighting
  correctMethod?: boolean;
  correctPath?: boolean;
  correctDescription?: boolean;
  matchedEndpointId?: string;
}

type ApiRequirement = {
  id: string;
  weight?: number;
  scope?: string;
  method?: string;
  correctPath?: string;
};

// Helper: Check if paths are semantically similar
function pathsSimilar(userPath: string, expectedPath: string): boolean {
  const normalize = (p: string) =>
    p
      .toLowerCase()
      .replace(/^\/+/, "")
      .replace(/:[^/]+/g, ":param")
      .replace(/\{[^}]+}/g, ":param");

  return (
    normalize(userPath) === normalize(expectedPath) ||
    normalize(userPath).includes(normalize(expectedPath).split("/")[0])
  );
}

// Helper: Find best matching endpoint for a requirement
function findBestMatchingEndpoint(
  endpoints: ApiDefinitionInput["endpoints"],
  expectedMethod: string,
  expectedPath: string
): ApiDefinitionInput["endpoints"][0] | null {
  // Priority 1: Exact method + similar path
  const exactMatch = endpoints.find(
    (ep) => ep.method.value === expectedMethod && pathsSimilar(ep.path.value, expectedPath)
  );
  if (exactMatch) return exactMatch;

  // Priority 2: Similar path (any method)
  const pathMatch = endpoints.find((ep) => pathsSimilar(ep.path.value, expectedPath));
  if (pathMatch) return pathMatch;

  // Priority 3: Same method
  const methodMatch = endpoints.find((ep) => ep.method.value === expectedMethod);
  if (methodMatch) return methodMatch;

  return null;
}

// Helper: Determine which field is incorrect based on requirement
function determineIncorrectFieldId(
  requirement: { method?: string; correctPath?: string },
  endpoints: ApiDefinitionInput["endpoints"]
): string | undefined {
  if (endpoints.length === 0) return undefined;
  if (!requirement.method || !requirement.correctPath) return undefined;

  const matched = findBestMatchingEndpoint(endpoints, requirement.method, requirement.correctPath);
  const ep = matched || endpoints[0];

  if (ep.method.value !== requirement.method) {
    return ep.method.id;
  }
  if (!pathsSimilar(ep.path.value, requirement.correctPath)) {
    return ep.path.id;
  }
  return ep.description.id;
}

export const apiStrategy: EvaluationStrategy<ApiDefinitionInput, APIEvaluationResult> & {
  buildExtractionPrompt: (endpoint: { description: { value: string } }) => string;
  buildEvaluationPromptWithExtractions: (
    config: ProblemConfig,
    userInput: ApiDefinitionInput,
    extractions: Map<string, ExtractedApiInfo>
  ) => string;
} = {
  validate(input: unknown): ApiDefinitionInput {
    return ApiDefinitionSchema.parse(input);
  },

  // Step 1: Extract structured information from a single endpoint's description
  buildExtractionPrompt(endpoint: { description: { value: string } }): string {
    return `Extract structured information from this API endpoint description.

IMPORTANT: The HTTP method (GET/POST/etc.) and URL path are captured in SEPARATE form fields.
DO NOT try to extract method or path from this description.
Focus ONLY on: what it does, request body, response format, status codes, and errors.

**Description:**
${endpoint.description.value || "(empty)"}

**Instructions:**
Extract ONLY what the user explicitly wrote. DO NOT infer or assume.
If something is not DIRECTLY stated in the description, use "not specified".

CRITICAL: You must be LITERAL. Do not guess. Do not infer from context.
- If user says "Creates URL" but doesn't mention request body → requestBody: "not specified"
- If user says "Returns short URL" but doesn't specify format → responseFormat: "not specified"
- If user doesn't list error codes → errorCases: []

You are an EXTRACTOR, not an IMPROVER. Output only what's there.

IMPORTANT: Return a FLAT JSON object with exactly these 5 keys. DO NOT use a "results" array.

**Example 1 (POST with JSON body - Create resource):**
Input: "create url endpoint
body has the long url like {"url": "..."}
returns 201 with shortUrl
errors: 400 bad url, 429 too many requests"

Output:
{"mainAction":"create","requestBody":"{\\"url\\":\\"...\\"}","responseFormat":"shortUrl","successStatusCode":"201","errorCases":["400 bad url","429 too many requests"]}

**Example 2 (GET with query parameters - Pagination):**
Input: "GET endpoint to fetch message history for a chat
Path param: chatId
Query params: cursor (optional), limit (default 50)
Returns array of messages with sender, timestamp, content
200 on success, 404 if chat not found"

Output:
{"mainAction":"fetch message history","requestBody":"not specified","responseFormat":"array of messages with sender, timestamp, content","successStatusCode":"200","errorCases":["404 if chat not found"]}

**Example 3 (POST with boolean response - Rate limiting):**
Input: "Check if request is allowed under rate limit
Body: { key: string, cost?: number }
Returns: { allowed: boolean, remaining: number, resetAt: timestamp }
200 if allowed, 429 if rate limited"

Output:
{"mainAction":"check rate limit","requestBody":"{ key: string, cost?: number }","responseFormat":"{ allowed: boolean, remaining: number, resetAt: timestamp }","successStatusCode":"200","errorCases":["429 if rate limited"]}

**Example 4 (Async operation - 202 Accepted):**
Input: "Send notification to user
Body: userId, channel (email/sms/push), content, priority
Returns 202 Accepted - notification queued for async delivery
Errors: 400 invalid channel, 404 user not found"

Output:
{"mainAction":"send notification","requestBody":"userId, channel (email/sms/push), content, priority","responseFormat":"notification queued for async delivery","successStatusCode":"202","errorCases":["400 invalid channel","404 user not found"]}

**Example 5 (minimal input):**
Input: "Creates a shortened URL"

Output:
{"mainAction":"create","requestBody":"not specified","responseFormat":"not specified","successStatusCode":"not specified","errorCases":[]}

Return ONLY the JSON object below (no markdown, no explanation, no "results" wrapper):
{"mainAction":"string","requestBody":"string","responseFormat":"string","successStatusCode":"string","errorCases":[]}`;
  },

  // Step 2: Evaluation prompt that uses pre-extracted data
  buildEvaluationPromptWithExtractions(
    config: ProblemConfig,
    userInput: ApiDefinitionInput,
    extractions: Map<string, ExtractedApiInfo>
  ): string {
    const requirements = config.steps.api.requirements || [];

    // Normalize paths by adding leading "/" if missing
    const normalizedEndpoints = userInput.endpoints.map((ep) => ({
      ...ep,
      path: {
        ...ep.path,
        value: ep.path.value.startsWith("/") ? ep.path.value : `/${ep.path.value}`,
      },
    }));

    const formattedDesign = normalizedEndpoints
      .map((ep) => {
        const extraction = extractions.get(ep.id);
        const extractedInfo = extraction
          ? `
  **Extracted from description:**
  - Action: ${extraction.mainAction}
  - Request body: ${extraction.requestBody}
  - Response format: ${extraction.responseFormat}
  - Status code: ${extraction.successStatusCode}
  - Error cases: ${extraction.errorCases.length > 0 ? extraction.errorCases.join(", ") : "none specified"}`
          : `
  **Extracted from description:** (extraction failed)`;

        return `Endpoint ID: ${ep.id}
  Method: ${ep.method.value}
  Path: ${ep.path.value}
  Raw Description: ${ep.description.value || "(empty)"}${extractedInfo}`;
      })
      .join("\n---\n");

    return `You are an expert system design interviewer.
Evaluate the candidate's API Design for a "${config.title}" system.

**EVALUATION APPROACH - GENEROUS MATCHING:**
You are evaluating the semantic meaning of the user's design. Be GENEROUS.

The code will handle strict validation of missing fields AFTER your evaluation.
Your job is ONLY to check if the user's intent matches the requirement.

correctDescription = TRUE if:
- The mainAction broadly matches the goal of the requirement
- The user provides SOME documentation of request/response (any format is fine)
- Do NOT be pedantic about exact formatting or wording
- NOTE: GET requests do NOT need a requestBody - that's expected behavior

correctDescription = FALSE only if:
- The description is literally empty
- The description is for a COMPLETELY DIFFERENT action (e.g., "delete user" for a "create URL" requirement)

**Problem Description:**
${config.description}

**Evaluation Criteria:**
${requirements
  .map((r) => {
    if (r.scope === "endpoint") {
      const normalizedPath = r.correctPath?.startsWith("/") ? r.correctPath : `/${r.correctPath}`;
      let base = `- ID: "${r.id}" (Endpoint)
   Expected: ${r.method} ${normalizedPath}
   Criteria: ${r.evaluationCriteria}`;
      if (r.hints?.length) {
        const hintList = r.hints
          .filter((h) => h.id)
          .map((h) => `     * HintID: "${h.id}" -> "${h.text}"`)
          .join("\n");
        if (hintList) base += `\n   Hints:\n${hintList}`;
      }
      return base;
    }
    return `- ID: "${r.id}" (Global)\n   Criteria: ${r.evaluationCriteria}`;
  })
  .join("\n")}

**Candidate's Design (with extracted information):**
${formattedDesign}

**Instructions:**
1. DOMAIN CHECK: Verify the design is for "${config.title}". If off-topic, set all fields to false.

2. For each endpoint requirement, find the best matching endpoint and evaluate EACH FIELD SEPARATELY:
   - Set "matchedEndpointId" to the candidate's endpoint ID you evaluated

   **STEP 2a - Evaluate METHOD (ignore path and description):**
   Ask: "Does the HTTP method match?"
   - If candidate method == expected method → correctMethod: TRUE
   - If candidate method != expected method → correctMethod: FALSE

   **STEP 2b - Evaluate PATH (ignore method and description):**
   Ask: "Does the path match semantically?" (/:param = /{param} = /:slug)
   - If paths match → correctPath: TRUE
   - If paths differ → correctPath: FALSE

   **STEP 2c - Evaluate DESCRIPTION (BE GENEROUS):**
   Check if the user's description INTENDS to describe the same action as the requirement.

   CRITICAL: The HTTP method and URL path are captured in SEPARATE form fields (evaluated in 2a and 2b).
   Do NOT fail correctDescription because the user didn't mention "POST" or "/api/v1/urls" in their description text.

   correctDescription = TRUE if:
   - The mainAction broadly matches (e.g., "create URL" ≈ "shorten URL" ≈ "POST endpoint for URLs")
   - The description is NOT empty
   - The description is NOT for a completely different feature

   correctDescription = FALSE only if:
   - Raw Description is empty or says "(empty)"
   - Description describes a DIFFERENT action entirely (e.g., "delete users" vs "create URL")

   NOTE: Do NOT fail based on missing request body, response format, or status codes.
   The system will validate those fields separately. Your job is semantic matching only.

   **MANDATORY EXAMPLES - follow these exactly:**
   | Expected | Candidate | correctMethod | correctPath | correctDescription |
   |----------|-----------|---------------|-------------|-------------------|
   | POST /api/v1/urls | GET /api/v1/urls | FALSE | TRUE | (semantic match) |
   | GET /:slug | POST /:slug | FALSE | TRUE | (semantic match) |
   | POST /urls | POST /wrong | TRUE | FALSE | (semantic match) |
   | GET /:id | GET /{id} | TRUE | TRUE | (semantic match) |

   - CRITICAL: "found" = correctMethod AND correctPath AND correctDescription

3. For "found" to be TRUE, ALL THREE fields must be TRUE. Be strict.

4. Provide specific feedback explaining what needs improvement. Only mention fields that are actually wrong.

5. Include "relatedHintId" if a hint applies to the failure.

**OUTPUT FORMAT - Return ONLY this JSON structure:**
\`\`\`json
{
  "results": [
    {
      "id": "requirement-id-here",
      "found": true,
      "correctMethod": true,
      "correctPath": true,
      "correctDescription": true,
      "matchedEndpointId": "ep-1",
      "feedback": "Explanation of evaluation",
      "relatedHintId": null
    }
  ]
}
\`\`\`

CRITICAL: Use EXACTLY these field names: "found", "correctMethod", "correctPath", "correctDescription", "matchedEndpointId".
Do NOT use "met", "complete", "pass", or any other field names.`;
  },

  // Original buildPrompt kept for backward compatibility (used when extractions not available)
  buildPrompt(config: ProblemConfig, userInput: ApiDefinitionInput): string {
    const requirements = config.steps.api.requirements || [];

    // Normalize paths by adding leading "/" if missing
    const normalizedEndpoints = userInput.endpoints.map((ep) => ({
      ...ep,
      path: {
        ...ep.path,
        value: ep.path.value.startsWith("/") ? ep.path.value : `/${ep.path.value}`,
      },
    }));

    const formattedDesign = normalizedEndpoints
      .map(
        (ep) =>
          `Endpoint ID: ${ep.id}\n  Method: ${ep.method.value}\n  Path: ${ep.path.value}\n  Description: ${ep.description.value || "(empty)"}`
      )
      .join("\n---\n");

    return `You are an expert system design interviewer.
Evaluate the candidate's API Design for a "${config.title}" system.

**Problem Description:**
${config.description}

**Evaluation Criteria:**
${requirements
  .map((r) => {
    if (r.scope === "endpoint") {
      const normalizedPath = r.correctPath?.startsWith("/") ? r.correctPath : `/${r.correctPath}`;
      let base = `- ID: "${r.id}" (Endpoint)
   Expected: ${r.method} ${normalizedPath}
   Criteria: ${r.evaluationCriteria}`;
      if (r.hints?.length) {
        const hintList = r.hints
          .filter((h) => h.id)
          .map((h) => `     * HintID: "${h.id}" -> "${h.text}"`)
          .join("\n");
        if (hintList) base += `\n   Hints:\n${hintList}`;
      }
      return base;
    }
    return `- ID: "${r.id}" (Global)\n   Criteria: ${r.evaluationCriteria}`;
  })
  .join("\n")}

**Candidate's Design:**
${formattedDesign}

**Instructions:**
1. DOMAIN CHECK: Verify the design is for "${config.title}". If off-topic, set all fields to false.

2. For each endpoint requirement, find the best matching endpoint and evaluate EACH FIELD SEPARATELY:
   - Set "matchedEndpointId" to the candidate's endpoint ID you evaluated

   **STEP 2a - Evaluate METHOD (ignore path and description):**
   Ask: "Does the HTTP method match?"
   - If candidate method == expected method → correctMethod: TRUE
   - If candidate method != expected method → correctMethod: FALSE

   **STEP 2b - Evaluate PATH (ignore method and description):**
   Ask: "Does the path match semantically?" (/:param = /{param} = /:slug)
   - If paths match → correctPath: TRUE
   - If paths differ → correctPath: FALSE

   **STEP 2c - Evaluate DESCRIPTION (ignore method and path):**
   Ask: "Does description mention the core action?"
   - If yes → correctDescription: TRUE
   - If empty or completely wrong action → correctDescription: FALSE

   **MANDATORY EXAMPLES - follow these exactly:**
   | Expected | Candidate | correctMethod | correctPath | correctDescription |
   |----------|-----------|---------------|-------------|-------------------|
   | POST /api/v1/urls | GET /api/v1/urls | FALSE | TRUE | (evaluate desc) |
   | GET /:slug | POST /:slug | FALSE | TRUE | (evaluate desc) |
   | POST /urls | POST /wrong | TRUE | FALSE | (evaluate desc) |
   | GET /:id | GET /{id} | TRUE | TRUE | (evaluate desc) |

   - CRITICAL: "found" = correctMethod AND correctPath AND correctDescription

3. DESCRIPTION EVALUATION - Evaluate based on the Criteria field for each requirement:
   - correctDescription: true ONLY if the description satisfies ALL requirements in the Criteria
   - The Criteria field specifies exactly what the description must include
   - If Criteria mentions request/response formats, status codes, or error handling - they MUST be present
   - Semantic equivalence is sufficient - exact wording not required
   - Only mark correctDescription: false if:
     * Description is empty or says "(empty)"
     * Description is missing ANY element specified in the Criteria
     * Description describes a COMPLETELY DIFFERENT action

4. Provide specific feedback explaining what needs improvement. Only mention fields that are actually wrong.

5. Include "relatedHintId" if a hint applies to the failure.

**OUTPUT FORMAT - Return ONLY this JSON structure:**
\`\`\`json
{
  "results": [
    {
      "id": "requirement-id-here",
      "found": true,
      "correctMethod": true,
      "correctPath": true,
      "correctDescription": true,
      "matchedEndpointId": "ep-1",
      "feedback": "Explanation of evaluation",
      "relatedHintId": null
    }
  ]
}
\`\`\`

CRITICAL: Use EXACTLY these field names: "found", "correctMethod", "correctPath", "correctDescription", "matchedEndpointId".
Do NOT use "met", "complete", "pass", or any other field names.`;
  },

  parseResponse(
    responseText: string,
    config: ProblemConfig,
    userInput: ApiDefinitionInput
  ): APIEvaluationResult {
    const requirements = config.steps.api.requirements || [];
    let aiResults: AIResultItem[] = [];

    try {
      // Clean markdown code blocks if present and parse
      const cleanedText = responseText.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(cleanedText);
      aiResults = parsed.results || [];
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Return error result with fallback itemIds for highlighting
      return {
        feedback: "Evaluation failed: Unable to parse AI response. Please try again.",
        score: 0,
        results: requirements.map((req: ApiRequirement) => {
          const fallbackItemId = determineIncorrectFieldId(req, userInput.endpoints);
          return {
            id: req.id,
            complete: false,
            feedback: "Evaluation could not be completed due to a processing error.",
            itemIds: fallbackItemId ? [fallbackItemId] : undefined,
          };
        }),
      };
    }

    const results = requirements.map((req: ApiRequirement) => {
      const aiResult = aiResults.find((r: AIResultItem) => r.id === req.id);

      // Handle both "found" and "met" field names (AI sometimes uses "met")
      const aiFoundOrMet = aiResult?.found ?? aiResult?.met ?? false;

      // Derive completion from granular correctness fields when available (safety net for inconsistent AI)
      let isComplete = !!aiFoundOrMet;
      if (
        aiResult &&
        req.scope === "endpoint" &&
        aiResult.correctMethod !== undefined &&
        aiResult.correctPath !== undefined &&
        aiResult.correctDescription !== undefined
      ) {
        // For endpoint requirements, all three fields must be true
        isComplete = !!(
          aiResult.correctMethod &&
          aiResult.correctPath &&
          aiResult.correctDescription
        );
      }

      // Collect ALL incorrect field IDs (not just the first one)
      const itemIds: string[] = [];

      // Use AI-provided schema fields for field highlighting
      if (!isComplete && aiResult?.matchedEndpointId) {
        const matchedEp = userInput.endpoints.find((ep) => ep.id === aiResult.matchedEndpointId);
        if (matchedEp) {
          // Collect ALL incorrect fields
          if (aiResult.correctMethod === false) {
            itemIds.push(matchedEp.method.id);
          }
          if (aiResult.correctPath === false) {
            itemIds.push(matchedEp.path.id);
          }
          if (aiResult.correctDescription === false) {
            itemIds.push(matchedEp.description.id);
          }
        }
      }

      // Fallback: determine field to highlight when AI doesn't provide matchedEndpointId
      // BUT: only use fallback if AI didn't explicitly say "no endpoint matched"
      // If matchedEndpointId is null, it means the endpoint is completely missing - don't highlight existing endpoints
      const aiIndicatesEndpointMissing = aiResult?.matchedEndpointId === null;
      if (!isComplete && itemIds.length === 0 && !aiIndicatesEndpointMissing) {
        const fallbackItemId = determineIncorrectFieldId(req, userInput.endpoints);
        if (fallbackItemId) {
          itemIds.push(fallbackItemId);
        }
      }

      return {
        id: req.id,
        complete: isComplete,
        feedback: aiResult?.feedback,
        hintId: aiResult?.relatedHintId,
        itemIds: itemIds.length > 0 ? itemIds : undefined,
        matchedEndpointId: aiResult?.matchedEndpointId ?? undefined,
      };
    });

    const score = results.reduce((acc: number, res: { complete: boolean; id: string }) => {
      if (res.complete) {
        const req = requirements.find((r: { id: string; weight?: number }) => r.id === res.id);
        return acc + (req?.weight || 0);
      }
      return acc;
    }, 0);

    // Store snapshot of what was evaluated for change detection / no-regression
    const evaluatedInput = {
      endpoints: userInput.endpoints.map((ep) => ({
        id: ep.id,
        method: ep.method.value,
        path: ep.path.value,
        description: ep.description.value,
      })),
    };

    return { feedback: "Evaluation complete.", score, results, evaluatedInput };
  },
};
