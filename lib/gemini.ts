import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema, // <--- Import the Schema type
} from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please add it to your .env file."
    );
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAI;
}

/**
 * Schema for Functional & Non-Functional evaluation.
 * These steps use a simple met/not-met boolean.
 */
const functionalEvaluationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    results: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          feedback: { type: SchemaType.STRING },
          relatedHintId: { type: SchemaType.STRING, nullable: true },
          met: { type: SchemaType.BOOLEAN },
        },
        required: ["id", "feedback", "met"],
      },
    },
  },
  required: ["results"],
};

/**
 * Schema for API evaluation with strict field requirements.
 * All correctness fields are REQUIRED to ensure consistent responses.
 */
const apiEvaluationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    results: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          feedback: { type: SchemaType.STRING },
          relatedHintId: { type: SchemaType.STRING, nullable: true },
          found: { type: SchemaType.BOOLEAN },
          correctMethod: { type: SchemaType.BOOLEAN },
          correctPath: { type: SchemaType.BOOLEAN },
          correctDescription: { type: SchemaType.BOOLEAN },
          matchedEndpointId: { type: SchemaType.STRING, nullable: true },
        },
        required: ["id", "feedback", "found", "correctMethod", "correctPath", "correctDescription"],
      },
    },
  },
  required: ["results"],
};

/**
 * Get Gemini 2.0 Flash for Functional/Non-Functional evaluation
 */
export function getGeminiModel() {
  const ai = getGenAI();
  return ai.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: functionalEvaluationSchema,
    },
  });
}

/**
 * Get Gemini 2.0 Flash for API evaluation with strict schema
 * All correctness fields (found, correctMethod, correctPath, correctDescription) are required
 */
export function getGeminiModelForApiEvaluation() {
  const ai = getGenAI();
  return ai.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: apiEvaluationSchema,
    },
  });
}

/**
 * Schema for API extraction - flat structure with 5 fields
 */
const extractionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    mainAction: { type: SchemaType.STRING },
    requestBody: { type: SchemaType.STRING },
    responseFormat: { type: SchemaType.STRING },
    successStatusCode: { type: SchemaType.STRING },
    errorCases: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["mainAction", "requestBody", "responseFormat", "successStatusCode", "errorCases"],
};

/**
 * Get Gemini 2.0 Flash with JSON Mode for extraction (different schema)
 */
export function getGeminiModelForExtraction() {
  const ai = getGenAI();
  return ai.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: extractionSchema,
    },
  });
}

export { getGenAI };
