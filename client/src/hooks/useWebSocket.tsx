import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserWithoutPassword } from '@/lib/types';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  userId?: string;
}

interface LiveUpdate {
  type: 'dashboard_update' | 'call_update' | 'agent_update' | 'notification';
  userId?: string;
  data: any;
  timestamp: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  sendMessage: (message: any) => void;
  connectionStats: {
    reconnectAttempts: number;
    lastConnected: Date | null;
  };
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Get current user session for authentication
  const { data: user } = useQuery<UserWithoutPassword>({ 
    queryKey: ['/api/auth/me'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      // Use the user session ID as a simple token for now
      // In production, you'd want to use proper JWT tokens
      const token = user?.id || 'anonymous';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Replit environment, always use the current host without specifying port
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${token}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        setLastConnected(new Date());
        
        // Start heartbeat
        heartbeatTimer.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'ping' });
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear heartbeat
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
          heartbeatTimer.current = null;
        }

        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimer.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'dashboard_update':
        // Invalidate dashboard queries to trigger refresh
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        break;
        
      case 'call_update':
        // Invalidate call-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/calls'] });
        break;
        
      case 'agent_update':
        // Invalidate agent-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
        break;
        
      case 'notification':
        // Handle notifications - could integrate with a toast system
        if (message.data.title && message.data.message) {
          console.log('Notification:', message.data.title, message.data.message);
          // You could integrate this with your toast/notification system
        }
        break;
        
      case 'connected':
        console.log('WebSocket authenticated:', message.data);
        break;
        
      case 'subscribed':
        console.log('Subscribed to channel:', message.data.channel);
        break;
        
      case 'unsubscribed':
        console.log('Unsubscribed from channel:', message.data.channel);
        break;
        
      case 'pong':
        // Heartbeat response
        break;
        
      case 'error':
        console.error('WebSocket error:', message.data);
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    sendMessage({ type: 'subscribe', channel });
  }, [sendMessage]);

  const unsubscribe = useCallback((channel: string) => {
    sendMessage({ type: 'unsubscribe', channel });
  }, [sendMessage]);

  // Connect when user is available
  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmount');
      }
    };
  }, [user?.id]);

  const contextValue: WebSocketContextType = {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    sendMessage,
    connectionStats: {
      reconnectAttempts,
      lastConnected,
    },
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Specialized hooks for different types of real-time updates
export const useDashboardRealTime = () => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe('dashboard');
      return () => unsubscribe('dashboard');
    }
  }, [isConnected, subscribe, unsubscribe]);

  return { isConnected };
};

export const useCallsRealTime = () => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe('calls');
      return () => unsubscribe('calls');
    }
  }, [isConnected, subscribe, unsubscribe]);

  return { isConnected };
};

export const useAgentsRealTime = () => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected) {
      subscribe('agents');
      return () => unsubscribe('agents');
    }
  }, [isConnected, subscribe, unsubscribe]);

  return { isConnected };
};

export const useNotifications = () => {
  const { subscribe, unsubscribe, isConnected, lastMessage } = useWebSocket();
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
    actions?: Array<{ label: string; action: string; }>;
  }>>([]);

  useEffect(() => {
    if (isConnected) {
      subscribe('notifications');
      return () => unsubscribe('notifications');
    }
  }, [isConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      const notification = {
        id: Date.now().toString(),
        ...lastMessage.data,
        timestamp: lastMessage.timestamp || Date.now(),
      };
      setNotifications(prev => [...prev, notification]);
    }
  }, [lastMessage]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    removeNotification,
    isConnected,
  };
};