import { Reminder, AmbientSoundType, AllowedApplication, DeviceLog } from "../types";

export type ToolEventListener = (event: {
  type: string;
  data: any;
}) => void;

/**
 * ToolManager coordinates the execution of client-side tools called by Gemini.
 * It provides the raw output results to send back to the server and emits
 * events so the React UI can dynamically render the tool's visual impacts.
 */
export class ToolManager {
  private listeners: Set<ToolEventListener> = new Set();
  private ambientAudios: Record<string, HTMLAudioElement | null> = {
    rain: null,
    forest: null,
    waves: null,
  };
  private currentPlayingSound: AmbientSoundType = "off";

  // Security - Allowed Application List
  private allowedApplications: AllowedApplication[] = [
    { name: "Google Chrome", category: "Web Browser", description: "Standard secure web browser client", logo: "🌐", autoApprove: true },
    { name: "Visual Studio Code", category: "IDE & Editor", description: "Primary software editing engine", logo: "💻", autoApprove: false },
    { name: "Spotify", category: "Media & Audio", description: "Audio streaming provider", logo: "🎵", autoApprove: false },
    { name: "Downloads", category: "File System", description: "Local user downloads directory", logo: "📥", autoApprove: true },
    { name: "Terminal", category: "Developer Tool", description: "Command-line terminal console", logo: "🐚", autoApprove: false },
    { name: "Slack", category: "Communication", description: "Team communication interface", logo: "💬", autoApprove: false },
    { name: "Discord", category: "Communication", description: "Community voice and chat platform", logo: "👾", autoApprove: false },
    { name: "Zoom", category: "Meeting Client", description: "Video conference portal", logo: "📹", autoApprove: false },
  ];

  // Device Logs
  private logs: DeviceLog[] = [];

  // Tracked opened windows/tabs for closing
  private openedTabs: Window[] = [];

  // Hardware states (Future extension simulation)
  private volume: number = 75;
  private brightness: number = 80;
  private cameraActive: boolean = false;
  private bypassSecurity: boolean = typeof window !== "undefined"
    ? localStorage.getItem("tune_bypass_security") !== "false"
    : true;

  constructor() {
    // Setup high-quality static looping ambient sound URLs
    if (typeof window !== "undefined") {
      this.ambientAudios.rain = new Audio("https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg");
      this.ambientAudios.rain.loop = true;

      this.ambientAudios.forest = new Audio("https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg");
      this.ambientAudios.forest.loop = true;

      this.ambientAudios.waves = new Audio("https://actions.google.com/sounds/v1/water/sea_waves.ogg");
      this.ambientAudios.waves.loop = true;
    }
  }

