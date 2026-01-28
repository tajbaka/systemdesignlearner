"use client";

import { useCallback, useEffect, useRef } from "react";

type VoiceWaveformProps = {
  audioLevel: number; // 0-1 value
  isActive: boolean;
  className?: string;
};

const BAR_COUNT = 5;
const MIN_HEIGHT = 0.2;
const MAX_HEIGHT = 1;
const ANIMATION_SPEED = 0.1;

/**
 * Animated waveform visualization for voice input
 */
export function VoiceWaveform({ audioLevel, isActive, className = "" }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barHeightsRef = useRef<number[]>(Array(BAR_COUNT).fill(MIN_HEIGHT));
  const targetHeightsRef = useRef<number[]>(Array(BAR_COUNT).fill(MIN_HEIGHT));
  const animationFrameRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const barWidth = width / (BAR_COUNT * 2 - 1);
    const gap = barWidth;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Update target heights based on audio level
    if (isActive) {
      for (let i = 0; i < BAR_COUNT; i++) {
        // Add some variation per bar
        const variation = Math.sin(Date.now() * 0.01 + i) * 0.2;
        const target =
          MIN_HEIGHT +
          (audioLevel * (MAX_HEIGHT - MIN_HEIGHT) + variation) * (0.7 + Math.random() * 0.3);
        targetHeightsRef.current[i] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, target));
      }
    } else {
      targetHeightsRef.current = Array(BAR_COUNT).fill(MIN_HEIGHT);
    }

    // Smooth animation towards target heights
    for (let i = 0; i < BAR_COUNT; i++) {
      const diff = targetHeightsRef.current[i] - barHeightsRef.current[i];
      barHeightsRef.current[i] += diff * ANIMATION_SPEED;
    }

    // Draw bars
    ctx.fillStyle = isActive ? "#3b82f6" : "#71717a"; // blue-500 when active, zinc-500 otherwise

    for (let i = 0; i < BAR_COUNT; i++) {
      const barHeight = barHeightsRef.current[i] * height;
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [isActive, audioLevel]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={24}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
