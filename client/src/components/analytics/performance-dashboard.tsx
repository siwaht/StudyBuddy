import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Zap, Clock, TrendingUp, TrendingDown, AlertTriangle, 
  Target, CheckCircle, XCircle, Activity, BarChart3
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadialBarChart, RadialBar, Legend, Area, AreaChart
} from "recharts";

interface PerformanceData {
  overview: {
    avgResponseTime: number;
    p95ResponseTime: number;
    successRate: number;
    errorRate: number;
    uptime: number;
    totalRequests: number;
    slaCompliance: number;
    qualityScore: number;
  };
  latencyBreakdown: {
    speechToText: number;
    agentLogic: number;
    ttsGeneration: number;
    networkLatency: number;
  };
  timeSeries: Array<{
    timestamp: string;
    responseTime: number;
    p95: number;
    successRate: number;
    requests: number;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    platform: string;
    avgResponseTime: number;
    successRate: number;
    qualityScore: number;
    totalCalls: number;
    errorCount: number;
    slaCompliance: number;
  }>;
  errorAnalysis: Array<{
    type: string;
    count: number;
    percentage: number;
    trend: number;
  }>;
  slaMetrics: {
    responseTimeTarget: number;
    uptimeTarget: number;
    successRateTarget: number;
    currentCompliance: number;
    violations: Array<{
      metric: string;
      timestamp: string;
      value: number;
      target: number;
    }>;
  };
}

interface PerformanceDashboardProps {
  dateRange: { from: Date; to: Date };
}

const QUALITY_COLORS = {
  excellent: "#22C55E",
  good: "#3B82F6", 
  fair: "#F59E0B",
  poor: "#EF4444"
};

