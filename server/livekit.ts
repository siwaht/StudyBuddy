import { AccessToken, RoomServiceClient, ParticipantInfo, Room } from 'livekit-server-sdk';

// Initialize LiveKit with environment variables
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://tawasul-safqo3pu.livekit.cloud';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

// Create a Room Service Client for API calls
let roomServiceClient: RoomServiceClient | null = null;

function getRoomServiceClient(): RoomServiceClient {
  if (!roomServiceClient) {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit API credentials are not configured');
    }
    // Extract host from WebSocket URL
    const host = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
    roomServiceClient = new RoomServiceClient(host, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return roomServiceClient;
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
  participantName?: string
): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API credentials are not configured');
  }

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
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
export async function getActiveRooms(): Promise<LiveKitRoom[]> {
  try {
    const client = getRoomServiceClient();
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
export async function getRoomParticipants(roomName: string): Promise<LiveKitParticipant[]> {
  try {
    const client = getRoomServiceClient();
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
export async function getLiveKitMetrics(): Promise<LiveKitMetrics> {
  try {
    const rooms = await getActiveRooms();
    
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
  metadata?: string
): Promise<Room> {
  try {
    const client = getRoomServiceClient();
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
export async function deleteRoom(roomName: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.deleteRoom(roomName);
  } catch (error) {
    console.error(`Error deleting room ${roomName}:`, error);
    throw error;
  }
}

/**
 * Remove a participant from a room
 */
export async function removeParticipant(roomName: string, participantIdentity: string): Promise<void> {
  try {
    const client = getRoomServiceClient();
    await client.removeParticipant(roomName, participantIdentity);
  } catch (error) {
    console.error(`Error removing participant ${participantIdentity} from room ${roomName}:`, error);
    throw error;
  }
}

/**
 * Check if LiveKit is properly configured
 */
export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

/**
 * Get LiveKit configuration status
 */
export function getLiveKitStatus(): {
  configured: boolean;
  url: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
} {
  return {
    configured: isLiveKitConfigured(),
    url: LIVEKIT_URL,
    hasApiKey: !!LIVEKIT_API_KEY,
    hasApiSecret: !!LIVEKIT_API_SECRET,
  };
}