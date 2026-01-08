/**
 * Gemini AI Integration for Scoring Enhancement
 *
 * Provides semantic understanding and natural language explanations
 * to augment rule-based scoring.
 */

import { getGenAI } from "@/lib/gemini";

/**
 * Extract structured requirements from natural language text
 */
export async function extractRequirementsWithAI(
  text: string,
  referenceRequirements: Array<{ id: string; label: string; description: string }>
): Promise<Record<string, boolean>> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are analyzing a system design functional requirements description.

User's description:
"""
${text}
"""

Reference requirements to check for:
${referenceRequirements.map((req) => `- ${req.id}: ${req.label} - ${req.description}`).join("\n")}

Task: Determine which requirements are mentioned or implied in the user's description.
Consider synonyms, related concepts, and implicit mentions.

Respond ONLY with a JSON object mapping requirement IDs to boolean values.
Format: { "requirement-id": true/false, ... }

Example: { "url-shortening": true, "redirection": true, "custom-aliases": false }

Your response (JSON only, no explanation):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("AI response didn't contain valid JSON:", response);
      return {};
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return extracted;
  } catch (error) {
    console.error("Error extracting requirements with AI:", error);
    return {};
  }
}

/**
 * Generate natural language explanation for a score
 */
export async function explainScoreWithAI(
  userInput: {
    functionalSummary?: string;
    endpoints?: Array<{ method: string; path: string; notes: string }>;
    designComponents?: string[];
  },
  score: number,
  maxScore: number,
  feedbackItems: Array<{ message: string; severity: string }>,
  stepName: string
): Promise<string> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const percentage = Math.round((score / maxScore) * 100);

  const prompt = `You are a helpful system design mentor providing personalized feedback.

Step: ${stepName}
Score: ${score}/${maxScore} (${percentage}%)

User's work:
${JSON.stringify(userInput, null, 2)}

System feedback:
${feedbackItems.map((f) => `[${f.severity.toUpperCase()}] ${f.message}`).join("\n")}

Task: Write a 2-3 sentence personalized explanation that:
1. Acknowledges what they did well
2. Explains why they got this score
3. Provides encouraging, specific guidance on how to improve

Be conversational, supportive, and specific. Avoid just repeating the feedback items.
Focus on the "why" and "how" to help them learn.

Your explanation:`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response.trim();
  } catch (error) {
    console.error("Error generating explanation with AI:", error);
    return "Great effort! Review the feedback above for specific improvements.";
  }
}

/**
 * Validate if a creative/alternative solution still meets requirements
 */
export async function validateAlternativeSolution(
  userSolution: string,
  requirement: {
    id: string;
    label: string;
    description: string;
    keywords: string[];
  },
  context: string
): Promise<{
  isValid: boolean;
  confidence: number;
  reasoning: string;
}> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are evaluating whether a creative system design solution meets a requirement.

Requirement: ${requirement.label}
Description: ${requirement.description}
Expected keywords: ${requirement.keywords.join(", ")}

User's solution:
"""
${userSolution}
"""

Context: ${context}

Task: Determine if the user's solution addresses this requirement, even if they used different terminology.
Consider:
- Synonyms and alternative phrasing
- Implicit vs explicit mentions
- Functionally equivalent approaches

Respond with JSON:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Your response (JSON only):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isValid: false,
        confidence: 0,
        reasoning: "Unable to parse AI response",
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error validating alternative solution:", error);
    return {
      isValid: false,
      confidence: 0,
      reasoning: "AI validation failed",
    };
  }
}

/**
 * Compare user's API design to best practices
 */
export async function analyzeApiDesign(
  endpoints: Array<{ method: string; path: string; notes: string }>,
  functionalRequirements: string[]
): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a REST API design expert reviewing a system design.

Functional Requirements: ${functionalRequirements.join(", ")}

User's API Endpoints:
${endpoints.map((ep) => `${ep.method} ${ep.path}\n  Notes: ${ep.notes || "No documentation"}`).join("\n\n")}

Task: Analyze the API design and provide:
1. Overall score (0-100)
2. Strengths (what's done well)
3. Improvements (what needs fixing)
4. Suggestions (optional enhancements)

Consider:
- RESTful conventions
- Path naming (nouns, not verbs)
- HTTP method appropriateness
- Documentation quality
- Alignment with functional requirements
- Missing critical endpoints

Respond with JSON:
{
  "score": 0-100,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}

Your response (JSON only):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 0,
        strengths: [],
        improvements: ["Unable to analyze with AI"],
        suggestions: [],
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error analyzing API design:", error);
    return {
      score: 0,
      strengths: [],
      improvements: ["AI analysis failed"],
      suggestions: [],
    };
  }
}

