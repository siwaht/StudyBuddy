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
  private apiKey: string | null = null;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  async initialize(): Promise<boolean> {
    try {
      // Try to get API key from database first
      const apiKeyRecord = await storage.getApiKey('elevenlabs');
      if (apiKeyRecord && apiKeyRecord.isActive) {
        this.apiKey = decrypt(apiKeyRecord.encryptedKey);
        return true;
      }

      // Fallback to environment variable
      const envKey = process.env.ELEVENLABS_API_KEY;
      if (envKey) {
        this.apiKey = envKey;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to initialize ElevenLabs integration:', error);
      return false;
    }
  }

  async fetchAgentById(agentId: string): Promise<ElevenLabsAgent | null> {
    if (!this.apiKey) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('ElevenLabs API key not configured');
      }
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/agents/${agentId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update last used timestamp
      const apiKeyRecord = await storage.getApiKey('elevenlabs');
      if (apiKeyRecord) {
        await storage.updateApiKey('elevenlabs', apiKeyRecord.encryptedKey);
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

  async listAgents(limit: number = 100): Promise<ElevenLabsAgent[]> {
    if (!this.apiKey) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('ElevenLabs API key not configured');
      }
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/agents`,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          params: {
            page_size: limit,
          },
        }
      );

      return response.data.agents || [];
    } catch (error: any) {
      console.error('Error listing agents from ElevenLabs:', error.response?.data || error.message);
      throw new Error(`Failed to list agents: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      const initialized = await this.initialize();
      if (!initialized) {
        return false;
      }
    }

    try {
      // Try to fetch user info or list agents to test the connection
      await axios.get(
        `${this.baseUrl}/user`,
        {
          headers: {
            'xi-api-key': this.apiKey,
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