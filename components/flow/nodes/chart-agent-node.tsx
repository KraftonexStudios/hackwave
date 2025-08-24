'use client';

import React, { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Loader2, Network, GitBranch, Workflow } from 'lucide-react';
import * as d3 from 'd3';
import mermaid from 'mermaid';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartAgentNodeData {
  id: string;
  query?: string;
  chartType: 'bar' | 'line' | 'pie' | 'mermaid' | 'd3-network' | 'plotly' | 'flowchart' | 'mindmap';
  data: ChartData[] | any;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  timestamp?: string;
  processingTime?: number;
  mermaidCode?: string;
  plotlyConfig?: any;
  networkData?: {
    nodes: Array<{ id: string; name: string; group?: number }>;
    links: Array<{ source: string; target: string; value?: number }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const chartIcons = {
  bar: BarChart3,
  line: TrendingUp,
  pie: PieChartIcon,
  mermaid: GitBranch,
  'd3-network': Network,
  plotly: BarChart3,
  flowchart: Workflow,
  mindmap: Network,
};

export function ChartAgentNode({ data }: { data: ChartAgentNodeData }) {
  const ChartIcon = chartIcons[data.chartType] || BarChart3;
  const mermaidRef = useRef<HTMLDivElement>(null);
  const d3Ref = useRef<HTMLDivElement>(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });
  }, []);

  // Render Mermaid diagram
  useEffect(() => {
    if (data.chartType === 'mermaid' && data.mermaidCode && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      const element = document.createElement('div');
      element.className = 'mermaid';
      element.textContent = data.mermaidCode;
      mermaidRef.current.appendChild(element);
      mermaid.init(undefined, element);
    }
  }, [data.mermaidCode, data.chartType]);

  // Render D3 Network Graph
  useEffect(() => {
    if (data.chartType === 'd3-network' && data.networkData && d3Ref.current) {
      const container = d3Ref.current;
      d3.select(container).selectAll('*').remove();

      const width = 350;
      const height = 250;

      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const simulation = d3.forceSimulation(data.networkData.nodes)
        .force('link', d3.forceLink(data.networkData.links).id((d: any) => d.id))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const link = svg.append('g')
        .selectAll('line')
        .data(data.networkData.links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d: any) => Math.sqrt(d.value || 1));

      const node = svg.append('g')
        .selectAll('circle')
        .data(data.networkData.nodes)
        .enter().append('circle')
        .attr('r', 8)
        .attr('fill', (d: any) => d3.schemeCategory10[d.group || 0])
        .call(d3.drag()
          .on('start', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }));

      const label = svg.append('g')
        .selectAll('text')
        .data(data.networkData.nodes)
        .enter().append('text')
        .text((d: any) => d.name)
        .attr('font-size', 10)
        .attr('dx', 12)
        .attr('dy', 4);

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);

        label
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      });
    }
  }, [data.networkData, data.chartType]);

  const renderChart = () => {
    if (data.isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Generating chart...</span>
          </div>
        </div>
      );
    }

    if (data.error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-red-500 mb-2">Error generating chart</p>
            <p className="text-xs text-muted-foreground">{data.error}</p>
          </div>
        </div>
      );
    }

    if (!data.data || data.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      );
    }

    switch (data.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {Array.isArray(data.data) && data.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'mermaid':
      case 'flowchart':
      case 'mindmap':
        return (
          <div className="w-full h-64 overflow-auto">
            <div ref={mermaidRef} className="flex justify-center items-center min-h-full" />
          </div>
        );

      case 'd3-network':
        return (
          <div className="w-full h-64">
            <div ref={d3Ref} className="flex justify-center items-center w-full h-full" />
          </div>
        );

      case 'plotly':
        return data.plotlyConfig ? (
          <Plot
            data={data.plotlyConfig.data}
            layout={{
              ...data.plotlyConfig.layout,
              width: 350,
              height: 250,
              margin: { l: 40, r: 40, t: 40, b: 40 }
            }}
            config={{ displayModeBar: false, responsive: true }}
          />
        ) : (
          <div className="text-center text-muted-foreground">No Plotly configuration available</div>
        );

      default:
        return <div className="text-center text-muted-foreground">Unsupported chart type: {data.chartType}</div>;
    }
  };

  return (
    <div className="w-[400px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <Card className="border-2 shadow-lg bg-white dark:bg-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <ChartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">
                {data.title || 'Chart Analysis'}
              </CardTitle>
              {data.query && (
                <p className="text-sm text-muted-foreground mt-1">
                  Query: {data.query}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {data.chartType?.toUpperCase() || 'CHART'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {data.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {data.description}
            </p>
          )}

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            {renderChart()}
          </div>

          {data.timestamp && data.processingTime && (
            <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
              <span>Generated: {new Date(data.timestamp).toLocaleTimeString()}</span>
              <span>Processing: {data.processingTime}ms</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export type { ChartAgentNodeData };