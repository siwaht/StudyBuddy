import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, Area, AreaChart } from "recharts";
import { Progress } from "@/components/ui/progress";
import type { DashboardStats } from "@/lib/types";

interface ChartsProps {
  stats: DashboardStats;
}

export default function Charts({ stats }: ChartsProps) {
  const performanceMetrics = [
    { label: "Response Time", value: 95, percentage: 85, color: "bg-green-500" },
    { label: "Success Rate", value: "98.5%", percentage: 98, color: "bg-emerald-500" },
    { label: "Audio Quality", value: "4.6/5", percentage: 92, color: "bg-blue-500" },
  ];

  // Check which platforms are assigned to the user
  const hasElevenLabs = stats.platforms?.includes('elevenlabs');
  const hasLiveKit = stats.platforms?.includes('livekit');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Agent Utilization Chart */}
      <Card className="hover:shadow-md transition-shadow" data-testid="agent-utilization-chart">
        <CardHeader>
          <CardTitle className="text-lg">Agent Utilization Trends</CardTitle>
          <div className="flex items-center space-x-4 mt-2">
            {hasElevenLabs && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">ElevenLabs Agents</span>
              </div>
            )}
            {hasLiveKit && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">LiveKit Agents</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.callVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }} 
                />
                <Legend />
                {hasElevenLabs && (
                  <Area
                    type="monotone"
                    dataKey="elevenlabs"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth={2}
                    fill="hsl(217 91% 60%)"
                    fillOpacity={0.2}
                    name="ElevenLabs"
                  />
                )}
                {hasLiveKit && (
                  <Area
                    type="monotone"
                    dataKey="livekit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    name="LiveKit"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="hover:shadow-md transition-shadow" data-testid="performance-metrics">
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {performanceMetrics.map((metric, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </span>
                  <span className="text-sm font-semibold">{metric.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all duration-300`}
                    style={{ width: `${metric.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
