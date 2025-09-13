import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  recordingUrl?: string;
  duration?: number;
  metadata?: any;
  call?: {
    id?: string;
    agent?: {
      name: string;
      platform: string;
    };
    sentiment?: string;
    outcome?: string;
  };
  onTimeUpdate?: (time: number) => void;
}

export default function AudioPlayer({ recordingUrl, duration, metadata, call, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'checking' | 'available' | 'processing' | 'unavailable'>('checking');
  const [actualRecordingUrl, setActualRecordingUrl] = useState<string | null>(recordingUrl || null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (totalSeconds?: number) => {
    if (!totalSeconds) return "0:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const newTime = Math.floor(audio.currentTime);
      setCurrentTime(newTime);
      if (onTimeUpdate) {
        onTimeUpdate(newTime);
      }
    };

    const handleLoadedData = () => {
      setAudioLoaded(true);
      setError(null);
      // Set the actual duration from the audio element
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(Math.floor(audio.duration));
      }
    };

    const handleLoadedMetadata = () => {
      // Also try to get duration from metadata
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(Math.floor(audio.duration));
      }
    };

    const handleError = () => {
      setError("Audio failed to load");
      setAudioLoaded(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [actualRecordingUrl]);

  // Check recording availability and poll if processing
  useEffect(() => {
    if (!call?.id || !call.id.startsWith('EL-')) {
      setRecordingStatus('unavailable');
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const maxPolls = 12; // Poll for up to 2 minutes (12 * 10 seconds)

    const checkAvailability = async () => {
      try {
        const response = await fetch(`/api/calls/${call.id}/recording/availability`);
        if (response.ok) {
          const data = await response.json();
          setRecordingStatus(data.status);
          
          if (data.status === 'available') {
            // Set the recording URL when available
            setActualRecordingUrl(`/api/calls/${call.id}/recording`);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
          } else if (data.status === 'processing') {
            // Continue polling if processing
            pollCount++;
            if (pollCount >= maxPolls) {
              setRecordingStatus('unavailable');
              if (pollInterval) {
                clearInterval(pollInterval);
              }
            }
          } else {
            // Stop polling if unavailable
            if (pollInterval) {
              clearInterval(pollInterval);
            }
          }
        }
      } catch (err) {
        console.error('Failed to check recording availability:', err);
        setRecordingStatus('unavailable');
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      }
    };

    // Initial check
    checkAvailability();

    // If recording URL is not provided, poll for availability
    if (!recordingUrl) {
      pollInterval = setInterval(checkAvailability, 10000); // Poll every 10 seconds
    } else {
      setRecordingStatus('available');
      setActualRecordingUrl(recordingUrl);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [call?.id, recordingUrl]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Audio playback failed:', err);
      setError('Playback failed');
      setIsPlaying(false);
    }
  };

  const getProgressPercentage = () => {
    // Use the actual audio duration instead of the prop
    const totalDuration = audioDuration || duration || 0;
    if (!totalDuration || !currentTime) return 0;
    return Math.min((currentTime / totalDuration) * 100, 100);
  };

  return (
    <Card className="shadow-sm" data-testid="audio-player">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Call Recording & Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Audio Player */}
          <div className="space-y-4">
            {actualRecordingUrl && (
              <audio
                ref={audioRef}
                src={actualRecordingUrl}
                preload="metadata"
                role="audio"
                data-testid="audio-element"
                aria-label="Call recording audio player"
              />
            )}
            
            <div className="flex items-center space-x-4">
              <Button
                size="lg"
                className="w-12 h-12 rounded-full"
                onClick={handlePlayPause}
                disabled={!audioLoaded && !error && Boolean(actualRecordingUrl)}
                data-testid="button-play-pause"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
              <div className="flex-1">
                {error ? (
                  <div className="text-sm text-red-500 mb-2">{error}</div>
                ) : actualRecordingUrl ? (
                  <>
                    <div className="relative h-10 bg-muted rounded mb-2" data-testid="audio-waveform">
                      <div 
                        className="h-full bg-primary rounded transition-all duration-200"
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                      <div className="absolute inset-0 waveform" />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span data-testid="current-time">{formatTime(currentTime)}</span>
                      <span data-testid="total-duration">/ {formatDuration(audioDuration || duration)}</span>
                    </div>
                  </>
                ) : recordingStatus === 'processing' ? (
                  <div className="text-sm text-muted-foreground mb-2">Recording is being processed...</div>
                ) : recordingStatus === 'checking' ? (
                  <div className="text-sm text-muted-foreground mb-2">Checking recording availability...</div>
                ) : (
                  <div className="text-sm text-muted-foreground mb-2">No recording available</div>
                )}
              </div>
            </div>
          </div>

          {/* Call Metadata */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Agent:</span>
              <span className="text-sm font-medium text-foreground">
                {call?.agent?.name} ({call?.agent?.platform === "elevenlabs" ? "EL" : "LK"})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">LiveKit Room:</span>
              <span className="text-sm text-foreground">{metadata?.roomId || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sentiment:</span>
              <span className={`px-3 py-1 rounded-full text-xs ${
                call?.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                call?.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {call?.sentiment ? call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1) : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Outcome:</span>
              <span className="text-sm text-foreground">{call?.outcome || "Unknown"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
