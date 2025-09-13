import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Clock, Users, Phone, Bot, 
  Calendar as CalendarIcon, Download, ArrowUpRight, ArrowDownRight,
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  Area, AreaChart
} from "recharts";

interface AnalyticsData {
  metrics: {
    totalCalls: number;
    avgDuration: number;
    avgSentiment: number;
    resolutionRate: number;
    comparisons?: {
      totalCalls: number;
      avgDuration: number;
      avgSentiment: number;
      resolutionRate: number;
    };
  };
  trends: Array<{
    timestamp: string;
    calls: number;
    avgDuration: number;
    sentiment: { positive: number; negative: number; neutral: number };
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    totalCalls: number;
    avgDuration: number;
    avgSentiment: number;
    resolutionRate: number;
  }>;
  peakHours: Array<{
    hour: number;
    calls: number;
    avgWaitTime: number;
  }>;
}

const DATE_PRESETS = [
  { label: "Today", value: "today", days: 0 },
  { label: "Last 7 Days", value: "7d", days: 7 },
  { label: "Last 30 Days", value: "30d", days: 30 },
  { label: "Last 90 Days", value: "90d", days: 90 },
];

const SENTIMENT_COLORS = {
  positive: "#22C55E",
  neutral: "#6B7280",
  negative: "#EF4444"
};

export default function Analytics() {
  const [datePreset, setDatePreset] = useState("7d");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [compareMode, setCompareMode] = useState(false);
  const [compareDateRange, setCompareDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    to: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  });
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  // Update date range based on preset
  useEffect(() => {
    const preset = DATE_PRESETS.find(p => p.value === datePreset);
    if (preset && preset.days > 0) {
      setCustomDateRange({
        from: new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000),
        to: new Date()
      });
    } else if (preset && preset.days === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCustomDateRange({
        from: today,
        to: tomorrow
      });
    }
  }, [datePreset]);

  // Build query params
  const params = new URLSearchParams();
  params.append('dateFrom', customDateRange.from.toISOString());
  params.append('dateTo', customDateRange.to.toISOString());
  if (compareMode) {
    params.append('compareFrom', compareDateRange.from.toISOString());
    params.append('compareTo', compareDateRange.to.toISOString());
  }
  params.append('groupBy', groupBy);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', params.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatSentiment = (score: number) => {
    if (score > 0.3) return { label: "Positive", color: "text-green-600" };
    if (score < -0.3) return { label: "Negative", color: "text-red-600" };
    return { label: "Neutral", color: "text-gray-600" };
  };

  const formatDate = (date: Date, format: string = 'short') => {
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const exportData = (format: 'csv' | 'json') => {
    if (!analyticsData) return;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString()}.json`;
      a.click();
    } else {
      // Convert to CSV
      const headers = ['Date', 'Calls', 'Avg Duration', 'Positive', 'Neutral', 'Negative'];
      const rows = analyticsData.trends.map(t => [
        t.timestamp,
        t.calls,
        t.avgDuration,
        t.sentiment.positive,
        t.sentiment.neutral,
        t.sentiment.negative
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString()}.csv`;
      a.click();
    }
  };

  const getChangePercent = (current: number, previous?: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Advanced Analytics</h1>
            <p className="text-muted-foreground">Deep insights into agent performance and call patterns</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">Deep insights into agent performance and call patterns</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-40" data-testid="date-preset-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {datePreset === 'custom' && (
              <Button variant="outline" data-testid="custom-date-button">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {formatDate(customDateRange.from)} - {formatDate(customDateRange.to)}
              </Button>
            )}
          </div>

          {/* Compare Toggle */}
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
            data-testid="compare-toggle"
          >
            Compare Periods
          </Button>

          {/* Export Options */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="export-button">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => exportData('csv')}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => exportData('json')}
                >
                  Export as JSON
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData?.metrics.totalCalls || 0}
            </div>
            {analyticsData?.metrics.comparisons && (
              <div className="flex items-center text-xs">
                {getChangePercent(
                  analyticsData.metrics.totalCalls,
                  analyticsData.metrics.comparisons.totalCalls
                ) >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                    <span className="text-green-600">
                      {Math.abs(getChangePercent(
                        analyticsData.metrics.totalCalls,
                        analyticsData.metrics.comparisons.totalCalls
                      )).toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                    <span className="text-red-600">
                      {Math.abs(getChangePercent(
                        analyticsData.metrics.totalCalls,
                        analyticsData.metrics.comparisons.totalCalls
                      )).toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="ml-1 text-muted-foreground">vs previous</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analyticsData?.metrics.avgDuration || 0)}
            </div>
            {analyticsData?.metrics.comparisons && (
              <div className="text-xs text-muted-foreground">
                Previous: {formatDuration(analyticsData.metrics.comparisons.avgDuration)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={formatSentiment(analyticsData?.metrics.avgSentiment || 0).color}>
                {formatSentiment(analyticsData?.metrics.avgSentiment || 0).label}
              </span>
            </div>
            {analyticsData?.metrics.comparisons && (
              <div className="text-xs text-muted-foreground">
                Score: {(analyticsData.metrics.avgSentiment || 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analyticsData?.metrics.resolutionRate || 0) * 100).toFixed(1)}%
            </div>
            {analyticsData?.metrics.comparisons && (
              <Progress 
                value={(analyticsData.metrics.resolutionRate || 0) * 100} 
                className="mt-2 h-2"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Call Trends</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="peak">Peak Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Volume Over Time</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Group by:</span>
                <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analyticsData?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (groupBy === 'hour') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      if (groupBy === 'day') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      if (groupBy === 'week') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { 
                          name: 'Positive', 
                          value: analyticsData?.trends.reduce((sum, t) => sum + t.sentiment.positive, 0) || 0,
                          color: SENTIMENT_COLORS.positive
                        },
                        { 
                          name: 'Neutral', 
                          value: analyticsData?.trends.reduce((sum, t) => sum + t.sentiment.neutral, 0) || 0,
                          color: SENTIMENT_COLORS.neutral
                        },
                        { 
                          name: 'Negative', 
                          value: analyticsData?.trends.reduce((sum, t) => sum + t.sentiment.negative, 0) || 0,
                          color: SENTIMENT_COLORS.negative
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(SENTIMENT_COLORS)[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sentiment.positive" 
                      stroke={SENTIMENT_COLORS.positive}
                      name="Positive"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sentiment.neutral" 
                      stroke={SENTIMENT_COLORS.neutral}
                      name="Neutral"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sentiment.negative" 
                      stroke={SENTIMENT_COLORS.negative}
                      name="Negative"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.agentPerformance.map((agent) => (
                  <div key={agent.agentId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{agent.agentName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{agent.totalCalls} calls</span>
                        <span>{formatDuration(agent.avgDuration)}</span>
                        <Badge className={
                          agent.avgSentiment > 0.3 ? "bg-green-100 text-green-800" :
                          agent.avgSentiment < -0.3 ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {formatSentiment(agent.avgSentiment).label}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Resolution Rate</span>
                        <span>{(agent.resolutionRate * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={agent.resolutionRate * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peak" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analyticsData?.peakHours || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Calls') return value;
                      return `${value.toFixed(0)}s`;
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="calls" 
                    fill="#3B82F6" 
                    name="Calls"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgWaitTime" 
                    stroke="#EF4444" 
                    name="Avg Wait Time (s)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}