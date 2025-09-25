import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, Zap, Type, ArrowUp, ArrowDown } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface KpiCardsProps {
  stats: DashboardStats;
  subscriptionData?: {
    characterCount: number;
    characterLimit: number;
    charactersUsedPercentage: number;
    nextCharacterCountResetUnix: number | null;
  };
}

export default function KpiCards({ stats, subscriptionData }: KpiCardsProps) {
  
  const baseKpis = [
    {
      title: "Total Calls Handled",
      value: (stats.totalCalls || 0).toLocaleString(),
      icon: TrendingUp,
      trend: "+5.2%",
      trendColor: "text-emerald-600",
      trendUp: true,
    },
    {
      title: "Avg. Handle Time",
      value: stats.avgHandleTime || "0m 0s",
      icon: Clock,
      trend: "-2.1%",
      trendColor: "text-emerald-600",
      trendUp: false,
    },
  ];

  // Add platform-specific KPIs based on what platforms the user has agents for
  const platformKpis = [];
  
  if (stats.platforms?.includes('elevenlabs')) {
    platformKpis.push({
      title: "ElevenLabs Latency (P95)",
      value: `${stats.elevenLabsLatencyP95 || 0}ms`,
      icon: Zap,
      trend: "Optimal",
      trendColor: "text-amber-600",
      trendUp: undefined,
      valueColor: undefined,
    });
    
    // Add monthly characters used if subscription data is available
    if (subscriptionData) {
      const usagePercentage = subscriptionData.charactersUsedPercentage;
      const isHighUsage = usagePercentage >= 80;
      const isNearLimit = usagePercentage >= 95;
      
      // Calculate days until reset
      const resetDate = subscriptionData.nextCharacterCountResetUnix 
        ? new Date(subscriptionData.nextCharacterCountResetUnix * 1000)
        : new Date();
      const now = new Date();
      const daysUntilReset = subscriptionData.nextCharacterCountResetUnix
        ? Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      // Format trend text
      let trendText = `${Math.round(usagePercentage)}% used`;
      if (daysUntilReset > 0) {
        trendText += ` • Resets in ${daysUntilReset}d`;
      } else if (daysUntilReset === 0) {
        trendText += ` • Resets today`;
      }
      
      platformKpis.push({
        title: "Monthly Characters Used",
        value: subscriptionData.characterCount.toLocaleString(),
        icon: Type,
        trend: trendText,
        trendColor: isNearLimit ? "text-red-600" : isHighUsage ? "text-amber-600" : "text-emerald-600",
        trendUp: undefined,
      });
    }
  }


  const kpis = [...baseKpis, ...platformKpis];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {kpis.map((kpi, index) => (
        <Card 
          key={index}
          className="hover:shadow-md transition-shadow"
          data-testid={`kpi-card-${index}`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{kpi.title}</p>
              <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2">
              {kpi.value}
            </p>
            <div className="flex items-center space-x-1">
              {kpi.trend === "online" ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600">LIVE</span>
                </div>
              ) : kpi.trend ? (
                <div className="flex items-center space-x-1">
                  {kpi.trendUp !== undefined && (
                    kpi.trendUp ? (
                      <ArrowUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-600" />
                    )
                  )}
                  <span className={`text-xs ${kpi.trendColor}`}>{kpi.trend}</span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
