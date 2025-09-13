import { useEffect, useRef, useState } from "react";

interface ElevenLabsConversationProps {
  agentId?: string;
  signedUrl?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  onStatusChange?: (status: string) => void;
  onModeChange?: (mode: { mode: string; isInterrupting: boolean }) => void;
  onVolumeChange?: (volume: number) => void;
}

// Note: ElevenLabs WebSocket SDK needs to be loaded from CDN
// This is a custom implementation matching their API
export function useElevenLabsConversation(props: ElevenLabsConversationProps) {
  const conversationRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState<number>(1);

  const startConversation = async (options: {
    agentId?: string;
    signedUrl?: string;
    overrides?: any;
  }) => {
    try {
      if (conversationRef.current) {
        await conversationRef.current.endSession();
      }

      // Session options
      const sessionOptions: any = {};
      
      if (options.signedUrl || props.signedUrl) {
        sessionOptions.signedUrl = options.signedUrl || props.signedUrl;
      } else if (options.agentId || props.agentId) {
        sessionOptions.agentId = options.agentId || props.agentId;
      } else {
        throw new Error("Either agentId or signedUrl is required");
      }

      if (options.overrides) {
        sessionOptions.overrides = options.overrides;
      }
      
      // Initialize ElevenLabs conversation
      // Using dynamic import or CDN script
      const ElevenLabs = (window as any).ElevenLabsClient;
      if (!ElevenLabs) {
        throw new Error("ElevenLabs SDK not loaded. Please ensure the SDK script is included.");
      }
      
      const conversation = ElevenLabs.Conversation.startSession(sessionOptions);
      conversationRef.current = conversation;

      // Set up event listeners
      conversation.on("connect", () => {
        setIsConnected(true);
        setStatus("connected");
        props.onConnect?.();
      });

      conversation.on("disconnect", () => {
        setIsConnected(false);
        setStatus("disconnected");
        props.onDisconnect?.();
      });

      conversation.on("message", (message: any) => {
        props.onMessage?.(message);
      });

      conversation.on("error", (error: any) => {
        console.error("Conversation error:", error);
        props.onError?.(error);
      });

      conversation.on("status", (status: any) => {
        setStatus(status.status);
        props.onStatusChange?.(status.status);
      });

      conversation.on("mode-change", (mode: any) => {
        setIsSpeaking(mode.mode === "speaking");
        props.onModeChange?.(mode);
      });

      conversation.on("volume", (volumeData: any) => {
        setVolume(volumeData.volume);
        props.onVolumeChange?.(volumeData.volume);
      });

      // Session options already used above
      const conversationId = conversation.getId();
      
      return conversationId;
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setIsConnected(false);
      setStatus("error");
      throw error;
    }
  };

  const endConversation = async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession();
        conversationRef.current = null;
        setIsConnected(false);
        setStatus("disconnected");
      } catch (error) {
        console.error("Failed to end conversation:", error);
      }
    }
  };

  const setConversationVolume = async (newVolume: number) => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.setVolume({ volume: newVolume });
        setVolume(newVolume);
      } catch (error) {
        console.error("Failed to set volume:", error);
      }
    }
  };

  const getInputVolume = () => {
    if (conversationRef.current) {
      return conversationRef.current.getInputVolume();
    }
    return 0;
  };

  const getOutputVolume = () => {
    if (conversationRef.current) {
      return conversationRef.current.getOutputVolume();
    }
    return 0;
  };

  const getInputByteFrequencyData = () => {
    if (conversationRef.current) {
      return conversationRef.current.getInputByteFrequencyData();
    }
    return new Uint8Array(0);
  };

  const getOutputByteFrequencyData = () => {
    if (conversationRef.current) {
      return conversationRef.current.getOutputByteFrequencyData();
    }
    return new Uint8Array(0);
  };

  const getConversationId = () => {
    if (conversationRef.current) {
      return conversationRef.current.getId();
    }
    return null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(console.error);
      }
    };
  }, []);

  return {
    startConversation,
    endConversation,
    setVolume: setConversationVolume,
    getInputVolume,
    getOutputVolume,
    getInputByteFrequencyData,
    getOutputByteFrequencyData,
    getConversationId,
    isConnected,
    status,
    isSpeaking,
    volume,
    conversation: conversationRef.current,
  };
}