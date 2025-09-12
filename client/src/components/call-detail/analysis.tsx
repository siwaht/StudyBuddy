import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AnalysisProps {
  analysis?: {
    summary: string;
    topics: string[];
    latencyWaterfall?: {
      speechToText?: number;
      agentLogic?: number;
      elevenLabsTTS?: number;
      liveKitTransport?: number;
    };
  };
}

export default function Analysis({ analysis }: AnalysisProps) {
  if (!analysis) {
    return (
      <Card className="shadow-sm" data-testid="analysis">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">In-Depth Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No analysis available for this call.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTopicColor = (topic: string) => {
    const colors = [
      "bg-sky-100 text-sky-800 hover:bg-sky-100",
      "bg-green-100 text-green-800 hover:bg-green-100",
      "bg-orange-100 text-orange-800 hover:bg-orange-100",
      "bg-purple-100 text-purple-800 hover:bg-purple-100",
    ];
    return colors[topic.length % colors.length];
  };

  const latencySteps = [
    { 
      name: "Speech-to-Text", 
      value: analysis.latencyWaterfall?.speechToText || 0,
      color: "bg-primary"
    },
    { 
      name: "Agent Logic", 
      value: analysis.latencyWaterfall?.agentLogic || 0,
      color: "bg-green-500"
    },
    { 
      name: "ElevenLabs TTS", 
      value: analysis.latencyWaterfall?.elevenLabsTTS || 0,
      color: "bg-purple-500"
    },
    { 
      name: "LiveKit Transport", 
      value: analysis.latencyWaterfall?.liveKitTransport || 0,
      color: "bg-blue-500"
    },
  ];

  const maxLatency = Math.max(...latencySteps.map(step => step.value));

  return (
    <Card className="shadow-sm" data-testid="analysis">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">In-Depth Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">AI Call Summary:</h4>
          <p className="text-sm text-foreground" data-testid="analysis-summary">
            {analysis.summary}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Key Topics Detected:</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.topics.map((topic, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className={`text-xs ${getTopicColor(topic)}`}
                data-testid={`topic-${index}`}
              >
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Latency Waterfall:</h4>
          <div className="space-y-3">
            {latencySteps.map((step, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{step.name}</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={(step.value / maxLatency) * 100} 
                    className="w-20 h-2" 
                  />
                  <span className="text-xs w-12 text-right" data-testid={`latency-${index}`}>
                    {step.value}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-3 border-t border-border mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Total Latency:</span>
              <span className="text-sm font-bold text-foreground" data-testid="total-latency">
                {latencySteps.reduce((sum, step) => sum + step.value, 0)}ms
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
