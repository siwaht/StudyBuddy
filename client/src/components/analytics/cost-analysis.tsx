import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, 
  Clock, Bot, BarChart3, Target, Zap 
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, Area, AreaChart
} from "recharts";
import { ResponsiveChart, MobileTooltip } from '@/components/ui/responsive-chart';
import { useIsMobile } from '@/hooks/use-mobile';

interface CostAnalysisData {
  overview: {
    totalCost: number;
    avgCostPerCall: number;
    avgCostPerMinute: number;
    predictedMonthlyCost: number;
    costTrend: number; // percentage change
    topCostAgent: {
      id: string;
      name: string;
      cost: number;
    };
  };
  agentBreakdown: Array<{
    agentId: string;
    agentName: string;
    platform: string;
    totalCost: number;
    callCount: number;
    avgCostPerCall: number;
    costPercentage: number;
    trend: number;
  }>;
  timeSeries: Array<{
    date: string;
    cost: number;
    calls: number;
    avgCostPerCall: number;
  }>;
  predictions: {
    nextMonth: number;
    nextQuarter: number;
    yearlyProjection: number;
    recommendations: Array<{
      type: 'optimization' | 'alert' | 'suggestion';
      message: string;
      potentialSavings: number;
    }>;
  };
}

interface CostAnalysisProps {
  dateRange: { from: Date; to: Date };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export default function CostAnalysis({ dateRange }: CostAnalysisProps) {
  const isMobile = useIsMobile();
  const [timeGrouping, setTimeGrouping] = useState<'day' | 'week' | 'month'>('day');
  
  const { data: costData, isLoading } = useQuery<CostAnalysisData>({
    queryKey: ['/api/analytics/costs', dateRange.from, dateRange.to, timeGrouping],
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

  if (!costData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No cost data available for the selected period.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatTrend = (trend: number) => {
    const isPositive = trend > 0;
    return (
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span className="text-xs font-medium">{Math.abs(trend).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="cost-analysis">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="total-cost-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Total Cost</p>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2">{formatCurrency(costData.overview.totalCost)}</p>
            {formatTrend(costData.overview.costTrend)}
          </CardContent>
        </Card>

        <Card data-testid="cost-per-call-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Avg Cost/Call</p>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2">{formatCurrency(costData.overview.avgCostPerCall)}</p>
            <p className="text-xs text-muted-foreground">Per minute: {formatCurrency(costData.overview.avgCostPerMinute)}</p>
          </CardContent>
        </Card>

        <Card data-testid="predicted-cost-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Monthly Projection</p>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-semibold mb-2">{formatCurrency(costData.overview.predictedMonthlyCost)}</p>
            <p className="text-xs text-muted-foreground">Based on current usage</p>
          </CardContent>
        </Card>

        <Card data-testid="top-agent-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-muted-foreground font-medium">Top Cost Agent</p>
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">{costData.overview.topCostAgent.name}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(costData.overview.topCostAgent.cost)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="trends" data-testid="tab-cost-trends">Cost Trends</TabsTrigger>
            <TabsTrigger value="breakdown" data-testid="tab-agent-breakdown">Agent Breakdown</TabsTrigger>
            <TabsTrigger value="predictions" data-testid="tab-predictions">Predictions</TabsTrigger>
          </TabsList>
          
          <Select value={timeGrouping} onValueChange={(value: any) => setTimeGrouping(value)}>
            <SelectTrigger className="w-32" data-testid="select-time-grouping">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="trends" className="space-y-4">
          <Card data-testid="cost-trends-chart">
            <CardHeader>
              <CardTitle>Cost Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costData.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'cost' ? formatCurrency(value) : value,
                        name === 'cost' ? 'Total Cost' : name === 'calls' ? 'Calls' : 'Avg Cost/Call'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="agent-cost-pie-chart">
              <CardHeader>
                <CardTitle>Cost Distribution by Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costData.agentBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="totalCost"
                        nameKey="agentName"
                      >
                        {costData.agentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="agent-cost-table">
              <CardHeader>
                <CardTitle>Agent Cost Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  {costData.agentBreakdown.map((agent, index) => (
                    <div key={agent.agentId} className="p-4 border-b last:border-b-0" data-testid={`agent-cost-${index}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{agent.agentName}</p>
                          <Badge variant="outline" className="text-xs">
                            {agent.platform}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(agent.totalCost)}</p>
                          {formatTrend(agent.trend)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p>Calls: {agent.callCount}</p>
                          <p>Avg/Call: {formatCurrency(agent.avgCostPerCall)}</p>
                        </div>
                        <div>
                          <p>Share: {agent.costPercentage.toFixed(1)}%</p>
                          <Progress value={agent.costPercentage} className="h-2 mt-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card data-testid="next-month-prediction">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Next Month</p>
                <p className="text-2xl font-semibold">{formatCurrency(costData.predictions.nextMonth)}</p>
              </CardContent>
            </Card>

            <Card data-testid="next-quarter-prediction">
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Next Quarter</p>
                <p className="text-2xl font-semibold">{formatCurrency(costData.predictions.nextQuarter)}</p>
              </CardContent>
            </Card>

            <Card data-testid="yearly-projection">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">Yearly Projection</p>
                <p className="text-2xl font-semibold">{formatCurrency(costData.predictions.yearlyProjection)}</p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="cost-recommendations">
            <CardHeader>
              <CardTitle>Cost Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costData.predictions.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50" data-testid={`recommendation-${index}`}>
                    <div className={`p-2 rounded-full ${
                      rec.type === 'optimization' ? 'bg-green-100 text-green-600' :
                      rec.type === 'alert' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {rec.type === 'optimization' ? <Zap className="h-4 w-4" /> :
                       rec.type === 'alert' ? <AlertTriangle className="h-4 w-4" /> :
                       <Target className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{rec.message}</p>
                      {rec.potentialSavings > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Potential savings: {formatCurrency(rec.potentialSavings)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}