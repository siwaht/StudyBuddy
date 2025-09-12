import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallWithAgent } from "@/lib/types";

export default function Calls() {
  const { data: calls, isLoading } = useQuery<CallWithAgent[]>({
    queryKey: ['/api/calls']
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';  
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Call History</h1>
            <p className="text-muted-foreground">Complete history of voice agent calls</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="calls-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call History</h1>
          <p className="text-muted-foreground">Complete history of voice agent calls</p>
        </div>
      </div>

      <div className="space-y-4">
        {calls?.map((call) => (
          <Card key={call.id} data-testid={`call-card-${call.id}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold" data-testid={`call-id-${call.id}`}>
                      Call #{call.id}
                    </h3>
                    <Badge className={getSentimentColor(call.sentiment || 'neutral')}>
                      {call.sentiment || 'neutral'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(call.duration || 0)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Agent: {call.agent?.name || 'Unknown'} ({call.agent?.platform || 'N/A'})</p>
                    <p>Started: {new Date(call.startTime).toLocaleString()}</p>
                    {call.outcome && <p>Outcome: {call.outcome}</p>}
                  </div>
                </div>
                <Link href={`/calls/${call.id}`}>
                  <Button variant="outline" size="sm" data-testid={`view-call-${call.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {calls && calls.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">No calls found</h3>
              <p className="text-muted-foreground">No voice agent calls have been recorded yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}