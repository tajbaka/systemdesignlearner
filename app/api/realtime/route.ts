import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RealtimeSessionResponse = {
  client_secret: {
    value: string;
    expires_at: number;
  };
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 401 }
    );
  }

  try {
    const origin = req.headers.get("origin") || "";
    const allowedOrigins = [
      "http://localhost:3000",
      "https://www.systemdesignsandbox.com",
    ];

    if (!allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          modalities: ["text"],
          voice: "verse",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    const data = (await response.json()) as RealtimeSessionResponse;

    return NextResponse.json(
      {
        client_secret: data.client_secret.value,
        expires_at: data.client_secret.expires_at,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    logger.error("Realtime session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
