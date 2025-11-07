import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/transcribe/route";
import { NextRequest } from "next/server";

describe("/api/transcribe", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = "sk-test-key";
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  const createMockRequest = (
    formData: FormData,
    origin = "http://localhost:3000"
  ) => {
    return {
      formData: async () => formData,
      headers: {
        get: (name: string) => {
          if (name === "origin") return origin;
          return null;
        },
      },
    } as unknown as NextRequest;
  };

  it("transcribes audio successfully", async () => {
    const mockWhisperResponse = { text: "hello world" };

    globalThis.fetch = vi.fn(async (url) => {
      if (
        url === "https://api.openai.com/v1/audio/transcriptions"
      ) {
        return {
          ok: true,
          json: async () => mockWhisperResponse,
        } as Response;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }) as unknown as typeof fetch;

    const formData = new FormData();
    const audioBlob = new Blob(["fake audio"], { type: "audio/webm" });
    const audioFile = new File([audioBlob], "test.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.text).toBe("hello world");
  });

  it("returns 401 when OPENAI_API_KEY is not configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const formData = new FormData();
    const audioBlob = new Blob(["fake audio"], { type: "audio/webm" });
    const audioFile = new File([audioBlob], "test.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("OPENAI_API_KEY not configured");
  });

  it("returns 403 for unauthorized origins", async () => {
    const formData = new FormData();
    const audioBlob = new Blob(["fake audio"], { type: "audio/webm" });
    const audioFile = new File([audioBlob], "test.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);

    const request = createMockRequest(formData, "https://evil.com");
    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when no audio file is provided", async () => {
    const formData = new FormData();
    // No file attached

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No audio file provided");
  });

  it("returns 400 when audio file exceeds 25MB", async () => {
    const formData = new FormData();
    // Create a file larger than 25MB
    const largeBlob = new Blob([new ArrayBuffer(26 * 1024 * 1024)], {
      type: "audio/webm",
    });
    const largeFile = new File([largeBlob], "large.webm", {
      type: "audio/webm",
    });
    formData.append("file", largeFile);

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Audio file too large (max 25 MB)");
  });

  it("returns 500 when OpenAI API fails", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      text: async () => "OpenAI error",
    })) as unknown as typeof fetch;

    const formData = new FormData();
    const audioBlob = new Blob(["fake audio"], { type: "audio/webm" });
    const audioFile = new File([audioBlob], "test.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Transcription failed");
  });

  it("forwards language parameter to OpenAI", async () => {
    const fetchMock = vi.fn<
      [RequestInfo | URL, RequestInit?],
      Promise<Response>
    >(async () => ({
      ok: true,
      json: async () => ({ text: "bonjour" }),
    }));

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const formData = new FormData();
    const audioBlob = new Blob(["fake audio"], { type: "audio/webm" });
    const audioFile = new File([audioBlob], "test.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);
    formData.append("language", "fr");

    const request = createMockRequest(formData);
    await POST(request);

    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0] as Parameters<typeof fetch>;
    expect(options).toBeDefined();
    if (!options) {
      throw new Error("Fetch was called without options");
    }
    const sentFormData = options.body as FormData;
    expect(sentFormData.get("language")).toBe("fr");
  });

  it("allows requests from systemdesignsandbox.com", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ text: "test" }),
    })) as unknown as typeof fetch;

    const formData = new FormData();
    const audioBlob = new Blob(["fake audio"], { type: "audio/webm" });
    const audioFile = new File([audioBlob], "test.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);

    const request = createMockRequest(
      formData,
      "https://www.systemdesignsandbox.com"
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
