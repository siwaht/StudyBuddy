import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { storage } from '../storage';
import { decrypt } from '../utils/crypto';
import { audioStorage } from '../audioStorage';

interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  description?: string;
  language?: string;
  voice?: {
    voice_id?: string;
    name?: string;
    provider?: string;
  };
  first_message?: string;
  prompt?: {
    prompt?: string;
  };
  metadata?: any;
}

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  user_id?: string;
  start_time: number;
  end_time: number;
  transcript?: Array<{
    timestamp: string;
    speaker: 'agent' | 'user';
    text: string;
  }>;
  analysis?: {
    summary?: string;
    topics?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  metadata?: any;
  recording_url?: string;
}

export class ElevenLabsIntegration {
  private client: ElevenLabsClient | null = null;

  async getApiKey(accountId?: string): Promise<string | null> {
    try {
      let apiKey: string | null = null;
      
      // If accountId is provided, get that specific account
      if (accountId) {
        const account = await storage.getAccount(accountId);
        if (account && account.isActive && account.service === 'elevenlabs') {
          apiKey = decrypt(account.encryptedApiKey);
        }
      }
      
      // Otherwise, get the first active ElevenLabs account
      if (!apiKey) {
        const accounts = await storage.getAccountsByService('elevenlabs');
        const activeAccount = accounts.find(a => a.isActive);
        if (activeAccount) {
          apiKey = decrypt(activeAccount.encryptedApiKey);
        }
      }

      // Fallback to environment variable
      if (!apiKey) {
        apiKey = process.env.ELEVENLABS_API_KEY || null;
      }

      // Clean the API key - remove whitespace, newlines, and control characters
      if (apiKey) {
        apiKey = apiKey.trim().replace(/[\r\n\t]/g, '').replace(/[^\x20-\x7E]/g, '');
      }

      return apiKey;
    } catch (error) {
      return null;
    }
  }

  async getClient(accountId?: string): Promise<ElevenLabsClient> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Create a new client with the API key
    this.client = new ElevenLabsClient({
      apiKey: apiKey,
    });

