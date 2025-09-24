import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, TrendingDown, BarChart3, Calendar, 
  Target, AlertTriangle, Zap, Activity, Download
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Bar, Legend, ReferenceLine
} from "recharts";

interface TrendData {
  timeSeries: Array<{
    timestamp: string;
    calls: number;
    avgDuration: number;
    cost: number;
    successRate: number;
    predicted?: boolean;
  }>;
  seasonality: {
    hourly: Array<{ hour: number; avgCalls: number; pattern: 'peak' | 'normal' | 'low' }>;
    daily: Array<{ day: string; avgCalls: number; pattern: 'peak' | 'normal' | 'low' }>;
    weekly: Array<{ week: number; avgCalls: number; pattern: 'peak' | 'normal' | 'low' }>;
  };
  predictions: {
    nextWeek: Array<{
      timestamp: string;
      predictedCalls: number;
      predictedCost: number;
      confidence: number;
    }>;
    nextMonth: Array<{
      timestamp: string;
      predictedCalls: number;
      predictedCost: number;
      confidence: number;
    }>;
    insights: Array<{
      type: 'growth' | 'decline' | 'seasonal' | 'anomaly';
      message: string;
      confidence: number;
      impact: 'high' | 'medium' | 'low';
      recommendation?: string;
    }>;
  };
  comparisons: {
    periodOverPeriod: {
      current: { calls: number; cost: number; avgDuration: number; successRate: number };
      previous: { calls: number; cost: number; avgDuration: number; successRate: number };
      changes: { calls: number; cost: number; avgDuration: number; successRate: number };
    };
    benchmarks: {
      industry: { avgCallsPerUser: number; avgCostPerCall: number; avgSuccessRate: number };
      userVsIndustry: { calls: number; cost: number; successRate: number };
    };
  };
  forecasting: {
    model: string;
    accuracy: number;
    confidence: number;
    scenarios: Array<{
      name: string;
      description: string;
      growth: number;
      projectedCalls: number;
      projectedCost: number;
    }>;
  };
}

interface TrendAnalysisProps {
  dateRange: { from: Date; to: Date };
}

const PATTERN_COLORS = {
  peak: "#EF4444",
  normal: "#3B82F6", 
  low: "#10B981"
};

const INSIGHT_COLORS = {
  growth: "#10B981",
  decline: "#EF4444",
  seasonal: "#F59E0B",
  anomaly: "#8B5CF6"
};

