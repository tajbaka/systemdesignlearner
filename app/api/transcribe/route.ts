import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel function timeout

type WhisperResponse = {
  text: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 401 });
  }

  try {
    // CORS check
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");

    logger.info("Transcribe API request", { origin, referer });

    // Allow requests from same origin (when origin header is not present)
    // or from localhost in development
    const isLocalhost =
      (origin &&
        (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) ||
      (referer &&
        (referer.startsWith("http://localhost:") || referer.startsWith("http://127.0.0.1:")));

    const allowedOrigins = ["https://www.systemdesignsandbox.com"];
    const isAllowedOrigin = origin && allowedOrigins.some((allowed) => origin.startsWith(allowed));

    if (!isLocalhost && !isAllowedOrigin) {
      logger.error("CORS blocked", { origin, referer });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const model = (formData.get("model") as string) || "whisper-1";
    const language = formData.get("language") as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Check file size (25 MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large (max 25 MB)" }, { status: 400 });
    }

    // Forward to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", model);
    if (language) {
      whisperFormData.append("language", language);
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Whisper API error:", errorText);
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }

    const data = (await response.json()) as WhisperResponse;

    return NextResponse.json(
      { text: data.text },
      {
        headers: {
          "Access-Control-Allow-Origin": origin || "",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    logger.error("Transcription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
