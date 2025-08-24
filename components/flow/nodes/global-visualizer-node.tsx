'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, BarChart3, Network, GitBranch, Workflow, Brain, Zap } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as d3 from 'd3';
import mermaid from 'mermaid';

// Dynamic import for Plotly
const Plot = React.lazy(() => import('react-plotly.js'));

export interface GlobalVisualizerNodeData {
  id: string;
  query?: string;
  visualizationType?: 'auto' | 'chart' | 'diagram' | 'network' | 'flow' | 'mindmap';
  chartType?: 'bar' | 'line' | 'pie' | 'mermaid' | 'd3-network' | 'plotly' | 'flowchart' | 'mindmap';
  data?: any[];
  mermaidCode?: string;
  plotlyConfig?: any;
  networkData?: {
    nodes: Array<{ id: string; name: string; group: number }>;
    links: Array<{ source: string; target: string; value: number }>;
  };
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  timestamp?: string;
  processingTime?: number;
}

interface GlobalVisualizerNodeProps {
  data: GlobalVisualizerNodeData;
  selected?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const visualizationIcons = {
  auto: Brain,
  chart: BarChart3,
  diagram: GitBranch,
  network: Network,
  flow: Workflow,
  mindmap: Zap,
};

const GlobalVisualizerNode: React.FC<GlobalVisualizerNodeProps> = ({ data, selected }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const d3Ref = useRef<SVGSVGElement>(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  // Render Mermaid diagrams
  useEffect(() => {
    if (data.mermaidCode && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      mermaid.render('mermaid-' + data.id, data.mermaidCode, (svgCode) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svgCode;
        }
      });
    }
  }, [data.mermaidCode, data.id]);

  // Render D3 network graphs
  useEffect(() => {
    if (data.networkData && d3Ref.current) {
      const svg = d3.select(d3Ref.current);
      svg.selectAll('*').remove();

      const width = 400;
      const height = 300;
      const { nodes, links } = data.networkData;

      const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d: any) => Math.sqrt(d.value));

      const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', 8)
        .attr('fill', (d: any) => COLORS[d.group % COLORS.length])
        .call(d3.drag() as any);

      const label = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .text((d: any) => d.name)
        .attr('font-size', '12px')
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
  }, [data.networkData]);

  const handleAnalyze = async () => {
    if (!data.query) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: data.query,
          chartType: data.chartType || 'auto',
          visualizationType: data.visualizationType || 'auto',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze visualization');
      }

      const result = await response.json();
      // Update node data through flow store or parent component
      console.log('Visualization result:', result);
    } catch (error) {
      console.error('Error analyzing visualization:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderVisualization = () => {
    if (data.isLoading || isAnalyzing) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Analyzing and generating visualization...</span>
        </div>
      );
    }

    if (data.error) {
      return (
        <div className="flex items-center justify-center h-64 text-red-500">
          <p>Error: {data.error}</p>
        </div>
      );
    }

    if (!data.data && !data.mermaidCode && !data.plotlyConfig && !data.networkData) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Eye className="h-12 w-12 mb-2" />
          <p>No visualization data available</p>
          {data.query && (
            <Button onClick={handleAnalyze} className="mt-4" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Generate Visualization'
              )}
            </Button>
          )}
        </div>
      );
    }

    switch (data.chartType) {
      case 'mermaid':
      case 'flowchart':
      case 'mindmap':
        return (
          <div className="w-full h-64 overflow-auto">
            <div ref={mermaidRef} className="mermaid-container" />
          </div>
        );

      case 'd3-network':
        return (
          <div className="w-full h-64">
            <svg ref={d3Ref} width="100%" height="100%" />
          </div>
        );

      case 'plotly':
        return (
          <div className="w-full h-64">
            <React.Suspense fallback={<div>Loading Plotly...</div>}>
              <Plot
                data={data.plotlyConfig?.data || []}
                layout={{
                  ...data.plotlyConfig?.layout,
                  width: 400,
                  height: 250,
                  margin: { t: 30, r: 30, b: 30, l: 30 },
                }}
                config={{ displayModeBar: false }}
              />
            </React.Suspense>
          </div>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
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
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={Array.isArray(data.data) ? data.data : []}
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

      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Unsupported visualization type: {data.chartType}</p>
          </div>
        );
    }
  };

  const IconComponent = visualizationIcons[data.visualizationType || 'auto'];

  return (
    <div className={`min-w-[400px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Left} />

      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <IconComponent className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Global Visualizer</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {data.visualizationType && (
                <Badge variant="secondary">
                  {data.visualizationType.toUpperCase()}
                </Badge>
              )}
              {data.chartType && (
                <Badge variant="outline">
                  {data.chartType?.toUpperCase() || 'CHART'}
                </Badge>
              )}
            </div>
          </div>
          {data.title && (
            <p className="text-sm font-medium text-gray-700">{data.title}</p>
          )}
          {data.description && (
            <p className="text-xs text-gray-500">{data.description}</p>
          )}
        </CardHeader>

        <CardContent>
          {renderVisualization()}

          {data.timestamp && (
            <div className="mt-4 flex justify-between text-xs text-gray-400">
              <span>Generated: {new Date(data.timestamp).toLocaleTimeString()}</span>
              {data.processingTime && (
                <span>Processing: {data.processingTime}ms</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default GlobalVisualizerNode;