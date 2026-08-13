import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ConnectionState } from "../types";
import { Play, Mic, MicOff, Heart, Sparkles, Camera } from "lucide-react";
import { FaceMirrorData } from "../utils/faceTracker";

interface AIAvatarProps {
  connectionState: ConnectionState;
  userVolume: number;
  aiVolume: number;
  isMuted: boolean;
  onClick: () => void;
  mood?: "calm" | "excited" | "thinking" | "happy" | "confused" | "supportive" | "surprised" | "concerned" | "curious" | "neutral" | "angry" | "scolded" | "baby_pout" | "laughing";
  avatarScale?: number;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  faceMirrorData?: FaceMirrorData | null;
  isMirrorMode?: boolean;
  size?: number;
  onCanvasRef?: (canvas: HTMLCanvasElement | null) => void;
}

// Simple 3D point structure
interface Point3D {
  x: number;
  y: number;
  z: number;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  connectionState,
  userVolume,
  aiVolume,
  isMuted,
  onClick,
  mood = "calm",
  avatarScale = 1.0,
  avatarOffsetX = 0,
  avatarOffsetY = 0,
  faceMirrorData,
  isMirrorMode = false,
  size = 320,
  onCanvasRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (onCanvasRef && canvasRef.current) {
      onCanvasRef(canvasRef.current);
    }
  }, [onCanvasRef]);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Track cursor position for interactive eye/head tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize cursor pos from -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setCursorPos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;
    let blinkTimer = 0;
    let blinkRatio = 1.0; // 1 = fully open, 0 = closed
    let isBlinking = false;

    // Smooth transition values for rotations & offsets to make movements incredibly natural and organic
    let currentYaw = 0;
    let currentPitch = 0;
    let currentTilt = 0;
    let currentMouthHeight = 0;
    let currentSmileRatio = 0; // 0 = flat, 1 = smiling
    let currentEyeScaleY = 1.0;
    let currentEyeBrowY = -3.0;
    let currentBrowAngle = 0;
    let currentBrowArch = 6.0; // Rounded arch depth
    let currentBrowAsymmetry = 0; // Left vs Right brow offset for confusion/emoji expression
    let smoothAiVolume = 0; // Audio envelope follower for ultra-smooth lip sync

    // Persistent floating data particles for advanced sci-fi aesthetic
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      size: number;
      speedY: number;
      angleOffset: number;
      alpha: number;
    }> = [];
    
    for (let i = 0; i < 22; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 160,
        y: (Math.random() - 0.5) * 180 - 10,
        z: (Math.random() - 0.5) * 60,
        size: Math.random() * 1.5 + 0.5,
        speedY: Math.random() * 0.35 + 0.1,
        angleOffset: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.55 + 0.15
      });
    }

    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // 3D Projection configuration
    const cx = size / 2;
    const cy = size / 2;
    const fov = 350 * (size / 320); // Perspective distance scaled

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      t += 0.03;

      // --- BREATHING CYCLE (FACIAL SYSTEM) ---
      let breathingFrequency = 1.1;
      let breathingAmplitude = 1.3;
      if (connectionState === "speaking") {
        breathingFrequency = 1.7;
        breathingAmplitude = 1.6;
      } else if (connectionState === "thinking") {
        breathingFrequency = 0.7;
        breathingAmplitude = 0.5;
      } else if (mood === "excited") {
        breathingFrequency = 2.2;
        breathingAmplitude = 1.8;
      } else if (connectionState === "disconnected") {
        breathingFrequency = 0.5;
        breathingAmplitude = 0.3;
      }

      const breathY = Math.sin(t * breathingFrequency) * breathingAmplitude;

      // --- 1. CORE PHYSICS & NATURAL MOVEMENTS ---
      // Natural low-frequency breathing cycle (oscillating yaw/pitch)
      let targetYaw = Math.sin(t * 0.6) * 0.03 + Math.cos(t * 0.2) * 0.01;
      let targetPitch = Math.cos(t * 0.5) * 0.02 - 0.05; // Slightly looking forward/down
      let targetTilt = Math.sin(t * 0.3) * 0.02;

      // Idle eye saccades and gaze drifts
      let gazeX = cursorPos.x * 0.25;
      let gazeY = cursorPos.y * 0.25;

      // Adjust targets based on moods and system states
      if (connectionState === "disconnected") {
        targetPitch = 0.05 + Math.sin(t * 0.3) * 0.02; // Nodding down, asleep
        targetYaw = Math.sin(t * 0.2) * 0.02;
        gazeX = 0;
        gazeY = 0.1; // Sleeping eyes
      } else if (connectionState === "connecting") {
        targetYaw = Math.sin(t * 1.2) * 0.05; // Scanning left/right smoothly
        targetPitch = Math.cos(t * 0.8) * 0.03;
      } else if (connectionState === "listening") {
        // Steady Attentive Listening facing user directly (NO SWAYING OR TILTING)
        targetPitch = -0.05 + (cursorPos.y * 0.02);
        targetYaw = cursorPos.x * 0.10; // Focused gaze towards cursor/user, no side-to-side oscillation
        targetTilt = 0; // Completely still tilt, no swaying!
        gazeX = cursorPos.x * 0.30;
        gazeY = cursorPos.y * 0.30 - 0.05; // Direct attentive eye contact
      } else if (connectionState === "speaking") {
        // Ultra-Smooth Human Speech & Natural Expressions (NO TREMBLING / NO JITTER)
        const speakNod = Math.sin(t * 1.2) * 0.03;
        const speakSway = Math.sin(t * 0.8) * 0.04;
        targetPitch = -0.05 + speakNod; 
        targetYaw = speakSway + (cursorPos.x * 0.08); 
        targetTilt = Math.sin(t * 0.9) * 0.02; 
        gazeX = cursorPos.x * 0.30;
        gazeY = cursorPos.y * 0.30 - 0.05;
      } else if (connectionState === "thinking") {
        // Looks slightly up and to the side (classic cognitive pattern)
        targetYaw = -0.12;
        targetPitch = -0.10;
        gazeX = -0.18;
        gazeY = -0.18;
      }

      // Smooth audio envelopes with strong low-pass filter to eliminate trembling/jitter completely
      smoothAiVolume += (aiVolume - smoothAiVolume) * 0.06;
      let smoothUserVolume = 0;
      smoothUserVolume += (userVolume - smoothUserVolume) * 0.06;

      // Handle custom emotional expressions & emoji-style eyebrow morphing
      let smileTarget = 0.2; // Soft neutral smiling curve
      let browTarget = -3.5; // Raised, rounded eyebrow height
      let angleTarget = 0; // Eyebrow tilt angle
      let archTarget = 7.0; // Rounded arch depth
      let asymTarget = 0; // Asymmetry offset for emoji expressions

      const m = String(mood || "calm").toLowerCase();

      // --- 100+ FACIAL REACTION EXPRESSION ENGINE ---
      if (m.includes("happy") || m.includes("excited") || m.includes("joy") || m.includes("ecstatic") || m.includes("giggle") || m.includes("delighted")) {
        smileTarget = 0.88;
        browTarget = -6.5;
        angleTarget = -0.15;
        archTarget = 9.5;
        targetPitch += 0.02;
        if (m.includes("excited") || m.includes("ecstatic")) {
          targetYaw += Math.sin(t * 1.2) * 0.03;
        }
      } else if (m.includes("laugh") || m.includes("lol") || m.includes("rofl") || m.includes("haha")) {
        smileTarget = 1.0;
        browTarget = -8.5;
        angleTarget = -0.22;
        archTarget = 12.0;
        targetPitch += Math.sin(t * 1.8) * 0.04;
        targetYaw += Math.sin(t * 1.2) * 0.04;
        targetTilt += Math.cos(t * 1.0) * 0.03;
      } else if (m.includes("scold") || m.includes("pout") || m.includes("sad") || m.includes("cry") || m.includes("oviman") || m.includes("pleading") || m.includes("sorry") || m.includes("heartbroken")) {
        smileTarget = -0.38;
        browTarget = -6.8;
        angleTarget = -0.58;
        archTarget = 5.0;
        targetPitch = 0.10 + Math.sin(t * 0.8) * 0.02;
        targetTilt = Math.sin(t * 1.0) * 0.03;
        gazeY = 0.15;
      } else if (m.includes("angry") || m.includes("furious") || m.includes("pissed") || m.includes("annoyed") || m.includes("grumpy") || m.includes("outrage")) {
        smileTarget = -0.65;
        browTarget = 3.8;
        angleTarget = 0.50;
        archTarget = -2.5;
        targetPitch = 0.05;
      } else if (m.includes("confused") || m.includes("curious") || m.includes("puzzled") || m.includes("skeptical") || m.includes("suspicious") || m.includes("huh")) {
        targetTilt = 0.12;
        browTarget = -5.0;
        angleTarget = 0.25;
        archTarget = 6.5;
        asymTarget = 9.5;
        smileTarget = 0.05;
      } else if (m.includes("support") || m.includes("concern") || m.includes("empathy") || m.includes("caring") || m.includes("reassur")) {
        smileTarget = 0.15;
        browTarget = -4.5;
        angleTarget = -0.32;
        archTarget = 8.5;
        targetPitch = -0.01;
      } else if (m.includes("surprise") || m.includes("shock") || m.includes("mindblown") || m.includes("wow") || m.includes("gasp") || m.includes("stun")) {
        smileTarget = -0.1;
        browTarget = -10.5;
        angleTarget = -0.1;
        archTarget = 14.0;
        targetPitch = -0.06;
      } else if (m.includes("think") || m.includes("calculate") || m.includes("ponder") || m.includes("concentrat") || m.includes("brainstorm") || m.includes("search") || m.includes("research")) {
        smileTarget = 0.15;
        browTarget = -2.0;
        angleTarget = 0.2;
        archTarget = 4.0;
        targetYaw += Math.sin(t * 1.2) * 0.03;
        gazeX += Math.cos(t * 1.0) * 0.08;
      } else if (m.includes("flirt") || m.includes("wink") || m.includes("charm") || m.includes("smirk") || m.includes("shy") || m.includes("blush")) {
        smileTarget = 0.60;
        browTarget = -5.5;
        angleTarget = -0.1;
        asymTarget = 6.0;
        targetTilt = 0.08;
      } else if (m.includes("sleep") || m.includes("tired") || m.includes("yawn") || m.includes("bored") || m.includes("drowsy")) {
        smileTarget = -0.05;
        browTarget = -1.0;
        angleTarget = 0.0;
        targetPitch = 0.08;
      } else if (m.includes("cool") || m.includes("sunglass") || m.includes("confident") || m.includes("boss") || m.includes("badass")) {
        smileTarget = 0.45;
        browTarget = -4.0;
        angleTarget = -0.1;
        targetPitch = -0.04;
      } else if (m.includes("silly") || m.includes("tongue") || m.includes("goofy") || m.includes("derp") || m.includes("playful")) {
        smileTarget = 0.70;
        browTarget = -7.0;
        asymTarget = 8.0;
        targetTilt = -0.10;
      } else if (m.includes("sing") || m.includes("rock") || m.includes("groov") || m.includes("dance") || m.includes("music")) {
        smileTarget = 0.65;
        browTarget = -6.0;
        targetYaw += Math.sin(t * 1.5) * 0.04;
        targetTilt += Math.cos(t * 1.2) * 0.03;
      } else if (m.includes("peace") || m.includes("zen") || m.includes("meditat") || m.includes("relax")) {
        smileTarget = 0.25;
        browTarget = -3.0;
        angleTarget = -0.1;
        targetPitch = 0.02;
      } else if (m.includes("victor") || m.includes("celebrat") || m.includes("genius") || m.includes("eureka") || m.includes("flex")) {
        smileTarget = 0.90;
        browTarget = -8.0;
        archTarget = 11.0;
        targetPitch = -0.06;
      }

      // Listening Eyebrow & Smile Reactions: Warm, friendly, curious & cute
      if (connectionState === "listening") {
        const listenVolBoost = Math.min(2.0, smoothUserVolume * 3.0);
        if (mood === "calm" || mood === "neutral") {
          browTarget = -6.0 - listenVolBoost; // Warm raised eyebrows
          angleTarget = -0.15; // Gentle friendly inner lift
          archTarget = 9.5; // High rounded happy arches
          smileTarget = 0.50 + smoothUserVolume * 0.2; // Cute attentive smile when listening!
          targetTilt = 0.05; // Cute curious head tilt
        } else if (mood === "scolded" || mood === "baby_pout") {
          browTarget = -6.8;
          angleTarget = -0.55;
          archTarget = 5.0;
          smileTarget = -0.3;
        } else if (mood === "curious" || mood === "confused") {
          browTarget = -5.5 - listenVolBoost * 0.5;
          angleTarget = 0.25;
          asymTarget = 9.0;
          smileTarget = 0.25;
        } else if (mood === "happy" || mood === "excited" || mood === "laughing") {
          browTarget = -7.0 - listenVolBoost * 0.5;
          angleTarget = -0.2;
          archTarget = 10.5;
          smileTarget = 0.85;
        } else if (mood === "concerned" || mood === "supportive") {
          browTarget = -5.0 - listenVolBoost * 0.5;
          angleTarget = -0.35;
          archTarget = 8.5;
          smileTarget = 0.2;
        }
      } else if (connectionState === "speaking") {
        // Keep eyebrows steady, calm, and lifted during speech - ABSOLUTELY NO TREMBLING OR JITTER!
        browTarget = -6.0;
        angleTarget = -0.10;
        archTarget = 8.5;
        asymTarget = 0;
      }

      // --- FACE MIRRORING / CAMERA FACIAL GESTURE MIMIC OVERRIDE ---
      let mirrorLerpRate = 0.06; // Silky smooth 60fps tracking rate (0% vibration/shaking)
      if (isMirrorMode && faceMirrorData) {
        targetYaw = faceMirrorData.yaw;
        targetPitch = faceMirrorData.pitch;
        targetTilt = faceMirrorData.tilt;
        smileTarget = faceMirrorData.smileRatio;
        browTarget = faceMirrorData.eyebrowY;
        gazeX = faceMirrorData.yaw * 0.5;
        gazeY = faceMirrorData.pitch * 0.5;
        mirrorLerpRate = 0.08; // Perfectly stabilized face mimic rate
      }

      // Smoothly interpolate current physics values with damped lerp
      currentYaw += (targetYaw - currentYaw) * mirrorLerpRate;
      currentPitch += (targetPitch - currentPitch) * mirrorLerpRate;
      currentTilt += (targetTilt - currentTilt) * mirrorLerpRate;
      currentSmileRatio += (smileTarget - currentSmileRatio) * mirrorLerpRate;
      currentEyeBrowY += (browTarget - currentEyeBrowY) * 0.05;
      currentBrowAngle += (angleTarget - currentBrowAngle) * 0.05;
      currentBrowArch += (archTarget - currentBrowArch) * 0.05;
      currentBrowAsymmetry += (asymTarget - currentBrowAsymmetry) * 0.05;

      // Dynamic mouth opening with smooth audio envelope follower or face camera mirror
      let targetMouthHeight = 0;
      if (isMirrorMode && faceMirrorData && faceMirrorData.mouthHeight > 0) {
        targetMouthHeight = faceMirrorData.mouthHeight;
      } else if (connectionState === "speaking") {
        // Cartoon U-shaped mouth opening during speech (up to 28px height)
        const mouthPulse = Math.sin(t * 10) * 2.0 * Math.min(1, smoothAiVolume * 2);
        targetMouthHeight = Math.min(26, smoothAiVolume * 45 + mouthPulse);
        smileTarget = Math.max(smileTarget, 0.45 + smoothAiVolume * 0.35);
      } else if (connectionState === "listening") {
        // Subtle smile perk up when user speaks
        currentSmileRatio += smoothUserVolume * 0.10;
      }
      currentMouthHeight += (targetMouthHeight - currentMouthHeight) * (isMirrorMode ? 0.12 : 0.20);

      // Organic Blinking controller (Blinks naturally every 2-4 seconds)
      blinkTimer++;
      if (!isBlinking && Math.random() < 0.012 && blinkTimer > 80) {
        isBlinking = true;
        blinkTimer = 0;
      }

      if (isBlinking) {
        blinkRatio -= 0.3;
        if (blinkRatio <= 0) {
          blinkRatio = 0;
          isBlinking = false; // Start reopening
        }
      } else if (blinkRatio < 1.0) {
        blinkRatio += 0.25;
        if (blinkRatio > 1.0) blinkRatio = 1.0;
      }

      // Override blink when disconnected (fully closed eyes)
      let listeningEyeNarrow = 1.0;
      if (connectionState === "listening" && userVolume > 0.02) {
        // Attentive focused eye narrowing ONLY while user speaks ("cokh choto kore monojug diye shuna")
        listeningEyeNarrow = Math.max(0.45, 1.0 - Math.min(0.52, userVolume * 2.2));
      }

      if (connectionState === "disconnected") {
        currentEyeScaleY = 0.05;
      } else {
        currentEyeScaleY = blinkRatio * (mood === "surprised" ? 1.4 : mood === "angry" ? 0.7 : 1.0);
      }

      // Rotation matrix values
      const cosY = Math.cos(currentYaw);
      const sinY = Math.sin(currentYaw);
      const cosP = Math.cos(currentPitch);
      const sinP = Math.sin(currentPitch);
      const cosT = Math.cos(currentTilt);
      const sinT = Math.sin(currentTilt);

      // 3D point transformer
      const project = (pt: Point3D): { x: number; y: number } => {
        const ptY = pt.y + breathY;
        let x1 = pt.x * cosY - pt.z * sinY;
        let z1 = pt.x * sinY + pt.z * cosY;
        let y2 = ptY * cosP - z1 * sinP;
        let z2 = ptY * sinP + z1 * cosP;
        let x3 = x1 * cosT - y2 * sinT;
        let y3 = x1 * sinT + y2 * cosT;
        const distance = 400;
        const scaleFactor = fov / (distance + z2);
        return {
          x: cx + x3 * scaleFactor,
          y: cy + y3 * scaleFactor,
        };
      };

      // Theme Colors
      let primaryColor = "#ffffff";
      if (connectionState === "disconnected") {
        primaryColor = "rgba(225, 225, 230, 0.4)";
      }

      // --- 6. ROUND ("GOL GOL") CUTE EXPRESSIVE EYES WITH BLINKING & EYEBROWS ---
      const drawCuteEye = (isRight: boolean) => {
        const sideMult = isRight ? 1 : -1;
        const eyeCenter3D: Point3D = {
          x: (36 * sideMult) + (gazeX * 4),
          y: -14 + (gazeY * 3),
          z: 28,
        };

        // Round Eye Radius ("gol gol")
        const baseRadius = (mood === "scolded" || mood === "baby_pout") 
          ? 18 
          : 15;
        const radiusX = baseRadius;
        const radiusY = baseRadius * currentEyeScaleY * listeningEyeNarrow;

        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = primaryColor;

        if (mood === "laughing") {
          // Hearty Laughing Arches (◠  ◠)
          const arcStart = project({ x: eyeCenter3D.x - radiusX - 2, y: eyeCenter3D.y + 2, z: eyeCenter3D.z });
          const arcMid = project({ x: eyeCenter3D.x, y: eyeCenter3D.y - 10, z: eyeCenter3D.z });
          const arcEnd = project({ x: eyeCenter3D.x + radiusX + 2, y: eyeCenter3D.y + 2, z: eyeCenter3D.z });

          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(arcStart.x, arcStart.y);
          ctx.quadraticCurveTo(arcMid.x, arcMid.y, arcEnd.x, arcEnd.y);
          ctx.stroke();
        } else if (currentEyeScaleY <= 0.2) {
          // Closed sleeping/blinking eye (Smooth curved line ◡)
          const arcStart = project({ x: eyeCenter3D.x - radiusX, y: eyeCenter3D.y, z: eyeCenter3D.z });
          const arcMid = project({ x: eyeCenter3D.x, y: eyeCenter3D.y + 4, z: eyeCenter3D.z });
          const arcEnd = project({ x: eyeCenter3D.x + radiusX, y: eyeCenter3D.y, z: eyeCenter3D.z });

          ctx.lineWidth = 4.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(arcStart.x, arcStart.y);
          ctx.quadraticCurveTo(arcMid.x, arcMid.y, arcEnd.x, arcEnd.y);
          ctx.stroke();
        } else {
          // Pure Round Eye ("Gol Gol" Circle)
          const centerPos = project(eyeCenter3D);

          ctx.beginPath();
          ctx.ellipse(centerPos.x, centerPos.y, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fillStyle = primaryColor;
          ctx.fill();

          // Cute pleading puppy-dog eye sparkle for baby_pout / scolded mood!
          if (mood === "scolded" || mood === "baby_pout") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.beginPath();
            ctx.arc(centerPos.x + 3, centerPos.y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // --- EXPRESSIVE EMOJI EYEBROWS POSITIONED HIGH ABOVE EYES ---
        if (connectionState !== "disconnected") {
          const asymOffset = (!isRight ? currentBrowAsymmetry : -currentBrowAsymmetry * 0.3);
          const browY = eyeCenter3D.y - 26 + currentEyeBrowY - asymOffset; // High above eyes ("ektu upor dike thakbe")
          const tiltMult = isRight ? -1 : 1;
          const slantOffset = currentBrowAngle * 14 * tiltMult;

          const browL = project({ x: eyeCenter3D.x - 16, y: browY - slantOffset + 2, z: 28 });
          const browR = project({ x: eyeCenter3D.x + 16, y: browY + slantOffset + 2, z: 28 });
          // Arched middle apex for rounded/curved emoji eyebrows ("ektu round")
          const browMid = project({ x: eyeCenter3D.x, y: browY - currentBrowArch - (slantOffset * 0.15), z: 28 });

          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 4.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(browL.x, browL.y);
          ctx.quadraticCurveTo(browMid.x, browMid.y, browR.x, browR.y);
          ctx.stroke();
        }
      };

      drawCuteEye(false); // Left Eye
      drawCuteEye(true);  // Right Eye

      // --- 7. CARTOON EMOJI ROSY CHEEK BLUSH (Cute Anime / Emoji Expressions) ---
      if (connectionState !== "disconnected" && (mood === "happy" || mood === "excited" || mood === "laughing" || mood === "scolded" || mood === "baby_pout" || mood === "supportive")) {
        const blushY = 4 + (gazeY * 2);
        const blushL = project({ x: -42 + (gazeX * 3), y: blushY, z: 28 });
        const blushR = project({ x: 42 + (gazeX * 3), y: blushY, z: 28 });
        
        ctx.fillStyle = "rgba(255, 115, 165, 0.42)";
        ctx.beginPath();
        ctx.ellipse(blushL.x, blushL.y, 11, 6, -0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(blushR.x, blushR.y, 11, 6, 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 8. EXPRESSIVE CARTOON MOUTH & DYNAMIC LIP-SYNC ANIMATION ---
      const mouthY = 22 + (gazeY * 2);

      // Dynamic corner vertical offset (corners raise up for smile, lower for sad/angry/pout)
      let cornerYOffset = -currentSmileRatio * 5; // Negative Y moves up in 3D (smile corner lift)
      if (mood === "angry") {
        cornerYOffset = 6; // Corners droop down
      } else if (mood === "scolded" || mood === "baby_pout") {
        cornerYOffset = 4; // Pouting corners
      }

      // Phoneme shape modulation during speech (A, O, E, I, U, M, P)
      const phonemeWidthMod = connectionState === "speaking" 
        ? Math.cos(t * 21) * 8 * Math.min(1, smoothAiVolume * 3) 
        : 0;
      
      const baseSmileWidth = 22 + (currentSmileRatio * 8);
      const speechWidthMod = connectionState === "speaking" 
        ? (smoothAiVolume * 28 + phonemeWidthMod)
        : 0;
      
      const smileWidth = Math.max(14, baseSmileWidth + speechWidthMod);

      const mouthL = project({ x: -smileWidth, y: mouthY + cornerYOffset, z: 28 });
      const mouthR = project({ x: smileWidth, y: mouthY + cornerYOffset, z: 28 });
      
      let arcDepth = 10 + (currentSmileRatio * 8);
      if (mood === "angry") {
        arcDepth = -10; // Inverted arc for anger
      } else if (mood === "scolded" || mood === "baby_pout") {
        arcDepth = -5; // Cute pouting lip
      }

      if (currentMouthHeight > 0.8) {
        // --- CARTOON OPEN SPEECH MOUTH (Dynamic U-mouth & phonemes) ---
        const topLipRaise = currentMouthHeight * 0.20;
        const bottomLipDrop = Math.max(6, arcDepth * 0.35) + (currentMouthHeight * 0.85);

        const mouthTopMid = project({ x: 0, y: mouthY + cornerYOffset - topLipRaise, z: 28 });
        const mouthBottomMid = project({ x: 0, y: mouthY + cornerYOffset + bottomLipDrop, z: 28 });

        // Outer lip border & fill
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(mouthL.x, mouthL.y);
        ctx.quadraticCurveTo(mouthTopMid.x, mouthTopMid.y, mouthR.x, mouthR.y);
        ctx.quadraticCurveTo(mouthBottomMid.x, mouthBottomMid.y, mouthL.x, mouthL.y);
        ctx.closePath();
        ctx.fill();

        // Inner dark cartoon mouth cavity (perfectly nested)
        if (currentMouthHeight > 2.5) {
          const cavityTopY = mouthY + cornerYOffset + 1.5;
          const cavityBottomY = mouthY + cornerYOffset + bottomLipDrop - 2.5;

          const innerTop = project({ x: 0, y: cavityTopY, z: 28 });
          const innerBottom = project({ x: 0, y: cavityBottomY, z: 28 });
          const innerL = project({ x: -(smileWidth - 3.8), y: cavityTopY, z: 28 });
          const innerR = project({ x: (smileWidth - 3.8), y: cavityTopY, z: 28 });

          ctx.fillStyle = "rgba(10, 10, 26, 0.65)";
          ctx.beginPath();
          ctx.moveTo(innerL.x, innerL.y);
          ctx.quadraticCurveTo(innerTop.x, innerTop.y, innerR.x, innerR.y);
          ctx.quadraticCurveTo(innerBottom.x, innerBottom.y, innerL.x, innerL.y);
          ctx.closePath();
          ctx.fill();

          // Cute upper white teeth line when wide open
          if (currentMouthHeight > 6.0) {
            const teethTop = project({ x: 0, y: cavityTopY, z: 28 });
            const teethBottom = project({ x: 0, y: cavityTopY + Math.min(5.5, currentMouthHeight * 0.4), z: 28 });
            const teethL = project({ x: -(smileWidth * 0.52), y: cavityTopY + 1, z: 28 });
            const teethR = project({ x: (smileWidth * 0.52), y: cavityTopY + 1, z: 28 });

            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.moveTo(teethL.x, teethL.y);
            ctx.quadraticCurveTo(teethTop.x, teethTop.y, teethR.x, teethR.y);
            ctx.quadraticCurveTo(teethBottom.x, teethBottom.y, teethL.x, teethL.y);
            ctx.closePath();
            ctx.fill();
          }

          // Soft pink cartoon tongue (Jihoba) perfectly sitting at bottom of mouth cavity
          if (currentMouthHeight > 4.5) {
            const tongueHeight = Math.min(cavityBottomY - cavityTopY - 2, 3.0 + currentMouthHeight * 0.42);
            const tongueTopY = cavityBottomY - tongueHeight;

            const tongueTop = project({ x: 0, y: tongueTopY, z: 28 });
            const tongueBottom = project({ x: 0, y: cavityBottomY - 0.8, z: 28 });
            const tongueL = project({ x: -(smileWidth * 0.40), y: cavityBottomY - 1.2, z: 28 });
            const tongueR = project({ x: (smileWidth * 0.40), y: cavityBottomY - 1.2, z: 28 });

            ctx.fillStyle = "rgba(255, 110, 155, 0.92)";
            ctx.beginPath();
            ctx.moveTo(tongueL.x, tongueL.y);
            ctx.quadraticCurveTo(tongueTop.x, tongueTop.y, tongueR.x, tongueR.y);
            ctx.quadraticCurveTo(tongueBottom.x, tongueBottom.y, tongueL.x, tongueL.y);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Cute attached lip corner dimple accents (positioned right at mouth corners)
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.8;
        ctx.lineCap = "round";

        const dimpleL1 = project({ x: -smileWidth - 1.5, y: mouthY + cornerYOffset - 2.5, z: 28 });
        const dimpleL2 = project({ x: -smileWidth + 0.5, y: mouthY + cornerYOffset + 2.5, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleL1.x, dimpleL1.y);
        ctx.lineTo(dimpleL2.x, dimpleL2.y);
        ctx.stroke();

        const dimpleR1 = project({ x: smileWidth + 1.5, y: mouthY + cornerYOffset - 2.5, z: 28 });
        const dimpleR2 = project({ x: smileWidth - 0.5, y: mouthY + cornerYOffset + 2.5, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleR1.x, dimpleR1.y);
        ctx.lineTo(dimpleR2.x, dimpleR2.y);
        ctx.stroke();

      } else {
        // --- CLOSED EXPRESSIVE CARTOON LIP LINE ---
        const mouthMid = project({ x: 0, y: mouthY + cornerYOffset + arcDepth, z: 28 });

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(mouthL.x, mouthL.y);
        ctx.quadraticCurveTo(mouthMid.x, mouthMid.y, mouthR.x, mouthR.y);
        ctx.stroke();

        // Cute attached lip corner dimples for closed mouth
        ctx.lineWidth = 2.8;
        const dimpleL1 = project({ x: -smileWidth - 1.5, y: mouthY + cornerYOffset - 2.0, z: 28 });
        const dimpleL2 = project({ x: -smileWidth + 0.5, y: mouthY + cornerYOffset + 2.0, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleL1.x, dimpleL1.y);
        ctx.lineTo(dimpleL2.x, dimpleL2.y);
        ctx.stroke();

        const dimpleR1 = project({ x: smileWidth + 1.5, y: mouthY + cornerYOffset - 2.0, z: 28 });
        const dimpleR2 = project({ x: smileWidth - 0.5, y: mouthY + cornerYOffset + 2.0, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleR1.x, dimpleR1.y);
        ctx.lineTo(dimpleR2.x, dimpleR2.y);
        ctx.stroke();
      }

      // --- 10. CLEAN HOVER EFFECT (NO CIRCLES) ---

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [connectionState, userVolume, aiVolume, mood, isHovered, cursorPos, isMirrorMode, faceMirrorData]);

  // Smooth scaling animations
  const getAvatarStyles = () => {
    switch (connectionState) {
      case "disconnected":
        return {
          scale: isHovered ? 1.03 : 1.0,
        };
      case "connecting":
        return {
          scale: [1.0, 1.02, 1.0],
          transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
        };
      case "listening":
        return {
          scale: 1.02 + userVolume * 0.08,
        };
      case "speaking":
        return {
          scale: 1.03 + aiVolume * 0.1,
        };
      case "thinking":
        return {
          scale: 1.01,
        };
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center select-none pt-4 pb-4 transition-transform duration-200 ease-out"
      style={{
        transform: `translate(${avatarOffsetX}px, ${avatarOffsetY}px) scale(${avatarScale})`,
      }}
    >
       {/* Main interactive avatar container button */}
       <motion.button
         id="tune-ai-avatar-core"
         onClick={onClick}
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
         animate={getAvatarStyles() as any}
         whileTap={{ scale: 0.97 }}
         style={{ width: size, height: size }}
         className="relative rounded-full flex flex-col items-center justify-center cursor-pointer outline-none transition-all duration-500 z-10"
       >
         {/* 3D Render Canvas */}
         <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center pointer-events-none">
           <canvas ref={canvasRef} style={{ width: size, height: size }} />
         </div>
       </motion.button>
    </div>
  );
};
export default AIAvatar;
