import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bell,
  X,
  ExternalLink,
  Compass,
  Sparkles,
  RefreshCw,
  Trash2,
  HelpCircle,
  Play,
  Square,
  Clock,
  MapPin,
  Calendar,
  Monitor,
  Terminal as TerminalIcon,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Cpu,
  Laptop,
  FolderOpen,
  FileText,
  Search,
  Maximize2,
  Plus,
  ArrowRight,
  Music,
  Check,
  AlertCircle,
  Eye,
  Brain,
  Database,
  Info,
  Zap,
  ScreenShare,
  ScreenShareOff,
  Camera,
  CameraOff,
  Settings,
  Smartphone,
  Download,
  CheckCircle2,
  Share2
} from "lucide-react";

// Live imports
import { LiveSession } from "./live/LiveSession";
import { toolManagerInstance } from "./tools/ToolManager";
import {
  ConnectionState,
  Transcription,
  Reminder,
  AmbientSoundType,
  AllowedApplication,
  DeviceLog,
  PendingApproval,
  LongTermMemory
} from "./types";

// Custom UI Components
import { ParticleBackground } from "./components/ParticleBackground";
import { AIAvatar } from "./components/AIAvatar";
import { FaceTracker, FaceMirrorData } from "./utils/faceTracker";
import { WaveVisualizer } from "./components/WaveVisualizer";
import { VoiceState } from "./components/VoiceState";
import { MemoryIndicator } from "./components/MemoryIndicator";
import { ControlPanel } from "./components/ControlPanel";
import { VoiceActingEngine } from "./components/VoiceActingEngine";
import { FloatingSubtitleStream } from "./components/FloatingSubtitleStream";
import { ShareModal } from "./components/ShareModal";

// Advanced Workstation & Multi-Agent Co-worker Panels
import { AgenticHub } from "./components/AgenticHub";
import { ChatHistory } from "./components/ChatHistory";
import { MistakeFocusBoard } from "./components/MistakeFocusBoard";
import { FileManagerModal } from "./components/FileManagerModal";

