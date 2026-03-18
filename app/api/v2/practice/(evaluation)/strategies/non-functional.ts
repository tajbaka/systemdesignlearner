import type { ProblemConfig } from "@/domains/practice/back-end/types";
import { captureServerError } from "@/lib/posthog-server";
import type { EvaluationStrategy, EvaluationResult } from "../types";
import { TextRequirementSchema, type TextRequirementInput } from "../validation";

export const nonFunctionalStrategy: EvaluationStrategy<TextRequirementInput> = {
  validate(input: unknown): TextRequirementInput {
    return TextRequirementSchema.parse(input);
  },

  buildPrompt(config: ProblemConfig, userInput: TextRequirementInput): string {
    const requirements = config.steps.nonFunctional.requirements || [];

    return `You are an expert system design interviewer. 
Evaluate the candidate's non-functional requirements for a "${config.title}" system.

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
      let base = `- ID: "${r.id}"\n   Criteria: ${r.evaluationCriteria || r.description}`;
      if (r.hints?.length) {
        const hintList = r.hints
          .filter((h: { id: string }) => h.id)
          .map((h: { id: string; text: string }) => `     * HintID: "${h.id}" -> "${h.text}" `)
          .join("\n");
        if (hintList) base += `\n   Available Hints:\n${hintList}`;
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
   - Verify input is relevant to "${config.title}". If completely off-topic (e.g. pizza vs URL shortener), set "met": false.
   
2. For each requirement, determine if the input meets the criteria (set "met": true).
   - Check for specific metrics (latency, throughput) if mentioned.

3. If a requirement is NOT met:
   - Include relevant "relatedHintId" if applicable.
   - MANDATORY: Include "incorrectFieldId" with the TextField ID provided above to highlight the text field.

4. Return JSON in this format:
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
    userInput: TextRequirementInput
  ): EvaluationResult {
    const requirements = config.steps.nonFunctional.requirements || [];
    let aiResults: {
      id: string;
      met?: boolean;
      feedback?: string;
      relatedHintId?: string;
      incorrectFieldId?: string;
    }[] = [];

    try {
      const parsed = JSON.parse(responseText);
      aiResults = parsed.results || [];
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      captureServerError(e, { route: "non-functional-strategy", step: "parseResponse" });
    }

    const results = requirements.map((req: { id: string; weight?: number }) => {
      const aiResult = aiResults.find((r: { id: string }) => r.id === req.id);
      const isComplete = !!aiResult?.met;

      // Fallback: If AI didn't provide incorrectFieldId but requirement is incomplete,
      // use the textField id
      let itemIds: string[] | undefined;
      if (!isComplete) {
        const fieldId = aiResult?.incorrectFieldId || userInput.textField.id;
        itemIds = fieldId ? [fieldId] : undefined;
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

    return { feedback: "Evaluation complete.", score, results };
  },
};
