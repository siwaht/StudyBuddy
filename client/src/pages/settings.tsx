import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Key, Bell, Shield, Database, Palette, Globe } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 p-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your platform configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="elevenlabs-key">ElevenLabs API Key</Label>
                  <Input 
                    id="elevenlabs-key" 
                    type="password" 
                    placeholder="sk-..." 
                    data-testid="elevenlabs-api-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="livekit-key">LiveKit API Key</Label>
                  <Input 
                    id="livekit-key" 
                    type="password" 
                    placeholder="API..." 
                    data-testid="livekit-api-key"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook Endpoint</Label>
                <Input 
                  id="webhook-url" 
                  placeholder="https://your-app.com/webhook" 
                  data-testid="webhook-url"
                />
              </div>
              <Button data-testid="save-api-config">Save API Configuration</Button>
            </CardContent>
          </Card>

          {/* Voice & Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Voice & Audio Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-voice">Default Voice</Label>
                  <Select>
                    <SelectTrigger data-testid="default-voice-select">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rachel">Rachel</SelectItem>
                      <SelectItem value="adam">Adam</SelectItem>
                      <SelectItem value="domi">Domi</SelectItem>
                      <SelectItem value="elli">Elli</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audio-quality">Audio Quality</Label>
                  <Select>
                    <SelectTrigger data-testid="audio-quality-select">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (16kHz)</SelectItem>
                      <SelectItem value="medium">Medium (22kHz)</SelectItem>
                      <SelectItem value="high">High (44kHz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt Template</Label>
                <Textarea 
                  id="system-prompt"
                  placeholder="You are a helpful AI assistant..."
                  rows={4}
                  data-testid="system-prompt"
                />
              </div>
              <Button data-testid="save-voice-settings">Save Voice Settings</Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Call Recording</Label>
                  <p className="text-sm text-muted-foreground">Record all voice interactions for quality assurance</p>
                </div>
                <Switch data-testid="call-recording-toggle" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Encryption</Label>
                  <p className="text-sm text-muted-foreground">Encrypt stored call data and transcripts</p>
                </div>
                <Switch data-testid="data-encryption-toggle" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Automatically end idle sessions after specified time</p>
                </div>
                <Select>
                  <SelectTrigger className="w-32" data-testid="session-timeout-select">
                    <SelectValue placeholder="30 min" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button data-testid="save-security-settings">Save Security Settings</Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Call Alerts</Label>
                <Switch data-testid="call-alerts-toggle" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Error Notifications</Label>
                <Switch data-testid="error-notifications-toggle" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Daily Reports</Label>
                <Switch data-testid="daily-reports-toggle" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Weekly Summaries</Label>
                <Switch data-testid="weekly-summaries-toggle" defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p><span className="font-medium">Platform Version:</span> v2.1.0</p>
                <p><span className="font-medium">Database:</span> PostgreSQL 15</p>
                <p><span className="font-medium">Uptime:</span> 7 days, 14 hours</p>
                <p><span className="font-medium">Storage Used:</span> 2.4 GB / 50 GB</p>
              </div>
              <Separator />
              <Button variant="outline" size="sm" className="w-full" data-testid="system-diagnostics">
                Run Diagnostics
              </Button>
            </CardContent>
          </Card>

          {/* Backup & Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full" data-testid="export-data">
                Export All Data
              </Button>
              <Button variant="outline" size="sm" className="w-full" data-testid="backup-settings">
                Backup Settings
              </Button>
              <Button variant="destructive" size="sm" className="w-full" data-testid="reset-platform">
                Reset Platform
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}