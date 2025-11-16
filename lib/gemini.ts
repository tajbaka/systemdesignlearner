import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please add it to your .env file. Get a free API key at https://aistudio.google.com/app/apikey"
    );
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAI;
}

/**
 * Get Gemini 2.0 Flash model for fast, structured responses
 */
export function getGeminiModel() {
  const ai = getGenAI();
  return ai.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent validation
      topP: 0.8,
      topK: 40,
    },
  });
}

export { getGenAI };
