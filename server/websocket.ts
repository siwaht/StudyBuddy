import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
// JWT verification would be implemented here in production
import type { Server } from 'http';
import { storage } from './storage';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string;
  data?: any;
}

interface LiveUpdate {
  type: 'dashboard_update' | 'call_update' | 'agent_update' | 'notification';
  userId?: string;
  data: any;
  timestamp: number;
}

class WebSocketService {
  private wss?: WebSocketServer;
  private clients = new Map<string, Set<AuthenticatedWebSocket>>();
  private channels = new Map<string, Set<AuthenticatedWebSocket>>();
  private heartbeatInterval?: NodeJS.Timeout;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: false
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Setup heartbeat to detect disconnected clients
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 30000); // Every 30 seconds

    console.log('WebSocket server initialized on /ws');
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage): Promise<void> {
    const url = parse(request.url || '', true);
    const token = url.query.token as string;

    try {
      // Authenticate the WebSocket connection
      const userId = await this.authenticateConnection(token);
      if (!userId) {
        ws.close(1008, 'Authentication failed');
        return;
      }

      // Get user details for role-based access
      const user = await storage.getUser(userId);
      if (!user) {
        ws.close(1008, 'User not found');
        return;
      }

      ws.userId = userId;
      ws.userRole = user.role;
      ws.isAlive = true;

      // Add to user's connections
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(ws);

      console.log(`WebSocket connected for user: ${userId} (role: ${user.role})`);

      // Setup message handling
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        data: { userId, role: user.role }
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Server error');
    }
  }

  private async authenticateConnection(token: string): Promise<string | null> {
    if (!token) return null;

    try {
      // For this implementation, we'll treat the token as the user ID
      // and validate that the user exists in the database
      const user = await storage.getUser(token);
      if (user && user.isActive) {
        return user.id; // Return user ID if valid
      }
      return null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message.channel || '');
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.channel || '');
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong' });
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private handleSubscribe(ws: AuthenticatedWebSocket, channel: string): void {
    if (!ws.userId) return;

    // Validate user has access to this channel
    if (!this.validateChannelAccess(ws, channel)) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Access denied to channel: ' + channel }
      });
      return;
    }

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws);

    this.sendToClient(ws, {
      type: 'subscribed',
      data: { channel }
    });

    console.log(`User ${ws.userId} subscribed to channel: ${channel}`);
  }

  private handleUnsubscribe(ws: AuthenticatedWebSocket, channel: string): void {
    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.delete(ws);
      if (channelClients.size === 0) {
        this.channels.delete(channel);
      }
    }

    this.sendToClient(ws, {
      type: 'unsubscribed',
      data: { channel }
    });
  }

  private validateChannelAccess(ws: AuthenticatedWebSocket, channel: string): boolean {
    if (!ws.userId || !ws.userRole) return false;

    // Define access control rules for different channels
    const channelRules: Record<string, string[]> = {
      'dashboard': ['admin', 'supervisor', 'analyst', 'viewer'],
      'calls': ['admin', 'supervisor', 'analyst', 'viewer'],
      'agents': ['admin', 'supervisor', 'analyst'],
      'admin': ['admin'],
      'supervisor': ['admin', 'supervisor'],
      'analytics': ['admin', 'supervisor', 'analyst'],
      'notifications': ['admin', 'supervisor', 'analyst', 'viewer']
    };

    // Extract base channel name (remove user-specific suffixes)
    const baseChannel = channel.split(':')[0];
    const allowedRoles = channelRules[baseChannel] || [];
    
    return allowedRoles.includes(ws.userRole);
  }

  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      // Remove from user connections
      const userConnections = this.clients.get(ws.userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          this.clients.delete(ws.userId);
        }
      }

      // Remove from all channels
      this.channels.forEach((clients, channel) => {
        clients.delete(ws);
        if (clients.size === 0) {
          this.channels.delete(channel);
        }
      });

      console.log(`WebSocket disconnected for user: ${ws.userId}`);
    }
  }

  private heartbeat(): void {
    this.clients.forEach((connections, userId) => {
      connections.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          this.handleDisconnection(ws);
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    });
  }

  private sendToClient(ws: AuthenticatedWebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Public methods for broadcasting updates
  public broadcastToUser(userId: string, update: LiveUpdate): void {
    const userConnections = this.clients.get(userId);
    if (userConnections) {
      userConnections.forEach(ws => {
        this.sendToClient(ws, update);
      });
    }
  }

  public broadcastToChannel(channel: string, update: LiveUpdate): void {
    const channelClients = this.channels.get(channel);
    if (channelClients) {
      channelClients.forEach(ws => {
        this.sendToClient(ws, update);
      });
    }
  }

  public broadcastToRole(role: string, update: LiveUpdate): void {
    this.clients.forEach((connections, userId) => {
      connections.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.userRole === role) {
          this.sendToClient(ws, update);
        }
      });
    });
  }

  public getConnectionStats(): {
    totalConnections: number;
    userCount: number;
    channelCount: number;
    channels: Record<string, number>;
  } {
    const channels: Record<string, number> = {};
    Array.from(this.channels.entries()).forEach(([channel, clients]) => {
      channels[channel] = clients.size;
    });

    return {
      totalConnections: Array.from(this.clients.values()).reduce((sum, connections) => sum + connections.size, 0),
      userCount: this.clients.size,
      channelCount: this.channels.size,
      channels
    };
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    // Close all client connections
    Array.from(this.clients.values()).forEach((connections) => {
      connections.forEach((ws: AuthenticatedWebSocket) => ws.close());
    });

    this.clients.clear();
    this.channels.clear();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Helper functions for triggering real-time updates
export const triggerDashboardUpdate = async (userId: string, data: any) => {
  websocketService.broadcastToUser(userId, {
    type: 'dashboard_update',
    userId,
    data,
    timestamp: Date.now()
  });
};

export const triggerCallUpdate = async (callId: string, agentId: string, data: any) => {
  // Broadcast to users who have access to this agent
  const assignments = await getUsersWithAgentAccess(agentId);
  assignments.forEach((userId: string) => {
    websocketService.broadcastToUser(userId, {
      type: 'call_update',
      data: { callId, agentId, ...data },
      timestamp: Date.now()
    });
  });
  
  // Also broadcast to calls channel
  websocketService.broadcastToChannel('calls', {
    type: 'call_update',
    data: { callId, agentId, ...data },
    timestamp: Date.now()
  });
};

// Helper function to get users with access to an agent
const getUsersWithAgentAccess = async (agentId: string): Promise<string[]> => {
  try {
    // Get all user-agent assignments and filter for this agent
    const allAssignments = await storage.getAllUserAgentAssignments();
    const usersWithAccess: string[] = [];
    
    allAssignments.forEach((assignment, userId) => {
      if (assignment.agents.some((agent: any) => agent.id === agentId)) {
        usersWithAccess.push(userId);
      }
    });
    
    return usersWithAccess;
  } catch (error) {
    console.error('Error getting users with agent access:', error);
    return [];
  }
};

export const triggerAgentUpdate = async (agentId: string, data: any) => {
  // Broadcast to users who have access to this agent
  const assignments = await getUsersWithAgentAccess(agentId);
  assignments.forEach((userId: string) => {
    websocketService.broadcastToUser(userId, {
      type: 'agent_update',
      data: { agentId, ...data },
      timestamp: Date.now()
    });
  });
  
  // Also broadcast to agents channel
  websocketService.broadcastToChannel('agents', {
    type: 'agent_update',
    data: { agentId, ...data },
    timestamp: Date.now()
  });
};

export const triggerNotification = async (userId: string, notification: {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actions?: Array<{ label: string; action: string; }>;
}) => {
  websocketService.broadcastToUser(userId, {
    type: 'notification',
    userId,
    data: notification,
    timestamp: Date.now()
  });
};