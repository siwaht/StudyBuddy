import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Key, Check, X, AlertCircle, Calendar, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Integration {
  service: string;
  isActive: boolean;
  lastUsed: string | null;
  updatedAt: string | null;
  hasKey: boolean;
}

export default function Integrations() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ service, apiKey }: { service: string; apiKey: string }) => {
      const response = await apiRequest("PUT", `/api/integrations/${service}`, { apiKey });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: `API key for ${variables.service} has been updated successfully.`,
      });
      setIsUpdateDialogOpen(false);
      setApiKey("");
      setSelectedService(null);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (service: string) => {
      const response = await apiRequest("DELETE", `/api/integrations/${service}`);
      return response.json();
    },
    onSuccess: (data, service) => {
      toast({
        title: "Success",
        description: `API key for ${service} has been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const handleUpdateKey = (service: string) => {
    setSelectedService(service);
    setApiKey("");
    setIsUpdateDialogOpen(true);
  };

  const handleSubmitKey = () => {
    if (!selectedService || !apiKey.trim()) return;
    updateApiKeyMutation.mutate({ service: selectedService, apiKey });
  };

  const getServiceInfo = (service: string) => {
    const info: Record<string, { name: string; description: string; docsUrl: string }> = {
      elevenlabs: {
        name: "ElevenLabs",
        description: "High-quality AI voice synthesis and conversational AI agents",
        docsUrl: "https://elevenlabs.io/docs/api-reference",
      },
      livekit: {
        name: "LiveKit",
        description: "Real-time audio and video streaming infrastructure",
        docsUrl: "https://docs.livekit.io",
      },
      openai: {
        name: "OpenAI",
        description: "Advanced language models and AI capabilities",
        docsUrl: "https://platform.openai.com/docs",
      },
    };
    return info[service] || { name: service, description: "", docsUrl: "" };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="integrations-page">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Manage API keys and configurations for external services
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API keys are encrypted and stored securely. Only administrators can manage integrations.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {integrations?.map((integration) => {
          const info = getServiceInfo(integration.service);
          return (
            <Card key={integration.service} data-testid={`integration-card-${integration.service}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-lg">{info.name}</CardTitle>
                    {integration.hasKey ? (
                      integration.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline">
                        <X className="h-3 w-3 mr-1" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {integration.hasKey && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteApiKeyMutation.mutate(integration.service)}
                        data-testid={`button-remove-${integration.service}`}
                      >
                        Remove
                      </Button>
                    )}
                    <Button
                      variant={integration.hasKey ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleUpdateKey(integration.service)}
                      data-testid={`button-configure-${integration.service}`}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {integration.hasKey ? "Update Key" : "Add Key"}
                    </Button>
                  </div>
                </div>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Last Updated:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(integration.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span>Last Used:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(integration.lastUsed)}
                    </span>
                  </div>
                </div>
                {info.docsUrl && (
                  <div className="mt-4">
                    <a
                      href={info.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View API Documentation →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedService && 
                `${integrations?.find(i => i.service === selectedService)?.hasKey ? 'Update' : 'Add'} ${getServiceInfo(selectedService).name} API Key`
              }
            </DialogTitle>
            <DialogDescription>
              Enter your API key below. It will be encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-api-key"
              />
            </div>
            {selectedService === 'elevenlabs' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can find your ElevenLabs API key in your{" "}
                  <a
                    href="https://elevenlabs.io/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ElevenLabs dashboard
                  </a>
                  .
                </AlertDescription>
              </Alert>
            )}
            {selectedService === 'livekit' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need both an API key and secret for LiveKit. Enter them as "key:secret".
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUpdateDialogOpen(false);
                setApiKey("");
                setSelectedService(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitKey}
              disabled={!apiKey.trim() || updateApiKeyMutation.isPending}
              data-testid="button-save-api-key"
            >
              {updateApiKeyMutation.isPending ? "Saving..." : "Save Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}