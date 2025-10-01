import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, RefreshCw, FileAudio, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AudioPlayer from "@/components/call-detail/audio-player";
import Transcript from "@/components/call-detail/transcript";
import Analysis from "@/components/call-detail/analysis";
import type { CallWithAgent } from "@/lib/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CallDetail() {
  const { id } = useParams();
  const [currentTime, setCurrentTime] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: call, isLoading, error } = useQuery<CallWithAgent & {
    agent: any;
    metrics: any[];
  }>({
    queryKey: ["/api/calls", id],
  });

  const syncConversationMutation = useMutation({
    mutationFn: async () => {
      if (!call?.conversationId || !call.id.startsWith('EL-')) {
        throw new Error('Not an ElevenLabs conversation');
      }

      const conversationId = call.id.replace('EL-', '');
      const response = await fetch(`/api/elevenlabs/conversations/${conversationId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to sync conversation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls", id] });
      toast({
        title: "Success",
        description: "Conversation data refreshed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync conversation",
        variant: "destructive",
      });
    },
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

  const callAnalysis = call?.analysis as any;
  const callMetadata = call?.metadata as any;
  const hasSummary = callAnalysis?.summary || callMetadata?.transcriptSummary;
  const hasTranscript = call?.transcript && Array.isArray(call.transcript) && call.transcript.length > 0;

  return (
    <div className="p-6 space-y-6" data-testid="call-detail-page">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
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
          <div>
            <h2 className="text-2xl font-semibold text-foreground" data-testid="call-title">
              {callMetadata?.callSummaryTitle || `Call Analysis: #${call.id.substring(0, 8)}`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {call.agent?.name} • {new Date(call.startTime).toLocaleString()}
            </p>
          </div>
        </div>

        {call.id.startsWith('EL-') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncConversationMutation.mutate()}
            disabled={syncConversationMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncConversationMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        )}
      </div>

      {/* Call Summary Card */}
      {hasSummary && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Call Summary
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {callAnalysis?.summary || callMetadata?.transcriptSummary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="text-2xl font-bold">{Math.floor((call.duration || 0) / 60)}:{((call.duration || 0) % 60).toString().padStart(2, '0')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Sentiment</div>
            <Badge className="mt-1">{call.sentiment || 'neutral'}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Recording</div>
            <div className="flex items-center gap-1 mt-1">
              {call.recordingUrl || callMetadata?.hasAudio ? (
                <>
                  <FileAudio className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Available</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Not Available</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Transcript</div>
            <div className="text-sm mt-1">
              {hasTranscript ? `${call.transcript.length} entries` : 'Not Available'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Recording & Metadata */}
      <AudioPlayer
        recordingUrl={call.recordingUrl}
        duration={call.duration}
        metadata={call.metadata}
        call={call}
        onTimeUpdate={setCurrentTime}
      />

      {/* Transcript and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Transcript transcript={call.transcript} currentTime={currentTime} />
        <Analysis analysis={call.analysis} />
      </div>
    </div>
  );
}
