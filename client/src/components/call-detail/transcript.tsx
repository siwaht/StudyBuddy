import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TranscriptEntry {
  timestamp: string;
  speaker: string;
  text: string;
}

interface TranscriptProps {
  transcript?: TranscriptEntry[];
  currentTime?: number;
}

export default function Transcript({ transcript = [], currentTime = 0 }: TranscriptProps) {
  const getSpeakerColor = (speaker: string) => {
    return speaker === "agent" ? "text-purple-600" : "text-blue-600";
  };

  const getSpeakerName = (speaker: string) => {
    return speaker === "agent" ? "Agent (EL)" : "User";
  };

  const getActiveIndex = () => {
    // Find the most recent transcript entry based on current playback time
    for (let i = transcript.length - 1; i >= 0; i--) {
      const entry = transcript[i];
      if (entry.timestamp) {
        // Convert timestamp (MM:SS) to seconds
        const [minutes, seconds] = entry.timestamp.split(':').map(Number);
        const entryTimeInSeconds = (minutes || 0) * 60 + (seconds || 0);
        if (currentTime >= entryTimeInSeconds) {
          return i;
        }
      }
    }
    return -1;
  };

  const activeIndex = getActiveIndex();

  return (
    <Card className="shadow-sm" data-testid="transcript">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto space-y-4">
          {transcript.map((entry, index) => (
            <div 
              key={index} 
              className={`space-y-2 ${index === activeIndex ? 'bg-blue-50 p-3 rounded' : ''}`}
              data-testid={`transcript-entry-${index}`}
              data-active={index === activeIndex ? 'true' : 'false'}
              aria-current={index === activeIndex ? 'true' : 'false'}
            >
              <div className="flex items-start space-x-3">
                <span className="text-xs text-muted-foreground mt-1" data-testid={`timestamp-${index}`}>
                  {entry.timestamp}
                </span>
                <div>
                  <span className={`text-sm font-medium ${getSpeakerColor(entry.speaker)}`}>
                    {getSpeakerName(entry.speaker)}:
                  </span>
                  <p className="text-sm text-foreground mt-1" data-testid={`transcript-text-${index}`}>
                    {entry.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {transcript.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No transcript available for this call.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
