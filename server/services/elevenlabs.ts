import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { storage } from "../storage";
import { decrypt } from "../utils/crypto";

interface ElevenLabsConfig {
  apiKey?: string;
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

  // Get API key from account or environment
  async getApiKey(accountId?: string): Promise<string | null> {
    try {
      // First, try to get from environment variable (most reliable)
      let apiKey: string | null = process.env.ELEVENLABS_API_KEY || null;
      
      // If no environment variable, try database
      if (!apiKey) {
        // If accountId is provided, get that specific account
        if (accountId) {
          const account = await storage.getAccount(accountId);
          if (account && account.isActive && account.service === 'elevenlabs') {
            const dbKey = decrypt(account.encryptedApiKey);
            // Check if the decrypted key is valid (should be alphanumeric with dashes)
            if (dbKey && /^[a-zA-Z0-9-_]{20,}$/.test(dbKey.trim())) {
              apiKey = dbKey;
            }
          }
        }
        
        // Otherwise, get the first active ElevenLabs account
        if (!apiKey) {
          const accounts = await storage.getAccountsByService('elevenlabs');
          const activeAccount = accounts.find((a: any) => a.isActive);
          if (activeAccount) {
            const dbKey = decrypt(activeAccount.encryptedApiKey);
            // Check if the decrypted key is valid
            if (dbKey && /^[a-zA-Z0-9-_]{20,}$/.test(dbKey.trim())) {
              apiKey = dbKey;
            }
          }
        }
      }

      // Fallback to instance API key
      if (!apiKey) {
        apiKey = this.apiKey || null;
      }

      // Clean the API key - remove whitespace
      if (apiKey) {
        apiKey = apiKey.trim();
        // Validate the key format (should be alphanumeric with dashes/underscores)
        if (!/^[a-zA-Z0-9-_]{20,}$/.test(apiKey)) {
          console.error('Invalid API key format detected, falling back to environment variable');
          apiKey = process.env.ELEVENLABS_API_KEY || null;
        }
      }

      return apiKey;
    } catch (error) {
      console.error('Failed to get ElevenLabs API key:', error);
      // Fallback to environment variable on error
      return process.env.ELEVENLABS_API_KEY || null;
    }
  }

  isConfigured(): boolean {
    // Check if we have an API key available from any source
    return !!(this.apiKey || process.env.ELEVENLABS_API_KEY);
  }

  // Generate signed URL for private agents
  async getSignedUrl(agentId: string, accountId?: string): Promise<string | null> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
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
  async getAgent(agentId: string, accountId?: string): Promise<any> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
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
  async listAgents(accountId?: string): Promise<any[]> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/agents",
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
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
  async getConversation(conversationId: string, accountId?: string): Promise<any> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      console.error('No API key available for getConversation');
      return null;
    }

    try {
      console.log(`Fetching conversation ${conversationId} from ElevenLabs API`);
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch conversation ${conversationId}: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          console.error(`Conversation ${conversationId} not found in ElevenLabs`);
        }
        return null;
      }

      const conversation = await response.json();
      console.log(`Successfully fetched conversation ${conversationId}`);
      return conversation;
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      return null;
    }
  }

  // List conversations
  async listConversations(agentId?: string, limit: number = 100, accountId?: string): Promise<any[]> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
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
          "xi-api-key": apiKey,
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
  async getConversationAudio(conversationId: string, accountId?: string): Promise<Buffer | null> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      console.error('[ElevenLabs] No API key available for fetching audio');
      return null;
    }

    try {
      // First, check if the conversation has audio available
      const conversation = await this.getConversation(conversationId, accountId);
      if (!conversation) {
        console.error(`[ElevenLabs] Conversation ${conversationId} not found`);
        return null;
      }

      // Check if conversation has a recording_url field (preferred method)
      if (conversation.recording_url) {
        console.log(`[ElevenLabs] Using recording_url from conversation: ${conversation.recording_url}`);
        const response = await fetch(conversation.recording_url, {
          method: "GET",
          headers: {
            "xi-api-key": apiKey,
          },
        });
        
        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          console.log(`[ElevenLabs] Successfully fetched audio from recording_url, size: ${audioBuffer.byteLength} bytes`);
          return Buffer.from(audioBuffer);
        }
      }

      // Check if audio is available (this field may be present in the conversation response)
      if (conversation.has_audio === false && conversation.has_response_audio === false) {
        console.log(`[ElevenLabs] No audio available for conversation ${conversationId} - has_audio and has_response_audio are false`);
        return null;
      }

      // Try the correct ElevenLabs endpoint for audio retrieval
      // Note: The /audio endpoint doesn't need format parameter for MP3
      const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
      
      console.log(`[ElevenLabs] Fetching audio from: ${audioUrl}`);
      
      const response = await fetch(audioUrl, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
          "Accept": "audio/mpeg",
        },
      });

      if (!response.ok) {
        console.error(`[ElevenLabs] Failed to fetch audio for conversation ${conversationId}: ${response.status} ${response.statusText}`);
        
        // Log the response body for debugging
        try {
          const errorText = await response.text();
          console.error(`[ElevenLabs] Error response: ${errorText}`);
        } catch (e) {
          console.error('[ElevenLabs] Could not read error response');
        }
        
        return null;
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`[ElevenLabs] Successfully fetched audio for conversation ${conversationId}, size: ${audioBuffer.byteLength} bytes`);
      return Buffer.from(audioBuffer);
    } catch (error) {
      console.error(`[ElevenLabs] Error fetching audio for conversation ${conversationId}:`, error);
      return null;
    }
  }

  // Check if conversation has audio available
  async hasConversationAudio(conversationId: string, accountId?: string): Promise<boolean> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      console.error('[ElevenLabs] No API key available for checking audio');
      return false;
    }

    try {
      const conversation = await this.getConversation(conversationId, accountId);
      if (!conversation) {
        console.log(`[ElevenLabs] Conversation ${conversationId} not found`);
        return false;
      }

      // Enhanced debug logging for production
      console.log(`[ElevenLabs] Conversation ${conversationId} audio check:`, {
        has_recording_url: !!conversation.recording_url,
        has_audio: conversation.has_audio,
        has_user_audio: conversation.has_user_audio,
        has_response_audio: conversation.has_response_audio,
        status: conversation.status,
        phase: conversation.phase,
        ended_at: conversation.ended_at,
        available_audio_fields: Object.keys(conversation).filter(k => k.toLowerCase().includes('audio') || k.toLowerCase().includes('recording') || k.toLowerCase().includes('media'))
      });

      // Check multiple fields for audio availability
      // ElevenLabs may have changed their API response structure
      const hasAudio = !!(conversation.recording_url || 
                         conversation.audio_url || 
                         conversation.audio_file || 
                         conversation.media?.audio || 
                         conversation.has_audio === true ||
                         conversation.has_response_audio === true ||
                         conversation.has_user_audio === true);
      
      console.log(`[ElevenLabs] Conversation ${conversationId} hasAudio result: ${hasAudio}`);
      return hasAudio;
    } catch (error) {
      console.error(`[ElevenLabs] Error checking audio availability for conversation ${conversationId}:`, error);
      return false;
    }
  }

  // Get recording URL for a conversation (for streaming)
  async getConversationRecordingUrl(conversationId: string, accountId?: string): Promise<string | null> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
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
  async getUsageAnalytics(startDate?: Date, endDate?: Date, accountId?: string): Promise<any> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
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
          "xi-api-key": apiKey,
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