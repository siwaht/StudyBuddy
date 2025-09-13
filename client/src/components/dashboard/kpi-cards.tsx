import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, Zap, Circle, ArrowUp, ArrowDown } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface KpiCardsProps {
  stats: DashboardStats;
}

export default function KpiCards({ stats }: KpiCardsProps) {
  const [animatedNumbers, setAnimatedNumbers] = useState<{ [key: number]: number }>({});
  
  useEffect(() => {
    // Animate numbers on mount
    const timeouts: NodeJS.Timeout[] = [];
    kpis.forEach((kpi, index) => {
      const timeout = setTimeout(() => {
        setAnimatedNumbers(prev => ({ ...prev, [index]: 1 }));
      }, index * 100);
      timeouts.push(timeout);
    });
    return () => timeouts.forEach(clearTimeout);
  }, [stats]);
  
  const kpis = [
    {
      title: "Total Calls Handled",
      value: stats.totalCalls.toLocaleString(),
      icon: TrendingUp,
      trend: "+5.2%",
      trendColor: "text-emerald-600",
      trendUp: true,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Avg. Handle Time",
      value: stats.avgHandleTime,
      icon: Clock,
      trend: "-2.1%",
      trendColor: "text-emerald-600",
      trendUp: false,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "ElevenLabs Latency (P95)",
      value: `${stats.elevenLabsLatencyP95}ms`,
      icon: Zap,
      trend: "Optimal",
      trendColor: "text-amber-600",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "LiveKit Active Rooms",
      value: stats.activeRooms,
      icon: Circle,
      trend: "online",
      trendColor: "text-emerald-500",
      valueColor: "text-primary",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          premium 
          className={`group transition-all duration-500 hover:scale-105 ${
            animatedNumbers[index] ? 'number-animation' : 'opacity-0'
          }`}
          data-testid={`kpi-card-${index}`}
        >
          <CardContent className="p-6 relative overflow-hidden">
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
            
            {/* Icon with floating animation */}
            <div className={`absolute top-4 right-4 p-3 rounded-xl bg-gradient-to-br ${kpi.gradient} opacity-10 group-hover:opacity-20 transition-all duration-500`}>
              <kpi.icon className="h-6 w-6 text-foreground float" />
            </div>
            
            <div className="relative z-10">
              <p className="text-sm text-muted-foreground font-medium mb-3">{kpi.title}</p>
              <div className="flex items-end justify-between">
                <p className={`text-4xl font-bold tracking-tight ${
                  kpi.valueColor || 'gradient-text'
                } ${animatedNumbers[index] ? 'counter-animation' : ''}`}>
                  {kpi.value}
                </p>
                <div className={`${kpi.trendColor} flex items-center space-x-1 mb-1`}>
                  {kpi.trend === "online" ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full pulse-glow" />
                      <span className="text-xs font-semibold">LIVE</span>
                    </div>
                  ) : kpi.trend ? (
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full glass">
                      {kpi.trendUp !== undefined ? (
                        kpi.trendUp ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      <span className="text-xs font-bold">{kpi.trend}</span>
                    </div>
                  ) : (
                    <kpi.icon className="h-5 w-5" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