  /**
   * Subscribe to tool execution events (to update state in React).
   */
  subscribe(listener: ToolEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(type: string, data: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener({ type, data });
      } catch (err) {
        console.error("Error in tool listener:", err);
      }
    });
  }

  /**
   * Translates fuzzy user voice inputs into structured application names.
   */
  public resolveApplicationName(input: string): string {
    const clean = input.toLowerCase().trim();
    if (clean.includes("coding") || clean.includes("code") || clean.includes("vs code") || clean.includes("editor") || clean.includes("programming") || clean.includes("visual studio")) {
      return "Visual Studio Code";
    }
    if (clean.includes("music") || clean.includes("spotify") || clean.includes("song") || clean.includes("playlist") || clean.includes("audio")) {
      return "Spotify";
    }
    if (clean.includes("browser") || clean.includes("chrome") || clean.includes("web") || clean.includes("internet") || clean.includes("google")) {
      return "Google Chrome";
    }
    if (clean.includes("downloads") || clean.includes("download folder") || clean.includes("my download")) {
      return "Downloads";
    }
    if (clean.includes("terminal") || clean.includes("command") || clean.includes("shell") || clean.includes("bash") || clean.includes("console")) {
      return "Terminal";
    }
    if (clean.includes("slack") || clean.includes("work chat") || clean.includes("workspace messenger")) {
      return "Slack";
    }
    if (clean.includes("discord") || clean.includes("gaming chat") || clean.includes("guild")) {
      return "Discord";
    }
    if (clean.includes("zoom") || clean.includes("meeting") || clean.includes("video call")) {
      return "Zoom";
    }
    // Fallback capitalizations
    return input.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  /**
   * Adds a record to the live device audit log.
   */
  private addLog(action: string, status: "success" | "pending" | "denied", details: string): DeviceLog {
    const log: DeviceLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      action,
      status,
      details,
    };
    this.logs.unshift(log);
    this.emit("deviceLogAdded", log);
    return log;
  }

  /**
   * Prompts the user with a sleek UI popup for verification.
   */
  private async requestUserPermission(actionName: string, details: string): Promise<boolean> {
    if (this.bypassSecurity) {
      this.addLog(actionName, "success", `Auto-Authorized (Bypass Active): ${details}`);
      return true;
    }

    const logId = this.addLog(actionName, "pending", `Awaiting user permission: ${details}`).id;
    
    return new Promise<boolean>((resolve) => {
      this.emit("permissionRequested", {
        id: Math.random().toString(36).substring(2, 9),
        actionName,
        details,
        resolve: (approved: boolean) => {
          // Update the log status based on decision
          const logIndex = this.logs.findIndex(l => l.id === logId);
          if (logIndex !== -1) {
            this.logs[logIndex].status = approved ? "success" : "denied";
            this.logs[logIndex].details = approved 
              ? `Authorized by user. ${details}`
              : `Denied by user. ${details}`;
            this.emit("deviceLogsUpdated", [...this.logs]);
          }
          resolve(approved);
        }
      });
    });
  }

  /**
   * Main entry point to execute a tool.
   * Runs the local side-effect and returns a result payload to send back to Gemini.
   */
  async execute(name: string, args: any): Promise<any> {
    console.log(`🔧 Executing tool: ${name} with args:`, args);
    this.emit("toolStart", { name, args });

    try {
      let output: any = null;

      switch (name) {
        case "openWebsite":
          output = await this.openWebsite(args.url, args.autoCloseSeconds || args.temporarySeconds);
          break;

        case "closeWebsite":
          output = await this.closeWebsite();
          break;

        case "getWeather":
          output = await this.getWeather(args.location);
          break;

        case "getDateTime":
          output = await this.getDateTime();
          break;

        case "createReminder":
          output = await this.createReminder(args.text, args.time);
          break;

        case "playAmbientSound":
          output = await this.playAmbientSound(args.soundType);
          break;

        // --- NEW DEVICE CONTROL TOOLS ---
        case "openApplication":
          output = await this.openApplication(args.appName);
          break;

        case "launchProgram":
          output = await this.launchProgram(args.programName);
          break;

        case "executeShellCommand":
          output = await this.executeShellCommand(args.command);
          break;

        case "closeProgram":
          output = await this.closeProgram(args.programName);
          break;

        case "openFile":
          output = await this.openFile(args.fileName);
          break;

        case "openFolder":
          output = await this.openFolder(args.folderPath);
          break;

        case "searchOnDevice":
          output = await this.searchOnDevice(args.query);
          break;

        // --- FUTURE/EXPANDED CONTROLS ---
        case "adjustVolume":
          output = await this.adjustVolume(args.level);
          break;

        case "adjustBrightness":
          output = await this.adjustBrightness(args.level);
          break;

        case "takeScreenshot":
          output = await this.takeScreenshot();
          break;

        case "getSystemMetrics":
          output = await this.getSystemMetrics();
          break;

        case "requestScreenShare":
          output = await this.requestScreenShare(args.reason);
          break;

        case "requestCameraShare":
          output = await this.requestCameraShare(args.action, args.reason);
          break;

        case "getUserLocation":
          output = await this.getUserLocation();
          break;

        case "analyzeScreenContent":
          output = await this.analyzeScreenContent(args.focusQuery || args.query);
          break;

        case "controlBrowser":
          output = await this.controlBrowser(args.action, args.param1, args.param2);
          break;

        case "searchYouTube":
          output = await this.searchYouTube(args.query);
          break;

        case "performGoogleResearch":
          output = await this.performGoogleResearch(args.topic || args.query || "General search");
          break;

        default:
          throw new Error(`Tool '${name}' is not supported.`);
      }

      console.log(`✅ Tool ${name} execution result:`, output);
      this.emit("toolSuccess", { name, args, output });
      return output;
    } catch (err: any) {
      console.error(`❌ Tool ${name} failed:`, err);
      this.emit("toolFailure", { name, args, error: err.message || err });
      return { error: err.message || "Failed to execute tool" };
    }
  }

  /**
   * Conducts Google web research as fallback.
   */
  private async performGoogleResearch(topic: string): Promise<any> {
    console.log(`🔎 Performing client-fallback Google Research for topic: "${topic}"`);
    try {
      const response = await fetch("/api/browser/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", param1: topic })
      });
      const data = await response.json();
      return {
        status: "success",
        topic,
        researchSummary: data.result || `Completed Google Web Research for "${topic}".`
      };
    } catch (err: any) {
      return {
        status: "success",
        topic,
        researchSummary: `Executed Google Search query for "${topic}".`
      };
    }
  }

  // --- DEVICE CONTROLS IMPLEMENTATION ---

  /**
   * Dispatches a command to the remote companion on the user's local PC.
   */
  private async dispatchToCompanion(action: string, payload: any): Promise<boolean> {
    try {
      const response = await fetch("/api/pc/connection-status");
      const status = await response.json();
      if (status.active) {
        await fetch("/api/pc/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload })
        });
        return true;
      }
    } catch (err) {
      console.warn("Failed to dispatch to PC companion:", err);
    }
    return false;
  }

  /**
   * Runs a shell command on your real PC via the companion script.
   */
  private async executeShellCommand(command: string): Promise<any> {
    const allowed = await this.requestUserPermission(
      "Execute CLI Command",
      `Execute shell command: "${command}"`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User denied console command execution permission."
      };
    }

    const remoteActive = await this.dispatchToCompanion("execute_shell", { command });

    this.addLog("Execute CLI Command", "success", `Command executed: ${command} ${remoteActive ? "(on local PC)" : ""}`);
    
    if (remoteActive) {
      // Since it's async polling, let's wait a couple of seconds to see if there is an update in the logs!
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      try {
        const logsRes = await fetch("/api/pc/logs");
        const data = await logsRes.json();
        const latestLog = data.logs?.[0];
        if (latestLog && latestLog.action === "execute_shell") {
          return {
            success: latestLog.status === "success",
            action: "executed_remote",
            command,
            output: latestLog.details,
            message: `Command executed on your actual PC: ${latestLog.details}`
          };
        }
      } catch (err) {
        // Log fetch failed
      }

      return {
        success: true,
        action: "dispatched",
        command,
        message: `Successfully sent terminal command to execute on your actual PC. Keep an eye on your console or companion logs for outputs!`
      };
    }

    return {
      success: true,
      action: "simulated_shell",
      command,
      output: `[SIMULATED] Executing '${command}' in virtual container. Run the PC Companion to execute real commands on your local device.`,
      message: `Executed simulated terminal command '${command}' successfully.`
    };
  }

  private async openApplication(appName: string): Promise<any> {
    const targetAppName = this.resolveApplicationName(appName);
    
    // Check security checklist configuration
    const config = this.allowedApplications.find(
      app => app.name.toLowerCase() === targetAppName.toLowerCase()
    );

    const requiresConfirm = !config || !config.autoApprove;

    if (requiresConfirm) {
      const allowed = await this.requestUserPermission(
        "Open Application",
        `Start program: ${targetAppName}`
      );
      if (!allowed) {
        return {
          success: false,
          action: "denied",
          reason: "User denied device permission request.",
          application: targetAppName
        };
      }
    }

    // Try to open on local PC via companion!
    const remoteActive = await this.dispatchToCompanion("open_app", { appName: targetAppName });

    // Process the successful opening simulation
    this.addLog("Open Application", "success", `Successfully launched ${targetAppName} ${remoteActive ? "(on local PC)" : ""}`);
    
    // Notify React UI to display an amazing mock virtual OS window of the application!
    this.emit("applicationOpened", { appName: targetAppName, remoteActive });

    return {
      success: true,
      action: "opened",
      application: targetAppName,
      remoteActive,
      message: remoteActive
        ? `Successfully launched real program "${targetAppName}" on your local PC!`
        : `Successfully launched mock virtual ${targetAppName} on your workspace screen.`
    };
  }

  private async launchProgram(programName: string): Promise<any> {
    // Treat similar to openApplication for seamless experience
    return this.openApplication(programName);
  }

  private async closeProgram(programName: string): Promise<any> {
    const targetProgramName = this.resolveApplicationName(programName);

    const allowed = await this.requestUserPermission(
      "Terminate Program",
      `Force stop application: ${targetProgramName}`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User declined termination request for security.",
        program: targetProgramName
      };
    }

    // Try to close on local PC via companion!
    const remoteActive = await this.dispatchToCompanion("close_app", { appName: targetProgramName });

    this.addLog("Terminate Program", "success", `Stopped process: ${targetProgramName} ${remoteActive ? "(on local PC)" : ""}`);
    this.emit("applicationClosed", { appName: targetProgramName, remoteActive });

    return {
      success: true,
      action: "closed",
      program: targetProgramName,
      remoteActive,
      message: remoteActive
        ? `Successfully terminated process for "${targetProgramName}" on your local PC.`
        : `Process for ${targetProgramName} was closed safely.`
    };
  }

  private async openFile(fileName: string): Promise<any> {
    const cleanFileName = fileName.trim();
    
    // Security check for file access
    const allowed = await this.requestUserPermission(
      "Read Local File",
      `Accessing file: "${cleanFileName}"`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "Access to the requested file was denied by the user."
      };
    }

    const mockFilePath = `/Users/tune/Documents/${cleanFileName}`;
    this.addLog("Read Local File", "success", `Opened file: ${cleanFileName}`);
    this.emit("fileOpened", { fileName: cleanFileName, path: mockFilePath });

    return {
      success: true,
      action: "opened_file",
      fileName: cleanFileName,
      path: mockFilePath,
      message: `Successfully loaded file "${cleanFileName}" into editor.`
    };
  }

  private async openFolder(folderPath: string): Promise<any> {
    // Resolve smart names like "downloads"
    let targetPath = folderPath.trim();
    if (targetPath.toLowerCase() === "downloads") {
      targetPath = "/Users/tune/Downloads";
    }

    const allowed = await this.requestUserPermission(
      "Navigate Directory",
      `Open folder directory: ${targetPath}`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "Folder access permission rejected."
      };
    }

    this.addLog("Navigate Directory", "success", `Opened folder view: ${targetPath}`);
    this.emit("folderOpened", { folderPath: targetPath });

    return {
      success: true,
      action: "opened_folder",
      folderPath: targetPath,
      message: `Directory folder view resolved at: ${targetPath}`
    };
  }

  private async searchOnDevice(query: string): Promise<any> {
    this.addLog("Search Local Disk", "success", `Searched indexes for: "${query}"`);

    // Dynamic mock search results
    const results = [
      { name: `${query}_final_v2.pdf`, path: `/Users/tune/Documents/${query}_final_v2.pdf`, size: "2.4 MB" },
      { name: `notes_on_${query}.txt`, path: `/Users/tune/Downloads/notes_on_${query}.txt`, size: "14 KB" },
      { name: `archive_${query}.zip`, path: `/Users/tune/Archive/archive_${query}.zip`, size: "48.2 MB" }
    ];

    return {
      success: true,
      action: "searched",
      query,
      results,
      message: `Found ${results.length} files matching the criteria on your disk.`
    };
  }

  // --- FUTURE EXTENSIONS SIMULATION ---

  private async adjustVolume(level: number): Promise<any> {
    this.volume = Math.max(0, Math.min(100, level));
    this.addLog("Volume Adjust", "success", `Set master volume to ${this.volume}%`);
    
    // Dispatch to local PC companion!
    const remoteActive = await this.dispatchToCompanion("adjust_volume", { level: this.volume });

    this.emit("hardwareStateChanged", { type: "volume", value: this.volume, remoteActive });
    return { 
      success: true, 
      volume: this.volume, 
      remoteActive,
      message: remoteActive 
        ? `Successfully updated volume to ${this.volume}% on your local computer!`
        : `System volume updated to ${this.volume}%.` 
    };
  }

  private async adjustBrightness(level: number): Promise<any> {
    this.brightness = Math.max(0, Math.min(100, level));
    this.addLog("Brightness Adjust", "success", `Set display brightness to ${this.brightness}%`);
    this.emit("hardwareStateChanged", { type: "brightness", value: this.brightness });
    return { success: true, brightness: this.brightness, message: `Screen brightness level adjusted to ${this.brightness}%.` };
  }

  private async takeScreenshot(): Promise<any> {
    this.addLog("Capture Screenshot", "success", `Saved workspace screenshot capture.`);
    this.emit("screenshotTaken", {});
    return { 
      success: true, 
      action: "screenshot", 
      path: "/Users/tune/Pictures/Screenshot_2026_07.png",
      message: "Screenshot captured and saved to system pictures directory." 
    };
  }

  private async getSystemMetrics(): Promise<any> {
    const cpu = 15 + Math.round(Math.random() * 20);
    const ram = 54;
    return {
      success: true,
      cpuUsage: `${cpu}%`,
      ramUsage: `${ram}%`,
      temperature: "42°C",
      uptime: "3 days, 4 hours"
    };
  }

  private async requestScreenShare(reason: string): Promise<any> {
    this.addLog("Request Screen Share", "pending", `Requested access: "${reason}"`);
    return new Promise((resolve) => {
      this.emit("requestScreenShareEvent", {
        reason,
        callback: (approved: boolean) => {
          if (approved) {
            this.addLog("Request Screen Share", "success", "Screen share authorized by user.");
            resolve({
              success: true,
              sharing: true,
              message: "User approved screen sharing. Capturing browser frame stream now."
            });
          } else {
            this.addLog("Request Screen Share", "denied", "Screen share authorization declined.");
            resolve({
              success: false,
              sharing: false,
              message: "User declined the screen sharing request."
            });
          }
        }
      });
    });
  }

  private async requestCameraShare(action: string = "start", reason?: string): Promise<any> {
    const isStop = action === "stop" || action === "disable" || action === "off";
    this.addLog("Camera Vision Control", "pending", `${isStop ? "Deactivating" : "Activating"} camera vision (${reason || "User request"})`);
    return new Promise((resolve) => {
      this.emit("requestCameraShareEvent", {
        action,
        reason: reason || "to see through device camera",
        callback: (approved: boolean, errorMsg?: string) => {
          if (approved) {
            this.addLog("Camera Vision Control", "success", `Camera vision ${isStop ? "deactivated" : "activated"}.`);
            resolve({
              success: true,
              cameraActive: !isStop,
              message: isStop ? "Camera vision has been completely turned off." : "User approved camera vision. Streaming camera video frames now."
            });
          } else {
            this.addLog("Camera Vision Control", "denied", `Camera vision ${isStop ? "stop failed" : "permission declined"}.`);
            resolve({
              success: false,
              cameraActive: isStop,
              message: errorMsg || (isStop ? "Could not stop camera vision." : "User declined or denied camera permission request.")
            });
          }
        }
      });
    });
  }

  public async getUserLocation(): Promise<any> {
    this.addLog("Geolocation", "pending", "Detecting user real-world location...");
    try {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        let address = "";
        let city = "";
        let country = "";

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            address = data.display_name || "";
            const addrObj = data.address || {};
            city = addrObj.city || addrObj.town || addrObj.village || addrObj.state_district || "";
            country = addrObj.country || "";
          }
        } catch (e) {
          console.warn("Reverse geocoding fetch error:", e);
        }

        if (!address) {
          address = `Latitude ${lat.toFixed(4)}, Longitude ${lon.toFixed(4)}`;
        }

        this.addLog("Geolocation", "success", `Detected location: ${address}`);
        return {
          success: true,
          latitude: lat,
          longitude: lon,
          address: address,
          city: city,
          country: country,
          message: `User's current physical location is: ${address}.`
        };
      }
    } catch (err: any) {
      console.warn("Browser geolocation failed, attempting IP fallback:", err);
    }

    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const address = `${ipData.city || ""}, ${ipData.region || ""}, ${ipData.country_name || ""}`;
        this.addLog("Geolocation (IP)", "success", `Detected location: ${address}`);
        return {
          success: true,
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          address: address,
          city: ipData.city,
          country: ipData.country_name,
          message: `User's location via IP lookup is: ${address}.`
        };
      }
    } catch (e) {
      console.warn("IP geolocation fallback failed:", e);
    }

    return {
      success: false,
      message: "Unable to detect exact geolocation. Please enable browser location permissions."
    };
  }

  public async analyzeScreenContent(focusQuery?: string): Promise<any> {
    this.addLog("Analyze Screen", "pending", `Capturing screen for visual analysis: "${focusQuery || "email or open tab"}"`);
    return new Promise((resolve) => {
      this.emit("captureAndAnalyzeScreenEvent", {
        query: focusQuery,
        callback: async (dataUrl: string | null, errorMsg?: string) => {
          if (!dataUrl) {
            this.addLog("Analyze Screen", "denied", errorMsg || "Failed to capture screen image.");
            resolve({
              success: false,
              message: errorMsg || "Unable to capture screen image. Please allow screen sharing or tab capture."
            });
            return;
          }

          try {
            const customApiKey = typeof localStorage !== "undefined" ? localStorage.getItem("custom_gemini_api_key") || "" : "";
            const res = await fetch("/api/analyze-screen", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {})
              },
              body: JSON.stringify({
                image: dataUrl,
                query: focusQuery || "Read all visible text, email messages (subject, sender like Ornob Kundu sir, and body), or open tab content and explain it clearly.",
                customApiKey
              })
            });

            if (res.ok) {
              const data = await res.json();
              this.addLog("Analyze Screen", "success", "Screen content analyzed successfully.");
              resolve({
                success: true,
                extractedAnalysis: data.analysis,
                message: `Screen content analysis result: ${data.analysis}`
              });
            } else {
              const errData = await res.json().catch(() => ({}));
              this.addLog("Analyze Screen", "denied", errData.error || "Vision API analysis failed.");
              resolve({
                success: false,
                message: `Vision analysis failed: ${errData.error || "Server error"}`
              });
            }
          } catch (err: any) {
            console.error("Error sending screen image to vision API:", err);
            this.addLog("Analyze Screen", "denied", err.message);
            resolve({
              success: false,
              message: `Error analyzing screen: ${err.message}`
            });
          }
        }
      });
    });
  }

  private async controlBrowser(action: string, param1?: string, param2?: string): Promise<any> {
    this.addLog("Control Browser", "success", `Browser command: ${action} (${param1 || ''}, ${param2 || ''})`);
    
    // Delegate key commands directly to the actual Chrome browser via openWebsite/closeWebsite
    if (action === "navigate" && param1) {
      return await this.openWebsite(param1);
    } else if (action === "search" && param1) {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(param1)}`;
      return await this.openWebsite(googleSearchUrl);
    } else if (action === "newTab") {
      const targetUrl = param1 || "https://www.google.com";
      return await this.openWebsite(targetUrl);
    } else if (action === "closeTab" || action === "close") {
      return await this.closeWebsite();
    }

    // For other visual or interactive actions, we can still emit the event so UI logs it, but return success
    this.emit("controlBrowserEvent", { action, param1, param2 });
    
    return {
      success: true,
      action,
      message: `Browser command '${action}' logged. For live browsing, Chrome is opened directly on your PC.`
    };
  }

  // --- ACCESSORS & SETTERS ---

  public getBypassSecurity(): boolean {
    return this.bypassSecurity;
  }

  public setBypassSecurity(val: boolean) {
    this.bypassSecurity = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("tune_bypass_security", String(val));
    }
    this.emit("securityBypassChanged", val);
  }

  public getAllowedApplications(): AllowedApplication[] {
    return this.allowedApplications;
  }

  public updateAllowedApplication(name: string, autoApprove: boolean) {
    const app = this.allowedApplications.find(a => a.name === name);
    if (app) {
      app.autoApprove = autoApprove;
      this.emit("allowedAppsUpdated", [...this.allowedApplications]);
    }
  }

  public addAllowedApplication(app: AllowedApplication) {
    this.allowedApplications.push(app);
    this.emit("allowedAppsUpdated", [...this.allowedApplications]);
  }

  public getLogs(): DeviceLog[] {
    return this.logs;
  }

  public getHardwareState() {
    return {
      volume: this.volume,
      brightness: this.brightness,
      cameraActive: this.cameraActive,
    };
  }

  /**
   * Tool: searchYouTube
   * Searches YouTube for a song or track and opens it directly in the user's Chrome browser.
   */
  private async searchYouTube(query: string): Promise<any> {
    const cleanQuery = query.trim();
    this.addLog("YouTube Search", "success", `Searching YouTube for: "${cleanQuery}" on actual Chrome browser`);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
    return await this.openWebsite(youtubeUrl);
  }

  /**
   * Tool: openWebsite
   * Attempts to open the URL in a new tab and alerts the UI.
   */
  private async openWebsite(url: string, autoCloseSeconds?: number): Promise<any> {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Make opening websites secure via confirmation too!
    const allowed = await this.requestUserPermission(
      "Browse Web Link",
      `Open external URL: ${cleanUrl}${autoCloseSeconds ? ` (Auto-close in ${autoCloseSeconds}s)` : ""}`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User denied browse action."
      };
    }

    // Try to open on the actual PC default browser via companion!
    const remoteActive = await this.dispatchToCompanion("open_website", { url: cleanUrl, autoCloseSeconds });

    let opened = false;
    if (!remoteActive) {
      try {
        // Note: We avoid noopener here so we can keep the window reference to close it later
        const tab = window.open(cleanUrl, "_blank");
        if (tab) {
          opened = true;
          this.openedTabs.push(tab);

          if (autoCloseSeconds && autoCloseSeconds > 0) {
            setTimeout(() => {
              try {
                if (tab && !tab.closed) {
                  tab.close();
                  this.addLog("Auto Close Tab", "success", `Auto-closed temporary tab: ${cleanUrl}`);
                  this.openedTabs = this.openedTabs.filter(t => t !== tab);
                }
              } catch (e) {
                console.warn("Could not auto close tab:", e);
              }
            }, autoCloseSeconds * 1000);
          }
        }
      } catch (err) {
        // Sandbox / Popup blocker
      }
    } else {
      opened = true;
    }

    this.addLog("Browse Web Link", "success", `Browsed URL: ${cleanUrl} ${remoteActive ? "(on local PC)" : ""}${autoCloseSeconds ? ` [Auto-closes in ${autoCloseSeconds}s]` : ""}`);
    this.emit("websiteOpened", { url: cleanUrl, opened, remoteActive, autoCloseSeconds });

    return {
      success: opened || remoteActive,
      url: cleanUrl,
      remoteActive,
      openedSuccessfully: opened,
      autoCloseSeconds,
      message: remoteActive
        ? `Successfully launched "${cleanUrl}" on your actual PC's default browser!`
        : opened 
        ? `Successfully opened ${cleanUrl} in a new tab.${autoCloseSeconds ? ` Tab will automatically close in ${autoCloseSeconds} seconds.` : ""}` 
        : `Requested opening ${cleanUrl}. Some browsers may block automatic popups, so a link has been displayed on the screen for the user.`
    };
  }

  /**
   * Tool: closeWebsite
   * Closes the most recently opened tab/website.
   */
  private async closeWebsite(): Promise<any> {
    const allowed = await this.requestUserPermission(
      "Close Web Link",
      `Close the last opened browser tab/window.`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User denied the action to close the tab."
      };
    }

    // Try to close on the actual PC via companion!
    const remoteActive = await this.dispatchToCompanion("close_website", {});

    let closedSuccessfully = false;
    if (!remoteActive) {
      // Filter out already closed or null references
      this.openedTabs = this.openedTabs.filter(tab => tab && !tab.closed);

      if (this.openedTabs.length === 0) {
        this.addLog("Close Web Link", "success", "Requested tab close but no active open tabs found.");
        return {
          success: false,
          message: "No active browser tabs opened by this application are currently available to close."
        };
      }

      const lastTab = this.openedTabs.pop();
      if (lastTab) {
        try {
          lastTab.close();
          closedSuccessfully = true;
        } catch (err) {
          console.error("Error trying to close tab:", err);
        }
      }
    } else {
      closedSuccessfully = true;
    }

    this.addLog("Close Web Link", "success", `Closed last opened web tab. ${remoteActive ? "(on local PC)" : ""}`);
    this.emit("websiteClosed", { closedSuccessfully, remoteActive });

    return {
      success: closedSuccessfully || remoteActive,
      remoteActive,
      message: remoteActive
        ? "Successfully closed the last active browser tab on your local PC."
        : closedSuccessfully
        ? "Successfully closed the last opened web tab."
        : "Failed to close the browser tab. Some browsers restrict window.close() on certain tabs."
    };
  }

  /**
   * Tool: getWeather
   * Generates highly contextual realistic mock weather.
   */
  private async getWeather(location: string): Promise<any> {
    const weatherDataList = [
      { temp: "72°F (22°C)", condition: "Sunny", desc: "with a perfect gentle ocean breeze" },
      { temp: "64°F (18°C)", condition: "Partly Cloudy", desc: "with crisp and fresh air" },
      { temp: "55°F (13°C)", condition: "Light Rain", desc: "bringing a soothing petrichor scent" },
      { temp: "78°F (26°C)", condition: "Warm and Clear", desc: "ideal for a scenic walk" },
    ];

    // Seed based on string hash for consistency
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = location.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % weatherDataList.length;
    const selected = weatherDataList[idx];

    const result = {
      location,
      temperature: selected.temp,
      condition: selected.condition,
      description: selected.desc,
      formattedReport: `It is currently ${selected.temp} and ${selected.condition} in ${location}, ${selected.desc}.`
    };

    return result;
  }

  /**
   * Tool: getDateTime
   * Returns current localized timestamp.
   */
  private async getDateTime(): Promise<any> {
    const now = new Date();
    return {
      localTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      localDate: now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fullISO: now.toISOString()
    };
  }

  /**
   * Tool: createReminder
   * Adds a reminder to the UI.
   */
  private async createReminder(text: string, time: string): Promise<any> {
    const reminder: Reminder = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      time,
      active: true,
    };

    this.emit("reminderCreated", reminder);

    return {
      success: true,
      text,
      time,
      id: reminder.id,
      message: `I've created a reminder for "${text}" set for ${time}.`
    };
  }

  /**
   * Tool: playAmbientSound
   * Toggles audio loop playbacks.
   */
  private async playAmbientSound(soundType: string): Promise<any> {
    const target = soundType.toLowerCase().trim() as AmbientSoundType;
    
    // Stop current sounds
    Object.keys(this.ambientAudios).forEach((key) => {
      const audio = this.ambientAudios[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (target === "off" || !["rain", "forest", "waves"].includes(target)) {
      this.currentPlayingSound = "off";
      this.emit("ambientSoundChanged", "off");
      return { success: true, playing: false, message: "Turned off all ambient sounds." };
    }

    const audioToPlay = this.ambientAudios[target];
    if (audioToPlay) {
      try {
        await audioToPlay.play();
        this.currentPlayingSound = target;
        this.emit("ambientSoundChanged", target);
        return { success: true, playing: true, sound: target, message: `Playing looping ambient ${target} sound.` };
      } catch (err) {
        console.warn(`Failed to play ambient sound: ${target}`, err);
        return { success: false, error: "Audio playback was blocked by browser autoplay policy. Ask the user to click the screen first." };
      }
    }

    return { success: false, error: "Sound file unavailable." };
  }

  getCurrentAmbientSound(): AmbientSoundType {
    return this.currentPlayingSound;
  }

  cleanup(): void {
    Object.keys(this.ambientAudios).forEach((key) => {
      const audio = this.ambientAudios[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    this.currentPlayingSound = "off";
  }
}
export const toolManagerInstance = new ToolManager();
