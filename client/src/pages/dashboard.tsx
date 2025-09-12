import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import KpiCards from "@/components/dashboard/kpi-cards";
import Charts from "@/components/dashboard/charts";
import CallHistoryTable from "@/components/dashboard/call-history-table";
import type { DashboardStats, CallWithAgent } from "@/lib/types";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: calls, isLoading: callsLoading } = useQuery<CallWithAgent[]>({
    queryKey: ["/api/calls"],
  });

  if (statsLoading || callsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
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
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <KpiCards stats={stats} />
      <Charts stats={stats} />
      <CallHistoryTable calls={calls || []} />
    </div>
  );
}
