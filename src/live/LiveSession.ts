import { AudioStreamer } from "../audio/AudioStreamer";
import { AudioPlayer } from "../audio/AudioPlayer";
import { toolManagerInstance } from "../tools/ToolManager";
import { ConnectionState, Transcription } from "../types";

export interface LiveSessionCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onTranscription: (transcription: Transcription) => void;
  onVolumeChange: (userVolume: number, aiVolume: number) => void;
  onError: (error: string) => void;
  onMemoryUpdated?: (memory: any) => void;
  onScreenShareChange?: (sharing: boolean) => void;
  onCameraShareChange?: (sharing: boolean) => void;
}

/**
 * LiveSession coordinates the client-side WebSocket proxy connection,
 * audio capture streaming, and audio response playback.
 */
export class LiveSession {
  private ws: WebSocket | null = null;
  private streamer: AudioStreamer;
  private player: AudioPlayer;
  private state: ConnectionState = "disconnected";
  private callbacks: LiveSessionCallbacks;
  private volumePollInterval: any = null;
  private isMuted: boolean = false;
  private screenStream: MediaStream | null = null;
  private screenInterval: any = null;
  private isScreenSharing: boolean = false;
  private cameraStream: MediaStream | null = null;
  private cameraInterval: any = null;
  private cameraVideoEl: HTMLVideoElement | null = null;
  private isCameraSharing: boolean = false;

