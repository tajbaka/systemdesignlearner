import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useRealtimeStt } from "@/hooks/useRealtimeStt";

class MockDataChannel {
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: ((err: unknown) => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public send = vi.fn();
  public close = vi.fn();

  triggerOpen() {
    this.onopen?.();
  }

  emitMessage(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

class MockRTCPeerConnection {
  public static instances: MockRTCPeerConnection[] = [];
  public dataChannel: MockDataChannel | null = null;
  public oniceconnectionstatechange: (() => void) | null = null;
  public addTrack = vi.fn();
  public createOffer = vi.fn(async () => ({
    type: "offer",
    sdp: "offer-sdp",
  }));
  public setLocalDescription = vi.fn(async () => {});
  public setRemoteDescription = vi.fn(async () => {});
  public close = vi.fn();

  constructor() {
    MockRTCPeerConnection.instances.push(this);
  }

  createDataChannel() {
    this.dataChannel = new MockDataChannel();
    return this.dataChannel as unknown as RTCDataChannel;
  }
}

describe("useRealtimeStt", () => {
  const originalFetch = globalThis.fetch;
  const originalRTCPeerConnection = (globalThis as any).RTCPeerConnection;
  const originalMediaDevices = navigator.mediaDevices;

  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockStream: MediaStream;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    MockRTCPeerConnection.instances = [];
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

    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/realtime") {
        return {
          ok: true,
          json: async () => ({
            client_secret: "ephemeral-secret",
            expires_at: Math.floor(Date.now() / 1000) + 60,
          }),
        } as Response;
      }

      if (url.startsWith("https://api.openai.com/v1/realtime")) {
        return {
          ok: true,
          text: async () => "answer-sdp",
        } as Response;
      }

      throw new Error(`Unexpected fetch call to ${url}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;
    (globalThis as any).RTCPeerConnection =
      MockRTCPeerConnection as unknown as typeof RTCPeerConnection;
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    (globalThis as any).RTCPeerConnection = originalRTCPeerConnection;
    (navigator as unknown as { mediaDevices: MediaDevices }).mediaDevices =
      originalMediaDevices;
    MockRTCPeerConnection.instances = [];
  });

  it("runs the realtime voice pipeline end-to-end and surfaces transcripts", async () => {
    const onFinal = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeStt({
        stepId: "step-one",
        onFinal,
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const peer =
      MockRTCPeerConnection.instances[
        MockRTCPeerConnection.instances.length - 1
      ];
    expect(peer).toBeDefined();
    expect(peer?.addTrack).toHaveBeenCalled();

    const channel = peer?.dataChannel as MockDataChannel;
    expect(channel).toBeDefined();

    act(() => {
      channel.triggerOpen();
    });

    expect(channel.send).toHaveBeenCalledWith(
      expect.stringContaining('"session.update"')
    );

    act(() => {
      channel.emitMessage({
        type: "input_audio_buffer.speech_started",
      });
    });

    act(() => {
      channel.emitMessage({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "hello world",
      });
    });

    await waitFor(() =>
      expect(onFinal).toHaveBeenCalledWith("hello world")
    );

    expect(result.current.finalText).toBe("hello world");
    expect(result.current.isRecording).toBe(true);

    act(() => {
      result.current.stop();
    });

    await waitFor(() => expect(result.current.isRecording).toBe(false));
    expect(mockTrackStop).toHaveBeenCalled();
    expect(channel.close).toHaveBeenCalled();
    expect(peer?.close).toHaveBeenCalled();
  });

  it("surfaces fetch errors from the token endpoint", async () => {
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      json: async () => ({}),
    }));

    const { result } = renderHook(() =>
      useRealtimeStt({
        stepId: "step-error",
      })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("Failed to get session token");
    expect(result.current.isRecording).toBe(false);
  });
});
