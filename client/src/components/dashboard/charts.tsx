import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, Area, AreaChart } from "recharts";
import { Progress } from "@/components/ui/progress";
import type { DashboardStats } from "@/lib/types";

interface ChartsProps {
  stats: DashboardStats;
}

export default function Charts({ stats }: ChartsProps) {
  const performanceMetrics = [
    { label: "Response Time", value: 95, percentage: 85, color: "bg-emerald-500", gradient: "from-emerald-500 to-teal-500" },
    { label: "Success Rate", value: "98.5%", percentage: 98, color: "bg-primary", gradient: "from-purple-500 to-pink-500" },
    { label: "Audio Quality", value: "4.6/5", percentage: 92, color: "bg-blue-500", gradient: "from-blue-500 to-cyan-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Agent Utilization Chart */}
      <Card premium className="group transition-all duration-500 hover:scale-[1.02]" data-testid="agent-utilization-chart">
        <CardHeader>
          <CardTitle gradient className="text-lg">Agent Utilization Trends</CardTitle>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full glass">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full pulse-glow"></div>
              <span className="text-sm font-medium">ElevenLabs Agents</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full glass">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full pulse-glow"></div>
              <span className="text-sm font-medium">LiveKit Agents</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.callVolumeData}>
                <defs>
                  <linearGradient id="gradientElevenlabs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientLivekit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }} 
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="elevenlabs"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#gradientElevenlabs)"
                  name="ElevenLabs"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="livekit"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#gradientLivekit)"
                  name="LiveKit"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card premium className="group transition-all duration-500 hover:scale-[1.02]" data-testid="performance-metrics">
        <CardHeader>
          <CardTitle gradient className="text-lg">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="group/metric">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground group-hover/metric:text-foreground transition-colors">
                    {metric.label}
                  </span>
                  <span className="text-sm font-bold gradient-text">{metric.value}</span>
                </div>
                <div className="relative">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${metric.gradient} transition-all duration-1000 ease-out rounded-full shimmer`}
                      style={{
                        width: `${metric.percentage}%`,
                        animation: `slideIn 1.5s ease-out ${index * 0.2}s both`
                      }}
                    />
                  </div>
                  <div className="absolute -top-1 transition-all duration-300"
                    style={{ left: `${metric.percentage}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-4 h-4 bg-gradient-to-r from-white to-gray-100 rounded-full shadow-lg border-2 border-primary-solid pulse-glow" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
