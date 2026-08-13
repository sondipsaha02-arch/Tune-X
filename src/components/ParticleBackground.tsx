import React, { useEffect, useRef } from "react";
import { ConnectionState } from "../types";

export type AIMood =
  | "calm"
  | "excited"
  | "thinking"
  | "happy"
  | "confused"
  | "supportive"
  | "surprised"
  | "concerned"
  | "curious"
  | "neutral"
  | "angry"
  | "scolded"
  | "baby_pout"
  | "laughing";

interface ParticleBackgroundProps {
  connectionState: ConnectionState;
  mood?: AIMood;
  aiVolume?: number;
  userVolume?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  colorIdx: number;
  pulseSpeed: number;
  pulsePhase: number;
}

// RGB color tuple helper
type RGB = [number, number, number];

// Emotion Theme Definition
interface MoodTheme {
  primaryRGB: RGB;   // Main central glow behind avatar
  secondaryRGB: RGB; // Top-left ambient glow
  accentRGB: RGB;    // Bottom-right ambient glow
  particleRGBs: RGB[];
  particleSpeed: number;
  pulseFreq: number;
}

const MOOD_THEMES: Record<string, MoodTheme> = {
  happy: {
    primaryRGB: [245, 158, 11],  // Warm Gold (#f59e0b)
    secondaryRGB: [251, 191, 36], // Bright Amber (#fbbf24)
    accentRGB: [217, 119, 6],    // Deep Gold (#d97706)
    particleRGBs: [[245, 158, 11], [251, 191, 36], [252, 211, 77]],
    particleSpeed: 0.35,
    pulseFreq: 1.8,
  },
  laughing: {
    primaryRGB: [251, 146, 60],  // Vibrant Warm Orange/Amber (#fb923c)
    secondaryRGB: [245, 158, 11],
    accentRGB: [234, 179, 8],
    particleRGBs: [[251, 146, 60], [245, 158, 11], [250, 204, 21]],
    particleSpeed: 0.5,
    pulseFreq: 2.4,
  },
  thinking: {
    primaryRGB: [14, 165, 233],  // Cool Electric Blue / Cyan (#0ea5e9)
    secondaryRGB: [56, 189, 248], // Sky Blue (#38bdf8)
    accentRGB: [30, 64, 175],    // Deep Cobalt Blue (#1e40af)
    particleRGBs: [[14, 165, 233], [56, 189, 248], [99, 102, 241]],
    particleSpeed: 0.2,
    pulseFreq: 1.0,
  },
  excited: {
    primaryRGB: [236, 72, 153],  // Vibrant Neon Magenta (#ec4899)
    secondaryRGB: [244, 63, 94],  // Hot Pink/Rose (#f43f5e)
    accentRGB: [139, 92, 246],   // Electric Violet (#8b5cf6)
    particleRGBs: [[236, 72, 153], [244, 63, 94], [168, 85, 247]],
    particleSpeed: 0.55,
    pulseFreq: 2.2,
  },
  scolded: {
    primaryRGB: [244, 114, 182], // Soft Innocent Rose (#f472b6)
    secondaryRGB: [251, 146, 60], // Soft Peach
    accentRGB: [192, 132, 252],  // Pastel Lavender
    particleRGBs: [[244, 114, 182], [251, 146, 60], [192, 132, 252]],
    particleSpeed: 0.22,
    pulseFreq: 1.2,
  },
  baby_pout: {
    primaryRGB: [244, 114, 182],
    secondaryRGB: [251, 146, 60],
    accentRGB: [192, 132, 252],
    particleRGBs: [[244, 114, 182], [251, 146, 60], [192, 132, 252]],
    particleSpeed: 0.2,
    pulseFreq: 1.1,
  },
  surprised: {
    primaryRGB: [234, 179, 8],   // Radiant Bright Yellow (#eab308)
    secondaryRGB: [163, 230, 53], // Electric Lime (#a3e635)
    accentRGB: [34, 197, 94],    // Vibrant Emerald (#22c55e)
    particleRGBs: [[234, 179, 8], [163, 230, 53], [34, 197, 94]],
    particleSpeed: 0.45,
    pulseFreq: 2.0,
  },
  concerned: {
    primaryRGB: [168, 85, 247],  // Soft Comforting Violet (#a855f7)
    secondaryRGB: [129, 140, 248],// Gentle Indigo (#818cf8)
    accentRGB: [99, 102, 241],   // Deep Soft Purple (#6366f1)
    particleRGBs: [[168, 85, 247], [129, 140, 248], [99, 102, 241]],
    particleSpeed: 0.2,
    pulseFreq: 0.9,
  },
  supportive: {
    primaryRGB: [168, 85, 247],
    secondaryRGB: [129, 140, 248],
    accentRGB: [99, 102, 241],
    particleRGBs: [[168, 85, 247], [129, 140, 248], [99, 102, 241]],
    particleSpeed: 0.22,
    pulseFreq: 1.0,
  },
  curious: {
    primaryRGB: [99, 102, 241],   // Electric Indigo (#6366f1)
    secondaryRGB: [6, 182, 212],   // Vivid Cyan (#06b6d4)
    accentRGB: [59, 130, 246],    // Bright Blue (#3b82f6)
    particleRGBs: [[99, 102, 241], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.3,
    pulseFreq: 1.4,
  },
  confused: {
    primaryRGB: [99, 102, 241],
    secondaryRGB: [6, 182, 212],
    accentRGB: [59, 130, 246],
    particleRGBs: [[99, 102, 241], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.28,
    pulseFreq: 1.3,
  },
  angry: {
    primaryRGB: [239, 68, 68],   // Crimson Red (#ef4444)
    secondaryRGB: [249, 115, 22], // Hot Coral/Orange (#f97316)
    accentRGB: [185, 28, 28],    // Dark Crimson (#b91c1c)
    particleRGBs: [[239, 68, 68], [249, 115, 22], [185, 28, 28]],
    particleSpeed: 0.6,
    pulseFreq: 2.5,
  },
  calm: {
    primaryRGB: [16, 185, 129],  // Soothing Emerald (#10b981)
    secondaryRGB: [6, 182, 212],  // Soft Cyan (#06b6d4)
    accentRGB: [59, 130, 246],   // Electric Blue (#3b82f6)
    particleRGBs: [[16, 185, 129], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.2,
    pulseFreq: 1.0,
  },
  neutral: {
    primaryRGB: [16, 185, 129],
    secondaryRGB: [6, 182, 212],
    accentRGB: [59, 130, 246],
    particleRGBs: [[16, 185, 129], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.2,
    pulseFreq: 1.0,
  },
};

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  connectionState,
  mood = "calm",
  aiVolume = 0,
  userVolume = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Smooth color state holders for continuous RGB linear interpolation
  const currentPrimaryRef = useRef<RGB>([16, 185, 129]);
  const currentSecondaryRef = useRef<RGB>([6, 182, 212]);
  const currentAccentRef = useRef<RGB>([59, 130, 246]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initialize particles
    const maxParticles = 40;
    const particles: Particle[] = [];

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.8 + 0.8,
        vx: (Math.random() - 0.5) * 0.3,
        vy: - (Math.random() * 0.4 + 0.1), // Float upwards
        alpha: Math.random() * 0.4 + 0.1,
        maxAlpha: Math.random() * 0.5 + 0.2,
        colorIdx: Math.floor(Math.random() * 3),
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.02;

      // 1. Determine target theme
      const targetTheme = MOOD_THEMES[mood] || MOOD_THEMES.calm;

      // Override if disconnected
      const effectiveTheme = connectionState === "disconnected"
        ? {
            primaryRGB: [75, 85, 99] as RGB,   // Muted gray
            secondaryRGB: [55, 65, 81] as RGB,
            accentRGB: [31, 41, 55] as RGB,
            particleRGBs: [[107, 114, 128] as RGB, [75, 85, 99] as RGB, [55, 65, 81] as RGB],
            particleSpeed: 0.1,
            pulseFreq: 0.5,
          }
        : targetTheme;

      // 2. Smoothly lerp RGB values (0.04 factor gives a luxurious 1.5s color fade transition)
      const lerpSpeed = 0.04;
      const lerpRGB = (curr: RGB, target: RGB): RGB => [
        curr[0] + (target[0] - curr[0]) * lerpSpeed,
        curr[1] + (target[1] - curr[1]) * lerpSpeed,
        curr[2] + (target[2] - curr[2]) * lerpSpeed,
      ];

      currentPrimaryRef.current = lerpRGB(currentPrimaryRef.current, effectiveTheme.primaryRGB);
      currentSecondaryRef.current = lerpRGB(currentSecondaryRef.current, effectiveTheme.secondaryRGB);
      currentAccentRef.current = lerpRGB(currentAccentRef.current, effectiveTheme.accentRGB);

      const pRGB = currentPrimaryRef.current;
      const sRGB = currentSecondaryRef.current;
      const aRGB = currentAccentRef.current;

      // Calculate audio/speech pulse intensity
      const audioPulse = (connectionState === "speaking" ? aiVolume * 0.4 : userVolume * 0.3);
      const moodPulse = Math.sin(t * effectiveTheme.pulseFreq) * 0.05;
      const totalIntensityMult = 1.0 + audioPulse + moodPulse;

      // Pure pitch black canvas base
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [connectionState, mood, aiVolume, userVolume]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};