    return this.client;
  }

  async fetchAgentById(agentId: string, accountId?: string): Promise<ElevenLabsAgent | null> {
    try {
      const client = await this.getClient(accountId);
      
      // Clean the agent ID
      const cleanAgentId = agentId.trim();
      
      // Fetch agent using direct API call
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        throw new Error('API key not available');
      }
      
      console.log(`Fetching agent ${cleanAgentId} from ElevenLabs...`);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${cleanAgentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        
        if (response.status === 404) {
          return null;
        }
        if (response.status === 401) {
          throw new Error('Invalid ElevenLabs API key. Please check your API key in Integrations.');
        }
        
        throw new Error(`Failed to fetch agent: ${response.status} ${response.statusText}`);
      }

      const agent = await response.json();

      // Update last synced timestamp if we have an accountId
      if (accountId) {
        await storage.updateAccount(accountId, { lastSynced: new Date() });
      }

      return agent as ElevenLabsAgent;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }
  }

  async listAgents(limit: number = 100, accountId?: string): Promise<ElevenLabsAgent[]> {
    try {
      const client = await this.getClient(accountId);
      
      // List agents using direct API call
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        throw new Error('API key not available');
      }
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents?page_size=${limit}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {

          throw new Error('Invalid ElevenLabs API key. Please check your API key in Integrations.');
        }
        const errorText = await response.text();

        throw new Error(`Failed to list agents: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Update last synced timestamp if we have an accountId
      if (accountId) {
        await storage.updateAccount(accountId, { lastSynced: new Date() });
      }

      return (data.agents || []) as ElevenLabsAgent[];
    } catch (error: any) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }
  }

  async testConnection(accountId?: string): Promise<boolean> {
    try {
      // Get the API key directly to test it
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        return false;
      }
      
      // Test the API key by making a simple API call to get user info
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      });
      
      if (!response.ok) {
        return false;
      }
      
      // Parse the response to ensure it's valid JSON
      const userData = await response.json();
      
      return true;
    } catch (error: any) {
      return false;
    }
  }

  parseAgentForImport(agent: ElevenLabsAgent): {
    name: string;
    platform: 'elevenlabs';
    externalId: string;
    description?: string;
    metadata: any;
  } {
    return {
      name: agent.name || `ElevenLabs Agent ${agent.agent_id}`,
      platform: 'elevenlabs',
      externalId: agent.agent_id,
      description: agent.description || agent.first_message || undefined,
      metadata: {
        voice: agent.voice,
        language: agent.language,
        prompt: agent.prompt?.prompt,
        originalData: agent,
      },
    };
  }

  async fetchConversations(
    agentId: string,
    accountId?: string,
    options?: {
      startTime?: number;
      endTime?: number;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ conversations: ElevenLabsConversation[]; cursor?: string }> {
    try {
      const client = await this.getClient(accountId);
      
      // Build query parameters
      const params: any = {
        agent_id: agentId,
        page_size: options?.limit || 100,
      };

      if (options?.startTime) {
        params.start_time = options.startTime;
      }
      if (options?.endTime) {
        params.end_time = options.endTime;
      }
      if (options?.cursor) {
        params.cursor = options.cursor;
      }

      // Fetch conversations using direct API call
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        throw new Error('API key not available');
      }
      
      const queryParams = new URLSearchParams();
      if (params.agent_id) queryParams.append('agent_id', params.agent_id);
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.start_time) queryParams.append('start_time', params.start_time.toString());
      if (params.end_time) queryParams.append('end_time', params.end_time.toString());
      if (params.cursor) queryParams.append('cursor', params.cursor);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          console.log('Conversations endpoint not available for this agent/account');
          return {
            conversations: [],
            cursor: undefined,
          };
        }
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        conversations: (data.conversations || []) as ElevenLabsConversation[],
        cursor: data.cursor,
      };
    } catch (error: any) {
      // If the endpoint doesn't exist or returns 404, just return empty conversations
      if (error.statusCode === 404 || error.statusCode === 403) {
        console.log('Conversations endpoint not available for this agent/account');
        return {
          conversations: [],
          cursor: undefined,
        };
      }
      
      console.error('Error fetching conversations from ElevenLabs:', error.message);
      // Don't throw error for conversation fetching - just return empty array
      return {
        conversations: [],
        cursor: undefined,
      };
    }
  }

  async fetchConversationDetails(
    conversationId: string,
    accountId?: string
  ): Promise<ElevenLabsConversation | null> {
    try {
      const client = await this.getClient(accountId);
      
      // Fetch conversation details using direct API call
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        throw new Error('API key not available');
      }
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          return null;
        }
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const conversation = await response.json();

      return conversation as ElevenLabsConversation;
    } catch (error: any) {
      console.error('Error fetching conversation details from ElevenLabs:', error.message);
      if (error.statusCode === 404 || error.statusCode === 403) {
        return null;
      }
      // Return null for conversation details if there's an error
      return null;
    }
  }

  // Check if conversation has audio available
  async hasConversationAudio(conversationId: string, accountId?: string): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        console.log('[ElevenLabs] No API key available for audio check');
        return false;
      }
      
      console.log('[ElevenLabs] Using API key from', accountId ? 'storage' : 'environment');
      console.log(`[ElevenLabs] Checking audio availability for conversation ${conversationId}`);
      
      // Check if the conversation exists and has audio by trying to fetch the conversation details
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );
      
      if (!response.ok) {
        console.log(`[ElevenLabs] Failed to check conversation ${conversationId}: ${response.status} ${response.statusText}`);
        
        if (response.status === 404) {
          console.log(`[ElevenLabs] Conversation ${conversationId} not found in API`);
          return false;
        }
        
        return false;
      }
      
      const data = await response.json();
      console.log(`[ElevenLabs] Conversation ${conversationId} found with audio`);
      
      // Return true if conversation exists (audio is stored automatically for conversations)
      return true;
    } catch (error: any) {
      console.error('[ElevenLabs] Error checking audio availability:', error.message);
      return false;
    }
  }
  
  // Fetch conversation audio from ElevenLabs API
  async getConversationAudio(conversationId: string, accountId?: string): Promise<Buffer | null> {
    try {
      const apiKey = await this.getApiKey(accountId);
      if (!apiKey) {
        console.error('[ElevenLabs] No API key available for fetching audio');
        return null;
      }
      
      console.log('[ElevenLabs] Using API key from', accountId ? 'storage' : 'environment');
      console.log(`[ElevenLabs] Fetching conversation ${conversationId} from API`);
      
      // Fetch audio from ElevenLabs API
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );
      
      if (!response.ok) {
        console.log(`[ElevenLabs] Failed to fetch conversation ${conversationId}: ${response.status} ${response.statusText}`);
        
        if (response.status === 404) {
          console.log(`[ElevenLabs] Conversation ${conversationId} not found in API`);
        }
        
        console.log(`[ElevenLabs] Conversation ${conversationId} not found`);
        return null;
      }
      
      // Get the audio buffer
      const audioBuffer = await response.arrayBuffer();
      console.log(`[ElevenLabs] Successfully fetched audio for conversation ${conversationId} (${audioBuffer.byteLength} bytes)`);
      
      return Buffer.from(audioBuffer);
    } catch (error: any) {
      console.error('[ElevenLabs] Error fetching conversation audio:', error.message);
      return null;
    }
  }

  // New method to handle webhook data for recordings
  async processWebhookData(webhookData: {
    conversation_id: string;
    agent_id: string;
    audio?: string; // Base64 encoded MP3
    transcript?: any;
    analysis?: any;
  }): Promise<void> {
    try {
      let recordingUrl: string | undefined;

      // If audio data is provided, we need to save it
      if (webhookData.audio) {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(webhookData.audio, 'base64');

        // Save to a file or cloud storage
        // For now, we'll save locally but in production you'd want to use S3 or similar
        const fileName = `recording_${webhookData.conversation_id}.mp3`;
        const fs = await import('fs');
        const path = await import('path');

        const recordingsDir = path.join(process.cwd(), 'recordings');
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
        }

        const filePath = path.join(recordingsDir, fileName);
        fs.writeFileSync(filePath, audioBuffer);

        // Store the URL/path
        recordingUrl = `/recordings/${fileName}`;

        console.log(`Saved recording for conversation ${webhookData.conversation_id}`);
      }

      // Update the call record in the database with the recording URL
      if (recordingUrl) {
        // Find calls with this conversation ID
        // Note: getAllCalls requires a userId, but webhook doesn't provide it
        // This would need to be handled differently in production
        // For now, we'll skip updating the call record
        console.log(`Recording saved but cannot update call record without userId for conversation ${webhookData.conversation_id}`);
        // In production, you might want to:
        // 1. Store the userId in the conversation metadata
        // 2. Use a different storage mechanism for recordings
        // 3. Update the call record when the conversation ends with proper context
      }
    } catch (error) {
      console.error('Error processing webhook data:', error);
      throw error;
    }
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!(process.env.ELEVENLABS_API_KEY);
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

  // Get recording URL for a conversation (for streaming)
  async getConversationRecordingUrl(conversationId: string, accountId?: string): Promise<string | null> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      return null;
    }

    try {
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
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/conversation/initiate_outbound_call",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
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
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
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
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured");
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

      const response = await fetch(
        "https://api.elevenlabs.io/v1/convai/phone-numbers/register",
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
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

  // Fetch agent details
  async getAgent(agentId: string, accountId?: string): Promise<any> {
    return this.fetchAgentById(agentId, accountId);
  }

  // List all agents
  async listAllAgents(accountId?: string): Promise<any[]> {
    return this.listAgents(100, accountId);
  }

  // Fetch and store audio for a conversation
  async fetchAndStoreAudio(
    conversationId: string,
    callId: string,
    accountId?: string
  ): Promise<{ success: boolean; storageKey?: string; error?: string }> {
    try {
      console.log(`[ElevenLabs] Fetching audio for conversation ${conversationId}`);

      // First check if audio is available
      const hasAudio = await this.hasConversationAudio(conversationId, accountId);
      if (!hasAudio) {
        console.log(`[ElevenLabs] No audio available for conversation ${conversationId}`);

        // Update call status to unavailable
        await storage.updateCall(callId, {
          audioFetchStatus: 'unavailable',
          audioFetchedAt: new Date()
        });

        return {
          success: false,
          error: 'Audio not available'
        };
      }

      // Fetch the audio buffer
      const audioBuffer = await this.getConversationAudio(conversationId, accountId);
      if (!audioBuffer) {
        console.log(`[ElevenLabs] Failed to fetch audio for conversation ${conversationId}`);

        // Update call status to failed
        await storage.updateCall(callId, {
          audioFetchStatus: 'failed',
          audioFetchedAt: new Date()
        });

        return {
          success: false,
          error: 'Failed to fetch audio'
        };
      }

      // Upload to Supabase Storage
      const uploadResult = await audioStorage.uploadAudio(
        conversationId,
        audioBuffer,
        {
          call_id: callId,
          source: 'elevenlabs_api'
        }
      );

      if (!uploadResult.success) {
        console.error(`[ElevenLabs] Failed to upload audio for conversation ${conversationId}:`, uploadResult.error);

        // Update call status to failed
        await storage.updateCall(callId, {
          audioFetchStatus: 'failed',
          audioFetchedAt: new Date()
        });

        return {
          success: false,
          error: uploadResult.error || 'Failed to upload audio'
        };
      }

      // Update call with storage key and status
      await storage.updateCall(callId, {
        audioStorageKey: uploadResult.storageKey,
        audioFetchStatus: 'available',
        audioFetchedAt: new Date(),
        recordingUrl: uploadResult.publicUrl
      });

      console.log(`[ElevenLabs] Successfully stored audio for conversation ${conversationId} at ${uploadResult.storageKey}`);

      return {
        success: true,
        storageKey: uploadResult.storageKey
      };
    } catch (error: any) {
      console.error(`[ElevenLabs] Error fetching and storing audio for conversation ${conversationId}:`, error);

      // Update call status to failed
      try {
        await storage.updateCall(callId, {
          audioFetchStatus: 'failed',
          audioFetchedAt: new Date()
        });
      } catch (updateError) {
        console.error('[ElevenLabs] Failed to update call status:', updateError);
      }

      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  // Batch fetch and store audio for multiple conversations
  async batchFetchAndStoreAudio(
    conversations: Array<{ conversationId: string; callId: string }>,
    accountId?: string
  ): Promise<{
    successful: number;
    failed: number;
    unavailable: number;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      unavailable: 0
    };

    console.log(`[ElevenLabs] Starting batch audio fetch for ${conversations.length} conversations`);

    for (const { conversationId, callId } of conversations) {
      const result = await this.fetchAndStoreAudio(conversationId, callId, accountId);

      if (result.success) {
        results.successful++;
      } else if (result.error === 'Audio not available') {
        results.unavailable++;
      } else {
        results.failed++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[ElevenLabs] Batch audio fetch completed:`, results);

    return results;
  }
}

export const elevenLabsIntegration = new ElevenLabsIntegration();