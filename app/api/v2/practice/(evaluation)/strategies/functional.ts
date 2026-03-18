import { ProblemConfig } from "@/domains/practice/back-end/types";
import { captureServerError } from "@/lib/posthog-server";
import {
  TextRequirementInput,
  TextRequirementSchema,
} from "@/app/api/v2/practice/(evaluation)/validation";
import { EvaluationResult, EvaluationStrategy } from "@/app/api/v2/practice/(evaluation)/types";

export const functionalStrategy: EvaluationStrategy<TextRequirementInput> = {
  validate(input: unknown): TextRequirementInput {
    return TextRequirementSchema.parse(input);
  },

  buildPrompt(config: ProblemConfig, userInput: TextRequirementInput): string {
    const requirements = config.steps.functional.requirements;

    return `You are an expert system design interviewer. 
Evaluate the candidate's functional requirements for a "${config.title}" system.

**Problem Description:**
${config.description}

**Evaluation Criteria:**
${requirements
  .map(
    (r: {
      id: string;
      evaluationCriteria?: string;
      description: string;
      hints?: Array<{ id: string; text: string }>;
    }) => {
      let base = `- ID: "${r.id}"
   Criteria: ${r.evaluationCriteria || r.description}`;

      if (r.hints && r.hints.length > 0) {
        const hintList = r.hints
          .filter((h: { id: string }) => h.id)
          .map((h: { id: string; text: string }) => `     * HintID: "${h.id}" -> "${h.text}"`)
          .join("\n");
        if (hintList) {
          base += `\n   Available Hints:\n${hintList}`;
        }
      }
      return base;
    }
  )
  .join("\n")}

**Candidate's Input:**
TextField ID: ${userInput.textField.id}
Value: "${userInput.textField.value}"

**Instructions:**
1. CRITICAL - DOMAIN RELEVANCE CHECK:
   - First, verify the input is actually about designing a "${config.title}" system.
   - If the input discusses a completely DIFFERENT domain (e.g., ice cream, pizza delivery, cooking, social media features when designing a URL shortener), mark ALL requirements as NOT met (met: false) with feedback explaining the input is off-topic.
   - Keyword matches alone are INSUFFICIENT. The keyword must be used in the correct technical context for THIS specific system.

2. CONTEXTUAL MATCHING:
   - For each requirement, the candidate must describe the technical concept as it applies to "${config.title}".
   - If a keyword appears but in the wrong context, that requirement is NOT met.

3. For each requirement ID, determine if the candidate's input meets the criteria. set "met": true if satisfied.

4. If a requirement is NOT met or partially met:
   - Look at the "Available Hints". If a specific hint is relevant to the failure, include its "HintID" as "relatedHintId".
   - MANDATORY: Include "incorrectFieldId" with the TextField ID provided above to highlight the text field.

5. Return JSON in this format:
{
  "results": [
    {
      "id": "requirement-id",
      "met": boolean,
      "incorrectFieldId": "textfield-id" (only if NOT met),
      "feedback": "explanation",
      "relatedHintId": "hint-id-if-applicable"
    }
  ]
}`;
  },

  parseResponse(
    responseText: string,
    config: ProblemConfig,
    _userInput: TextRequirementInput
  ): EvaluationResult {
    const requirements = config.steps.functional.requirements;
    let aiResults: {
      id: string;
      met?: boolean;
      feedback?: string;
      relatedHintId?: string;
      incorrectFieldId?: string;
    }[] = [];

    try {
      // Direct JSON parsing - no regex needed thanks to Schema Mode
      const parsed = JSON.parse(responseText);
      aiResults = parsed.results || [];
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      captureServerError(e, { route: "functional-strategy", step: "parseResponse" });
    }

    const results = requirements.map((req: { id: string; weight?: number }) => {
      const aiResult = aiResults.find((r: { id: string }) => r.id === req.id);
      const isComplete = !!aiResult?.met;

      // Only use AI-provided incorrectFieldId
      let itemIds: string[] | undefined;
      if (!isComplete && aiResult?.incorrectFieldId) {
        itemIds = [aiResult.incorrectFieldId];
      }

      return {
        id: req.id,
        complete: isComplete,
        feedback: aiResult?.feedback,
        hintId: aiResult?.relatedHintId,
        itemIds,
      };
    });

    const score = results.reduce((acc: number, res: { complete: boolean; id: string }) => {
      if (res.complete) {
        const req = requirements.find((r: { id: string; weight?: number }) => r.id === res.id);
        return acc + (req?.weight || 0);
      }
      return acc;
    }, 0);

    return {
      feedback: "Evaluation complete.",
      score,
      results,
    };
  },
};
