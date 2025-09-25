import { useQuery } from "@tanstack/react-query";
import { useDashboardRealTime } from "@/hooks/useWebSocket";
import KpiCards from "@/components/dashboard/kpi-cards";
import Charts from "@/components/dashboard/charts";
import CallHistoryTable from "@/components/dashboard/call-history-table";
import type { DashboardStats, CallWithAgent } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";

interface ElevenLabsSubscription {
  characterCount: number;
  characterLimit: number;
  characterLimitOverride: number;
  effectiveLimit: number;
  charactersUsedPercentage: number;
  charactersRemaining: number;
  voiceSlotsUsed: number;
  voiceSlotsMax: number;
  professionalVoiceSlotsUsed: number;
  subscriptionTier: string;
  canExtendCharacterLimit: boolean;
  nextCharacterCountResetUnix: number | null;
  subscriptionStatus: string;
}

export default function Dashboard() {
  // Enable real-time updates for dashboard
  const { isConnected } = useDashboardRealTime();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: callsResponse, isLoading: callsLoading } = useQuery<{ data: CallWithAgent[]; pagination: any }>({
    queryKey: ["/api/calls"],
  });

  // Fetch ElevenLabs subscription data for credit usage
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<ElevenLabsSubscription>({
    queryKey: ["/api/elevenlabs/subscription"],
  });

  if (statsLoading || callsLoading || subscriptionLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse" />
          <div className="h-80 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse" style={{ animationDelay: "200ms" }} />
        </div>
        <div className="h-96 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse" style={{ animationDelay: "400ms" }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* KPI Cards */}
      <KpiCards stats={stats} subscriptionData={subscriptionData} />
      
      {/* Charts */}
      <Charts stats={stats} />
      
      {/* Call History Table */}
      <CallHistoryTable calls={callsResponse?.data || []} />
    </div>
  );
}