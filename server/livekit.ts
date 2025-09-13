import { AccessToken, RoomServiceClient, ParticipantInfo, Room } from 'livekit-server-sdk';
import { storage } from './storage';
import { decrypt } from './utils/crypto';

// Default LiveKit URL
const DEFAULT_LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://tawasul-safqo3pu.livekit.cloud';

// Cache for room service clients per account
const roomServiceClients: Map<string, RoomServiceClient> = new Map();

async function getLiveKitCredentials(accountId?: string): Promise<{ apiKey: string; apiSecret: string; url: string } | null> {
  try {
    // If accountId is provided, get that specific account
    if (accountId) {
      const account = await storage.getAccount(accountId);
      if (account && account.isActive && account.service === 'livekit') {
        // Decrypt the API key which should contain both key and secret in format "KEY:SECRET"
        let decrypted = decrypt(account.encryptedApiKey);
        // Clean the decrypted string from any control characters
        decrypted = decrypted.trim().replace(/[\r\n\t]/g, '').replace(/[^\x20-\x7E]/g, '');
        const [apiKey, apiSecret] = decrypted.split(':').map(s => s.trim());
        if (apiKey && apiSecret) {
          // Use URL from metadata if available, otherwise use default
          const url = (account.metadata as any)?.url || DEFAULT_LIVEKIT_URL;
          return { apiKey, apiSecret, url };
        }
      }
    }
    
    // Otherwise, get the first active LiveKit account
    const accounts = await storage.getAccountsByService('livekit');
    const activeAccount = accounts.find(a => a.isActive);
    if (activeAccount) {
      let decrypted = decrypt(activeAccount.encryptedApiKey);
      // Clean the decrypted string from any control characters
      decrypted = decrypted.trim().replace(/[\r\n\t]/g, '').replace(/[^\x20-\x7E]/g, '');
      const [apiKey, apiSecret] = decrypted.split(':').map(s => s.trim());
      if (apiKey && apiSecret) {
        const url = (activeAccount.metadata as any)?.url || DEFAULT_LIVEKIT_URL;
        return { apiKey, apiSecret, url };
      }
    }

    // Fallback to environment variables
    const envKey = process.env.LIVEKIT_API_KEY;
    const envSecret = process.env.LIVEKIT_API_SECRET;
    if (envKey && envSecret) {
      return { 
        apiKey: envKey.trim(), 
        apiSecret: envSecret.trim(), 
        url: DEFAULT_LIVEKIT_URL 
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get LiveKit credentials:', error);
    return null;
  }
}

async function getRoomServiceClient(accountId?: string): Promise<RoomServiceClient> {
  const cacheKey = accountId || 'default';
  
  // Check cache first
  const cached = roomServiceClients.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const credentials = await getLiveKitCredentials(accountId);
  if (!credentials) {
    throw new Error('LiveKit API credentials are not configured');
  }
  
  // Extract host from WebSocket URL
  const host = credentials.url.replace('wss://', 'https://').replace('ws://', 'http://');
  const client = new RoomServiceClient(host, credentials.apiKey, credentials.apiSecret);
  
  // Cache the client
  roomServiceClients.set(cacheKey, client);
  
  return client;
}

export interface LiveKitRoom {
  sid: string;
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
  creationTime: Date;
  numParticipants: number;
  activeRecording: boolean;
  metadata?: string;
}

export interface LiveKitParticipant {
  sid: string;
  identity: string;
  name?: string;
  state: string;
  joinedAt: Date;
  isPublisher: boolean;
}

export interface LiveKitMetrics {
  totalRooms: number;
  activeRooms: number;
  totalParticipants: number;
  activeRecordings: number;
  roomsWithParticipants: LiveKitRoom[];
  averageParticipantsPerRoom: number;
  longestRunningRoom?: {
    name: string;
    duration: number;
  };
}

/**
 * Create an access token for a participant
 */
export async function createAccessToken(
  roomName: string,
  participantIdentity: string,
  participantName?: string,
  accountId?: string
): Promise<string> {
  const credentials = await getLiveKitCredentials(accountId);
  if (!credentials) {
    throw new Error('LiveKit API credentials are not configured');
  }

  const token = new AccessToken(credentials.apiKey, credentials.apiSecret, {
    identity: participantIdentity,
    name: participantName,
  });

  // Grant permissions for the room
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}

/**
 * Fetch all active rooms
 */
export async function getActiveRooms(accountId?: string): Promise<LiveKitRoom[]> {
  try {
    const client = await getRoomServiceClient(accountId);
    const rooms = await client.listRooms();
    
    return rooms.map(room => ({
      sid: room.sid,
      name: room.name,
      emptyTimeout: room.emptyTimeout,
      maxParticipants: room.maxParticipants,
      creationTime: new Date(Number(room.creationTime) * 1000),
      numParticipants: room.numParticipants,
      activeRecording: room.activeRecording,
      metadata: room.metadata,
    }));
  } catch (error) {
    console.error('Error fetching LiveKit rooms:', error);
    return [];
  }
}

/**
 * Get participants in a specific room
 */
export async function getRoomParticipants(roomName: string, accountId?: string): Promise<LiveKitParticipant[]> {
  try {
    const client = await getRoomServiceClient(accountId);
    const participants = await client.listParticipants(roomName);
    
    return participants.map(participant => ({
      sid: participant.sid,
      identity: participant.identity,
      name: participant.name,
      state: participant.state.toString(),
      joinedAt: new Date(Number(participant.joinedAt) * 1000),
      isPublisher: participant.permission?.canPublish || false,
    }));
  } catch (error) {
    console.error(`Error fetching participants for room ${roomName}:`, error);
    return [];
  }
}

/**
 * Get detailed metrics about LiveKit usage
 */
export async function getLiveKitMetrics(accountId?: string): Promise<LiveKitMetrics> {
  try {
    const rooms = await getActiveRooms(accountId);
    
    const totalParticipants = rooms.reduce((sum, room) => sum + room.numParticipants, 0);
    const activeRooms = rooms.filter(room => room.numParticipants > 0);
    const activeRecordings = rooms.filter(room => room.activeRecording).length;
    
    // Calculate longest running room
    let longestRunningRoom;
    if (rooms.length > 0) {
      const now = Date.now();
      const longestRoom = rooms.reduce((longest, room) => {
        const duration = now - room.creationTime.getTime();
        const longestDuration = now - longest.creationTime.getTime();
        return duration > longestDuration ? room : longest;
      });
      
      longestRunningRoom = {
        name: longestRoom.name,
        duration: Math.floor((now - longestRoom.creationTime.getTime()) / 1000), // in seconds
      };
    }
    
    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      totalParticipants,
      activeRecordings,
      roomsWithParticipants: activeRooms,
      averageParticipantsPerRoom: activeRooms.length > 0 ? totalParticipants / activeRooms.length : 0,
      longestRunningRoom,
    };
  } catch (error) {
    console.error('Error calculating LiveKit metrics:', error);
    return {
      totalRooms: 0,
      activeRooms: 0,
      totalParticipants: 0,
      activeRecordings: 0,
      roomsWithParticipants: [],
      averageParticipantsPerRoom: 0,
    };
  }
}

/**
 * Create a new room
 */
export async function createRoom(
  roomName: string,
  emptyTimeout?: number,
  maxParticipants?: number,
  metadata?: string,
  accountId?: string
): Promise<Room> {
  try {
    const client = await getRoomServiceClient(accountId);
    const room = await client.createRoom({
      name: roomName,
      emptyTimeout: emptyTimeout || 300, // 5 minutes default
      maxParticipants: maxParticipants || 100,
      metadata,
    });
    return room;
  } catch (error) {
    console.error(`Error creating room ${roomName}:`, error);
    throw error;
  }
}

/**
 * Delete a room
 */
export async function deleteRoom(roomName: string, accountId?: string): Promise<void> {
  try {
    const client = await getRoomServiceClient(accountId);
    await client.deleteRoom(roomName);
  } catch (error) {
    console.error(`Error deleting room ${roomName}:`, error);
    throw error;
  }
}

/**
 * Remove a participant from a room
 */
export async function removeParticipant(roomName: string, participantIdentity: string, accountId?: string): Promise<void> {
  try {
    const client = await getRoomServiceClient(accountId);
    await client.removeParticipant(roomName, participantIdentity);
  } catch (error) {
    console.error(`Error removing participant ${participantIdentity} from room ${roomName}:`, error);
    throw error;
  }
}

/**
 * Check if LiveKit is properly configured
 */
export async function isLiveKitConfigured(accountId?: string): Promise<boolean> {
  const credentials = await getLiveKitCredentials(accountId);
  return !!credentials;
}

/**
 * Get LiveKit configuration status
 */
export async function getLiveKitStatus(accountId?: string): Promise<{
  configured: boolean;
  url: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
}> {
  const credentials = await getLiveKitCredentials(accountId);
  return {
    configured: !!credentials,
    url: credentials?.url || DEFAULT_LIVEKIT_URL,
    hasApiKey: !!credentials?.apiKey,
    hasApiSecret: !!credentials?.apiSecret,
  };
}