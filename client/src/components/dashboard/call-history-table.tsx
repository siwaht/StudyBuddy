import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { CallWithAgent } from "@/lib/types";

interface CallHistoryTableProps {
  calls: CallWithAgent[];
}

const getSentimentColor = (sentiment?: string) => {
  switch (sentiment) {
    case "positive":
      return "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border border-emerald-200/30 hover:from-emerald-500/20 hover:to-teal-500/20";
    case "negative":
      return "bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700 border border-red-200/30 hover:from-red-500/20 hover:to-pink-500/20";
    case "neutral":
      return "bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 border border-gray-200/30 hover:from-gray-500/20 hover:to-slate-500/20";
    default:
      return "bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 border border-gray-200/30 hover:from-gray-500/20 hover:to-slate-500/20";
  }
};

const getPlatformColor = (platform?: string) => {
  switch (platform) {
    case "elevenlabs":
      return "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 border border-purple-200/30 hover:from-purple-500/20 hover:to-pink-500/20";
    case "livekit":
      return "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 border border-blue-200/30 hover:from-blue-500/20 hover:to-cyan-500/20";
    default:
      return "bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 border border-gray-200/30 hover:from-gray-500/20 hover:to-slate-500/20";
  }
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function CallHistoryTable({ calls }: CallHistoryTableProps) {
  return (
    <Card premium className="group transition-all duration-500" data-testid="call-history-table">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle gradient className="text-lg">Recent Call History</CardTitle>
          <Button className="btn-premium" size="sm" data-testid="button-view-all-calls">
            View All Calls
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 backdrop-blur-sm">
              <tr className="border-b border-purple-200/30">
                <th className="text-left p-4 text-xs font-semibold text-purple-900/80 uppercase tracking-wider">Call ID</th>
                <th className="text-left p-4 text-xs font-semibold text-purple-900/80 uppercase tracking-wider">Timestamp</th>
                <th className="text-left p-4 text-xs font-semibold text-purple-900/80 uppercase tracking-wider">Agent & Platform</th>
                <th className="text-left p-4 text-xs font-semibold text-purple-900/80 uppercase tracking-wider">Duration</th>
                <th className="text-left p-4 text-xs font-semibold text-purple-900/80 uppercase tracking-wider">Sentiment</th>
                <th className="text-left p-4 text-xs font-semibold text-purple-900/80 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100/20">
              {calls.map((call, index) => (
                <tr key={call.id} className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30 hover:scale-[1.001] transition-all duration-300 group odd:bg-white/30 even:bg-purple-50/10" data-testid={`call-row-${call.id}`}>
                  <td className="p-4 text-sm font-medium gradient-text">#{call.id}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatTimestamp(call.startTime)}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">{call.agent?.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs w-fit mt-1 badge-premium ${getPlatformColor(call.agent?.platform)}`}
                      >
                        {call.agent?.platform === "elevenlabs" ? "ElevenLabs" : "LiveKit"}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {formatDuration(call.duration)}
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs badge-premium ${getSentimentColor(call.sentiment)} transition-all duration-300 hover:scale-105`}
                    >
                      {call.sentiment ? call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1) : "Unknown"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Link href={`/calls/${call.id}`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary/80 hover:bg-primary-solid/10 transition-all duration-300 hover:scale-105"
                        data-testid={`button-view-details-${call.id}`}
                      >
                        View Details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {calls.slice(0, 5).map((call) => (
            <div key={call.id} className="glass rounded-xl p-4 space-y-3 hover:scale-[1.02] transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{call.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(call.startTime)}
                  </p>
                </div>
                <Badge className={`badge-premium ${getSentimentColor(call.sentiment)}`}>
                  {call.sentiment || "unknown"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`badge-premium ${getPlatformColor(call.agent?.platform)}`}>
                  {call.agent?.platform || "unknown"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(call.duration)}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Link href={`/calls/${call.id}`}>
                  <Button size="sm" className="btn-premium w-full">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
