import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import KpiCards from "@/components/dashboard/kpi-cards";
import Charts from "@/components/dashboard/charts";
import CallHistoryTable from "@/components/dashboard/call-history-table";
import { Search, TrendingUp, Clock, Filter, Sparkles, Phone, MessageSquare, BarChart } from "lucide-react";
import type { DashboardStats, CallWithAgent } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";

interface SearchResult {
  type: 'call' | 'transcript' | 'agent';
  id: string;
  title: string;
  subtitle: string;
  sentiment?: number;
  timestamp?: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchPresets] = useState([
    { id: 'negative', label: 'Negative Sentiment Calls', query: 'sentiment:negative' },
    { id: 'long', label: 'Long Duration Calls', query: 'duration:>600' },
    { id: 'today', label: "Today's Calls", query: 'date:today' },
    { id: 'unresolved', label: 'Unresolved Issues', query: 'status:unresolved' },
  ]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: callsResponse, isLoading: callsLoading } = useQuery<{ data: CallWithAgent[]; pagination: any }>({
    queryKey: ["/api/calls"],
  });

  // Quick search query
  const { data: searchResults, mutate: performSearch } = useMutation<SearchResult[], Error, string>({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/calls/search?q=${encodeURIComponent(query)}&limit=10`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      // Transform search results into a unified format
      const results: SearchResult[] = [];
      
      // Add call results
      if (data.calls && data.calls.length > 0) {
        data.calls.forEach((call: CallWithAgent) => {
          results.push({
            type: 'call',
            id: call.id,
            title: `Call #${call.id}`,
            subtitle: `${call.agent?.name || 'Unknown Agent'} - ${new Date(call.startTime).toLocaleDateString()}`,
            sentiment: call.sentiment === 'positive' ? 0.5 : call.sentiment === 'negative' ? -0.5 : 0,
            timestamp: call.startTime
          });
        });
      }
      
      // Add transcript matches
      if (data.transcriptMatches && data.transcriptMatches.length > 0) {
        data.transcriptMatches.forEach((match: any) => {
          results.push({
            type: 'transcript',
            id: match.callId,
            title: `Transcript: "${match.text.substring(0, 50)}..."`,
            subtitle: `From call #${match.callId}`,
            sentiment: match.sentiment
          });
        });
      }
      
      return results;
    }
  });

  const handleQuickSearch = useCallback((query: string) => {
    if (query.length > 2) {
      performSearch(query);
    }
  }, [performSearch]);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearchSelect = (result: SearchResult) => {
    setQuickSearchOpen(false);
    if (result.type === 'call' || result.type === 'transcript') {
      setLocation(`/calls/${result.id}`);
    }
  };

  const handlePresetSearch = (preset: typeof searchPresets[0]) => {
    setLocation(`/calls?q=${encodeURIComponent(preset.query)}`);
  };

  if (statsLoading || callsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse" />
          <div className="h-80 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse" style={{ animationDelay: "200ms" }} />
        </div>
        <div className="h-96 rounded-xl skeleton-premium bg-gradient-to-r from-muted/50 via-muted to-muted/50 animate-pulse" style={{ animationDelay: "400ms" }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* Quick Search Widget */}
      <Card premium className="group transition-all duration-300 hover:scale-[1.01] animate-slideInUp">
        <CardHeader>
          <CardTitle gradient className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary-solid" />
              <span>Quick Search</span>
            </span>
            <Button
              className="btn-premium"
              size="sm"
              onClick={() => setQuickSearchOpen(true)}
              data-testid="quick-search-button"
            >
              <Search className="h-4 w-4 mr-2" />
              Search (Ctrl+K)
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Presets */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 gradient-text">
                <Filter className="h-4 w-4 text-primary-solid" />
                Quick Filters
              </h3>
              <div className="flex flex-wrap gap-2">
                {searchPresets.map(preset => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="glass hover:bg-primary-solid/10 hover:scale-105 transition-all duration-300"
                    onClick={() => handlePresetSearch(preset)}
                    data-testid={`preset-${preset.id}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Recent Searches */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 gradient-text">
                <Clock className="h-4 w-4 text-primary-solid" />
                Recent Searches
              </h3>
              {recentSearches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="badge-premium cursor-pointer hover:scale-105 transition-all duration-300"
                      onClick={() => {
                        setQuickSearchQuery(search);
                        setQuickSearchOpen(true);
                      }}
                      data-testid={`recent-search-${index}`}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent searches</p>
              )}
            </div>
          </div>
          
          {/* Search Insights */}
          <div className="mt-4 pt-4 border-t border-primary-solid/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="group/stat hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold gradient-text">{stats.totalCalls || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
              <div className="group/stat hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold gradient-text">{stats.activeRooms || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Active Rooms</p>
              </div>
              <div className="group/stat hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-center gap-2">
                  <BarChart className="h-4 w-4 text-purple-600" />
                  <span className="text-2xl font-bold gradient-text">
                    {stats.elevenLabsLatencyP95 ? stats.elevenLabsLatencyP95.toFixed(0) : 0}ms
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">P95 Latency</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command Dialog for Quick Search */}
      <CommandDialog open={quickSearchOpen} onOpenChange={setQuickSearchOpen}>
        <CommandInput
          placeholder="Search calls, transcripts, or agents..."
          value={quickSearchQuery}
          onValueChange={(value) => {
            setQuickSearchQuery(value);
            handleQuickSearch(value);
          }}
        />
        <CommandList>
          {!searchResults || searchResults.length === 0 ? (
            <CommandEmpty>
              {quickSearchQuery.length > 2 
                ? "No results found. Try a different search term."
                : "Type at least 3 characters to search..."}
            </CommandEmpty>
          ) : (
            <>
              <CommandGroup heading="Search Results">
                {searchResults.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => {
                      handleSearchSelect(result);
                      saveRecentSearch(quickSearchQuery);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {result.type === 'call' && <Phone className="h-4 w-4 text-blue-600" />}
                      {result.type === 'transcript' && <MessageSquare className="h-4 w-4 text-green-600" />}
                      {result.type === 'agent' && <Sparkles className="h-4 w-4 text-purple-600" />}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                      </div>
                      {result.sentiment !== undefined && (
                        <Badge 
                          variant={result.sentiment > 0.3 ? "default" : result.sentiment < -0.3 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {result.sentiment > 0.3 ? "Positive" : result.sentiment < -0.3 ? "Negative" : "Neutral"}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>

      {/* KPI Cards */}
      <KpiCards stats={stats} />
      
      {/* Charts */}
      <Charts stats={stats} />
      
      {/* Call History Table */}
      <CallHistoryTable calls={callsResponse?.data || []} />
    </div>
  );
}