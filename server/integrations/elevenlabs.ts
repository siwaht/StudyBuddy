import axios from 'axios';
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
  private baseUrl = 'https://api.elevenlabs.io/v1';

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

  async fetchAgentById(agentId: string, accountId?: string): Promise<ElevenLabsAgent | null> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      // Clean the agent ID as well
      const cleanAgentId = agentId.trim();
      const response = await axios.get(
        `${this.baseUrl}/convai/agents/${cleanAgentId}`,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update last synced timestamp if we have an accountId
      if (accountId) {
        await storage.updateAccount(accountId, { lastSynced: new Date() });
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching agent from ElevenLabs:', error.response?.data || error.message);
      throw new Error(`Failed to fetch agent: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  async listAgents(limit: number = 100, accountId?: string): Promise<ElevenLabsAgent[]> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/agents`,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          params: {
            page_size: limit,
          },
        }
      );

      // Update last synced timestamp if we have an accountId
      if (accountId) {
        await storage.updateAccount(accountId, { lastSynced: new Date() });
      }

      return response.data.agents || [];
    } catch (error: any) {
      console.error('Error listing agents from ElevenLabs:', error.response?.data || error.message);
      throw new Error(`Failed to list agents: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  async testConnection(accountId?: string): Promise<boolean> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      return false;
    }

    try {
      // Try to fetch user info or list agents to test the connection
      await axios.get(
        `${this.baseUrl}/user`,
        {
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );
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
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const params: any = {
        agent_id: agentId,
        limit: options?.limit || 100,
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

      const response = await axios.get(
        `${this.baseUrl}/conversational-ai/conversations`,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          params,
        }
      );

      return {
        conversations: response.data.conversations || [],
        cursor: response.data.cursor,
      };
    } catch (error: any) {
      console.error('Error fetching conversations from ElevenLabs:', error.response?.data || error.message);
      throw new Error(`Failed to fetch conversations: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  async fetchConversationDetails(
    conversationId: string,
    accountId?: string
  ): Promise<ElevenLabsConversation | null> {
    const apiKey = await this.getApiKey(accountId);
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/conversational-ai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching conversation details from ElevenLabs:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch conversation details: ${error.response?.data?.detail?.message || error.message}`);
    }
  }
}

export const elevenLabsIntegration = new ElevenLabsIntegration();