export default function TrendAnalysis({ dateRange }: TrendAnalysisProps) {
  const [forecastPeriod, setForecastPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week'>('day');
  
  const { data: trendData, isLoading } = useQuery<TrendData>({
    queryKey: ['/api/analytics/trends', dateRange.from, dateRange.to, forecastPeriod, granularity],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!trendData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No trend data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground';
  };

  const getChangeIcon = (change: number) => {
    return change > 0 ? TrendingUp : change < 0 ? TrendingDown : Activity;
  };

  const exportData = () => {
    const data = JSON.stringify(trendData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trend-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="trend-analysis">
      {/* Period-over-Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="calls-comparison-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Total Calls</p>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold mb-1">{trendData.comparisons.periodOverPeriod.current.calls.toLocaleString()}</p>
            <div className={`flex items-center space-x-1 ${getChangeColor(trendData.comparisons.periodOverPeriod.changes.calls)}`}>
              {(() => {
                const Icon = getChangeIcon(trendData.comparisons.periodOverPeriod.changes.calls);
                return <Icon className="h-3 w-3" />;
              })()}
              <span className="text-xs font-medium">{formatPercentage(trendData.comparisons.periodOverPeriod.changes.calls)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="cost-comparison-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Total Cost</p>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold mb-1">{formatCurrency(trendData.comparisons.periodOverPeriod.current.cost)}</p>
            <div className={`flex items-center space-x-1 ${getChangeColor(trendData.comparisons.periodOverPeriod.changes.cost)}`}>
              {(() => {
                const Icon = getChangeIcon(trendData.comparisons.periodOverPeriod.changes.cost);
                return <Icon className="h-3 w-3" />;
              })()}
              <span className="text-xs font-medium">{formatPercentage(trendData.comparisons.periodOverPeriod.changes.cost)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="duration-comparison-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Avg Duration</p>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold mb-1">{Math.round(trendData.comparisons.periodOverPeriod.current.avgDuration)}s</p>
            <div className={`flex items-center space-x-1 ${getChangeColor(trendData.comparisons.periodOverPeriod.changes.avgDuration)}`}>
              {(() => {
                const Icon = getChangeIcon(trendData.comparisons.periodOverPeriod.changes.avgDuration);
                return <Icon className="h-3 w-3" />;
              })()}
              <span className="text-xs font-medium">{formatPercentage(trendData.comparisons.periodOverPeriod.changes.avgDuration)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="success-rate-comparison-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Success Rate</p>
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold mb-1">{trendData.comparisons.periodOverPeriod.current.successRate.toFixed(1)}%</p>
            <div className={`flex items-center space-x-1 ${getChangeColor(trendData.comparisons.periodOverPeriod.changes.successRate)}`}>
              {(() => {
                const Icon = getChangeIcon(trendData.comparisons.periodOverPeriod.changes.successRate);
                return <Icon className="h-3 w-3" />;
              })()}
              <span className="text-xs font-medium">{formatPercentage(trendData.comparisons.periodOverPeriod.changes.successRate)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forecasting" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="forecasting" data-testid="tab-forecasting">Forecasting</TabsTrigger>
            <TabsTrigger value="seasonality" data-testid="tab-seasonality">Seasonality</TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="benchmarks" data-testid="tab-benchmarks">Benchmarks</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
              <SelectTrigger className="w-24" data-testid="select-granularity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={forecastPeriod} onValueChange={(value: any) => setForecastPeriod(value)}>
              <SelectTrigger className="w-28" data-testid="select-forecast-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">1 Week</SelectItem>
                <SelectItem value="month">1 Month</SelectItem>
                <SelectItem value="quarter">3 Months</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={exportData} data-testid="button-export-trends">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="forecasting" className="space-y-4">
          <Card data-testid="forecasting-chart">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Predictive Analytics & Forecasting</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Model: {trendData.forecasting.model}</Badge>
                  <Badge variant="outline">Accuracy: {trendData.forecasting.accuracy.toFixed(1)}%</Badge>
                  <Badge variant="outline">Confidence: {trendData.forecasting.confidence.toFixed(1)}%</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={[...trendData.timeSeries, ...trendData.predictions.nextMonth]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="timestamp" stroke="#6b7280" />
                    <YAxis yAxisId="left" stroke="#6b7280" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name.includes('cost') || name.includes('Cost') ? formatCurrency(value) : value,
                        name
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    
                    {/* Historical Data */}
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Historical Calls"
                      connectNulls={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Historical Cost"
                      connectNulls={false}
                    />
                    
                    {/* Predictions */}
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="predictedCalls" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Predicted Calls"
                      connectNulls={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="predictedCost" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Predicted Cost"
                      connectNulls={false}
                    />
                    
                    <ReferenceLine 
                      x={new Date().toISOString().split('T')[0]} 
                      stroke="#EF4444" 
                      strokeDasharray="2 2"
                      label="Today"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {trendData.forecasting.scenarios.map((scenario, index) => (
              <Card key={scenario.name} data-testid={`scenario-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold">{scenario.name}</h3>
                    <Badge variant={scenario.growth > 0 ? "default" : "destructive"}>
                      {formatPercentage(scenario.growth)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{scenario.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Projected Calls:</span>
                      <span className="font-medium">{scenario.projectedCalls.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Projected Cost:</span>
                      <span className="font-medium">{formatCurrency(scenario.projectedCost)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="seasonality" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card data-testid="hourly-patterns">
              <CardHeader>
                <CardTitle className="text-lg">Hourly Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendData.seasonality.hourly.map((pattern) => (
                    <div key={pattern.hour} className="flex items-center justify-between">
                      <span className="text-sm">{pattern.hour}:00</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PATTERN_COLORS[pattern.pattern] }}
                        />
                        <span className="text-sm font-medium">{pattern.avgCalls}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="daily-patterns">
              <CardHeader>
                <CardTitle className="text-lg">Daily Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendData.seasonality.daily.map((pattern) => (
                    <div key={pattern.day} className="flex items-center justify-between">
                      <span className="text-sm">{pattern.day}</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PATTERN_COLORS[pattern.pattern] }}
                        />
                        <span className="text-sm font-medium">{pattern.avgCalls}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="weekly-patterns">
              <CardHeader>
                <CardTitle className="text-lg">Weekly Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendData.seasonality.weekly.map((pattern) => (
                    <div key={pattern.week} className="flex items-center justify-between">
                      <span className="text-sm">Week {pattern.week}</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PATTERN_COLORS[pattern.pattern] }}
                        />
                        <span className="text-sm font-medium">{pattern.avgCalls}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card data-testid="ai-insights">
            <CardHeader>
              <CardTitle>AI-Powered Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendData.predictions.insights.map((insight, index) => (
                  <div key={index} className="p-4 rounded-lg border" data-testid={`insight-${index}`}>
                    <div className="flex items-start space-x-3">
                      <div 
                        className="p-2 rounded-full"
                        style={{ 
                          backgroundColor: `${INSIGHT_COLORS[insight.type]}20`,
                          color: INSIGHT_COLORS[insight.type]
                        }}
                      >
                        {insight.type === 'growth' && <TrendingUp className="h-4 w-4" />}
                        {insight.type === 'decline' && <TrendingDown className="h-4 w-4" />}
                        {insight.type === 'seasonal' && <Calendar className="h-4 w-4" />}
                        {insight.type === 'anomaly' && <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: INSIGHT_COLORS[insight.type],
                              color: INSIGHT_COLORS[insight.type]
                            }}
                          >
                            {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                          </Badge>
                          <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                            {insight.impact} impact
                          </Badge>
                          <span className="text-xs text-muted-foreground">{insight.confidence.toFixed(0)}% confidence</span>
                        </div>
                        <p className="text-sm mb-2">{insight.message}</p>
                        {insight.recommendation && (
                          <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
                            <strong>Recommendation:</strong> {insight.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card data-testid="industry-benchmarks">
            <CardHeader>
              <CardTitle>Industry Benchmarks Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Calls per User</p>
                  <p className="text-2xl font-semibold mb-1">{trendData.comparisons.benchmarks.userVsIndustry.calls.toFixed(1)}x</p>
                  <p className="text-xs text-muted-foreground">vs industry avg</p>
                  <div className={`text-sm mt-1 ${getChangeColor(trendData.comparisons.benchmarks.userVsIndustry.calls - 1)}`}>
                    {trendData.comparisons.benchmarks.userVsIndustry.calls > 1 ? 'Above' : 'Below'} average
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Cost per Call</p>
                  <p className="text-2xl font-semibold mb-1">{trendData.comparisons.benchmarks.userVsIndustry.cost.toFixed(1)}x</p>
                  <p className="text-xs text-muted-foreground">vs industry avg</p>
                  <div className={`text-sm mt-1 ${getChangeColor(1 - trendData.comparisons.benchmarks.userVsIndustry.cost)}`}>
                    {trendData.comparisons.benchmarks.userVsIndustry.cost < 1 ? 'More efficient' : 'Higher cost'}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Success Rate</p>
                  <p className="text-2xl font-semibold mb-1">{trendData.comparisons.benchmarks.userVsIndustry.successRate.toFixed(1)}x</p>
                  <p className="text-xs text-muted-foreground">vs industry avg</p>
                  <div className={`text-sm mt-1 ${getChangeColor(trendData.comparisons.benchmarks.userVsIndustry.successRate - 1)}`}>
                    {trendData.comparisons.benchmarks.userVsIndustry.successRate > 1 ? 'Above' : 'Below'} average
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}