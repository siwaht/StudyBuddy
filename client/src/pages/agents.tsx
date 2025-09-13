import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Settings2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function Agents() {
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isConfigureAgentOpen, setIsConfigureAgentOpen] = useState(false);
  const [isElevenLabsOpen, setIsElevenLabsOpen] = useState(false);
  const [isLiveKitOpen, setIsLiveKitOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [newAgent, setNewAgent] = useState({
    name: "",
    platform: "ElevenLabs",
    voice: "",
  });
  const { toast } = useToast();
  
  const mockAgents = [
    {
      id: 1,
      name: "Customer Support Agent",
      platform: "ElevenLabs",
      voice: "Rachel",
      status: "active",
      totalCalls: 1247,
      successRate: 94
    },
    {
      id: 2, 
      name: "Sales Assistant",
      platform: "LiveKit",
      voice: "Adam",
      status: "active",
      totalCalls: 892,
      successRate: 88
    },
    {
      id: 3,
      name: "Technical Support",
      platform: "ElevenLabs", 
      voice: "Domi",
      status: "inactive",
      totalCalls: 456,
      successRate: 91
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    return <Bot className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 p-6" data-testid="agents-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Configuration</h1>
          <p className="text-muted-foreground">Manage your AI voice agents and their settings</p>
        </div>
        <Button 
          data-testid="add-agent-button"
          onClick={() => setIsAddAgentOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAgents.map((agent) => (
          <Card key={agent.id} data-testid={`agent-card-${agent.id}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getPlatformIcon(agent.platform)}
                {agent.name}
              </CardTitle>
              <Badge className={getStatusColor(agent.status)}>
                {agent.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p><span className="font-medium">Platform:</span> {agent.platform}</p>
                  <p><span className="font-medium">Voice:</span> {agent.voice}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Calls</p>
                    <p className="font-semibold">{agent.totalCalls.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="font-semibold">{agent.successRate}%</p>
                  </div>
                </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                ElevenLabs Integration
              </h4>
              <p className="text-sm text-muted-foreground">
                High-quality AI voice synthesis with natural conversation flow and emotion recognition.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsElevenLabsOpen(true)}
                data-testid="button-configure-elevenlabs"
              >
                Configure ElevenLabs
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                LiveKit Integration  
              </h4>
              <p className="text-sm text-muted-foreground">
                Real-time audio streaming platform for low-latency voice interactions and group calls.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsLiveKitOpen(true)}
                data-testid="button-configure-livekit"
              >
                Configure LiveKit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Agent Dialog */}
      <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Configure a new AI voice agent for your system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent-name" className="text-right">
                Name
              </Label>
              <Input
                id="agent-name"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                className="col-span-3"
                placeholder="Customer Support Agent"
                data-testid="input-agent-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="platform" className="text-right">
                Platform
              </Label>
              <Select
                value={newAgent.platform}
                onValueChange={(value) => setNewAgent({ ...newAgent, platform: value })}
              >
                <SelectTrigger className="col-span-3" data-testid="select-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                  <SelectItem value="LiveKit">LiveKit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voice" className="text-right">
                Voice
              </Label>
              <Input
                id="voice"
                value={newAgent.voice}
                onChange={(e) => setNewAgent({ ...newAgent, voice: e.target.value })}
                className="col-span-3"
                placeholder="Rachel"
                data-testid="input-voice"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddAgentOpen(false);
                setNewAgent({ name: "", platform: "ElevenLabs", voice: "" });
              }}
              data-testid="button-cancel-agent"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newAgent.name || !newAgent.voice) {
                  toast({
                    title: "Error",
                    description: "Please fill in all required fields",
                    variant: "destructive",
                  });
                  return;
                }
                
                toast({
                  title: "Agent Added",
                  description: `Agent ${newAgent.name} has been successfully created`,
                });
                
                setIsAddAgentOpen(false);
                setNewAgent({ name: "", platform: "ElevenLabs", voice: "" });
              }}
              data-testid="button-save-agent"
            >
              Add Agent
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
              <Select defaultValue={selectedAgent?.status}>
                <SelectTrigger className="col-span-3" data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="config-voice" className="text-right">
                Voice
              </Label>
              <Input
                id="config-voice"
                defaultValue={selectedAgent?.voice}
                className="col-span-3"
                data-testid="input-config-voice"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfigureAgentOpen(false);
                setSelectedAgent(null);
              }}
              data-testid="button-cancel-config"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Agent Updated",
                  description: `Settings for ${selectedAgent?.name} have been saved`,
                });
                setIsConfigureAgentOpen(false);
                setSelectedAgent(null);
              }}
              data-testid="button-save-config"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ElevenLabs Configuration Dialog */}
      <Dialog open={isElevenLabsOpen} onOpenChange={setIsElevenLabsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure ElevenLabs Integration</DialogTitle>
            <DialogDescription>
              Set up your ElevenLabs API connection for AI voice synthesis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="elevenlabs-api" className="text-right">
                API Key
              </Label>
              <Input
                id="elevenlabs-api"
                type="password"
                className="col-span-3"
                placeholder="Enter your ElevenLabs API key"
                data-testid="input-elevenlabs-api"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="elevenlabs-model" className="text-right">
                Model
              </Label>
              <Select defaultValue="eleven_multilingual_v2">
                <SelectTrigger className="col-span-3" data-testid="select-elevenlabs-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eleven_multilingual_v2">Multilingual v2</SelectItem>
                  <SelectItem value="eleven_monolingual_v1">Monolingual v1</SelectItem>
                  <SelectItem value="eleven_turbo_v2">Turbo v2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsElevenLabsOpen(false)}
              data-testid="button-cancel-elevenlabs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "ElevenLabs Configured",
                  description: "Your ElevenLabs integration has been set up successfully",
                });
                setIsElevenLabsOpen(false);
              }}
              data-testid="button-save-elevenlabs"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* LiveKit Configuration Dialog */}
      <Dialog open={isLiveKitOpen} onOpenChange={setIsLiveKitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure LiveKit Integration</DialogTitle>
            <DialogDescription>
              Set up your LiveKit connection for real-time audio streaming.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="livekit-url" className="text-right">
                Server URL
              </Label>
              <Input
                id="livekit-url"
                className="col-span-3"
                placeholder="wss://your-livekit-server.com"
                data-testid="input-livekit-url"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="livekit-api" className="text-right">
                API Key
              </Label>
              <Input
                id="livekit-api"
                className="col-span-3"
                placeholder="Enter your LiveKit API key"
                data-testid="input-livekit-api"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="livekit-secret" className="text-right">
                API Secret
              </Label>
              <Input
                id="livekit-secret"
                type="password"
                className="col-span-3"
                placeholder="Enter your LiveKit API secret"
                data-testid="input-livekit-secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLiveKitOpen(false)}
              data-testid="button-cancel-livekit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "LiveKit Configured",
                  description: "Your LiveKit integration has been set up successfully",
                });
                setIsLiveKitOpen(false);
              }}
              data-testid="button-save-livekit"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}