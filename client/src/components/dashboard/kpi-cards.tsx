import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, Zap, Circle } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface KpiCardsProps {
  stats: DashboardStats;
}

export default function KpiCards({ stats }: KpiCardsProps) {
  const kpis = [
    {
      title: "Total Calls Handled",
      value: stats.totalCalls.toLocaleString(),
      icon: TrendingUp,
      trend: "+5.2%",
      trendColor: "text-emerald-600",
    },
    {
      title: "Avg. Handle Time",
      value: stats.avgHandleTime,
      icon: Clock,
      trend: "",
      trendColor: "text-muted-foreground",
    },
    {
      title: "ElevenLabs Latency (P95)",
      value: `${stats.elevenLabsLatencyP95}ms`,
      icon: Zap,
      trend: "",
      trendColor: "text-muted-foreground",
    },
    {
      title: "LiveKit Active Rooms",
      value: stats.activeRooms,
      icon: Circle,
      trend: "online",
      trendColor: "text-emerald-500",
      valueColor: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="shadow-sm" data-testid={`kpi-card-${index}`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <p className={`text-3xl font-bold mt-2 ${kpi.valueColor || 'text-foreground'}`}>
                  {kpi.value}
                </p>
              </div>
              <div className={`${kpi.trendColor} flex items-center space-x-1`}>
                {kpi.trend === "online" ? (
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                ) : kpi.trend ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">{kpi.trend}</span>
                  </>
                ) : (
                  <kpi.icon className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
