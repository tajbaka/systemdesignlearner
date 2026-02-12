import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel function timeout

/** Timeout for Whisper API calls (leave buffer before Vercel timeout) */
const WHISPER_API_TIMEOUT_MS = 25000;

/** Default allowed origins if ALLOWED_ORIGINS env var is not set */
const DEFAULT_ALLOWED_ORIGINS = ["https://www.systemdesignsandbox.com"];

type WhisperResponse = {
  text: string;
};

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim());
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 401, headers: getCorsHeaders(origin) }
    );
  }

  try {
    // CORS check
    const referer = req.headers.get("referer");

    logger.info("POST /api/v2/transcribe - Request received", { origin, referer });

    // Allow requests from same origin (when origin header is not present)
    // or from localhost in development
    const isLocalhost =
      (origin &&
        (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) ||
      (referer &&
        (referer.startsWith("http://localhost:") || referer.startsWith("http://127.0.0.1:")));

    const allowedOrigins = getAllowedOrigins();
    const isAllowedOrigin = origin && allowedOrigins.some((allowed) => origin.startsWith(allowed));

    if (!isLocalhost && !isAllowedOrigin) {
      logger.error("POST /api/v2/transcribe - CORS blocked", { origin, referer });
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: getCorsHeaders(origin) }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const model = (formData.get("model") as string) || "whisper-1";
    const language = formData.get("language") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Check file size (25 MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large (max 25 MB)" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", model);
    if (language) {
      whisperFormData.append("language", language);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WHISPER_API_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperFormData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("POST /api/v2/transcribe - Whisper API error:", errorText);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500, headers: getCorsHeaders(origin) }
      );
    }

    const data = (await response.json()) as WhisperResponse;

    logger.info("POST /api/v2/transcribe - Response sent", { data: { text: data.text } });
    return NextResponse.json({ text: data.text }, { headers: getCorsHeaders(origin) });
  } catch (error) {
    logger.error("POST /api/v2/transcribe - Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
