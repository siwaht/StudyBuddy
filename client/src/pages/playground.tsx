import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Activity, Clock, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
  platform: string;
  externalId?: string;
  metadata?: any;
  isActive: boolean;
}

interface TranscriptEntry {
  speaker: 'agent' | 'user';
  text: string;
  timestamp: string;
}

export default function Playground() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOutputMuted, setIsOutputMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>("disconnected");
  const [latency, setLatency] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch available agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  // Filter only ElevenLabs agents for playground
  const elevenLabsAgents = agents.filter(agent => agent.platform === 'elevenlabs' && agent.isActive);

  // Start playground session mutation
  const startSessionMutation = useMutation({
    mutationFn: async ({ agentId }: { agentId: string }) => {
      const response = await apiRequest("POST", "/api/playground/start", {
        agentId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      currentSessionIdRef.current = data.sessionId;
      connectToAgent(data.signedUrl || data.agentId);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start playground session",
        variant: "destructive",
      });
      setSessionStatus("error");
    },
  });

  // End playground session mutation
  const endSessionMutation = useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const response = await apiRequest("DELETE", `/api/playground/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Ended",
        description: "Playground session ended successfully",
      });
    },
  });

  const connectToAgent = async (signedUrlOrAgentId: string) => {
    try {
      setSessionStatus("connecting");
      
      // Check if ElevenLabs API is configured first
      const apiKeyResponse = await fetch('/api/elevenlabs/agents');
      if (!apiKeyResponse.ok) {
        // API not configured, show error
        setSessionStatus("error");
        toast({
          title: "Configuration Required",
          description: "Please configure your ElevenLabs API key to use the playground. Add ELEVENLABS_API_KEY to your environment variables.",
          variant: "destructive",
        });
        
        // Add message to transcript
        const entry: TranscriptEntry = {
          speaker: 'agent',
          text: 'ElevenLabs API key not configured. Please add your API key to enable the playground.',
          timestamp: new Date().toLocaleTimeString(),
        };
        setTranscript([entry]);
        
        return;
      }
      
      // Request microphone permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      } catch (micError) {
        console.error('Microphone access denied:', micError);
        toast({
          title: "Microphone Required",
          description: "Please allow microphone access to test the agent",
          variant: "destructive",
        });
        setSessionStatus("error");
        return;
      }
      
      // Create audio context
      audioContextRef.current = new AudioContext();
      
      // For now, show a message that direct WebSocket connection is not yet implemented
      // This would require either:
      // 1. A signed URL from the backend (for private agents)
      // 2. Or using the ElevenLabs JavaScript SDK with proper authentication
      
      setSessionStatus("error");
      toast({
        title: "Coming Soon",
        description: "Direct agent testing is being implemented. Please use the ElevenLabs platform directly for now.",
        variant: "default",
      });
      
      // Add message to transcript
      const entry: TranscriptEntry = {
        speaker: 'agent',
        text: 'The playground WebSocket connection is being implemented. You can test your agents directly on the ElevenLabs platform.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setTranscript([entry]);
      
      return;
      // Future implementation: Connect via WebSocket with proper authentication
      // This would require implementing signed URL generation in the backend
      // or using the ElevenLabs JavaScript SDK with authentication
      
      
    } catch (error: any) {
      console.error("Error connecting to agent:", error);
      setSessionStatus("error");
      toast({
        title: "Error",
        description: error.message || "Failed to connect to agent",
        variant: "destructive",
      });
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'transcript':
        // Add transcript entry
        const entry: TranscriptEntry = {
          speaker: data.role === 'assistant' ? 'agent' : 'user',
          text: data.text,
          timestamp: new Date().toLocaleTimeString(),
        };
        setTranscript(prev => [...prev, entry]);
        break;
      
      case 'latency':
        setLatency(data.value);
        break;
      
      case 'audio':
        // Handle audio playback
        if (!isOutputMuted && audioContextRef.current) {
          playAudioChunk(data.audio);
        }
        break;
      
      case 'status':
        setSessionStatus(data.status);
        break;
    }
  };

  const playAudioChunk = async (audioData: string) => {
    if (!audioContextRef.current) return;
    
    try {
      // Decode base64 audio data
      const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      const decodedAudio = await audioContextRef.current.decodeAudioData(audioBuffer.buffer);
      
      // Create and play audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const handleStartSession = () => {
    if (!selectedAgentId) {
      toast({
        title: "Error",
        description: "Please select an agent first",
        variant: "destructive",
      });
      return;
    }
    
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return;
    
    startSessionMutation.mutate({ agentId: agent.id });
  };

  const handleEndSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    // End session in backend if we have a session ID
    if (currentSessionIdRef.current) {
      endSessionMutation.mutate({ sessionId: currentSessionIdRef.current });
      currentSessionIdRef.current = null;
    }
    
    setIsConnected(false);
    setSessionStatus("disconnected");
    setTranscript([]);
    setLatency(null);
    setDuration(0);
    sessionStartTimeRef.current = null;
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleOutputMute = () => {
    setIsOutputMuted(!isOutputMuted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Auto-scroll transcript
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      handleEndSession();
    };
  }, []);

  return (
    <div className="space-y-6 p-6 animate-fadeIn" data-testid="playground-page">
      <div className="flex items-center justify-between animate-slideInLeft">
        <div>
          <h1 className="text-2xl font-bold">Agent Playground</h1>
          <p className="text-muted-foreground">Test your AI voice agents in real-time</p>
        </div>
        {isConnected && (
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
            {latency !== null && (
              <Badge variant="outline" className="flex items-center gap-2">
                <Activity className="h-3 w-3" />
                {latency}ms
              </Badge>
            )}
            <Badge className={sessionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}>
              {sessionStatus}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Selection & Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={isConnected}
              >
                <SelectTrigger data-testid="select-agent">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {elevenLabsAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAgentId && !isConnected && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> ElevenLabs API key required.
                    <br />
                    Test your agents on <a href="https://elevenlabs.io" target="__blank" rel="noopener noreferrer" className="underline">ElevenLabs platform</a> for now.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {!isConnected ? (
                  <Button 
                    className="flex-1"
                    onClick={handleStartSession}
                    disabled={!selectedAgentId || startSessionMutation.isPending}
                    data-testid="start-session"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {startSessionMutation.isPending ? "Connecting..." : "Start Session"}
                  </Button>
                ) : (
                  <Button 
                    className="flex-1"
                    variant="destructive"
                    onClick={handleEndSession}
                    data-testid="end-session"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                )}
              </div>

              {isConnected && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={toggleMute}
                    data-testid="toggle-mute"
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Mute
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={toggleOutputMute}
                    data-testid="toggle-output"
                  >
                    {isOutputMuted ? (
                      <>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Enable Audio
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Disable Audio
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Info */}
          {selectedAgentId && (
            <Card>
              <CardHeader>
                <CardTitle>Agent Info</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const agent = agents.find(a => a.id === selectedAgentId);
                  if (!agent) return null;
                  
                  return (
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {agent.name}</p>
                      <p><span className="font-medium">Platform:</span> ElevenLabs</p>
                      {agent.metadata?.voice?.name && (
                        <p><span className="font-medium">Voice:</span> {agent.metadata.voice.name}</p>
                      )}
                      {agent.metadata?.language && (
                        <p><span className="font-medium">Language:</span> {agent.metadata.language}</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Transcript */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversation Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {transcript.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isConnected ? "Start speaking to see the transcript..." : "No conversation yet"}
                </div>
              ) : (
                <div className="space-y-4">
                  {transcript.map((entry, index) => (
                    <div key={index} className="flex gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        entry.speaker === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {entry.speaker === 'agent' ? 'A' : 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {entry.speaker === 'agent' ? 'Agent' : 'You'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="text-sm">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>How to Use the Playground</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Select an agent from the dropdown menu</li>
              <li>Click "Start Session" to connect to the agent</li>
              <li>Allow microphone access when prompted</li>
              <li>Start speaking - the agent will respond in real-time</li>
              <li>View the conversation transcript on the right</li>
              <li>Use the mute buttons to control audio input/output</li>
              <li>Click "End Session" when you're done testing</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}