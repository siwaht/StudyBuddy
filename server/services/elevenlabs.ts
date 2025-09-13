import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

interface ElevenLabsConfig {
  apiKey: string | undefined;
}

class ElevenLabsService {
  private client: ElevenLabsClient | null = null;
  private apiKey: string | undefined;

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
    
    if (this.apiKey) {
      this.client = new ElevenLabsClient({
        apiKey: this.apiKey,
      });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  // Generate signed URL for private agents
  async getSignedUrl(agentId: string): Promise<string | null> {
    if (!this.apiKey) {
      console.error("ElevenLabs API key not configured");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const data = await response.json();
      return data.signed_url;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  }

  // Fetch agent details
  async getAgent(agentId: string): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching agent:", error);
      return null;
    }
  }

  // List all agents
  async listAgents(): Promise<any[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/agents",
        {
          method: "GET",
          headers: {
            "xi-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list agents: ${response.statusText}`);
      }

      const data = await response.json();
      return data.agents || [];
    } catch (error) {
      console.error("Error listing agents:", error);
      return [];
    }
  }

  // Get conversation details
  async getConversation(conversationId: string): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return null;
    }
  }

  // List conversations
  async listConversations(agentId?: string, limit: number = 100): Promise<any[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      let url = `https://api.elevenlabs.io/v1/convai/conversations?page_size=${limit}`;
      if (agentId) {
        url += `&agent_id=${agentId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list conversations: ${response.statusText}`);
      }

      const data = await response.json();
      return data.conversations || [];
    } catch (error) {
      console.error("Error listing conversations:", error);
      return [];
    }
  }

  // Get audio recording for a conversation
  async getConversationAudio(conversationId: string): Promise<Buffer | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      // First, get the conversation details which may contain audio URL or history item info
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        console.error(`Conversation ${conversationId} not found`);
        return null;
      }

      // Check if the conversation has an audio URL or audio data
      if (conversation.audio_url) {
        // Fetch audio from the provided URL
        const response = await fetch(conversation.audio_url, {
          method: "GET",
          headers: {
            "xi-api-key": this.apiKey,
          },
        });
        
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return Buffer.from(audioBuffer);
        }
      }

      // Try to get audio using the conversation's history_item_id if available
      const historyItemId = conversation.history_item_id || conversationId;
      
      // Try the history audio endpoint
      const historyAudioUrl = `https://api.elevenlabs.io/v1/history/${historyItemId}/audio`;
      const historyResponse = await fetch(historyAudioUrl, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (historyResponse.ok) {
        const audioBuffer = await historyResponse.arrayBuffer();
        return Buffer.from(audioBuffer);
      }

      // As a fallback, try the conversational AI endpoint
      const convaiAudioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
      const convaiResponse = await fetch(convaiAudioUrl, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
        },
      });
      
      if (convaiResponse.ok) {
        const audioBuffer = await convaiResponse.arrayBuffer();
        return Buffer.from(audioBuffer);
      }
      
      console.error(`Failed to fetch audio for conversation ${conversationId} from all endpoints`);
      return null;
    } catch (error) {
      console.error(`Error fetching audio for conversation ${conversationId}:`, error);
      return null;
    }
  }

  // Get recording URL for a conversation (for streaming)
  async getConversationRecordingUrl(conversationId: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      // Return a proxy URL that will be handled by our server
      // This avoids exposing the API key to the client
      return `/api/calls/${conversationId}/recording`;
    } catch (error) {
      console.error(`Error generating recording URL for conversation ${conversationId}:`, error);
      return null;
    }
  }

  // Initiate outbound call via Twilio
  async initiateOutboundCallTwilio(params: {
    agentId: string;
    toNumber: string;
    fromNumber?: string;
  }): Promise<any> {
    if (!this.client) {
      throw new Error("ElevenLabs client not configured");
    }

    try {
      // SDK doesn't have this method, keeping fetch for now
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/conversation/initiate_outbound_call",
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: params.agentId,
            customer: {
              number: params.toNumber,
            },
            from_number: params.fromNumber,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to initiate call: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error initiating outbound call:", error);
      throw error;
    }
  }

  // Initiate outbound call via SIP trunk
  async initiateOutboundCallSIP(params: {
    agentId: string;
    agentPhoneNumberId: string;
    toNumber: string;
    customHeaders?: Record<string, string>;
  }): Promise<any> {
    if (!this.client) {
      throw new Error("ElevenLabs client not configured");
    }

    try {
      // SDK doesn't have this method, keeping fetch for now
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call",
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: params.agentId,
            agent_phone_number_id: params.agentPhoneNumberId,
            to_number: params.toNumber,
            custom_headers: params.customHeaders,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to initiate SIP call: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error initiating SIP outbound call:", error);
      throw error;
    }
  }

  // Register phone number with agent
  async registerPhoneNumber(params: {
    agentId: string;
    phoneNumberId: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
  }): Promise<any> {
    if (!this.client) {
      throw new Error("ElevenLabs client not configured");
    }

    try {
      const body: any = {
        agent_id: params.agentId,
        phone_number_id: params.phoneNumberId,
      };

      if (params.twilioAccountSid && params.twilioAuthToken) {
        body.twilio_account_sid = params.twilioAccountSid;
        body.twilio_auth_token = params.twilioAuthToken;
      }

      // SDK doesn't have this method, keeping fetch for now
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/phone-numbers/register",
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to register phone number: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error registering phone number:", error);
      throw error;
    }
  }

  // Get usage analytics
  async getUsageAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    if (!this.apiKey) {
      return null;
    }

    try {
      let url = "https://api.elevenlabs.io/v1/usage/character-stats";
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append("start_unix", Math.floor(startDate.getTime() / 1000).toString());
      }
      if (endDate) {
        params.append("end_unix", Math.floor(endDate.getTime() / 1000).toString());
      }

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching usage analytics:", error);
      return null;
    }
  }
}

// Export singleton instance
export const elevenlabsService = new ElevenLabsService({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export default ElevenLabsService;