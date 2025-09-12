import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  recordingUrl?: string;
  duration?: number;
  metadata?: any;
  call?: {
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
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [recordingUrl]);

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
    if (!duration || !currentTime) return 0;
    return Math.min((currentTime / duration) * 100, 100);
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
            {recordingUrl && (
              <audio
                ref={audioRef}
                src={recordingUrl}
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
                disabled={!audioLoaded && !error && Boolean(recordingUrl)}
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
                ) : recordingUrl ? (
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
                      <span data-testid="total-duration">/ {formatDuration(duration)}</span>
                    </div>
                  </>
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
