import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AudioPlayer from "@/components/call-detail/audio-player";
import Transcript from "@/components/call-detail/transcript";
import Analysis from "@/components/call-detail/analysis";
import CallCategorization from "@/components/call-management/call-categorization";
import type { CallWithAgent } from "@/lib/types";
import { useState } from "react";

export default function CallDetail() {
  const { id } = useParams();
  const [currentTime, setCurrentTime] = useState(0);
  
  const { data: call, isLoading, error } = useQuery<CallWithAgent & { 
    agent: any; 
    metrics: any[];
  }>({
    queryKey: ["/api/calls", id],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-6" data-testid="call-detail-error">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div className="text-center text-muted-foreground">
          Call not found or failed to load. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="call-detail-page">
      {/* Back Navigation */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary/80"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h2 className="text-2xl font-semibold text-foreground" data-testid="call-title">
          Call Analysis: #{call.id}
        </h2>
      </div>

      {/* Call Recording & Metadata */}
      <AudioPlayer 
        recordingUrl={call.recordingUrl}
        duration={call.duration}
        metadata={call.metadata}
        call={call}
        onTimeUpdate={setCurrentTime}
      />

      {/* Call Management */}
      <div className="max-w-2xl">
        <CallCategorization 
          callId={call.id}
          currentCategories={call.categories || []}
          currentTags={call.tags || []}
        />
      </div>

      {/* Transcript and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Transcript transcript={call.transcript} currentTime={currentTime} />
        <Analysis analysis={call.analysis} />
      </div>
    </div>
  );
}
