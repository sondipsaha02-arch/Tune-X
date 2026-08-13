export type ConnectionState = "disconnected" | "connecting" | "listening" | "speaking" | "thinking";

export interface ResearchSource {
  title: string;
  url: string;
  domain?: string;
  verified?: boolean;
  snippet?: string;
}

export interface Transcription {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isResearch?: boolean;
  isSearching?: boolean;
  topic?: string;
  sources?: ResearchSource[];
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  active: boolean;
}

export type AmbientSoundType = "rain" | "forest" | "waves" | "off";

export interface ActiveTool {
  id: string;
  name: string;
  args: any;
  status: "running" | "completed" | "failed";
  result?: string;
}

export type DeviceAgentStatus = "offline" | "connecting" | "connected";

export interface AllowedApplication {
  name: string;
  category: string;
  description: string;
  logo: string;
  autoApprove: boolean;
}

export interface DeviceLog {
  id: string;
  timestamp: Date;
  action: string;
  status: "success" | "pending" | "denied";
  details: string;
}

export interface PendingApproval {
  id: string;
  name: string;
  args: any;
  resolve: (approved: boolean) => void;
}

export interface MemorySnippet {
  id: string;
  text: string;
  category: string;
  timestamp: string;
  embedding?: number[];
}

export interface UserProfile {
  name: string;
  personality: string;
  interests: string[];
  goals: string[];
}

export interface UserPreferences {
  speaking_style: string;
  favorite_topics: string[];
  voice_name?: string;
  character_personality?: string;
  proactive_coaching?: boolean;
  oviman_behavior?: boolean;
  vocal_sfx?: boolean;
  avatar_scale?: number;
  avatar_offset_x?: number;
  avatar_offset_y?: number;
  screen_share_mode?: "entire" | "tab";
  background_keep_alive?: boolean;
  user_title?: string;
}

export interface UserHistory {
  important_events: string[];
  previous_projects: string[];
}

export interface SpeakerProfile {
  id: string;
  name: string;
  relationship: string;
  preferences?: string;
  notes?: string;
  lastSpokeAt?: string;
}

export interface ActiveSpeaker {
  name: string;
  relationship?: string;
  confidence?: string;
}

export interface LongTermMemory {
  user_profile: UserProfile;
  preferences: UserPreferences;
  history: UserHistory;
  memories: MemorySnippet[];
  speakers?: SpeakerProfile[];
  active_speaker?: ActiveSpeaker;
}

