import React, { useEffect, useRef } from "react";
import { ConnectionState } from "../types";

interface WaveVisualizerProps {
  connectionState: ConnectionState;
  userVolume: number;
  aiVolume: number;
}

interface Particle {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  connectionState,
  userVolume,
  aiVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize circular reactive particles once
  useEffect(() => {
    const particles: Particle[] = [];
    const colors = [
      "rgba(34, 211, 238, 0.45)",  // Cyan
      "rgba(139, 92, 246, 0.45)", // Violet
      "rgba(59, 130, 246, 0.4)",  // Blue
    ];

    for (let i = 0; i < 40; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        distance: 100 + Math.random() * 50,
        speed: (Math.random() * 0.015 + 0.005) * (Math.random() < 0.5 ? 1 : -1),
        size: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let t = 0;

    const size = 380;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const cx = size / 2;
    const cy = size / 2;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      t += 0.035;

      const particles = particlesRef.current;
      const vol = connectionState === "listening" ? userVolume : (connectionState === "speaking" ? aiVolume : 0);

      // 1. Clean ambient aura at the base below the avatar (No intersecting rings around face)
      if (connectionState !== "disconnected") {
        let auraColor = "rgba(168, 85, 247, 0.15)";
        if (connectionState === "listening") auraColor = `rgba(6, 182, 212, ${0.15 + vol * 0.25})`;
        else if (connectionState === "speaking") auraColor = `rgba(168, 85, 247, ${0.20 + vol * 0.35})`;
        else if (connectionState === "thinking") auraColor = "rgba(236, 72, 153, 0.15)";

        // Soft radial glow anchored at base below character
        const baseGlow = ctx.createRadialGradient(cx, cy + 80, 10, cx, cy + 80, 140);
        baseGlow.addColorStop(0, auraColor);
        baseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.arc(cx, cy + 80, 140, 0, Math.PI * 2);
        ctx.fill();

        // Elegant sound equalizer wave line at bottom base
        ctx.beginPath();
        const barWidth = 4;
        const totalBars = 32;
        const startX = cx - (totalBars * barWidth * 1.5) / 2;
        const baseY = cy + 115;

        for (let i = 0; i < totalBars; i++) {
          const x = startX + i * barWidth * 1.5;
          const distFromCenter = 1 - Math.abs(i - totalBars / 2) / (totalBars / 2);
          const height = (Math.sin(i * 0.5 + t * 4) * 0.5 + 0.5) * (15 + vol * 50) * distFromCenter;

          ctx.fillStyle = connectionState === "speaking" ? `rgba(168, 85, 247, ${0.4 + vol * 0.5})` : `rgba(34, 211, 238, ${0.4 + vol * 0.5})`;
          ctx.beginPath();
          ctx.roundRect(x, baseY - height / 2, barWidth, Math.max(3, height), 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [connectionState, userVolume, aiVolume]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      <canvas ref={canvasRef} className="w-[380px] h-[380px]" />
    </div>
  );
};
export default WaveVisualizer;
