import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Plus, Settings, Trash2, Link2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SiTwilio } from "react-icons/si";

interface PhoneNumber {
  id: string;
  number: string;
  provider: 'twilio' | 'sip';
  accountId?: string;
  agentId?: string;
  configuration?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  platform: string;
  isActive: boolean;
}

export default function PhoneNumbers() {
  const [isAddNumberOpen, setIsAddNumberOpen] = useState(false);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [activeTab, setActiveTab] = useState<'twilio' | 'sip'>('twilio');
  const { toast } = useToast();

  // Form states for Twilio
  const [twilioForm, setTwilioForm] = useState({
    phoneNumber: "",
    accountSid: "",
    authToken: "",
    agentId: "",
  });

  // Form states for SIP
  const [sipForm, setSipForm] = useState({
    number: "",
    provider: "",
    address: "",
    transport: "TCP",
    username: "",
    password: "",
    encryption: "disabled",
    agentId: "",
  });

  // Fetch phone numbers
  const { data: phoneNumbers = [], isLoading: numbersLoading } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/phone-numbers"],
  });

  // Fetch agents for assignment
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  // Add phone number mutation
  const addPhoneNumberMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/phone-numbers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Phone number added successfully",
      });
      setIsAddNumberOpen(false);
      resetForms();
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add phone number",
        variant: "destructive",
      });
    },
  });

  // Update phone number mutation
  const updatePhoneNumberMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await apiRequest("PATCH", `/api/phone-numbers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Phone number updated successfully",
      });
      setIsConfigureOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number",
        variant: "destructive",
      });
    },
  });

  // Delete phone number mutation
  const deletePhoneNumberMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/phone-numbers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Phone number deleted successfully",
      });
      setIsConfigureOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete phone number",
        variant: "destructive",
      });
    },
  });

  const resetForms = () => {
    setTwilioForm({
      phoneNumber: "",
      accountSid: "",
      authToken: "",
      agentId: "",
    });
    setSipForm({
      number: "",
      provider: "",
      address: "",
      transport: "TCP",
      username: "",
      password: "",
      encryption: "disabled",
      agentId: "",
    });
  };

  const handleAddTwilioNumber = () => {
    if (!twilioForm.phoneNumber || !twilioForm.accountSid || !twilioForm.authToken) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addPhoneNumberMutation.mutate({
      number: twilioForm.phoneNumber,
      provider: 'twilio',
      agentId: twilioForm.agentId || null,
      configuration: {
        accountSid: twilioForm.accountSid,
        authToken: twilioForm.authToken,
      },
      isActive: true,
    });
  };

  const handleAddSipTrunk = () => {
    if (!sipForm.number || !sipForm.provider || !sipForm.address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addPhoneNumberMutation.mutate({
      number: sipForm.number,
      provider: 'sip',
      agentId: sipForm.agentId || null,
      configuration: {
        provider: sipForm.provider,
        address: sipForm.address,
        transport: sipForm.transport,
        username: sipForm.username,
        password: sipForm.password,
        encryption: sipForm.encryption,
      },
      isActive: true,
    });
  };

  const getAgentName = (agentId: string | undefined) => {
    if (!agentId) return "Unassigned";
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || "Unknown";
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'twilio') {
      return <SiTwilio className="h-4 w-4" />;
    }
    return <Phone className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 p-6 animate-fadeIn" data-testid="phone-numbers-page">
      <div className="flex items-center justify-between animate-slideInLeft">
        <div>
          <h1 className="text-2xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground">Import and manage your phone numbers</p>
        </div>
        <Button onClick={() => setIsAddNumberOpen(true)} data-testid="import-number">
          <Plus className="h-4 w-4 mr-2" />
          Import Number
        </Button>
      </div>

      {numbersLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading phone numbers...</p>
        </div>
      ) : phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No phone numbers yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any phone numbers yet.
            </p>
            <Button onClick={() => setIsAddNumberOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Import Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {phoneNumbers.map((phoneNumber) => (
            <Card key={phoneNumber.id} data-testid={`phone-card-${phoneNumber.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getProviderIcon(phoneNumber.provider)}
                  {phoneNumber.number}
                </CardTitle>
                <Badge className={phoneNumber.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                  {phoneNumber.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Provider:</span> {phoneNumber.provider.toUpperCase()}</p>
                    <p><span className="font-medium">Agent:</span> {getAgentName(phoneNumber.agentId)}</p>
                    {phoneNumber.configuration?.provider && (
                      <p className="text-xs text-muted-foreground">
                        SIP: {phoneNumber.configuration.provider}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedNumber(phoneNumber);
                        setIsConfigureOpen(true);
                      }}
                      data-testid={`configure-${phoneNumber.id}`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Number Dialog */}
      <Dialog open={isAddNumberOpen} onOpenChange={setIsAddNumberOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Phone Number</DialogTitle>
            <DialogDescription>
              Connect your phone number through Twilio or SIP trunk
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'twilio' | 'sip')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="twilio" className="flex items-center gap-2">
                <SiTwilio className="h-4 w-4" />
                From Twilio
              </TabsTrigger>
              <TabsTrigger value="sip" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                From SIP Trunk
              </TabsTrigger>
            </TabsList>

            <TabsContent value="twilio" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import your Twilio phone number. ElevenLabs will automatically configure the voice webhooks.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="twilio-number">Phone Number</Label>
                  <Input
                    id="twilio-number"
                    placeholder="+1234567890"
                    value={twilioForm.phoneNumber}
                    onChange={(e) => setTwilioForm({...twilioForm, phoneNumber: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="account-sid">Account SID</Label>
                  <Input
                    id="account-sid"
                    placeholder="AC..."
                    value={twilioForm.accountSid}
                    onChange={(e) => setTwilioForm({...twilioForm, accountSid: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="auth-token">Auth Token</Label>
                  <Input
                    id="auth-token"
                    type="password"
                    placeholder="Your Twilio Auth Token"
                    value={twilioForm.authToken}
                    onChange={(e) => setTwilioForm({...twilioForm, authToken: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="twilio-agent">Assign to Agent (Optional)</Label>
                  <Select
                    value={twilioForm.agentId}
                    onValueChange={(value) => setTwilioForm({...twilioForm, agentId: value})}
                  >
                    <SelectTrigger id="twilio-agent">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {agents.filter(a => a.platform === 'elevenlabs').map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sip" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Connect your existing phone infrastructure via SIP trunking.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sip-number">Phone Number / SIP URI</Label>
                  <Input
                    id="sip-number"
                    placeholder="+1234567890 or sip:user@domain"
                    value={sipForm.number}
                    onChange={(e) => setSipForm({...sipForm, number: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sip-provider">Provider</Label>
                  <Select
                    value={sipForm.provider}
                    onValueChange={(value) => setSipForm({...sipForm, provider: value})}
                  >
                    <SelectTrigger id="sip-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telnyx">Telnyx</SelectItem>
                      <SelectItem value="vonage">Vonage</SelectItem>
                      <SelectItem value="ringcentral">RingCentral</SelectItem>
                      <SelectItem value="sinch">Sinch</SelectItem>
                      <SelectItem value="plivo">Plivo</SelectItem>
                      <SelectItem value="bandwidth">Bandwidth</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sip-address">SIP Server Address</Label>
                  <Input
                    id="sip-address"
                    placeholder="sip.provider.com"
                    value={sipForm.address}
                    onChange={(e) => setSipForm({...sipForm, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="transport">Transport</Label>
                    <Select
                      value={sipForm.transport}
                      onValueChange={(value) => setSipForm({...sipForm, transport: value})}
                    >
                      <SelectTrigger id="transport">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TCP">TCP</SelectItem>
                        <SelectItem value="TLS">TLS (Recommended)</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="encryption">Media Encryption</Label>
                    <Select
                      value={sipForm.encryption}
                      onValueChange={(value) => setSipForm({...sipForm, encryption: value})}
                    >
                      <SelectTrigger id="encryption">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="allowed">Allowed</SelectItem>
                        <SelectItem value="required">Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sip-username">Username (Optional)</Label>
                    <Input
                      id="sip-username"
                      placeholder="SIP username"
                      value={sipForm.username}
                      onChange={(e) => setSipForm({...sipForm, username: e.target.value})}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sip-password">Password (Optional)</Label>
                    <Input
                      id="sip-password"
                      type="password"
                      placeholder="SIP password"
                      value={sipForm.password}
                      onChange={(e) => setSipForm({...sipForm, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sip-agent">Assign to Agent (Optional)</Label>
                  <Select
                    value={sipForm.agentId}
                    onValueChange={(value) => setSipForm({...sipForm, agentId: value})}
                  >
                    <SelectTrigger id="sip-agent">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {agents.filter(a => a.platform === 'elevenlabs').map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNumberOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={activeTab === 'twilio' ? handleAddTwilioNumber : handleAddSipTrunk}
              disabled={addPhoneNumberMutation.isPending}
            >
              {addPhoneNumberMutation.isPending ? "Importing..." : "Import Number"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Number Dialog */}
      <Dialog open={isConfigureOpen} onOpenChange={setIsConfigureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Phone Number</DialogTitle>
            <DialogDescription>
              Update settings for {selectedNumber?.number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="config-agent">Assigned Agent</Label>
              <Select
                value={selectedNumber?.agentId || "none"}
                onValueChange={(value) => {
                  if (selectedNumber) {
                    updatePhoneNumberMutation.mutate({
                      id: selectedNumber.id,
                      agentId: value === "none" ? null : value,
                    });
                  }
                }}
              >
                <SelectTrigger id="config-agent">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {agents.filter(a => a.platform === 'elevenlabs').map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active-toggle">Active Status</Label>
              <Button
                variant={selectedNumber?.isActive ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (selectedNumber) {
                    updatePhoneNumberMutation.mutate({
                      id: selectedNumber.id,
                      isActive: !selectedNumber.isActive,
                    });
                  }
                }}
              >
                {selectedNumber?.isActive ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Inactive
                  </>
                )}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (selectedNumber) {
                    deletePhoneNumberMutation.mutate(selectedNumber.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Phone Number
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}