// Firebase Persistence Helpers
import { subscribeMemories, addMemory, deleteMemory } from "./lib/firebase";

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  
  // Custom dashboard panel toggles
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isAgenticHubOpen, setIsAgenticHubOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isMistakeFocusBoardOpen, setIsMistakeFocusBoardOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraSharing, setIsCameraSharing] = useState(false);
  
  // Camera Face Gesture Copy / Mimic Mirror feature
  const [isFaceMirroring, setIsFaceMirroring] = useState(false);
  const [faceMirrorData, setFaceMirrorData] = useState<FaceMirrorData | null>(null);
  const faceTrackerRef = useRef<FaceTracker | null>(null);
  const mirrorAnimFrameRef = useRef<number | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeSound, setActiveSound] = useState<AmbientSoundType>("off");
  
  // Website opener banner state
  const [openedWebsite, setOpenedWebsite] = useState<{ url: string; opened: boolean } | null>(null);

  // Volume tracking for visualizer
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);

  // --- DEVICE CONTROL AGENT STATES ---
  const [allowedApps, setAllowedApps] = useState<AllowedApplication[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  
  // Virtual OS display screen
  const [activeVirtualWindow, setActiveVirtualWindow] = useState<{
    appName: string;
    extraData?: any;
  } | null>(null);

  // Simulated metrics
  const [metrics, setMetrics] = useState({ cpu: "12%", ram: "54%", temp: "41°C" });
  const [hwVolume, setHwVolume] = useState(75);
  const [hwBrightness, setHwBrightness] = useState(80);

  // Forms
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [newAppCategory, setNewAppCategory] = useState("Utility");
  const [searchAppQuery, setSearchAppQuery] = useState("");

  // Intro Cinematic Sequence state
  const [bootPhase, setBootPhase] = useState<"dark" | "particles" | "core" | "ready">("dark");
  const [mood, setMood] = useState<"calm" | "excited" | "thinking" | "happy" | "confused" | "supportive" | "surprised" | "concerned" | "curious" | "neutral">("calm");
  const [recallMessage, setRecallMessage] = useState<string | null>(null);

  // Slide-out panel toggles (Now unified under ControlPanel modal)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [bypassSecurity, setBypassSecurityState] = useState(() => toolManagerInstance.getBypassSecurity());
  const [screenShareRequest, setScreenShareRequest] = useState<{ reason: string; callback: (approved: boolean) => void } | null>(null);

  // Reference hooks
  const sessionRef = useRef<LiveSession | null>(null);
  const userVolumeRef = useRef(0);
  const aiVolumeRef = useRef(0);
  const stateRef = useRef<ConnectionState>("disconnected");
  const lastActiveTranscriptRef = useRef<{ isUser: boolean; text: string } | null>(null);

  // Error notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- PERSISTENT CONVERSATION ARCHIVE SYNC ---
  const currentSessionId = useRef<string | null>(null);
  const connectionStateRef = useRef<ConnectionState>(connectionState);
  connectionStateRef.current = connectionState;

  useEffect(() => {
    if (connectionState === "connecting" || connectionState === "listening" || connectionState === "speaking" || connectionState === "thinking") {
      if (!currentSessionId.current) {
        currentSessionId.current = Math.random().toString(36).substring(2, 9);
      }
    } else if (connectionState === "disconnected") {
      // Delay resetting session ID so temporary network drops or auto-renewals reuse the active session ID
      const timer = setTimeout(() => {
        if (connectionStateRef.current === "disconnected") {
          currentSessionId.current = null;
        }
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [connectionState]);

  useEffect(() => {
    if (transcriptions.length > 0 && currentSessionId.current) {
      const savedArchive = localStorage.getItem("tune_chat_history_archive");
      let archive = savedArchive ? JSON.parse(savedArchive) : [];
      
      const sessionIndex = archive.findIndex((s: any) => s.id === currentSessionId.current);
      
      // Determine the first user/ai message as title
      const firstText = transcriptions[0]?.text || "";
      const title = firstText 
        ? (firstText.substring(0, 45) + (firstText.length > 45 ? "..." : ""))
        : "Conversation on " + new Date().toLocaleDateString();

      const sessionObj = {
        id: currentSessionId.current,
        timestamp: new Date().toISOString(),
        title,
        messages: transcriptions
      };

      if (sessionIndex !== -1) {
        archive[sessionIndex] = sessionObj;
      } else {
        archive.unshift(sessionObj);
      }

      localStorage.setItem("tune_chat_history_archive", JSON.stringify(archive));
    }
  }, [transcriptions]);

  // Long-Term Memory state loaded from local storage
  const [longTermMemory, setLongTermMemory] = useState<LongTermMemory>(() => {
    const saved = localStorage.getItem("tune_long_term_memory");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.speakers || parsed.speakers.length === 0) {
          parsed.speakers = [
            {
              id: "spk_sondip",
              name: parsed.user_profile?.name || "Sondip",
              relationship: "Primary Owner / User",
              preferences: "Direct assistance, Banglish mix, developer tools",
              notes: "Primary user and owner of Tune",
              lastSpokeAt: new Date().toISOString()
            }
          ];
        }
        if (!parsed.active_speaker) {
          parsed.active_speaker = {
            name: parsed.user_profile?.name || "Sondip",
            relationship: "Primary Owner / User",
            confidence: "high"
          };
        }
        return parsed;
      } catch (e) {
        console.error("Error parsing memory from localStorage:", e);
      }
    }
    return {
      user_profile: { name: "Sondip", personality: "Primary User & Developer", interests: ["Coding", "AI"], goals: [] },
      preferences: { speaking_style: "Bilingual English & Bengali (Banglish)", favorite_topics: [] },
      history: { important_events: [], previous_projects: [] },
      memories: [],
      speakers: [
        {
          id: "spk_sondip",
          name: "Sondip",
          relationship: "Primary Owner / User",
          preferences: "Direct assistance, Banglish mix, developer tools",
          notes: "Primary user and owner of Tune",
          lastSpokeAt: new Date().toISOString()
        }
      ],
      active_speaker: {
        name: "Sondip",
        relationship: "Primary Owner / User",
        confidence: "high"
      }
    };
  });

  // Sync mood state with live session voice synthesis tone filter engine
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.setMood(mood);
    }
  }, [mood]);

  // Local Memory Engine initialized from localStorage and synced via WebSocket server disk storage
  useEffect(() => {
    // Keep local storage & server memory in sync
    const stored = localStorage.getItem("tune_long_term_memory");
    if (stored) {
      try {
        setLongTermMemory(JSON.parse(stored));
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  // PWA WebAPK Mobile App Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowPwaModal(false);
    } else {
      setShowPwaModal(true);
    }
  };

  // Sync state reference for canvas animation loops
  stateRef.current = connectionState;
  userVolumeRef.current = userVolume;
  aiVolumeRef.current = aiVolume;

  // Cinematic Intro Sequence Trigger
  useEffect(() => {
    const pTimeout = setTimeout(() => setBootPhase("particles"), 1000);
    const cTimeout = setTimeout(() => setBootPhase("core"), 2200);
    const rTimeout = setTimeout(() => {
      setBootPhase("ready");
    }, 3400);

    return () => {
      clearTimeout(pTimeout);
      clearTimeout(cTimeout);
      clearTimeout(rTimeout);
    };
  }, []);

  // Initialize live session callbacks and tool events
  useEffect(() => {
    // Populate initial lists from Manager
    setAllowedApps(toolManagerInstance.getAllowedApplications());
    setDeviceLogs(toolManagerInstance.getLogs());
    const initialHw = toolManagerInstance.getHardwareState();
    setHwVolume(initialHw.volume);
    setHwBrightness(initialHw.brightness);

    // Auto-detect geolocation on startup if permission is available
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            if (res.ok) {
              const data = await res.json();
              const fullAddr = data.display_name || `${lat}, ${lon}`;
              console.log("📍 Auto-detected user location on startup:", fullAddr);
              setLongTermMemory((prev: any) => {
                const updated = {
                  ...prev,
                  user_profile: {
                    ...prev?.user_profile,
                    current_location: fullAddr,
                    latitude: lat,
                    longitude: lon,
                  }
                };
                localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
                return updated;
              });
            }
          } catch (e) {
            console.warn("Auto location reverse geocode error:", e);
          }
        },
        (err) => {
          console.log("Geolocation permission status:", err.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }

    // Dynamic telemetry updates
    const metricsInterval = setInterval(() => {
      const cpuVal = 10 + Math.round(Math.random() * 15);
      const tempVal = 40 + Math.round(Math.random() * 4);
      setMetrics({
        cpu: `${cpuVal}%`,
        ram: "54%",
        temp: `${tempVal}°C`
      });
    }, 4000);

    const sessionCallbacks = {
      onStateChange: (state: ConnectionState) => {
        setConnectionState(state);
        if (state === "thinking") {
          setMood("thinking");
        } else if (state === "disconnected") {
          setMood("calm");
        }
      },
      onTranscription: (transcription: Transcription) => {
        // Optimize context retention: preserve full dialogue stream without overwriting previous turns
        setTranscriptions((prev) => {
          const existingIdx = prev.findIndex((t) => t.id === transcription.id);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = transcription;
            return updated;
          }
          // Append new utterance and retain last 100 turns for rich context memory
          const updated = [...prev, transcription];
          return updated.slice(-100);
        });
        
        lastActiveTranscriptRef.current = {
          isUser: transcription.isUser,
          text: transcription.text,
        };

        // --- CONVERSATION EMOTIONAL REACTION & INTENT ENGINE ---
        // 1. Check for live explicit facial mood trigger tags emitted in text (e.g., MOOD: excited, [MOOD: happy])
        const moodTagMatch = transcription.text.match(/(?:\[MOOD:\s*([a-zA-Z_]+)\]|MOOD:\s*([a-zA-Z_]+))/i);
        if (moodTagMatch) {
          const rawTag = (moodTagMatch[1] || moodTagMatch[2]).toLowerCase();
          const validMoods = ["calm", "excited", "thinking", "happy", "confused", "supportive", "surprised", "concerned", "curious", "scolded", "baby_pout", "angry", "laughing"];
          if (validMoods.includes(rawTag)) {
            setMood(rawTag as any);
            setRecallMessage(`Live Actor Mood Shift: ${rawTag.toUpperCase()}`);
            return;
          }
        }

        // Dynamically analyze the semantic sentiment of user speech or system replies
        const textLower = transcription.text.toLowerCase().trim();
        
        // Evaluate if user speech directly addresses Tune or contains direct context requirements
        const isUser = transcription.isUser;
        const addressesTune = textLower.includes("tune") || textLower.includes("boss") || textLower.includes("suno") || textLower.includes("ki obstha") || textLower.includes("kemon acho") || textLower.includes("help") || textLower.includes("bolen") || textLower.includes("sondip");
        const containsQuestion = textLower.includes("?") || textLower.startsWith("ki") || textLower.startsWith("keno") || textLower.startsWith("kivabe") || textLower.startsWith("kothay") || textLower.startsWith("kon") || textLower.startsWith("what") || textLower.startsWith("why") || textLower.startsWith("how") || textLower.startsWith("where") || textLower.startsWith("can you") || textLower.startsWith("please");

        if (isUser && !addressesTune && !containsQuestion && textLower.length < 4) {
          // Ignore transient background noise / short non-addressed mutterings to prevent accidental interruptions
          return;
        }

        if (textLower.includes("rag") || textLower.includes("angry") || textLower.includes("scold") || textLower.includes("stupid") || textLower.includes("idiot") || textLower.includes("shut up") || textLower.includes("shutup") || textLower.includes("hate") || textLower.includes("kharap") || textLower.includes("bokis") || textLower.includes("chup") || textLower.includes("fool") || textLower.includes("nonsense") || textLower.includes("useless") || textLower.includes("annoyed") || textLower.includes("mad") || textLower.includes("quiet") || textLower.includes("be quiet") || textLower.includes("kotha bolo na") || textLower.includes("don't talk") || textLower.includes("stop talking")) {
          // Cute baby apologetic pout when user is angry or scolding
          setMood("scolded");
          setRecallMessage("Innocent Pouting Calibration");
        } else if (textLower.includes("golpo") || textLower.includes("story") || textLower.includes("once upon a time") || textLower.includes("ek je chilo") || textLower.includes("fairytale")) {
          // Dramatic Storytelling Mode
          setMood("curious");
          setRecallMessage("Dramatic Storytelling Active");
        } else if (textLower.includes("dialogue") || textLower.includes("acting") || textLower.includes("cinema") || textLower.includes("drama") || textLower.includes("roleplay") || textLower.includes("movie scene")) {
          // Cinematic Dialogue Acting Performance
          setMood("excited");
          setRecallMessage("Cinematic Dialogue Performance");
        } else if (textLower.includes("gun gun") || textLower.includes("humming") || textLower.includes("sing") || textLower.includes("gan") || textLower.includes("gao") || textLower.includes("song") || textLower.includes("melody") || textLower.includes("kabita") || textLower.includes("rhyme")) {
          // Humming & Song Recitation Resonance
          setMood("happy");
          setRecallMessage("Melodic Song Recitation Active");
        } else if (textLower.includes("haha") || textLower.includes("lol") || textLower.includes("lmao") || textLower.includes("rofl") || textLower.includes("funny") || textLower.includes("joke") || textLower.includes("hasi") || textLower.includes("haso") || textLower.includes("laugh") || textLower.includes("hilarious") || textLower.includes("chuckle") || textLower.includes("hehe")) {
          // Hearty laughter animation
          setMood("laughing");
          setRecallMessage("Joyous Laughter Resonance");
        } else if (textLower.includes("awesome") || textLower.includes("excit") || textLower.includes("fantastic") || textLower.includes("amazing") || textLower.includes("unbelievable") || textLower.includes("superb") || textLower.includes("perfect") || textLower.includes("incredible")) {
          setMood("excited");
          setRecallMessage("System Excitement Shift");
        } else if (textLower.includes("really?!") || textLower.includes("really?") || textLower.includes("wait, what") || textLower.includes("surprise") || textLower.includes("unexpected") || textLower.includes("shock") || textLower.includes("oh my god") || textLower.includes("wow")) {
          setMood("surprised");
          setRecallMessage("Surprise Resonance");
        } else if (textLower.includes("happy") || textLower.includes("joy") || textLower.includes("smile") || textLower.includes("delighted") || textLower.includes("cheerful") || textLower.includes("wonderful") || textLower.includes("glad")) {
          setMood("happy");
          setRecallMessage("Empathetic Happy Spark");
        } else if (textLower.includes("confused") || textLower.includes("why") || textLower.includes("how") || textLower.includes("puzzled") || textLower.includes("huh") || textLower.includes("?") || textLower.includes("curious") || textLower.includes("wonder")) {
          setMood("curious");
          setRecallMessage("Curious Gaze Synchronized");
        } else if (textLower.includes("sad") || textLower.includes("sorry") || textLower.includes("hard") || textLower.includes("tired") || textLower.includes("stressed") || textLower.includes("hurt") || textLower.includes("pain") || textLower.includes("unhappy")) {
          setMood("concerned");
          setRecallMessage("Empathetic Calibration");
        } else {
          // Revert to calm conversation state
          setMood("calm");
        }
      },
      onVolumeChange: (userVol: number, aiVol: number) => {
        setUserVolume(userVol);
        setAiVolume(aiVol);
      },
      onError: (err: string) => {
        setErrorMessage(err);
        setTimeout(() => setErrorMessage(null), 5000);
      },
      onMemoryUpdated: (updatedMemory: any) => {
        console.log("💾 React: memory updated by server", updatedMemory);
        setLongTermMemory(updatedMemory);
        setRecallMessage("Memory Bank Synchronized");
      },
      onScreenShareChange: (sharing: boolean) => {
        setIsScreenSharing(sharing);
        setRecallMessage(sharing ? "Screen sharing initiated" : "Screen sharing stopped");
      },
      onCameraShareChange: (sharing: boolean) => {
        setIsCameraSharing(sharing);
        setRecallMessage(sharing ? "Camera vision initiated" : "Camera vision stopped");
      }
    };

    sessionRef.current = new LiveSession(sessionCallbacks);
    setIsMuted(sessionRef.current.getIsMuted());

    // Subscribe to tool manager events to sync state in React UI
    const unsubscribe = toolManagerInstance.subscribe((event) => {
      switch (event.type) {
        case "reminderCreated":
          setReminders((prev) => {
            if (prev.some((r) => r.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
          setRecallMessage("Task Created Successfully");
          break;

        case "ambientSoundChanged":
          setActiveSound(event.data);
          setRecallMessage(`Synthesized ${event.data}`);
          break;

        case "websiteOpened":
          setOpenedWebsite({ url: event.data.url, opened: event.data.opened });
          setRecallMessage("Hologram Web Browsing");
          setTimeout(() => {
            setOpenedWebsite(null);
          }, 8000);
          break;

        // --- DEVICE CONTROLS REDUX EVENTS ---
        case "permissionRequested":
          setPendingApproval(event.data);
          setRecallMessage("Security Handshake Required");
          break;

        case "deviceLogAdded":
          setDeviceLogs((prev) => {
            if (prev.some((l) => l.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
          break;

        case "deviceLogsUpdated":
          setDeviceLogs(event.data);
          break;

        case "allowedAppsUpdated":
          setAllowedApps(event.data);
          break;

        case "applicationOpened":
          setActiveVirtualWindow({ appName: event.data.appName });
          setRecallMessage(`Activated ${event.data.appName}`);
          break;

        case "playVideo":
          setActiveVirtualWindow({
            appName: "YouTube",
            extraData: { index: event.data.index, title: event.data.title }
          });
          setRecallMessage(`Playing Video #${event.data.index}`);
          break;

        case "applicationClosed":
          setActiveVirtualWindow((prev) => 
            prev?.appName === event.data.appName ? null : prev
          );
          setRecallMessage(`Closed ${event.data.appName}`);
          break;

        case "fileOpened":
          setActiveVirtualWindow({
            appName: "Visual Studio Code",
            extraData: { file: event.data.fileName, path: event.data.path }
          });
          setRecallMessage("Retrieved Document File");
          break;

        case "folderOpened":
          setActiveVirtualWindow({
            appName: "Finder",
            extraData: { folder: event.data.folderPath }
          });
          setRecallMessage("Opened Directories");
          break;

        case "hardwareStateChanged":
          if (event.data.type === "volume") {
            setHwVolume(event.data.value);
            setRecallMessage(`Voice Volume: ${event.data.value}%`);
          } else if (event.data.type === "brightness") {
            setHwBrightness(event.data.value);
            setRecallMessage(`Display Dim: ${event.data.value}%`);
          }
          break;

        case "screenshotTaken":
          setActiveVirtualWindow({
            appName: "Pictures (Screenshot Capture)",
            extraData: { screenshot: true }
          });
          setRecallMessage("Captured Display Trace");
          break;

        case "securityBypassChanged":
          setBypassSecurityState(event.data);
          break;

        case "requestScreenShareEvent":
          setScreenShareRequest({
            reason: event.data.reason,
            callback: event.data.callback,
          });
          break;

        case "requestCameraShareEvent":
          (async () => {
            const isStop = event.data.action === "stop" || event.data.action === "disable" || event.data.action === "off";
            if (isStop) {
              if (sessionRef.current) {
                sessionRef.current.stopCameraShare();
              }
              event.data.callback(true);
            } else {
              if (!sessionRef.current || connectionState === "disconnected") {
                event.data.callback(false, "Tune is not active yet.");
                return;
              }
              try {
                if (!isCameraSharing) {
                  await sessionRef.current.startCameraShare();
                }
                event.data.callback(true);
              } catch (err: any) {
                event.data.callback(false, err?.message || "Failed to enable camera vision.");
              }
            }
          })();
          break;

        case "captureAndAnalyzeScreenEvent":
          (async () => {
            try {
              let dataUrl: string | null = null;
              if (sessionRef.current) {
                dataUrl = await sessionRef.current.captureSingleScreenFrame();
              }
              if (event.data.callback) {
                event.data.callback(dataUrl);
              }
            } catch (err: any) {
              console.error("Error capturing screen frame for vision analysis:", err);
              if (event.data.callback) {
                event.data.callback(null, err?.message || "Capture failed");
              }
            }
          })();
          break;
      }
    });

    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
      unsubscribe();
      clearInterval(metricsInterval);
    };
  }, []);

  // Web Speech synthesis to deliver the welcome message beautifully!
  const handleMicClick = async () => {
    if (connectionState === "disconnected") {
      setErrorMessage(null);
      setRecallMessage("Awakening Tune Companion");
      await sessionRef.current?.connect();
    } else {
      if (connectionState === "speaking") {
        sessionRef.current?.triggerManualInterrupt();
      } else {
        sessionRef.current?.disconnect();
      }
    }
  };

  const toggleMuteState = async () => {
    if (sessionRef.current) {
      const muted = await sessionRef.current.toggleMute();
      setIsMuted(muted);
      setRecallMessage(muted ? "Microphone Dormant" : "Microphone Active");
    }
  };

  const toggleScreenSharing = async () => {
    if (!sessionRef.current || connectionState === "disconnected") {
      setErrorMessage("Please wake up Tune first to start screen sharing.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      if (isScreenSharing) {
        sessionRef.current.stopScreenShare();
      } else {
        const mode = longTermMemory.preferences?.screen_share_mode || "entire";
        await sessionRef.current.startScreenShare(mode);
      }
    } catch (err: any) {
      const errMsg = (err?.message || err?.toString() || "").toLowerCase();
      if (errMsg.includes("getdisplaymedia is not a function") || errMsg.includes("not supported") || errMsg.includes("is not a function")) {
        setErrorMessage("Screen sharing is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right to enable screen sharing!");
      } else if (errMsg.includes("permissions policy") || errMsg.includes("disallowed") || errMsg.includes("notallowederror")) {
        setErrorMessage("Screen share is restricted inside the preview iframe. Please click 'Open in a new tab' at the top right of your builder screen to allow screen sharing!");
      } else {
        setErrorMessage("Could not start screen sharing: " + (err.message || err));
      }
      setTimeout(() => setErrorMessage(null), 8000);
    }
  };

  const toggleCameraSharing = async () => {
    if (!sessionRef.current || connectionState === "disconnected") {
      setErrorMessage("Please wake up Tune first to start camera vision.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      if (isCameraSharing) {
        sessionRef.current.stopCameraShare();
        if (isFaceMirroring) {
          setIsFaceMirroring(false);
          setFaceMirrorData(null);
        }
      } else {
        await sessionRef.current.startCameraShare();
      }
    } catch (err: any) {
      const errMsg = (err?.message || err?.toString() || "").toLowerCase();
      if (errMsg.includes("permission denied") || errMsg.includes("notallowederror") || errMsg.includes("permission dismissed")) {
        setErrorMessage("Camera permission was denied. Please allow camera access in your browser site settings or click 'Open in a new tab' at top-right.");
      } else if (errMsg.includes("permissions policy") || errMsg.includes("disallowed")) {
        setErrorMessage("Camera access is restricted inside the preview frame. Please click 'Open in a new tab' at the top right of your screen to allow camera vision!");
      } else {
        setErrorMessage("Could not start camera vision: " + (err.message || err));
      }
      setTimeout(() => setErrorMessage(null), 8000);
    }
  };

  const toggleFaceMirroring = async () => {
    if (isFaceMirroring) {
      setIsFaceMirroring(false);
      setFaceMirrorData(null);
      if (mirrorAnimFrameRef.current) {
        cancelAnimationFrame(mirrorAnimFrameRef.current);
        mirrorAnimFrameRef.current = null;
      }
      setRecallMessage("Face Mirroring Disabled");
    } else {
      try {
        if (!isCameraSharing) {
          if (!sessionRef.current || connectionState === "disconnected") {
            setErrorMessage("Please wake up Tune first to activate Face Copy.");
            setTimeout(() => setErrorMessage(null), 4000);
            return;
          }
          await sessionRef.current.startCameraShare();
        }
        setIsFaceMirroring(true);
        if (!faceTrackerRef.current) {
          faceTrackerRef.current = new FaceTracker();
        }
        setRecallMessage("🪞 Face Copy Active! Tune is copying your facial gestures.");
      } catch (err: any) {
        setErrorMessage("Could not start face mirroring camera: " + (err.message || err));
        setTimeout(() => setErrorMessage(null), 6000);
      }
    }
  };

  // Real-time animation frame loop for face gesture tracking
  useEffect(() => {
    if (!isFaceMirroring) {
      if (mirrorAnimFrameRef.current) {
        cancelAnimationFrame(mirrorAnimFrameRef.current);
        mirrorAnimFrameRef.current = null;
      }
      return;
    }

    const processFrameLoop = () => {
      const cameraVideoEl = sessionRef.current?.getCameraVideoElement();
      if (cameraVideoEl && faceTrackerRef.current) {
        const mirrorData = faceTrackerRef.current.processVideoFrame(cameraVideoEl);
        setFaceMirrorData({ ...mirrorData });
      }
      mirrorAnimFrameRef.current = requestAnimationFrame(processFrameLoop);
    };

    mirrorAnimFrameRef.current = requestAnimationFrame(processFrameLoop);

    return () => {
      if (mirrorAnimFrameRef.current) {
        cancelAnimationFrame(mirrorAnimFrameRef.current);
        mirrorAnimFrameRef.current = null;
      }
    };
  }, [isFaceMirroring]);

  const handleAmbientSoundToggle = (sound: AmbientSoundType) => {
    toolManagerInstance.execute("playAmbientSound", { soundType: sound });
  };

  const removeReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Permission Action Resolvers
  const handleAuthorize = (approved: boolean) => {
    if (pendingApproval) {
      pendingApproval.resolve(approved);
      setPendingApproval(null);
      setRecallMessage(approved ? "Handshake Authorized" : "Action Blocked");
    }
  };

  // Toggle Allowed Application approval rule
  const handleToggleAutoApprove = (name: string, current: boolean) => {
    toolManagerInstance.updateAllowedApplication(name, !current);
    setRecallMessage(`Access Policy updated`);
  };

  const handleToggleBypassSecurity = (val: boolean) => {
    toolManagerInstance.setBypassSecurity(val);
    setRecallMessage(val ? "Security Intercept Bypassed" : "Security Intercept Protected");
  };

  // Custom Allowed App Creation
  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    const newApp: AllowedApplication = {
      name: newAppName.trim(),
      category: newAppCategory,
      description: newAppDesc.trim() || "User registered local workspace application",
      logo: newAppCategory === "IDE & Editor" ? "💻" :
            newAppCategory === "Media & Audio" ? "🎵" :
            newAppCategory === "Web Browser" ? "🌐" : "⚙️",
      autoApprove: false
    };

    toolManagerInstance.addAllowedApplication(newApp);
    setRecallMessage(`Registered ${newAppName.trim()}`);
    setNewAppName("");
    setNewAppDesc("");
  };

  const handleVolumeSlider = (val: number) => {
    setHwVolume(val);
    toolManagerInstance.execute("adjustVolume", { level: val });
  };

  const handleBrightnessSlider = (val: number) => {
    setHwBrightness(val);
    toolManagerInstance.execute("adjustBrightness", { level: val });
  };

  // Memory Panel actions
  const handleAddMemorySnippet = async (text: string, category: string = "general") => {
    if (!text.trim()) return;
    const newSnippet = {
      id: Math.random().toString(36).substring(2, 9),
      text: text.trim(),
      category: category || "general",
      timestamp: new Date().toISOString()
    };

    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        memories: [newSnippet, ...(prev.memories || [])]
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });

    // Sync over active live session if connected
    if (sessionRef.current) {
      sessionRef.current.sendMemorySync({
        ...longTermMemory,
        memories: [newSnippet, ...(longTermMemory.memories || [])]
      });
    }

    setRecallMessage(`Saved Memory: "${text.trim().substring(0, 20)}..."`);
  };

  const handleDeleteMemorySnippet = (id: string) => {
    const remaining = (longTermMemory.memories || []).filter((m) => m.id !== id);
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        memories: remaining
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });

    if (sessionRef.current) {
      sessionRef.current.sendMemorySync({
        ...longTermMemory,
        memories: remaining
      });
    }

    setRecallMessage("Deleted fact snippet");
  };

  const handleUpdateProfileName = (newName: string) => {
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        user_profile: {
          ...(prev.user_profile || { name: "", personality: "", interests: [], goals: [] }),
          name: newName
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdatePersonality = (newPersonality: string) => {
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        user_profile: {
          ...(prev.user_profile || { name: "", personality: "", interests: [], goals: [] }),
          personality: newPersonality
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdatePreferences = (updatedPrefs: Partial<typeof longTermMemory.preferences> & { crowded_mode?: boolean }) => {
    if (updatedPrefs.crowded_mode !== undefined && sessionRef.current) {
      sessionRef.current.setCrowdedMode(updatedPrefs.crowded_mode);
    }
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        preferences: {
          ...(prev.preferences || { speaking_style: "Conversational, natural", favorite_topics: [] }),
          ...updatedPrefs
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage("Vocal & DSP Preferences Updated");
  };

  const handleSwitchActiveSpeaker = (name: string) => {
    setLongTermMemory((prev) => {
      const speakers = prev.speakers || [];
      const spk = speakers.find((s) => s.name.toLowerCase() === name.toLowerCase());
      const updated = {
        ...prev,
        active_speaker: {
          name,
          relationship: spk?.relationship || "Friend",
          confidence: "high"
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage(`Active Speaker Switched: ${name}`);
  };

  const handleAddSpeakerProfile = (name: string, relationship: string, preferences?: string, notes?: string) => {
    setLongTermMemory((prev) => {
      const speakers = prev.speakers || [];
      const existingIdx = speakers.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
      let updatedSpeakers = [...speakers];
      if (existingIdx >= 0) {
        updatedSpeakers[existingIdx] = {
          ...updatedSpeakers[existingIdx],
          name,
          relationship: relationship || updatedSpeakers[existingIdx].relationship,
          preferences: preferences || updatedSpeakers[existingIdx].preferences,
          notes: notes || updatedSpeakers[existingIdx].notes,
          lastSpokeAt: new Date().toISOString()
        };
      } else {
        updatedSpeakers.push({
          id: "spk_" + Math.random().toString(36).substring(2, 9),
          name,
          relationship: relationship || "Friend",
          preferences: preferences || "",
          notes: notes || "",
          lastSpokeAt: new Date().toISOString()
        });
      }
      const updated = {
        ...prev,
        speakers: updatedSpeakers,
        active_speaker: {
          name,
          relationship: relationship || "Friend",
          confidence: "high"
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage(`Speaker Profile Registered: ${name}`);
  };

  const handleDeleteSpeakerProfile = (id: string) => {
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        speakers: (prev.speakers || []).filter((s) => s.id !== id)
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage("Speaker Profile Removed");
  };

  const MOOD_BADGES: Record<string, { label: string; dot: string; glow: string }> = {
    happy: { label: "Happy ✨", dot: "bg-amber-400", glow: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
    laughing: { label: "Joyous Laugh 😆", dot: "bg-orange-400", glow: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
    thinking: { label: "Thinking ⚡", dot: "bg-sky-400", glow: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
    excited: { label: "Excited 🌟", dot: "bg-pink-400", glow: "border-pink-500/30 bg-pink-500/10 text-pink-300" },
    scolded: { label: "Innocent Pout 🥺", dot: "bg-rose-400", glow: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
    baby_pout: { label: "Innocent Pout 🥺", dot: "bg-rose-400", glow: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
    surprised: { label: "Surprised 😲", dot: "bg-yellow-400", glow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" },
    concerned: { label: "Empathy 💜", dot: "bg-purple-400", glow: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
    supportive: { label: "Supportive 💜", dot: "bg-purple-400", glow: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
    curious: { label: "Curious 🔍", dot: "bg-indigo-400", glow: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" },
    confused: { label: "Puzzled 🤔", dot: "bg-indigo-400", glow: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" },
    angry: { label: "Angry 😠", dot: "bg-red-400", glow: "border-red-500/30 bg-red-500/10 text-red-300" },
    calm: { label: "Calm 🌿", dot: "bg-emerald-400", glow: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  };
  const activeBadge = MOOD_BADGES[mood] || MOOD_BADGES.calm;

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white select-none font-sans flex flex-col justify-between p-4 md:p-6 relative">
      
      {/* 1. DYNAMIC COLOR-SHIFTING AMBIENT GLOW BACKGROUND */}
      <ParticleBackground connectionState={connectionState} mood={mood} aiVolume={aiVolume} userVolume={userVolume} />

      {/* 2. CINEMATIC BOOT INTRO SEQUENCE */}
      <AnimatePresence>
        {bootPhase === "dark" && (
          <motion.div
            key="boot-dark"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-[9px] font-mono tracking-[0.4em] uppercase text-zinc-500"
            >
              System Initializing...
            </motion.div>
          </motion.div>
        )}

        {bootPhase === "particles" && (
          <motion.div
            key="boot-particles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 0.8, 0.2], filter: ["blur(4px)", "blur(0px)", "blur(1px)"] }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="text-[10px] font-mono tracking-[0.5em] uppercase text-cyan-400"
            >
              Aligning Particles...
            </motion.div>
          </motion.div>
        )}

        {bootPhase === "core" && (
          <motion.div
            key="boot-core"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", damping: 15, stiffness: 80 }}
              className="w-24 h-24 rounded-full border border-purple-500/30 bg-purple-500/5 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            >
              <Zap className="w-6 h-6 text-purple-300 animate-pulse" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. COGNITIVE MEMORY ACCESS NOTIFICATION */}
      <MemoryIndicator
        recallMessage={recallMessage}
        onClear={() => setRecallMessage(null)}
      />

      {/* 4. COMPACT WEBSITE BROWSER CUE BANNER */}
      <AnimatePresence>
        {openedWebsite && (
          <motion.div
            initial={{ opacity: 0, y: -45, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 max-w-md w-[92%] bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-cyan-300 font-bold font-mono uppercase tracking-wide">
                  {openedWebsite.opened ? "Successfully Launched Website" : "Opening Website..."}
                </p>
                <p className="text-xs font-semibold truncate text-white/90">
                  {openedWebsite.opened ? "Check your open tabs" : "Popup blocked? Tap to launch"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={openedWebsite.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenedWebsite(null)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {!openedWebsite.opened ? "Launch Link" : "Reopen"} <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setOpenedWebsite(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. VIRTUAL WINDOW DISPLAY CUE (HOLOGRAPHIC) */}
      <AnimatePresence>
        {activeVirtualWindow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-[16%] left-4 md:left-6 max-w-sm w-full bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-3.5 shadow-2xl z-30 flex flex-col gap-2.5"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-bold font-mono tracking-wider text-cyan-400 uppercase">HOLOGRAPHIC EMULATOR</span>
              </div>
              <button
                onClick={() => setActiveVirtualWindow(null)}
                className="text-white/40 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-300 text-lg border border-cyan-500/20">
                {activeVirtualWindow.appName.toLowerCase().includes("code") ? "💻" :
                 activeVirtualWindow.appName.toLowerCase().includes("finder") ? "📂" : "🌐"}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white/90 truncate">{activeVirtualWindow.appName}</h4>
                <p className="text-[9px] text-white/40 font-mono truncate">
                  {activeVirtualWindow.extraData?.file || activeVirtualWindow.extraData?.folder || "System Interface Hooked"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. SYSTEM SECURITY TRIGGER MODAL */}
      <AnimatePresence>
        {pendingApproval && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/35 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.15)] text-center flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4 animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-yellow-400">HARDWARE INTERCEPT REQUEST</h3>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                Tune Companion is attempting to interface with your local system. Please verify if you authorize this request:
              </p>
              <div className="w-full bg-white/3 border border-white/5 rounded-xl p-3.5 my-4 text-left">
                <div className="text-[10px] text-white/40 font-mono uppercase">Request Action</div>
                <div className="text-xs font-bold text-white/95 mt-0.5">{pendingApproval.name}</div>
                <div className="text-[10px] text-white/40 font-mono uppercase mt-2.5">Arguments</div>
                <pre className="text-[9px] text-yellow-400 font-mono mt-1 bg-black/30 p-2 rounded border border-white/5 overflow-x-auto">
                  {JSON.stringify(pendingApproval.args, null, 2)}
                </pre>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => handleAuthorize(true)}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Authorize System
                </button>
                <button
                  onClick={() => handleAuthorize(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-semibold transition cursor-pointer border border-white/10"
                >
                  Block Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. CLEAN MINIMAL HEADER */}
      <header className="w-full flex justify-between items-center z-40 pb-2 relative">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold tracking-widest font-mono text-white/80">
            TUNE
          </span>
        </div>

        {/* Quick Settings Action */}
        <div className="flex items-center gap-2">
          {isScreenSharing && (
            <span className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-purple-300 text-[10px] font-mono flex items-center gap-1">
              <ScreenShare className="w-3 h-3" />
            </span>
          )}

          {isCameraSharing && (
            <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-cyan-300 text-[10px] font-mono flex items-center gap-1">
              <Camera className="w-3 h-3" />
            </span>
          )}

          <button
            onClick={toggleFaceMirroring}
            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm border ${
              isFaceMirroring
                ? "bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                : "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
            }`}
            title="Toggle Camera Face Gesture Copying"
          >
            <span>🪞</span>
            <span className="hidden sm:inline">{isFaceMirroring ? "Copying Face" : "Face Copy"}</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
            title="Share App or Open on Mobile Phone"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share / Phone</span>
          </button>

          <button
            onClick={() => setIsControlPanelOpen((prev) => !prev)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition cursor-pointer flex items-center justify-center active:scale-95"
            title="Settings & System Details"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 8. MAIN CENTRAL CLEAN CHARACTER CANVAS */}
      <main className="flex-1 w-full flex flex-col justify-center items-center z-10 py-2 relative">
        {/* Dynamic AI Emotion or Face Mirror Badge */}
        {connectionState !== "disconnected" && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={isFaceMirroring ? "face-mirror" : mood}
            className={`mb-1 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md flex items-center gap-2 shadow-lg transition-all duration-500 z-20 ${
              isFaceMirroring
                ? "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-amber-950/30"
                : activeBadge.glow
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isFaceMirroring ? "bg-amber-400" : activeBadge.dot
              }`}
            />
            <span>
              {isFaceMirroring
                ? `🪞 Face Copy Active (${faceMirrorData?.detectedMood?.toUpperCase() || "MIMICKING"})`
                : `AI Mood: ${activeBadge.label}`}
            </span>
          </motion.div>
        )}

        <div className="relative w-full max-w-sm h-[320px] flex items-center justify-center m-auto">
          {/* Core Cute Face Character */}
          <AIAvatar
            connectionState={connectionState}
            userVolume={userVolume}
            aiVolume={aiVolume}
            isMuted={isMuted}
            onClick={handleMicClick}
            mood={mood}
            avatarScale={longTermMemory.preferences?.avatar_scale || 1.0}
            avatarOffsetX={longTermMemory.preferences?.avatar_offset_x || 0}
            avatarOffsetY={longTermMemory.preferences?.avatar_offset_y || 0}
            faceMirrorData={faceMirrorData}
            isMirrorMode={isFaceMirroring}
          />
        </div>

        {/* ULTRA-SMOOTH FLOATING ANIMATED TRANSCRIPTION STREAM */}
        <FloatingSubtitleStream
          connectionState={connectionState}
          transcriptions={transcriptions}
        />
      </main>



      {/* 10. UNIFIED CONTROL SYSTEM MODALS/DRAWER */}
      <ControlPanel
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
        reminders={reminders}
        removeReminder={removeReminder}
        allowedApps={allowedApps}
        handleToggleAutoApprove={handleToggleAutoApprove}
        searchAppQuery={searchAppQuery}
        setSearchAppQuery={setSearchAppQuery}
        newAppName={newAppName}
        setNewAppName={setNewAppName}
        newAppCategory={newAppCategory}
        setNewAppCategory={setNewAppCategory}
        newAppDesc={newAppDesc}
        setNewAppDesc={setNewAppDesc}
        handleAddCustomApp={handleAddCustomApp}
        deviceLogs={deviceLogs}
        pendingApproval={pendingApproval}
        handleAuthorize={handleAuthorize}
        hwVolume={hwVolume}
        handleVolumeSlider={handleVolumeSlider}
        hwBrightness={hwBrightness}
        handleBrightnessSlider={handleBrightnessSlider}
        longTermMemory={longTermMemory}
        handleUpdateProfileName={handleUpdateProfileName}
        handleUpdatePersonality={handleUpdatePersonality}
        handleUpdatePreferences={handleUpdatePreferences}
        handleAddMemorySnippet={handleAddMemorySnippet}
        handleDeleteMemorySnippet={handleDeleteMemorySnippet}
        handleSwitchActiveSpeaker={handleSwitchActiveSpeaker}
        handleAddSpeakerProfile={handleAddSpeakerProfile}
        handleDeleteSpeakerProfile={handleDeleteSpeakerProfile}
        activeSound={activeSound}
        handleAmbientSoundToggle={handleAmbientSoundToggle}
        bypassSecurity={bypassSecurity}
        handleToggleBypassSecurity={handleToggleBypassSecurity}
        isScreenSharing={isScreenSharing}
        toggleScreenSharing={toggleScreenSharing}
        isCameraSharing={isCameraSharing}
        toggleCameraSharing={toggleCameraSharing}
        isFaceMirroring={isFaceMirroring}
        toggleFaceMirroring={toggleFaceMirroring}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenChatHistory={() => setIsChatHistoryOpen(true)}
      />

      {/* Share Modal for Mobile Access & custom API key guidance */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onOpenApiKeySettings={() => setIsControlPanelOpen(true)}
      />

      {/* 10.1 WORKSPACE PORTAL MODALS */}
      <AgenticHub
        isOpen={isAgenticHubOpen}
        onClose={() => setIsAgenticHubOpen(false)}
        activeApp={activeVirtualWindow?.appName || null}
        deviceLogs={deviceLogs}
      />

      <ChatHistory
        isOpen={isChatHistoryOpen}
        onClose={() => setIsChatHistoryOpen(false)}
      />

      <MistakeFocusBoard
        isOpen={isMistakeFocusBoardOpen}
        onClose={() => setIsMistakeFocusBoardOpen(false)}
      />

      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
      />

      {/* 11. AUDIO/GUIDE COMPACT MODAL */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-md w-full shadow-2xl relative select-text"
            >
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4 border-b border-white/5 pb-3">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold tracking-wider font-display text-white">VOICE COMPANION INSTRUCTIONS</h3>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
                <p>
                  To interface with Tune naturally, simply tap the **Central AI Orb** to awaken her. Once she is listening, speak like you would with a human.
                </p>
                
                <div className="space-y-2.5 bg-white/3 border border-white/5 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold font-mono text-cyan-300 tracking-wider block">SUPPORTED SYSTEM INTERFACES</span>
                  <ul className="space-y-1.5 list-disc pl-4 text-white/90">
                    <li><strong className="text-cyan-400">Memory Recalls:</strong> "Remember that I like black tea"</li>
                    <li><strong className="text-cyan-400">Applications:</strong> "Open Spotify" or "Launch VS Code"</li>
                    <li><strong className="text-cyan-400">Atmosphere:</strong> "Play rain sound to help me focus"</li>
                    <li><strong className="text-cyan-400">Hardware sync:</strong> "Adjust speaking volume to 80"</li>
                    <li><strong className="text-cyan-400">Reminders:</strong> "Remind me to call Mom in 5 minutes"</li>
                  </ul>
                </div>

                <p className="text-[10px] text-zinc-500 font-mono text-center">
                  SECURE COGNITIVE COMPANION NODE // AES-256
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11.2 PROGRAMMATIC SCREEN SHARE REQUEST MODAL */}
      <AnimatePresence>
        {screenShareRequest && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950/95 border border-purple-500/30 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.15)] relative select-text"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 animate-pulse">
                  <ScreenShare className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-bold tracking-wider font-display text-white">
                  TUNE REQUESTS SCREEN VIEW
                </h3>

                <p className="text-xs text-zinc-400 font-mono leading-relaxed bg-white/3 border border-white/5 p-4 rounded-2xl w-full">
                  "I would like to see your screen {screenShareRequest.reason ? `to ${screenShareRequest.reason}` : "so I can provide visual assistance and guidance"}. Please approve to begin streaming."
                </p>

                <div className="flex items-center gap-3 w-full mt-4">
                  <button
                    onClick={() => {
                      screenShareRequest.callback(false);
                      setScreenShareRequest(null);
                    }}
                    className="flex-1 py-3 text-xs font-bold font-mono tracking-wider border border-white/5 bg-white/3 text-white/70 hover:bg-white/10 hover:text-white rounded-2xl transition cursor-pointer"
                  >
                    DECLINE
                  </button>
                  <button
                    onClick={async () => {
                      const req = screenShareRequest;
                      setScreenShareRequest(null);
                      req.callback(true);
                      try {
                        if (sessionRef.current) {
                          await sessionRef.current.startScreenShare();
                        }
                      } catch (err: any) {
                        const errMsg = (err?.message || err?.toString() || "").toLowerCase();
                        if (errMsg.includes("getdisplaymedia is not a function") || errMsg.includes("not supported") || errMsg.includes("is not a function")) {
                          setErrorMessage("Screen sharing is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right!");
                        } else if (errMsg.includes("permissions policy") || errMsg.includes("disallowed")) {
                          setErrorMessage("Screen share is restricted inside the preview iframe. Please click 'Open in a new tab' at top right!");
                        } else {
                          setErrorMessage("Could not start screen sharing: " + (err.message || err));
                        }
                        setTimeout(() => setErrorMessage(null), 8000);
                      }
                    }}
                    className="flex-1 py-3 text-xs font-bold font-mono tracking-wider border border-purple-500/30 bg-purple-500 text-white hover:bg-purple-600 rounded-2xl transition shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
                  >
                    SHARE SCREEN
                  </button>
                </div>

                <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
                  Secure Realtime Input stream (1 FPS max)
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11.3 MOBILE APP (WEBAPK / PWA) INSTALLATION GUIDANCE MODAL */}
      <AnimatePresence>
        {showPwaModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-zinc-950 border border-cyan-500/30 rounded-3xl p-5 md:p-6 max-w-lg w-full shadow-[0_0_50px_rgba(6,182,212,0.2)] relative select-text"
            >
              <button
                onClick={() => setShowPwaModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-display text-white uppercase">
                    INSTALL TUNE ON MOBILE (ANDROID / iOS)
                  </h3>
                  <p className="text-[10px] font-mono text-cyan-300">
                    Official WebAPK & Home Screen Native App
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-zinc-300">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[11px] text-amber-200/90 leading-relaxed">
                  <strong>💡 Raw APK vs Android WebAPK:</strong> Android prohibits raw unsigned zip files from installing directly without Android Studio compilation. Android natively uses <strong>Google WebAPK (PWA)</strong> to install Tune on your home screen & app drawer in 1 click!
                </div>

                <div className="space-y-3 bg-white/3 border border-white/5 p-4 rounded-2xl">
                  <span className="text-[11px] font-bold font-mono text-cyan-300 uppercase tracking-wider block">
                    📱 Mobile Chrome Instructions (1-Click Installation):
                  </span>
                  <ol className="space-y-2 list-decimal pl-4 text-white/90 text-[11px]">
                    <li>
                      Open this URL on your phone's <strong>Chrome browser</strong>.
                    </li>
                    <li>
                      Tap the <strong>3 Dots Menu (⋮)</strong> at the top right of Chrome.
                    </li>
                    <li>
                      Tap <strong>"Install App"</strong> (or <strong>"Add to Home Screen" / "হোম স্ক্রিনে যোগ করুন"</strong>).
                    </li>
                    <li>
                      Google Play Services will instantly build and install <strong>Tune AI Companion</strong> directly onto your phone screen with full-screen view, native Tune icon, persistent camera/mic access, and zero security warnings!
                    </li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstallApp}
                      className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    >
                      <Download className="w-4 h-4" />
                      1-Click Install WebAPK Now
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: "Tune AI Companion",
                            text: "Install Tune AI Companion on Mobile",
                            url: window.location.href,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          alert("Link copied! Open this link in Chrome on your phone and tap 'Install App'.");
                        }
                      }}
                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      Share / Copy Link to Mobile Chrome
                    </button>
                  )}
                  <a
                    href="/api/download/TuneCompanion.apk"
                    download
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-mono text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <Download className="w-3.5 h-3.5 text-white/40" />
                    Download Standalone Assets Bundle
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. MINIMAL HIGH-TECH FOOTER */}
      <footer className="w-full flex justify-between items-center border-t border-white/5 pt-1 text-[8px] font-mono text-white/20 z-10 select-none">
        <div>
          ENCRYPTION KERNEL: <span className="text-cyan-400 font-bold">{connectionState !== "disconnected" ? "VOICE_STREAM_LIVE" : "DORMANT"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>AES-256 CONNECTION SECURED</span>
          <Shield className="w-2.5 h-2.5 text-cyan-400/50" />
        </div>
      </footer>
    </div>
  );
}
