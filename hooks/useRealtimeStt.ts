"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RealtimeEvent,
  RealtimeSessionToken,
  SttHookOptions,
  SttHookState,
} from "@/lib/realtime/types";

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: 24000,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function useRealtimeStt(options: SttHookOptions): SttHookState {
  const { stepId, onInterim, onFinal } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentStepIdRef = useRef(stepId);

  useEffect(() => {
    currentStepIdRef.current = stepId;
  }, [stepId]);

  const cleanup = useCallback(() => {
    console.log("Cleanup called");

    if (dataChannelRef.current) {
      console.log("Closing data channel");
      try {
        dataChannelRef.current.close();
      } catch (err) {
        console.error("Error closing data channel:", err);
      }
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      console.log("Closing peer connection");
      try {
        peerConnectionRef.current.close();
      } catch (err) {
        console.error("Error closing peer connection:", err);
      }
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      console.log("Stopping media stream");
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Error stopping media stream:", err);
      }
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setInterimText("");
  }, []);

  const start = useCallback(async () => {
    if (isRecording) {
      console.log("Already recording, ignoring start");
      return;
    }

    console.log("Starting recording...");
    setError(null);
    setInterimText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      });
      mediaStreamRef.current = stream;
      console.log("Got media stream with", stream.getAudioTracks().length, "audio tracks");

      const tokenResponse = await fetch("/api/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get session token");
      }

      const tokenData =
        (await tokenResponse.json()) as RealtimeSessionToken;
      console.log("Got session token, expires at:", new Date(tokenData.expires_at * 1000));

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;
      console.log("Created peer connection");

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setError("Connection lost");
          cleanup();
        }
      };

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track available");
      }

      pc.addTrack(audioTrack, stream);
      console.log("Added audio track to peer connection");

      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.info("Data channel opened");

        // Send session update to enable transcription
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions:
              "You are a speech to text transcriber. Listen to the user's audio and respond with the exact transcription.",
            voice: "verse",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        };

        dc.send(JSON.stringify(sessionUpdate));
        console.log("Sent session update");
      };

      dc.onclose = () => {
        console.info("Data channel closed");
      };

      dc.onerror = (err) => {
        console.error("Data channel error:", err);
        setError("Data channel error");
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RealtimeEvent;
          console.log("Received event:", msg.type);

          if (msg.type === "input_audio_buffer.speech_started") {
            console.log("Speech started - clearing interim");
            setInterimText("");
          } else if (msg.type === "input_audio_buffer.speech_stopped") {
            console.log("Speech stopped - will wait for transcription");
          } else if (msg.type === "conversation.item.input_audio_transcription.completed") {
            const transcriptContent = (msg as any).transcript;
            console.log("Transcription completed:", transcriptContent);
            if (transcriptContent) {
              setFinalText((prev) => {
                const next = prev ? `${prev} ${transcriptContent}` : transcriptContent;
                console.log("Setting final text:", next);
                onFinal?.(next);
                return next;
              });
            }
          } else if (msg.type === "conversation.item.input_audio_transcription.failed") {
            console.error("Transcription failed:", msg);
            setError("Transcription failed");
          }
        } catch (err) {
          console.error("Failed to parse event:", err);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(
        `${baseUrl}?model=${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.client_secret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error("SDP exchange failed");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setIsRecording(true);
      console.log("Recording started successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      console.error("Failed to start recording:", err);
      setError(message);
      cleanup();
    }
  }, [isRecording, cleanup, onInterim, onFinal, interimText]);

  const stop = useCallback(() => {
    if (!isRecording) {
      console.log("Not recording, ignoring stop");
      return;
    }

    console.log("Stopping recording...");

    const current = interimText.trim();
    if (current) {
      console.log("Saving interim text as final:", current);
      setFinalText((prev) => {
        const next = prev ? `${prev} ${current}` : current;
        onFinal?.(next);
        return next;
      });
      setInterimText("");
    }

    cleanup();
    console.log("Recording stopped");
  }, [isRecording, interimText, cleanup, onFinal]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    interimText,
    finalText,
    error,
    start,
    stop,
  };
}
