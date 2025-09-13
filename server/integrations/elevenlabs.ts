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

export class ElevenLabsIntegration {
  private baseUrl = 'https://api.elevenlabs.io/v1';

  async getApiKey(accountId?: string): Promise<string | null> {
    try {
      // If accountId is provided, get that specific account
      if (accountId) {
        const account = await storage.getAccount(accountId);
        if (account && account.isActive && account.service === 'elevenlabs') {
          return decrypt(account.encryptedApiKey);
        }
      }
      
      // Otherwise, get the first active ElevenLabs account
      const accounts = await storage.getAccountsByService('elevenlabs');
      const activeAccount = accounts.find(a => a.isActive);
      if (activeAccount) {
        return decrypt(activeAccount.encryptedApiKey);
      }

      // Fallback to environment variable
      const envKey = process.env.ELEVENLABS_API_KEY;
      if (envKey) {
        return envKey;
      }

      return null;
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
      const response = await axios.get(
        `${this.baseUrl}/convai/agents/${agentId}`,
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
}

export const elevenLabsIntegration = new ElevenLabsIntegration();