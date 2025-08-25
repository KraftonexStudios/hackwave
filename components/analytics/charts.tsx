'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Activity } from 'lucide-react';

interface SessionOverTimeData {
  date: string;
  count: number;
}

interface SessionStatusData {
  status: string;
  count: number;
  fill: string;
}

interface AgentPerformanceData {
  agent: string;
  confidence: number;
  responses: number;
}

interface ResponseDistributionData {
  agent: string;
  count: number;
}

interface SessionOverTimeChartProps {
  data: SessionOverTimeData[];
  chartConfig: any;
}

interface SessionStatusChartProps {
  data: SessionStatusData[];
  chartConfig: any;
}

interface AgentPerformanceChartProps {
  data: AgentPerformanceData[];
  chartConfig: any;
}

interface ResponseDistributionChartProps {
  data: ResponseDistributionData[];
  chartConfig: any;
}

export function SessionOverTimeChart({ data, chartConfig }: SessionOverTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 opacity-50 mb-2" />
          <p>No session data available</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <YAxis />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--color-sessions)"
          fill="var(--color-sessions)"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function SessionStatusChart({ data, chartConfig }: SessionStatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 opacity-50 mb-2" />
          <p>No status data available</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}

export function AgentPerformanceChart({ data, chartConfig }: AgentPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 opacity-50 mb-2" />
          <p>No agent performance data available</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="agent" />
        <YAxis yAxisId="left" orientation="left" />
        <YAxis yAxisId="right" orientation="right" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          yAxisId="left"
          dataKey="confidence"
          fill="var(--color-confidence)"
          name="Avg Confidence"
        />
        <Bar
          yAxisId="right"
          dataKey="responses"
          fill="var(--color-responses)"
          name="Response Count"
        />
      </BarChart>
    </ChartContainer>
  );
}

export function ResponseDistributionChart({ data, chartConfig }: ResponseDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 opacity-50 mb-2" />
          <p>No response distribution data available</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="agent" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-responses)" />
      </BarChart>
    </ChartContainer>
  );
}