import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, ChevronUp, ChevronDown, MessageSquare, Sparkles } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<Record<number, string>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  // Simple sentiment analysis based on keywords
  const analyzeSentiment = (text: string): string => {
    // Handle undefined or non-string text
    if (!text || typeof text !== 'string') {
      return "neutral";
    }
    
    const positiveWords = ["thank", "great", "excellent", "happy", "good", "wonderful", "perfect", "appreciate"];
    const negativeWords = ["frustrated", "angry", "bad", "terrible", "awful", "horrible", "hate", "problem"];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => word && lowerText.includes(word.toLowerCase())).length;
    const negativeCount = negativeWords.filter(word => word && lowerText.includes(word.toLowerCase())).length;
    
    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  };

  // Initialize sentiment analysis
  useEffect(() => {
    const analysis: Record<number, string> = {};
    transcript.forEach((entry, index) => {
      analysis[index] = analyzeSentiment(entry.text);
    });
    setSentimentAnalysis(analysis);
  }, [transcript]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: number[] = [];
    const query = searchQuery.toLowerCase();
    
    transcript.forEach((entry, index) => {
      if (entry.text.toLowerCase().includes(query)) {
        results.push(index);
      }
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, transcript]);

  const scrollToEntry = (index: number) => {
    const element = entryRefs.current[index];
    if (element && scrollAreaRef.current) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const navigateSearch = (direction: 'prev' | 'next') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    scrollToEntry(searchResults[newIndex]);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">{part}</span> : 
        part
    );
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeIndex = getActiveIndex();

  return (
    <Card className="shadow-sm" data-testid="transcript">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Transcript
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            data-testid="toggle-search"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
        
        {showSearch && (
          <div className="mt-4 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search in transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                data-testid="transcript-search-input"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentSearchIndex + 1} of {searchResults.length} matches
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateSearch('prev')}
                    disabled={searchResults.length === 0}
                    data-testid="search-prev"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateSearch('next')}
                    disabled={searchResults.length === 0}
                    data-testid="search-next"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96" ref={scrollAreaRef}>
          <div className="space-y-4">
            {transcript.map((entry, index) => {
              const isActive = index === activeIndex;
              const isSearchResult = searchResults.includes(index);
              const isCurrentSearchResult = searchResults[currentSearchIndex] === index;
              const sentiment = sentimentAnalysis[index] || "neutral";
              
              return (
                <div 
                  key={index}
                  ref={(el) => { entryRefs.current[index] = el; }}
                  className={`
                    space-y-2 p-3 rounded-lg transition-all
                    ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${isCurrentSearchResult ? 'ring-2 ring-yellow-400' : ''}
                    ${isSearchResult && !isCurrentSearchResult ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                  `}
                  data-testid={`transcript-entry-${index}`}
                  data-active={isActive ? 'true' : 'false'}
                  data-search-result={isSearchResult ? 'true' : 'false'}
                  aria-current={isActive ? 'true' : 'false'}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-xs text-muted-foreground mt-1" data-testid={`timestamp-${index}`}>
                        {entry.timestamp}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${getSpeakerColor(entry.speaker)}`}>
                            {getSpeakerName(entry.speaker)}:
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSentimentColor(sentiment)}`}
                            data-testid={`sentiment-${index}`}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground" data-testid={`transcript-text-${index}`}>
                          {searchQuery ? highlightText(entry.text, searchQuery) : entry.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {transcript.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No transcript available for this call.
              </div>
            )}
          </div>
        </ScrollArea>
        
        {transcript.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-green-600">
                  {Object.values(sentimentAnalysis).filter(s => s === 'positive').length}
                </div>
                <div className="text-xs text-muted-foreground">Positive</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-600">
                  {Object.values(sentimentAnalysis).filter(s => s === 'neutral').length}
                </div>
                <div className="text-xs text-muted-foreground">Neutral</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">
                  {Object.values(sentimentAnalysis).filter(s => s === 'negative').length}
                </div>
                <div className="text-xs text-muted-foreground">Negative</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}