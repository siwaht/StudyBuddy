import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, Users, Phone, Bot } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Analytics() {
  const performanceData = [
    { time: '00:00', elevenlabs: 120, livekit: 95 },
    { time: '04:00', elevenlabs: 140, livekit: 110 },
    { time: '08:00', elevenlabs: 180, livekit: 140 },
    { time: '12:00', elevenlabs: 220, livekit: 170 },
    { time: '16:00', elevenlabs: 195, livekit: 160 },
    { time: '20:00', elevenlabs: 165, livekit: 125 }
  ];

  const latencyData = [
    { platform: 'ElevenLabs', avgLatency: 340, calls: 1247 },
    { platform: 'LiveKit', avgLatency: 180, calls: 892 },
  ];

  const sentimentData = [
    { name: 'Positive', value: 65, color: '#22C55E' },
    { name: 'Neutral', value: 25, color: '#6B7280' },
    { name: 'Negative', value: 10, color: '#EF4444' }
  ];

  const topicData = [
    { topic: 'Account Issues', count: 450, trend: 'up' },
    { topic: 'Product Questions', count: 320, trend: 'up' },
    { topic: 'Technical Support', count: 280, trend: 'down' },
    { topic: 'Billing', count: 190, trend: 'up' },
    { topic: 'Cancellations', count: 145, trend: 'down' }
  ];

  return (
    <div className="space-y-6 p-6" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">Deep insights into agent performance and call patterns</p>
        </div>
        <Select defaultValue="7d">
          <SelectTrigger className="w-40" data-testid="date-range-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2s</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              12% faster than last week
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89.4%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              3% improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <div className="text-xs text-muted-foreground">
              Across all platforms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Utilization</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76%</div>
            <div className="flex items-center text-xs text-red-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              8% higher than target
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="elevenlabs" stroke="#3B82F6" name="ElevenLabs" strokeWidth={2} />
              <Line type="monotone" dataKey="livekit" stroke="#10B981" name="LiveKit" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Average Latency by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}ms`, 'Avg Latency']} />
                <Bar dataKey="avgLatency" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Call Sentiment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Call Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Most Common Call Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topicData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">#{index + 1}</span>
                  <span className="font-medium">{item.topic}</span>
                  <Badge variant="secondary">{item.count} calls</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}