import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { storage } from '../storage';
import { decrypt } from '../utils/crypto';

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
      console.error('Failed to get ElevenLabs API key:', error);
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
      
      // Use the SDK to fetch agent
      const agent = await client.conversationalAi.getAgent(cleanAgentId);

      // Update last synced timestamp if we have an accountId
      if (accountId) {
        await storage.updateAccount(accountId, { lastSynced: new Date() });
      }

      return agent as ElevenLabsAgent;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      console.error('Error fetching agent from ElevenLabs:', error.message);
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }
  }

  async listAgents(limit: number = 100, accountId?: string): Promise<ElevenLabsAgent[]> {
    try {
      const client = await this.getClient(accountId);
      
      // Use the SDK to list agents
      const response = await client.conversationalAi.getAllAgents({
        page_size: limit,
      });

      // Update last synced timestamp if we have an accountId
      if (accountId) {
        await storage.updateAccount(accountId, { lastSynced: new Date() });
      }

      return (response.agents || []) as ElevenLabsAgent[];
    } catch (error: any) {
      console.error('Error listing agents from ElevenLabs:', error.message);
      throw new Error(`Failed to list agents: ${error.message}`);
    }
  }

  async testConnection(accountId?: string): Promise<boolean> {
    try {
      const client = await this.getClient(accountId);
      
      // Try to fetch user info to test the connection
      await client.user.get();
      return true;
    } catch (error) {
      console.error('ElevenLabs connection test failed:', error);
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

      // Use the SDK to fetch conversations
      const response = await client.conversationalAi.getConversations(params);

      return {
        conversations: (response.conversations || []) as ElevenLabsConversation[],
        cursor: response.cursor,
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
      
      // Use the SDK to fetch conversation details
      const conversation = await client.conversationalAi.getConversation(conversationId);

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
        const allCalls = await storage.getAllCalls();
        const matchingCall = allCalls.find(call => call.externalId === `EL-${webhookData.conversation_id}`);
        if (matchingCall) {
          await storage.updateCall(matchingCall.id, {
            recordingUrl: recordingUrl,
            metadata: {
              ...matchingCall.metadata,
              hasRecording: true,
              recordingProcessed: new Date().toISOString(),
            },
          });
        }
      }
    } catch (error) {
      console.error('Error processing webhook data:', error);
      throw error;
    }
  }
}

export const elevenLabsIntegration = new ElevenLabsIntegration();