export default function PerformanceDashboard({ dateRange }: PerformanceDashboardProps) {
  const [metricView, setMetricView] = useState<'overview' | 'latency' | 'quality'>('overview');
  
  const { data: performanceData, isLoading } = useQuery<PerformanceData>({
    queryKey: ['/api/analytics/performance', dateRange.from, dateRange.to],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  if (!performanceData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No performance data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return QUALITY_COLORS.excellent;
    if (score >= 75) return QUALITY_COLORS.good;
    if (score >= 60) return QUALITY_COLORS.fair;
    return QUALITY_COLORS.poor;
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6" data-testid="performance-dashboard">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="avg-response-time-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Avg Response Time</p>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2">{formatLatency(performanceData.overview.avgResponseTime)}</p>
            <p className="text-xs text-muted-foreground">P95: {formatLatency(performanceData.overview.p95ResponseTime)}</p>
          </CardContent>
        </Card>

        <Card data-testid="success-rate-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Success Rate</p>
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2">{performanceData.overview.successRate.toFixed(1)}%</p>
            <div className="flex items-center space-x-2">
              <Progress value={performanceData.overview.successRate} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{performanceData.overview.totalRequests} calls</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="quality-score-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Quality Score</p>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2" style={{ color: getQualityColor(performanceData.overview.qualityScore) }}>
              {performanceData.overview.qualityScore.toFixed(1)}
            </p>
            <Badge variant="outline" style={{ color: getQualityColor(performanceData.overview.qualityScore), borderColor: getQualityColor(performanceData.overview.qualityScore) }}>
              {getQualityLabel(performanceData.overview.qualityScore)}
            </Badge>
          </CardContent>
        </Card>

        <Card data-testid="sla-compliance-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">SLA Compliance</p>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2">{performanceData.overview.slaCompliance.toFixed(1)}%</p>
            <div className="flex items-center space-x-1">
              {performanceData.overview.slaCompliance >= 99 ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : performanceData.overview.slaCompliance >= 95 ? (
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
              ) : (
                <XCircle className="h-3 w-3 text-red-600" />
              )}
              <span className="text-xs text-muted-foreground">
                {performanceData.slaMetrics.violations.length} violations
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="trends" data-testid="tab-performance-trends">Performance Trends</TabsTrigger>
            <TabsTrigger value="latency" data-testid="tab-latency-breakdown">Latency Breakdown</TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agent-performance">Agent Performance</TabsTrigger>
            <TabsTrigger value="errors" data-testid="tab-error-analysis">Error Analysis</TabsTrigger>
            <TabsTrigger value="sla" data-testid="tab-sla-monitoring">SLA Monitoring</TabsTrigger>
          </TabsList>
          
          <Select value={metricView} onValueChange={(value: any) => setMetricView(value)}>
            <SelectTrigger className="w-32" data-testid="select-metric-view">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="latency">Latency</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="trends" className="space-y-4">
          <Card data-testid="performance-trends-chart">
            <CardHeader>
              <CardTitle>Performance Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="timestamp" stroke="#6b7280" />
                    <YAxis yAxisId="left" stroke="#6b7280" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name.includes('Time') ? formatLatency(value) : 
                        name.includes('Rate') ? `${value.toFixed(1)}%` : value,
                        name
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Avg Response Time"
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="p95" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="P95 Response Time"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Success Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="latency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="latency-breakdown-chart">
              <CardHeader>
                <CardTitle>Latency Component Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(performanceData.latencyBreakdown).map(([component, time]) => (
                    <div key={component} className="space-y-2" data-testid={`latency-${component}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {component.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm text-muted-foreground">{formatLatency(time)}</span>
                      </div>
                      <Progress 
                        value={(time / performanceData.overview.avgResponseTime) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="latency-distribution">
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={[
                      { name: 'Fast (<500ms)', value: 45, fill: '#10B981' },
                      { name: 'Good (500ms-1s)', value: 30, fill: '#3B82F6' },
                      { name: 'Slow (1s-3s)', value: 20, fill: '#F59E0B' },
                      { name: 'Very Slow (>3s)', value: 5, fill: '#EF4444' }
                    ]}>
                      <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                      <Legend />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card data-testid="agent-performance-table">
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Agent</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Platform</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Avg Response</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Success Rate</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Quality Score</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">SLA Compliance</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground">Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.agentPerformance.map((agent, index) => (
                      <tr key={agent.agentId} className="border-b" data-testid={`agent-performance-${index}`}>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{agent.agentName}</p>
                            <p className="text-xs text-muted-foreground">{agent.agentId}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">{agent.platform}</Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{formatLatency(agent.avgResponseTime)}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{agent.successRate.toFixed(1)}%</p>
                            <Progress value={agent.successRate} className="h-2 w-16" />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: getQualityColor(agent.qualityScore) }}
                            />
                            <span className="font-medium">{agent.qualityScore.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{agent.slaCompliance.toFixed(1)}%</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{agent.totalCalls.toLocaleString()}</p>
                          {agent.errorCount > 0 && (
                            <p className="text-xs text-red-600">{agent.errorCount} errors</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card data-testid="error-analysis-chart">
            <CardHeader>
              <CardTitle>Error Analysis & Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {performanceData.errorAnalysis.map((error, index) => (
                    <div key={error.type} className="p-4 border rounded-lg" data-testid={`error-type-${index}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{error.type}</p>
                          <p className="text-sm text-muted-foreground">{error.count} occurrences</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{error.percentage.toFixed(1)}%</p>
                          <div className={`flex items-center space-x-1 ${
                            error.trend > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {error.trend > 0 ? 
                              <TrendingUp className="h-3 w-3" /> : 
                              <TrendingDown className="h-3 w-3" />
                            }
                            <span className="text-xs">{Math.abs(error.trend).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <Progress value={error.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData.errorAnalysis} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="type" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card data-testid="response-time-sla">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Response Time SLA</p>
                <p className="text-lg font-semibold">&lt; {formatLatency(performanceData.slaMetrics.responseTimeTarget)}</p>
                <Progress value={performanceData.overview.slaCompliance} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="uptime-sla">
              <CardContent className="p-6 text-center">
                <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Uptime SLA</p>
                <p className="text-lg font-semibold">&gt; {performanceData.slaMetrics.uptimeTarget}%</p>
                <Progress value={performanceData.overview.uptime} className="mt-2" />
              </CardContent>
            </Card>

            <Card data-testid="success-rate-sla">
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Success Rate SLA</p>
                <p className="text-lg font-semibold">&gt; {performanceData.slaMetrics.successRateTarget}%</p>
                <Progress value={performanceData.overview.successRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card data-testid="sla-violations">
            <CardHeader>
              <CardTitle>Recent SLA Violations</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.slaMetrics.violations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No SLA violations in the selected period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {performanceData.slaMetrics.violations.map((violation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-red-50" data-testid={`sla-violation-${index}`}>
                      <div className="flex items-center space-x-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">{violation.metric}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(violation.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          {violation.metric.includes('Time') ? formatLatency(violation.value) : 
                           violation.metric.includes('Rate') ? `${violation.value.toFixed(1)}%` : violation.value}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Target: {violation.metric.includes('Time') ? formatLatency(violation.target) : 
                                   violation.metric.includes('Rate') ? `${violation.target.toFixed(1)}%` : violation.target}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}