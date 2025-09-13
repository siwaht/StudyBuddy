import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Bot, Settings2, Search, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Agent {
  id: string;
  name: string;
  platform: string;
  externalId?: string;
  description?: string;
  metadata?: any;
  isActive: boolean;
  createdAt: string;
}

export default function Agents() {
  const [isImportAgentOpen, setIsImportAgentOpen] = useState(false);
  const [isConfigureAgentOpen, setIsConfigureAgentOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [importForm, setImportForm] = useState({
    platform: "elevenlabs",
    agentId: "",
  });
  const [searchedAgent, setSearchedAgent] = useState<any>(null);
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const searchAgentMutation = useMutation({
    mutationFn: async ({ agentId, platform }: { agentId: string; platform: string }) => {
      const response = await apiRequest("GET", `/api/agents/search/${agentId}?platform=${platform}`);
      return response.json();
    },
    onSuccess: (data) => {
      setSearchedAgent(data);
      toast({
        title: "Agent Found",
        description: `Found agent: ${data.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to find agent",
        variant: "destructive",
      });
      setSearchedAgent(null);
    },
  });

  const importAgentMutation = useMutation({
    mutationFn: async ({ agentId, platform }: { agentId: string; platform: string }) => {
      const response = await apiRequest("POST", "/api/agents/import", { agentId, platform });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agent imported successfully",
      });
      setIsImportAgentOpen(false);
      setImportForm({ platform: "elevenlabs", agentId: "" });
      setSearchedAgent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import agent",
        variant: "destructive",
      });
    },
  });

  const toggleAgentStatusMutation = useMutation({
    mutationFn: async ({ agentId, isActive }: { agentId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/agents/${agentId}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agent status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update agent status",
        variant: "destructive",
      });
    },
  });

  const handleSearchAgent = () => {
    if (!importForm.agentId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an agent ID",
        variant: "destructive",
      });
      return;
    }
    searchAgentMutation.mutate(importForm);
  };

  const handleImportAgent = () => {
    if (!searchedAgent) return;
    importAgentMutation.mutate(importForm);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getPlatformIcon = (platform: string) => {
    return <Bot className="h-4 w-4" />;
  };

  const formatPlatformName = (platform: string) => {
    switch (platform) {
      case 'elevenlabs':
        return 'ElevenLabs';
      case 'livekit':
        return 'LiveKit';
      default:
        return platform;
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="agents-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Configuration</h1>
          <p className="text-muted-foreground">Manage your AI voice agents and their settings</p>
        </div>
        <Button 
          data-testid="import-agent-button"
          onClick={() => setIsImportAgentOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Import Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No agents imported yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Import your first agent from ElevenLabs or LiveKit to get started
            </p>
            <Button onClick={() => setIsImportAgentOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} data-testid={`agent-card-${agent.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getPlatformIcon(agent.platform)}
                  {agent.name}
                </CardTitle>
                <Badge className={getStatusColor(agent.isActive)}>
                  {agent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Platform:</span> {formatPlatformName(agent.platform)}</p>
                    {agent.externalId && (
                      <p className="font-mono text-xs text-muted-foreground">ID: {agent.externalId}</p>
                    )}
                    {agent.metadata?.voice?.name && (
                      <p><span className="font-medium">Voice:</span> {agent.metadata.voice.name}</p>
                    )}
                    {agent.metadata?.language && (
                      <p><span className="font-medium">Language:</span> {agent.metadata.language}</p>
                    )}
                  </div>
                  
                  {agent.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      data-testid={`configure-agent-${agent.id}`}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setIsConfigureAgentOpen(true);
                      }}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                ElevenLabs Agents
              </h4>
              <p className="text-sm text-muted-foreground">
                Import conversational AI agents from ElevenLabs with advanced voice synthesis and natural conversation flow.
              </p>
              <p className="text-xs text-muted-foreground">
                Requires ElevenLabs API key configured in Integrations
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                LiveKit Agents
              </h4>
              <p className="text-sm text-muted-foreground">
                Connect real-time audio streaming agents from LiveKit for low-latency voice interactions.
              </p>
              <p className="text-xs text-muted-foreground">
                Requires LiveKit API key configured in Integrations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Import Agent Dialog */}
      <Dialog open={isImportAgentOpen} onOpenChange={(open) => {
        setIsImportAgentOpen(open);
        if (!open) {
          setSearchedAgent(null);
          setImportForm({ platform: "elevenlabs", agentId: "" });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Agent</DialogTitle>
            <DialogDescription>
              Import an existing AI voice agent from ElevenLabs or LiveKit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="platform" className="text-right">
                Platform
              </Label>
              <Select
                value={importForm.platform}
                onValueChange={(value) => {
                  setImportForm({ ...importForm, platform: value });
                  setSearchedAgent(null);
                }}
              >
                <SelectTrigger className="col-span-3" data-testid="select-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="livekit" disabled>LiveKit (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-id" className="text-right">
                Agent ID
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="agent-id"
                  value={importForm.agentId}
                  onChange={(e) => {
                    setImportForm({ ...importForm, agentId: e.target.value });
                    setSearchedAgent(null);
                  }}
                  placeholder={importForm.platform === 'elevenlabs' ? "Enter ElevenLabs agent ID" : "Enter agent ID"}
                  data-testid="input-agent-id"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchAgent}
                  disabled={!importForm.agentId.trim() || searchAgentMutation.isPending}
                  data-testid="button-search-agent"
                >
                  {searchAgentMutation.isPending ? (
                    "Searching..."
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {importForm.platform === 'elevenlabs' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can find your agent ID in the ElevenLabs dashboard under Conversational AI → Agents
                </AlertDescription>
              </Alert>
            )}
            
            {searchedAgent && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-semibold">Agent Details</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-right text-muted-foreground">Name:</span>
                      <span className="col-span-3 font-medium">{searchedAgent.name}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-right text-muted-foreground">Platform:</span>
                      <span className="col-span-3">{formatPlatformName(searchedAgent.platform)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-right text-muted-foreground">External ID:</span>
                      <span className="col-span-3 font-mono text-xs">{searchedAgent.externalId}</span>
                    </div>
                    {searchedAgent.description && (
                      <div className="grid grid-cols-4 gap-4">
                        <span className="text-right text-muted-foreground">Description:</span>
                        <span className="col-span-3">{searchedAgent.description}</span>
                      </div>
                    )}
                    {searchedAgent.metadata?.voice?.name && (
                      <div className="grid grid-cols-4 gap-4">
                        <span className="text-right text-muted-foreground">Voice:</span>
                        <span className="col-span-3">{searchedAgent.metadata.voice.name}</span>
                      </div>
                    )}
                    {searchedAgent.metadata?.language && (
                      <div className="grid grid-cols-4 gap-4">
                        <span className="text-right text-muted-foreground">Language:</span>
                        <span className="col-span-3">{searchedAgent.metadata.language}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportAgentOpen(false);
                setImportForm({ platform: "elevenlabs", agentId: "" });
                setSearchedAgent(null);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportAgent}
              disabled={!searchedAgent || importAgentMutation.isPending}
              data-testid="button-import-agent"
            >
              {importAgentMutation.isPending ? "Importing..." : "Import Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Configure Agent Dialog */}
      <Dialog open={isConfigureAgentOpen} onOpenChange={setIsConfigureAgentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Agent</DialogTitle>
            <DialogDescription>
              Update settings for {selectedAgent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="config-status" className="text-right">
                Status
              </Label>
              <Select 
                value={selectedAgent?.isActive ? "active" : "inactive"}
                onValueChange={(value) => {
                  if (selectedAgent) {
                    toggleAgentStatusMutation.mutate({
                      agentId: selectedAgent.id,
                      isActive: value === "active",
                    });
                  }
                }}
              >
                <SelectTrigger className="col-span-3" data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-right text-muted-foreground text-sm">Platform:</span>
              <span className="col-span-3 text-sm">{selectedAgent && formatPlatformName(selectedAgent.platform)}</span>
            </div>
            {selectedAgent?.externalId && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-right text-muted-foreground text-sm">External ID:</span>
                <span className="col-span-3 font-mono text-xs">{selectedAgent.externalId}</span>
              </div>
            )}
            {selectedAgent?.metadata?.voice?.name && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-right text-muted-foreground text-sm">Voice:</span>
                <span className="col-span-3 text-sm">{selectedAgent.metadata.voice.name}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfigureAgentOpen(false);
                setSelectedAgent(null);
              }}
              data-testid="button-close-config"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}