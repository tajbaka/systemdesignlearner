"use client";

import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  audioLevel: number; // 0-1 value representing current audio level
  isActive: boolean;
}

export function VoiceWaveform({ audioLevel, isActive }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barsRef = useRef<number[]>(new Array(40).fill(0.1));
  const targetBarsRef = useRef<number[]>(new Array(40).fill(0.1));
  const audioLevelRef = useRef(audioLevel);
  const isActiveRef = useRef(isActive);

  // Update refs when props change
  useEffect(() => {
    audioLevelRef.current = audioLevel;
    isActiveRef.current = isActive;
  }, [audioLevel, isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateBars = () => {
      // When audio level is high, create more dynamic bars
      // When silent, flatten to low dotted line
      // Amplify the audio level for more dramatic movement
      const amplifiedLevel = audioLevelRef.current * 2.5;
      const baseHeight = amplifiedLevel > 0.1 ? amplifiedLevel : 0.15;

      // Update target bars with some randomness for natural look
      for (let i = 0; i < targetBarsRef.current.length; i++) {
        // Center bars are more responsive to audio
        const centerDistance = Math.abs(i - targetBarsRef.current.length / 2);
        const centerFactor = 1 - (centerDistance / (targetBarsRef.current.length / 2)) * 0.5;

        // Add some variation
        const variation = Math.random() * 0.4;
        targetBarsRef.current[i] = baseHeight * centerFactor + variation * baseHeight;
      }
    };

    const draw = () => {
      if (!canvas || !ctx) return;

      // Set canvas size to match display size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      const barCount = barsRef.current.length;
      const barWidth = 2;
      const barGap = 2;
      const totalWidth = barCount * (barWidth + barGap) - barGap;
      const startX = (rect.width - totalWidth) / 2;

      // Smoothly interpolate current bars to target bars
      for (let i = 0; i < barCount; i++) {
        barsRef.current[i] += (targetBarsRef.current[i] - barsRef.current[i]) * 0.2;
      }

      // Draw bars
      ctx.fillStyle = isActiveRef.current ? "rgb(59, 130, 246)" : "rgb(156, 163, 175)"; // blue-500 or gray-400

      for (let i = 0; i < barCount; i++) {
        const barHeight = Math.max(2, barsRef.current[i] * rect.height * 1.2);
        const x = startX + i * (barWidth + barGap);
        const y = (rect.height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start animation loop
    const interval = setInterval(updateBars, 50);
    draw();

    return () => {
      clearInterval(interval);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
