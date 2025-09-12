import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Settings2 } from "lucide-react";

export default function Agents() {
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
        <Button data-testid="add-agent-button">
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
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`configure-agent-${agent.id}`}>
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
              <Button variant="outline" size="sm">Configure ElevenLabs</Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                LiveKit Integration  
              </h4>
              <p className="text-sm text-muted-foreground">
                Real-time audio streaming platform for low-latency voice interactions and group calls.
              </p>
              <Button variant="outline" size="sm">Configure LiveKit</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}