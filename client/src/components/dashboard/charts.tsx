import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
import type { DashboardStats } from "@/lib/types";

interface ChartsProps {
  stats: DashboardStats;
}

export default function Charts({ stats }: ChartsProps) {
  const performanceMetrics = [
    { label: "Response Time", value: 95, percentage: 85, color: "bg-emerald-500" },
    { label: "Success Rate", value: "98.5%", percentage: 98, color: "bg-primary" },
    { label: "Audio Quality", value: "4.6/5", percentage: 92, color: "bg-blue-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Agent Utilization Chart */}
      <Card className="shadow-sm" data-testid="agent-utilization-chart">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Agent Utilization Trends</CardTitle>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">ElevenLabs Agents</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">LiveKit Agents</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.callVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="elevenlabs" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name="ElevenLabs"
                />
                <Line 
                  type="monotone" 
                  dataKey="livekit" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="LiveKit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="shadow-sm" data-testid="performance-metrics">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                <div className="flex items-center space-x-2">
                  <Progress value={metric.percentage} className="w-32" />
                  <span className="text-sm font-medium w-16 text-right">{metric.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