  // Auto Keep-Alive & Session Continuity
  private isUserDisconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private pingInterval: any = null;
  private activeSessionDialogue: { text: string; isUser: boolean; id: string }[] = [];

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
    this.streamer = new AudioStreamer();
    this.player = new AudioPlayer();
  }

  /**
   * Establishes the WebSocket connection and starts mic streaming.
   */
  async connect(): Promise<void> {
    if (this.state !== "disconnected" && this.state !== "connecting") return;

    this.isUserDisconnecting = false;
    this.updateState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log(`🔌 Connecting to Tune WebSocket proxy at: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log("🟢 WebSocket proxy connection opened. Synchronizing memory store...");
        this.reconnectAttempts = 0;

        // Heartbeat interval to keep connection active
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 20000);

        try {
          // Initialize or fetch existing memory from local storage
          const saved = localStorage.getItem("tune_long_term_memory");
          const memoryData = saved ? JSON.parse(saved) : {
            user_profile: { name: "", personality: "", interests: [], goals: [] },
            preferences: { speaking_style: "Conversational, natural", favorite_topics: [] },
            history: { important_events: [], previous_projects: [] },
            memories: []
          };

          // Fetch recent chat history to maintain conversation flow across page reloads / restarts
          let recentDialogue: any[] = [];
          try {
            const savedArchive = localStorage.getItem("tune_chat_history_archive");
            if (savedArchive) {
              const archive = JSON.parse(savedArchive);
              if (Array.isArray(archive) && archive.length > 0) {
                let collected: any[] = [];
                for (const sess of archive) {
                  if (sess.messages && Array.isArray(sess.messages)) {
                    // Prepend because archive is sorted newest first, we want chronological order
                    collected = [...sess.messages, ...collected];
                  }
                  if (collected.length >= 25) break;
                }
                recentDialogue = collected.slice(-25);
              }
            }
          } catch (e) {
            console.warn("Failed to parse chat history archive:", e);
          }

          // Combine with activeSessionDialogue
          if (this.activeSessionDialogue.length > 0) {
            const mergedMap = new Map();
            [...recentDialogue, ...this.activeSessionDialogue].forEach((item) => {
              const key = (item.id || "") + "_" + (item.text || "");
              mergedMap.set(key, item);
            });
            recentDialogue = Array.from(mergedMap.values()).slice(-30);
          }

          const customApiKey = typeof localStorage !== "undefined" ? localStorage.getItem("custom_gemini_api_key") || "" : "";

          // Synchronize memory first before any speech setup so server can personalize immediately
          this.ws?.send(JSON.stringify({ 
            type: "syncMemory", 
            data: memoryData,
            chatHistory: recentDialogue,
            customApiKey: customApiKey
          }));

          if (!this.isMuted) {
            await this.startStreaming();
          } else {
            this.updateState("listening");
          }
          this.startVolumePolling();
        } catch (err: any) {
          this.callbacks.onError(`Handshake and mic access failed: ${err.message || err}`);
          this.disconnect();
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "status":
              if (msg.state === "connected") {
                // Initial handshake completed, we are active
                this.updateState("listening");
              } else if (msg.state === "disconnected") {
                if (this.isUserDisconnecting) {
                  this.disconnect();
                } else {
                  console.log("⚡ Server signaled disconnect, auto-reconnecting...");
                  this.handleAutoReconnect();
                }
              } else if (msg.state === "connecting") {
                this.updateState("connecting");
              }
              break;

            case "audio":
              // We received response voice chunks from Gemini, feed to the player!
              if (this.state !== "speaking") {
                this.updateState("speaking");
              }
              this.player.playChunk(msg.data);
              break;

            case "interrupted":
              // Gemini detected user interruption or VAD triggered
              console.log("⚡ Tune: Interrupted by user speaking");
              this.player.stop();
              this.updateState("listening");
              break;

            case "transcription":
              // We received real-time transcription, propagate to the UI subtitles
              const isResearchResult = msg.isResearch || msg.text.includes("[Google Web Research") || msg.text.includes("🔎");
              const transcription: Transcription = {
                id: Math.random().toString(36).substring(2, 9),
                text: msg.text,
                isUser: msg.isUser,
                timestamp: new Date(),
                isResearch: isResearchResult,
                topic: msg.topic,
                sources: msg.sources || []
              };
              
              // Track in activeSessionDialogue so context is preserved if WS auto-reconnects
              this.activeSessionDialogue.push({
                id: transcription.id,
                text: transcription.text,
                isUser: transcription.isUser
              });
              if (this.activeSessionDialogue.length > 35) {
                this.activeSessionDialogue.shift();
              }

              this.callbacks.onTranscription(transcription);
              break;

            case "toolCall":
              // Gemini requested a tool call. Execute and return output!
              this.updateState("thinking");
              if (msg.name === "performGoogleResearch" || msg.name === "controlBrowser" || msg.name === "openWebsite" || msg.name === "searchYouTube") {
                const searchTopic = msg.args?.topic || msg.args?.query || msg.args?.param1 || "Google Research";
                this.callbacks.onTranscription({
                  id: "search_start_" + Date.now(),
                  text: `🔎 Google Search Active: Searching for "${searchTopic}"...`,
                  isUser: false,
                  timestamp: new Date(),
                  isResearch: true,
                  isSearching: true,
                  topic: searchTopic
                });
              }
              const output = await toolManagerInstance.execute(msg.name, msg.args);
              this.sendToolResponse(msg.name, msg.id, output);
              this.updateState("listening");
              break;

            case "memoryUpdated":
              console.log("💾 Long-term memory updated by companion:", msg.data);
              localStorage.setItem("tune_long_term_memory", JSON.stringify(msg.data));
              if (this.callbacks.onMemoryUpdated) {
                this.callbacks.onMemoryUpdated(msg.data);
              }
              break;

            case "error":
              this.callbacks.onError(msg.error);
              break;

            default:
              break;
          }
        } catch (err) {
          console.error("Error handling incoming WebSocket message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket status/error:", err);
        if (!this.isUserDisconnecting) {
          this.handleAutoReconnect();
        } else {
          this.callbacks.onError("WebSocket connection lost.");
          this.disconnect();
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket connection closed");
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (!this.isUserDisconnecting) {
          this.handleAutoReconnect();
        } else {
          this.disconnect();
        }
      };
    } catch (err: any) {
      if (!this.isUserDisconnecting) {
        this.handleAutoReconnect();
      } else {
        this.callbacks.onError(`Failed to establish connection: ${err.message || err}`);
        this.disconnect();
      }
    }
  }

  /**
   * Automatically attempts seamless reconnection when WebSocket drops unexpectedly.
   */
  private handleAutoReconnect(): void {
    if (this.isUserDisconnecting) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Auto-reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      this.updateState("connecting");

      // Notify subtitle UI of auto-reconnect attempt
      this.callbacks.onTranscription({
        id: "sys_reconnect_" + Date.now(),
        text: `🔄 (Connection auto-renewed seamlessly... conversation memory active!)`,
        isUser: false,
        timestamp: new Date()
      });

      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }

      setTimeout(() => {
        if (!this.isUserDisconnecting) {
          this.state = "disconnected"; // Allow connect() to execute
          this.connect();
        }
      }, 1000);
    } else {
      console.warn("⚠️ Max auto-reconnect attempts reached.");
      this.callbacks.onError("Connection lost. Please click Connect to resume with full conversation memory.");
      this.disconnect();
    }
  }

  /**
   * Disconnects the session explicitly when requested by user.
   */
  disconnect(): void {
    this.isUserDisconnecting = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.stopVolumePolling();
    this.streamer.stop();
    this.player.stop();
    this.stopScreenShare();
    this.stopCameraShare();
    toolManagerInstance.cleanup();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.updateState("disconnected");
    console.log("🔌 Session explicitly terminated by user.");
  }

  /**
   * Toggles microphone mute.
   */
  async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;
    console.log(`🎙️ Mute toggled: ${this.isMuted}`);

    if (this.isMuted) {
      this.streamer.stop();
      if (this.state !== "disconnected" && this.state !== "connecting") {
        this.updateState("listening");
      }
    } else {
      if (this.state !== "disconnected" && this.state !== "connecting") {
        await this.startStreaming();
      }
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Triggers a manual interruption.
   */
  triggerManualInterrupt(): void {
    if (this.player.getIsPlaying()) {
      this.player.stop();
      this.updateState("listening");
      
      // Send a dummy input to trigger interruption on Gemini side if playing
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Simple empty trigger
        this.ws.send(JSON.stringify({ type: "audio", data: "" }));
      }
    }
  }

  /**
   * Sends captured microphone chunks over WebSocket.
   */
  private async startStreaming(): Promise<void> {
    await this.streamer.start(
      (base64PCM) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isMuted) {
          this.ws.send(JSON.stringify({ type: "audio", data: base64PCM }));
        }
      },
      (userVolume) => {
        // If user is intentionally interrupting and speaking loudly, stop playback smoothly
        // Higher threshold (0.45) prevents background noise spikes from killing Tune's voice playback mid-sentence
        if (userVolume > 0.45 && this.player.getIsPlaying()) {
          console.log("⚡ Client-side intentional user speech interrupt triggered");
          this.player.stop();
          this.updateState("listening");
        }
      }
    );
  }

  /**
   * Sends execution outcomes of tool calls back to Gemini.
   */
  private sendToolResponse(name: string, id: string, output: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "toolResponse",
        name,
        id,
        output
      }));
    }
  }

  /**
   * Periodically poll mic and play volumes for visualization.
   */
  private startVolumePolling(): void {
    this.stopVolumePolling();
    this.volumePollInterval = setInterval(() => {
      const userVol = this.isMuted ? 0 : (this.state === "listening" || this.state === "speaking" ? Math.random() * 0.05 : 0); // Subtle idle chatter or mic vol
      // We will actually fetch real volumes
      const realUserVol = this.isMuted ? 0 : 0; // The streamer volume is used in callback
      const realAiVol = this.player.getVolume();
      
      // Update speaking vs listening state based on player
      if (this.state === "speaking" && !this.player.getIsPlaying()) {
        this.updateState("listening");
      }

      this.callbacks.onVolumeChange(
        this.player.getIsPlaying() ? 0 : realUserVol,
        realAiVol
      );
    }, 50);
  }

  private stopVolumePolling(): void {
    if (this.volumePollInterval) {
      clearInterval(this.volumePollInterval);
      this.volumePollInterval = null;
    }
  }

  private updateState(newState: ConnectionState): void {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Keeps audio/mic session active when tab is running in background.
   */
  public keepAliveBackground(): void {
    this.player.resumeIfSuspended();
    this.streamer.resumeIfSuspended();

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Tune Companion - Always Active",
          artist: "Sondip AI Assistant",
          album: "Background Voice Session",
        });
        navigator.mediaSession.playbackState = "playing";
      } catch (err) {}
    }
  }

  /**
   * Starts screen capture using navigator.mediaDevices.getDisplayMedia and streams frames.
   */
  async startScreenShare(targetMode: 'entire' | 'tab' = 'entire'): Promise<void> {
    if (this.isScreenSharing) return;

    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
      throw new Error("Screen sharing is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right to use screen sharing!");
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 1 },
          displaySurface: targetMode === 'entire' ? 'monitor' : 'browser',
        } as any,
        audio: false,
        surfaceSwitching: "include",
        selfBrowserSurface: targetMode === 'entire' ? "exclude" : "include",
      } as any);

      const videoTrack = this.screenStream.getVideoTracks()[0];
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const videoEl = document.createElement("video");
      videoEl.srcObject = this.screenStream;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;

      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.isScreenSharing = true;
      if (this.callbacks.onScreenShareChange) {
        this.callbacks.onScreenShareChange(true);
      }

      this.screenInterval = setInterval(() => {
        if (!this.isScreenSharing || !ctx || videoTrack.readyState === "ended") {
          this.stopScreenShare();
          return;
        }

        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 480;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        const base64JPEG = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        if (base64JPEG && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log("📷 Sending screen share frame to proxy");
          this.ws.send(JSON.stringify({
            type: "video",
            data: base64JPEG,
            mimeType: "image/jpeg"
          }));
        }
      }, 1000); // Send 1 frame per second as per Live API requirements

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

    } catch (err) {
      console.error("Failed to start screen share:", err);
      this.stopScreenShare();
      throw err;
    }
  }

  /**
   * Stops active screen sharing.
   */
  stopScreenShare(): void {
    const wasSharing = this.isScreenSharing;
    this.isScreenSharing = false;
    
    if (this.screenInterval) {
      clearInterval(this.screenInterval);
      this.screenInterval = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    
    if (wasSharing && this.callbacks.onScreenShareChange) {
      this.callbacks.onScreenShareChange(false);
    }
    console.log("🖥️ Screen sharing stopped.");
  }

  getIsScreenSharing(): boolean {
    return this.isScreenSharing;
  }

  /**
   * Captures a single high-quality snapshot frame from active screen share or requests display media frame.
   */
  async captureSingleScreenFrame(): Promise<string | null> {
    if (this.isScreenSharing && this.screenStream) {
      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === "live") {
        try {
          const videoEl = document.createElement("video");
          videoEl.srcObject = this.screenStream;
          videoEl.autoplay = true;
          videoEl.muted = true;
          await new Promise<void>((r) => {
            videoEl.onloadedmetadata = () => videoEl.play().then(() => r()).catch(() => r());
          });
          const canvas = document.createElement("canvas");
          canvas.width = videoEl.videoWidth || 1280;
          canvas.height = videoEl.videoHeight || 720;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", 0.85);
          }
        } catch (e) {
          console.warn("Failed to capture frame from active stream:", e);
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator?.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function") {
      try {
        const tempStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } } as any,
          audio: false
        } as any);

        const videoEl = document.createElement("video");
        videoEl.srcObject = tempStream;
        videoEl.autoplay = true;
        videoEl.muted = true;
        await new Promise<void>((r) => {
          videoEl.onloadedmetadata = () => videoEl.play().then(() => r()).catch(() => r());
        });

        await new Promise((r) => setTimeout(r, 250));

        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 1280;
        canvas.height = videoEl.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        let dataUrl: string | null = null;
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        }

        tempStream.getTracks().forEach((t) => t.stop());
        return dataUrl;
      } catch (err) {
        console.warn("Single frame displayMedia capture failed or cancelled by user:", err);
      }
    }

    return null;
  }

  public getCameraVideoElement(): HTMLVideoElement | null {
    return this.cameraVideoEl;
  }

  /**
   * Starts camera capture using navigator.mediaDevices.getUserMedia and streams video frames.
   */
  async startCameraShare(): Promise<void> {
    if (this.isCameraSharing) return;

    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      throw new Error("Camera vision is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right.");
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 1 },
          facingMode: "user"
        },
        audio: false
      });

      const videoTrack = this.cameraStream.getVideoTracks()[0];
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      this.cameraVideoEl = document.createElement("video");
      this.cameraVideoEl.srcObject = this.cameraStream;
      this.cameraVideoEl.autoplay = true;
      this.cameraVideoEl.playsInline = true;
      this.cameraVideoEl.muted = true;

      const videoEl = this.cameraVideoEl;

      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.isCameraSharing = true;
      if (this.callbacks.onCameraShareChange) {
        this.callbacks.onCameraShareChange(true);
      }

      this.cameraInterval = setInterval(() => {
        if (!this.isCameraSharing || !ctx || videoTrack.readyState === "ended") {
          this.stopCameraShare();
          return;
        }

        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 480;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        const base64JPEG = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        if (base64JPEG && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log("📷 Sending camera vision frame to proxy");
          this.ws.send(JSON.stringify({
            type: "video",
            data: base64JPEG,
            mimeType: "image/jpeg"
          }));
        }
      }, 1000);

      videoTrack.onended = () => {
        this.stopCameraShare();
      };

    } catch (err) {
      console.error("Failed to start camera vision:", err);
      this.stopCameraShare();
      throw err;
    }
  }

  /**
   * Stops active camera vision sharing completely.
   */
  stopCameraShare(): void {
    const wasSharing = this.isCameraSharing;
    this.isCameraSharing = false;
    
    if (this.cameraInterval) {
      clearInterval(this.cameraInterval);
      this.cameraInterval = null;
    }

    if (this.cameraVideoEl) {
      try {
        this.cameraVideoEl.pause();
        this.cameraVideoEl.srcObject = null;
      } catch (e) {
        // Ignore video cleanup error
      }
      this.cameraVideoEl = null;
    }
    
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {
          // Ignore track stop error
        }
      });
      this.cameraStream = null;
    }
    
    if (wasSharing && this.callbacks.onCameraShareChange) {
      this.callbacks.onCameraShareChange(false);
    }
    console.log("📷 Camera vision sharing fully stopped and device released.");
  }

  getIsCameraSharing(): boolean {
    return this.isCameraSharing;
  }

  setCrowdedMode(enabled: boolean): void {
    this.streamer.setCrowdedMode(enabled);
  }

  getCrowdedMode(): boolean {
    return this.streamer.getCrowdedMode();
  }

  setMood(mood: string): void {
    // Configures tone-aware acoustic output settings on player
    this.player.setMoodTone(mood);

    // Optionally notify server over WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: "moodUpdate",
          mood
        }));
      } catch (err) {
        // Safe send error catch
      }
    }
  }

  setNoiseStatusCallback(cb: (status: { noiseFloor: number; isSpeech: boolean; crowdedMode: boolean }) => void): void {
    this.streamer.setNoiseStatusCallback(cb);
  }
}
export default LiveSession;
