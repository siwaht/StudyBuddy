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
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
    case "negative":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "neutral":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

const getPlatformColor = (platform?: string) => {
  switch (platform) {
    case "elevenlabs":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    case "livekit":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
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
    <Card className="shadow-sm" data-testid="call-history-table">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Recent Call History</CardTitle>
          <Button variant="default" size="sm" data-testid="button-view-all-calls">
            View All Calls
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Call ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Agent & Platform</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Duration</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sentiment</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-muted/25" data-testid={`call-row-${call.id}`}>
                  <td className="p-4 text-sm text-foreground">#{call.id}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatTimestamp(call.startTime)}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">{call.agent?.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs w-fit mt-1 ${getPlatformColor(call.agent?.platform)}`}
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
                      className={`text-xs ${getSentimentColor(call.sentiment)}`}
                    >
                      {call.sentiment ? call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1) : "Unknown"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Link href={`/calls/${call.id}`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary/80"
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
            <div key={call.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{call.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(call.startTime)}
                  </p>
                </div>
                <Badge className={getSentimentColor(call.sentiment)}>
                  {call.sentiment || "unknown"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getPlatformColor(call.agent?.platform)}>
                  {call.agent?.platform || "unknown"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(call.duration)}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Link href={`/calls/${call.id}`}>
                  <Button size="sm" variant="outline" className="w-full">
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
