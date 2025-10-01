import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AnalysisProps {
  analysis?: {
    summary?: string | null;
    topics?: string[];
    sentiment?: string;
    callPurpose?: string;
    keyPoints?: string[];
    actionItems?: string[];
    outcome?: string;
    evaluation?: any;
    successMetrics?: any;
    latencyWaterfall?: {
      speechToText?: number;
      agentLogic?: number;
      elevenLabsTTS?: number;
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
  ];

  const maxLatency = Math.max(...latencySteps.map(step => step.value));

  return (
    <Card className="shadow-sm" data-testid="analysis">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">In-Depth Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysis.summary && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">AI Call Summary</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200" data-testid="analysis-summary">
              {analysis.summary}
            </p>
          </div>
        )}

        {analysis.callPurpose && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Call Purpose:</h4>
            <p className="text-sm text-foreground" data-testid="call-purpose">
              {analysis.callPurpose}
            </p>
          </div>
        )}

        {analysis.outcome && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Outcome:</h4>
            <p className="text-sm text-foreground" data-testid="call-outcome">
              {analysis.outcome}
            </p>
          </div>
        )}

        {analysis.topics && analysis.topics.length > 0 && (
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
        )}

        {analysis.keyPoints && analysis.keyPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Key Points:</h4>
            <ul className="space-y-1 text-sm text-foreground list-disc list-inside">
              {analysis.keyPoints.map((point, index) => (
                <li key={index} data-testid={`key-point-${index}`}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.actionItems && analysis.actionItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Action Items:</h4>
            <ul className="space-y-1 text-sm text-foreground list-disc list-inside">
              {analysis.actionItems.map((item, index) => (
                <li key={index} data-testid={`action-item-${index}`} className="text-orange-700 dark:text-orange-400">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.evaluation && (
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-3">Evaluation Results</h4>
            <div className="space-y-2">
              {typeof analysis.evaluation === 'object' && Object.entries(analysis.evaluation).map(([key, value]: [string, any], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-xs text-green-800 dark:text-green-200 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-xs font-medium text-green-900 dark:text-green-100">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.successMetrics && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Success Metrics:</h4>
            <div className="space-y-2">
              {typeof analysis.successMetrics === 'object' && Object.entries(analysis.successMetrics).map(([key, value]: [string, any], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className="text-xs">
                    {String(value)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.latencyWaterfall && (
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
        )}
      </CardContent>
    </Card>
  );
}
