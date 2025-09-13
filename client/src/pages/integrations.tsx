import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Key, Check, X, AlertCircle, Calendar, Activity, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Account {
  id: string;
  name: string;
  service: 'elevenlabs' | 'livekit';
  isActive: boolean;
  lastSynced: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  hasKey: boolean;
}

export default function Integrations() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState("");
  const [selectedService, setSelectedService] = useState<'elevenlabs' | 'livekit' | ''>("");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const createAccountMutation = useMutation({
    mutationFn: async ({ name, service, apiKey }: { name: string; service: string; apiKey: string }) => {
      const response = await apiRequest("POST", `/api/accounts`, { name, service, apiKey });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Account "${data.account.name}" has been created successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, name, apiKey, isActive }: { id: string; name?: string; apiKey?: string; isActive?: boolean }) => {
      const response = await apiRequest("PUT", `/api/accounts/${id}`, { name, apiKey, isActive });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account has been updated successfully.",
      });
      setIsUpdateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/accounts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAccountName("");
    setSelectedService("");
    setApiKey("");
    setIsActive(true);
    setSelectedAccount(null);
  };

  const handleCreateAccount = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleUpdateAccount = (account: Account) => {
    setSelectedAccount(account);
    setAccountName(account.name);
    setApiKey("");
    setIsActive(account.isActive);
    setIsUpdateDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    if (!accountName.trim() || !selectedService || !apiKey.trim()) return;
    createAccountMutation.mutate({ name: accountName, service: selectedService, apiKey });
  };

  const handleSubmitUpdate = () => {
    if (!selectedAccount) return;
    const updates: any = { id: selectedAccount.id };
    
    if (accountName && accountName !== selectedAccount.name) {
      updates.name = accountName;
    }
    if (apiKey.trim()) {
      updates.apiKey = apiKey;
    }
    if (isActive !== selectedAccount.isActive) {
      updates.isActive = isActive;
    }
    
    updateAccountMutation.mutate(updates);
  };

  const getServiceInfo = (service: string) => {
    const info: Record<string, { name: string; description: string }> = {
      elevenlabs: {
        name: "ElevenLabs",
        description: "High-quality AI voice synthesis and conversational AI agents",
      },
      livekit: {
        name: "LiveKit",
        description: "Real-time audio and video streaming infrastructure",
      },
    };
    return info[service] || { name: service, description: "" };
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

  const elevenLabsAccounts = accounts?.filter(a => a.service === 'elevenlabs') || [];
  const liveKitAccounts = accounts?.filter(a => a.service === 'livekit') || [];

  return (
    <div className="space-y-6 p-6" data-testid="integrations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Accounts</h1>
          <p className="text-muted-foreground">
            Manage API accounts for external services
          </p>
        </div>
        <Button onClick={handleCreateAccount} data-testid="button-create-account">
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API keys are encrypted and stored securely. You can add multiple accounts for each service.
        </AlertDescription>
      </Alert>

      {/* Service Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        {(['elevenlabs', 'livekit'] as const).map((service) => {
          const info = getServiceInfo(service);
          const serviceAccounts = service === 'elevenlabs' ? elevenLabsAccounts : liveKitAccounts;
          const activeCount = serviceAccounts.filter(a => a.isActive).length;
          
          return (
            <Card key={service} data-testid={`service-card-${service}`}>
              <CardHeader>
                <CardTitle className="text-lg">{info.name}</CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Accounts:</span>
                    <span className="font-medium">{serviceAccounts.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Accounts:</span>
                    <span className="font-medium">{activeCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Configured Accounts</h2>
        
        {accounts && accounts.length > 0 ? (
          <div className="grid gap-4">
            {accounts.map((account) => {
              const info = getServiceInfo(account.service);
              return (
                <Card key={account.id} data-testid={`account-card-${account.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{info.name}</p>
                        </div>
                        {account.isActive ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateAccount(account)}
                          data-testid={`button-edit-${account.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                          data-testid={`button-remove-${account.id}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(account.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        <span>Last Synced:</span>
                        <span className="font-medium text-foreground">
                          {formatDate(account.lastSynced)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No accounts configured yet. Click "Add Account" to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Account Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Account</DialogTitle>
            <DialogDescription>
              Create a new API account for an external service.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g., Production ElevenLabs"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                data-testid="input-account-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service">Service</Label>
              <Select value={selectedService} onValueChange={(value: any) => setSelectedService(value)}>
                <SelectTrigger id="service" data-testid="select-service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="livekit">LiveKit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder={selectedService === 'livekit' ? "Format: apiKey:apiSecret" : "Enter your API key..."}
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
                  Enter your LiveKit credentials in the format: "apiKey:apiSecret"
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={!accountName.trim() || !selectedService || !apiKey.trim() || createAccountMutation.isPending}
              data-testid="button-save-account"
            >
              {createAccountMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Account Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Account</DialogTitle>
            <DialogDescription>
              Update account details or API key.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="update-account-name">Account Name</Label>
              <Input
                id="update-account-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                data-testid="input-update-account-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="update-api-key">API Key (leave blank to keep current)</Label>
              <Input
                id="update-api-key"
                type="password"
                placeholder={selectedAccount?.service === 'livekit' ? "Format: apiKey:apiSecret" : "Enter new API key..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-update-api-key"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="account-active">Account Active</Label>
              <Switch
                id="account-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-account-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUpdateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitUpdate}
              disabled={updateAccountMutation.isPending}
              data-testid="button-update-account"
            >
              {updateAccountMutation.isPending ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}