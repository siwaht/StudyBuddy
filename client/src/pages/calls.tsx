import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Eye, Search, Filter, ChevronDown, X, Calendar,
  Clock, Mic, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CallWithAgent } from "@/lib/types";
import type { Agent } from "@shared/schema";

interface SearchParams {
  q?: string;
  agentId?: string;
  sentiment?: string[];
  dateFrom?: string;
  dateTo?: string;
  durationMin?: number;
  durationMax?: number;
  hasRecording?: boolean;
  sortBy?: 'date' | 'duration' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface SearchResult {
  calls: CallWithAgent[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export default function Calls() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<SearchParams>({
    sentiment: [],
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch agents for filter dropdown
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ['/api/agents']
  });

  // Build search params
  const searchParams = new URLSearchParams();
  if (debouncedQuery) searchParams.append('q', debouncedQuery);
  if (filters.agentId) searchParams.append('agentId', filters.agentId);
  if (filters.sentiment && filters.sentiment.length > 0) {
    filters.sentiment.forEach(s => searchParams.append('sentiment', s));
  }
  if (filters.dateFrom) searchParams.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) searchParams.append('dateTo', filters.dateTo);
  if (filters.durationMin !== undefined) searchParams.append('durationMin', filters.durationMin.toString());
  if (filters.durationMax !== undefined) searchParams.append('durationMax', filters.durationMax.toString());
  if (filters.hasRecording !== undefined) searchParams.append('hasRecording', filters.hasRecording.toString());
  if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);
  if (filters.sortOrder) searchParams.append('sortOrder', filters.sortOrder);
  searchParams.append('page', (filters.page || 1).toString());
  searchParams.append('limit', (filters.limit || 20).toString());

  // Fetch search results
  const { data: searchResult, isLoading, refetch } = useQuery<SearchResult>({
    queryKey: ['/api/calls/search', searchParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/calls/search?${searchParams.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to search calls');
      return response.json();
    }
  });

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/calls/suggestions?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(searchQuery);
  }, [searchQuery, fetchSuggestions]);

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

  const handleSentimentChange = (sentiment: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      sentiment: checked 
        ? [...(prev.sentiment || []), sentiment]
        : (prev.sentiment || []).filter(s => s !== sentiment),
      page: 1 // Reset to first page on filter change
    }));
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-') as ['date' | 'duration' | 'sentiment', 'asc' | 'desc'];
    setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({
      sentiment: [],
      sortBy: 'date',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    });
    setSearchQuery("");
  };

  const activeFilterCount = [
    filters.agentId,
    filters.sentiment && filters.sentiment.length > 0,
    filters.dateFrom,
    filters.dateTo,
    filters.durationMin !== undefined,
    filters.durationMax !== undefined,
    filters.hasRecording !== undefined
  ].filter(Boolean).length;

  if (isLoading && !searchResult) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Call History</h1>
            <p className="text-muted-foreground">Search and filter voice agent calls</p>
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
          <p className="text-muted-foreground">Search and filter voice agent calls</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search calls, transcripts, agents..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="pl-10"
            data-testid="search-input"
          />
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute top-full mt-1 w-full z-10">
              <ScrollArea className="h-48">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </ScrollArea>
            </Card>
          )}
        </div>

        {/* Filter Sheet for Mobile */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" data-testid="filter-button">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Calls</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Agent Filter */}
              <div className="space-y-2">
                <Label>Agent</Label>
                <Select 
                  value={filters.agentId || ""} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, agentId: value || undefined, page: 1 }))}
                >
                  <SelectTrigger data-testid="agent-filter">
                    <SelectValue placeholder="All agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All agents</SelectItem>
                    {agents?.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sentiment Filter */}
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <div className="space-y-2">
                  {['positive', 'neutral', 'negative'].map(sentiment => (
                    <div key={sentiment} className="flex items-center space-x-2">
                      <Checkbox
                        id={sentiment}
                        checked={filters.sentiment?.includes(sentiment) || false}
                        onCheckedChange={(checked) => handleSentimentChange(sentiment, checked as boolean)}
                        data-testid={`sentiment-${sentiment}`}
                      />
                      <Label htmlFor={sentiment} className="text-sm capitalize">
                        {sentiment}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined, page: 1 }))}
                    data-testid="date-from"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined, page: 1 }))}
                    data-testid="date-to"
                  />
                </div>
              </div>

              {/* Duration Range */}
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <div className="space-y-4">
                  <Slider
                    min={0}
                    max={600}
                    step={10}
                    value={[filters.durationMin || 0, filters.durationMax || 600]}
                    onValueChange={([min, max]) => {
                      setFilters(prev => ({ 
                        ...prev, 
                        durationMin: min > 0 ? min : undefined,
                        durationMax: max < 600 ? max : undefined,
                        page: 1
                      }));
                    }}
                    data-testid="duration-slider"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{filters.durationMin || 0}s</span>
                    <span>{filters.durationMax || 600}s</span>
                  </div>
                </div>
              </div>

              {/* Recording Status */}
              <div className="space-y-2">
                <Label>Recording Status</Label>
                <Select 
                  value={filters.hasRecording === undefined ? '' : filters.hasRecording.toString()} 
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    hasRecording: value === '' ? undefined : value === 'true',
                    page: 1
                  }))}
                >
                  <SelectTrigger data-testid="recording-filter">
                    <SelectValue placeholder="All calls" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All calls</SelectItem>
                    <SelectItem value="true">With recording</SelectItem>
                    <SelectItem value="false">Without recording</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={clearFilters}
                data-testid="clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Sort Dropdown */}
        <Select 
          value={`${filters.sortBy}-${filters.sortOrder}`} 
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-48" data-testid="sort-select">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="duration-desc">Longest first</SelectItem>
            <SelectItem value="duration-asc">Shortest first</SelectItem>
            <SelectItem value="sentiment-desc">Most positive first</SelectItem>
            <SelectItem value="sentiment-asc">Most negative first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      {searchResult && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {((searchResult.page - 1) * searchResult.pageSize) + 1} - {Math.min(searchResult.page * searchResult.pageSize, searchResult.total)} of {searchResult.total} calls
          </span>
          {(debouncedQuery || activeFilterCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear search & filters
            </Button>
          )}
        </div>
      )}

      {/* Call Cards */}
      <div className="space-y-4">
        {searchResult?.calls.map((call) => (
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
                    {call.recordingUrl && (
                      <Mic className="h-4 w-4 text-muted-foreground" />
                    )}
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
        
        {searchResult && searchResult.calls.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">No calls found</h3>
              <p className="text-muted-foreground">
                {debouncedQuery || activeFilterCount > 0 
                  ? "Try adjusting your search or filters"
                  : "No voice agent calls have been recorded yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {searchResult && searchResult.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(searchResult.page - 1)}
            disabled={searchResult.page === 1}
            data-testid="prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, searchResult.pages) }, (_, i) => {
              let pageNum;
              if (searchResult.pages <= 5) {
                pageNum = i + 1;
              } else if (searchResult.page <= 3) {
                pageNum = i + 1;
              } else if (searchResult.page >= searchResult.pages - 2) {
                pageNum = searchResult.pages - 4 + i;
              } else {
                pageNum = searchResult.page - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === searchResult.page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  data-testid={`page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(searchResult.page + 1)}
            disabled={searchResult.page === searchResult.pages}
            data-testid="next-page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}