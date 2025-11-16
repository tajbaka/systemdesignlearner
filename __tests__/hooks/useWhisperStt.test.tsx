import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useWhisperStt } from "@/hooks/useWhisperStt";

type MediaRecorderConstructor = typeof MediaRecorder;
type MediaRecorderGlobal = typeof globalThis & {
  MediaRecorder?: MediaRecorderConstructor;
};

// Mock BlobEvent for jsdom
class MockBlobEvent extends Event {
  public data: Blob;
  constructor(type: string, options: { data: Blob }) {
    super(type);
    this.data = options.data;
  }
}

class MockMediaRecorder {
  public static instances: MockMediaRecorder[] = [];
  public ondataavailable: ((event: MockBlobEvent) => void) | null = null;
  public onstop: (() => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public state: "inactive" | "recording" | "paused" = "inactive";

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions
  ) {
    MockMediaRecorder.instances.push(this);
  }

  start(_timeslice?: number) {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }

  static isTypeSupported(mimeType: string): boolean {
    return mimeType === "audio/webm;codecs=opus";
  }

  emitData(blob: Blob) {
    this.ondataavailable?.(new MockBlobEvent("dataavailable", { data: blob }));
  }
}

describe("useWhisperStt", () => {
  const originalFetch = globalThis.fetch;
  const mediaRecorderGlobal = globalThis as MediaRecorderGlobal;
  const originalMediaRecorder = mediaRecorderGlobal.MediaRecorder;
  const originalMediaDevices = navigator.mediaDevices;

  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockStream: MediaStream;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    MockMediaRecorder.instances = [];
    mockTrackStop = vi.fn();

    const audioTrack = { stop: mockTrackStop } as unknown as MediaStreamTrack;

    mockStream = {
      getAudioTracks: vi.fn(() => [audioTrack]),
      getTracks: vi.fn(() => [audioTrack]),
    } as unknown as MediaStream;

    const getUserMedia = vi.fn(async () => mockStream);
    (navigator as unknown as { mediaDevices: MediaDevices }).mediaDevices = {
      getUserMedia,
    } as MediaDevices;

    fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/transcribe") {
        // Simulate successful transcription
        return {
          ok: true,
          json: async () => ({
            text: "hello world",
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch call to ${url}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;
    mediaRecorderGlobal.MediaRecorder = MockMediaRecorder as unknown as MediaRecorderConstructor;
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    mediaRecorderGlobal.MediaRecorder = originalMediaRecorder;
    (navigator as unknown as { mediaDevices: MediaDevices }).mediaDevices = originalMediaDevices;
    MockMediaRecorder.instances = [];
  });

  it("starts recording and transcribes audio successfully", async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() =>
      useWhisperStt({
        stepId: "step-one",
        onFinal,
      })
    );

    // Start recording
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(true);

    const recorder = MockMediaRecorder.instances[MockMediaRecorder.instances.length - 1];
    expect(recorder).toBeDefined();
    expect(recorder.state).toBe("recording");

    // Emit some audio data
    act(() => {
      const blob = new Blob(["audio data"], { type: "audio/webm" });
      recorder.emitData(blob);
    });

    // Stop recording
    act(() => {
      result.current.stop();
    });

    expect(result.current.isRecording).toBe(false);

    // Wait for processing to complete
    await waitFor(() => expect(result.current.isProcessing).toBe(false));

    // Verify transcription was called
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transcribe",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    // Verify onFinal was called with transcript
    expect(onFinal).toHaveBeenCalledWith("hello world");
    expect(result.current.finalText).toBe("hello world");

    // Verify cleanup
    expect(mockTrackStop).toHaveBeenCalled();
  });

  it("handles transcription API errors gracefully", async () => {
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      json: async () => ({ error: "Transcription failed" }),
    }));

    const onFinal = vi.fn();
    const { result } = renderHook(() =>
      useWhisperStt({
        stepId: "step-error",
        onFinal,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    const recorder = MockMediaRecorder.instances[MockMediaRecorder.instances.length - 1];

    act(() => {
      const blob = new Blob(["audio data"], { type: "audio/webm" });
      recorder.emitData(blob);
    });

    act(() => {
      result.current.stop();
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toContain("Transcription failed");
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("handles microphone permission denied", async () => {
    const getUserMedia = vi.fn(async () => {
      throw new Error("Permission denied");
    });
    (navigator as unknown as { mediaDevices: MediaDevices }).mediaDevices = {
      getUserMedia,
    } as MediaDevices;

    const { result } = renderHook(() =>
      useWhisperStt({
        stepId: "step-permission",
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("Permission denied");
    expect(result.current.isRecording).toBe(false);
  });

  it("prevents starting recording when already recording", async () => {
    const { result } = renderHook(() =>
      useWhisperStt({
        stepId: "step-double-start",
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(true);

    const initialInstanceCount = MockMediaRecorder.instances.length;

    // Try to start again
    await act(async () => {
      await result.current.start();
    });

    // Should not create a new recorder
    expect(MockMediaRecorder.instances.length).toBe(initialInstanceCount);
  });

  it("ignores stop when not recording", () => {
    const { result } = renderHook(() =>
      useWhisperStt({
        stepId: "step-not-recording",
      })
    );

    expect(result.current.isRecording).toBe(false);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRecording).toBe(false);
  });

  it("returns empty interimText (batch mode only)", async () => {
    const { result } = renderHook(() =>
      useWhisperStt({
        stepId: "step-no-interim",
      })
    );

    await act(async () => {
      await result.current.start();
    });

    // Whisper API is batch-only, no interim transcripts
    expect(result.current.interimText).toBe("");

    act(() => {
      result.current.stop();
    });

    await waitFor(() => expect(result.current.isProcessing).toBe(false));

    // Still no interim text
    expect(result.current.interimText).toBe("");
  });
});
