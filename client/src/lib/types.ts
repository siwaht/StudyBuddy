export interface DashboardStats {
  totalCalls: number;
  avgHandleTime: string;
  elevenLabsLatencyP95: number;
  activeRooms: number;
  callVolumeData: Array<{ time: string; elevenlabs: number }>;
  recentCalls: any[];
  platforms: string[];
}

export interface CallWithAgent {
  id: string;
  agentId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  sentiment?: "positive" | "negative" | "neutral";
  outcome?: string;
  recordingUrl?: string;
  transcript?: Array<{ timestamp: string; speaker: string; text: string }>;
  analysis?: {
    summary: string;
    topics: string[];
    latencyWaterfall?: {
      speechToText?: number;
      agentLogic?: number;
      elevenLabsTTS?: number;
    };
  };
  metadata?: any;
  rating?: number; // 1-5 star rating for call quality
  categories?: string[]; // array of category strings
  tags?: string[]; // array of tag strings for flexible labeling
  agent?: {
    id: string;
    name: string;
    platform: "elevenlabs";
    description?: string;
  };
}

export interface UserWithoutPassword {
  id: string;
  username: string;
  email: string;
  role: "admin" | "supervisor" | "analyst" | "viewer";
  isActive: boolean;
  lastActive?: string;
  createdAt: string;
}