/**
 * Generate actionable improvement suggestions to reach 100% score
 */
export async function generateImprovementPath(
  currentScore: number,
  maxScore: number,
  endpoints: Array<{ method: string; path: string; notes: string }>,
  feedback: {
    positive: Array<{ message: string }>;
    warnings: Array<{ message: string }>;
    suggestions: Array<{ message: string }>;
  },
  functionalRequirements: string[]
): Promise<{
  improvements: string[];
  examples: string[];
}> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const percentage = Math.round((currentScore / maxScore) * 100);

  const prompt = `You are an API design coach helping a student improve their REST API design from ${percentage}% to 100%.

Current Score: ${currentScore}/${maxScore} (${percentage}%)
Functional Requirements: ${functionalRequirements.join(", ")}

Current API Endpoints:
${endpoints.map((ep) => `${ep.method} ${ep.path}\n  Documentation: ${ep.notes || "None"}`).join("\n\n")}

Current Feedback:
Strengths:
${feedback.positive.map((p) => `- ${p.message}`).join("\n")}

Issues:
${feedback.warnings.map((w) => `- ${w.message}`).join("\n")}

Existing Suggestions:
${feedback.suggestions.map((s) => `- ${s.message}`).join("\n")}

Task: Provide specific, actionable advice to reach 100% score. Focus on:
1. What's missing or incomplete in the current design
2. How to improve documentation quality (mention specific keywords: request, response, error, authentication, rate limiting, validation)
3. What optional endpoints would make this a complete API
4. Concrete examples of better documentation

Be concise and actionable. Provide 3-5 improvement suggestions and 2-3 concrete examples.

Respond with JSON:
{
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "examples": ["example 1 showing better documentation", "example 2 showing missing endpoint"]
}

Your response (JSON only):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        improvements: ["Consider adding more detailed documentation for each endpoint"],
        examples: ["Example: Describe request body format, response structure, and error codes"],
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error generating improvement path:", error);
    return {
      improvements: ["Review your endpoint documentation for completeness"],
      examples: ["Include request/response formats and error handling details"],
    };
  }
}

/**
 * Analyze system architecture for patterns and anti-patterns
 */
export async function analyzeArchitecture(
  components: Array<{ kind: string; replicas: number }>,
  connections: Array<{ from: string; to: string }>,
  requirements: {
    functional: string[];
    readRps: number;
    writeRps: number;
    latency: number;
  }
): Promise<{
  score: number;
  patterns: string[];
  antiPatterns: string[];
  scalabilityConcerns: string[];
  recommendations: string[];
}> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a system architecture expert reviewing a high-level design.

Requirements:
- Functional: ${requirements.functional.join(", ")}
- Read RPS: ${requirements.readRps}
- Write RPS: ${requirements.writeRps}
- Target Latency: ${requirements.latency}ms

Architecture:
Components:
${components.map((c) => `- ${c.kind} (${c.replicas} replica${c.replicas > 1 ? "s" : ""})`).join("\n")}

Connections:
${connections.map((c) => `- ${c.from} → ${c.to}`).join("\n")}

Task: Analyze the architecture and identify:
1. Overall architecture score (0-100)
2. Good patterns detected
3. Anti-patterns or issues
4. Scalability concerns
5. Recommendations for improvement

Consider:
- Data flow efficiency
- Caching strategies
- Single points of failure
- Scalability bottlenecks
- Appropriate component choices
- Redundancy and availability

Respond with JSON:
{
  "score": 0-100,
  "patterns": ["pattern 1", "pattern 2"],
  "antiPatterns": ["anti-pattern 1", "anti-pattern 2"],
  "scalabilityConcerns": ["concern 1", "concern 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}

Your response (JSON only):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 0,
        patterns: [],
        antiPatterns: [],
        scalabilityConcerns: ["Unable to analyze with AI"],
        recommendations: [],
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error analyzing architecture:", error);
    return {
      score: 0,
      patterns: [],
      antiPatterns: [],
      scalabilityConcerns: ["AI analysis failed"],
      recommendations: [],
    };
  }
}

/**
 * Check if AI is available and configured
 */
export function isAIAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY);
}
