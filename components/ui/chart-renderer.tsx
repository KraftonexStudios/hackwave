'use client';

import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Dynamic imports for better performance
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Lazy load Chart.js components only when needed
const ChartComponents = {
  Line: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })), { ssr: false }),
  Bar: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })), { ssr: false }),
  Pie: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Pie })), { ssr: false }),
  Doughnut: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })), { ssr: false }),
  Radar: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Radar })), { ssr: false }),
  PolarArea: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.PolarArea })), { ssr: false }),
  Scatter: dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Scatter })), { ssr: false }),
};

// Lazy load D3 only when needed
let d3: any = null;
const loadD3 = async () => {
  if (!d3) {
    d3 = await import('d3');
  }
  return d3;
};

// Lazy load and register Chart.js components only when needed
let chartJSRegistered = false;
const registerChartJS = async () => {
  if (!chartJSRegistered) {
    const chartModule = await import('chart.js');
    const {
      Chart: ChartJS,
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      ArcElement,
      RadialLinearScale,
    } = chartModule;

    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      ArcElement,
      RadialLinearScale
    );
    chartJSRegistered = true;
  }
};



// Theme-aware color utilities
const getThemeColors = (isDark: boolean) => {
  if (isDark) {
    return {
      text: 'hsl(0 0% 98%)',
      textMuted: 'hsl(0 0% 63.9%)',
      background: 'hsl(0 0% 3.9%)',
      border: 'hsl(0 0% 14.9%)',
      grid: 'hsl(0 0% 14.9%)',
      chartColors: [
        'hsl(220 70% 50%)', // chart-1
        'hsl(160 60% 45%)', // chart-2
        'hsl(30 80% 55%)',  // chart-3
        'hsl(280 65% 60%)', // chart-4
        'hsl(340 75% 55%)', // chart-5
      ],
    };
  }
  return {
    text: 'hsl(0 0% 3.9%)',
    textMuted: 'hsl(0 0% 45.1%)',
    background: 'hsl(0 0% 100%)',
    border: 'hsl(0 0% 89.8%)',
    grid: 'hsl(0 0% 89.8%)',
    chartColors: [
      'hsl(12 76% 61%)',  // chart-1
      'hsl(173 58% 39%)', // chart-2
      'hsl(197 37% 24%)', // chart-3
      'hsl(43 74% 66%)',  // chart-4
      'hsl(27 87% 67%)',  // chart-5
    ],
  };
};

const getChartJsOptions = (isDark: boolean, userOptions: any = {}) => {
  const colors = getThemeColors(isDark);

  return {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: colors.text,
        },
      },
      tooltip: {
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.border,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.textMuted,
        },
        grid: {
          color: colors.grid,
        },
        border: {
          color: colors.border,
        },
      },
      y: {
        ticks: {
          color: colors.textMuted,
        },
        grid: {
          color: colors.grid,
        },
        border: {
          color: colors.border,
        },
      },
    },
    ...userOptions,
  };
};

const applyThemeToChartData = (data: any, isDark: boolean) => {
  const colors = getThemeColors(isDark);

  if (!data || !data.datasets) return data;

  const themedData = { ...data };
  themedData.datasets = data.datasets.map((dataset: any, index: number) => {
    const colorIndex = index % colors.chartColors.length;
    const baseColor = colors.chartColors[colorIndex];

    return {
      ...dataset,
      backgroundColor: dataset.backgroundColor || baseColor.replace(')', ', 0.6)').replace('hsl(', 'hsla('),
      borderColor: dataset.borderColor || baseColor,
      pointBackgroundColor: dataset.pointBackgroundColor || baseColor,
      pointBorderColor: dataset.pointBorderColor || colors.background,
    };
  });

  return themedData;
};

interface ChartRendererProps {
  type: string;
  data: string | any;
  config?: string;
  options?: any;
  width?: number;
  height?: number;
  className?: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = memo(({
  type,
  data,
  config = '',
  options = {},
  width = 600,
  height = 400,
  className = '',
}) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const d3Ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidData, setIsValidData] = useState<boolean>(false);

  // Memoize parsed data to prevent unnecessary re-parsing
  const parsedData = useMemo(() => {
    if (!data) return null;

    try {
      if (typeof data === 'string') {
        const cleanedData = data.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        if (!cleanedData) return null;
        return JSON.parse(cleanedData);
      }
      return data;
    } catch (parseErr) {
      console.warn('Chart data parsing failed:', parseErr);
      return null;
    }
  }, [data]);

  // Memoize parsed config
  const parsedConfig = useMemo(() => {
    if (!config) return {};

    try {
      if (typeof config === 'string') {
        const cleanedConfig = config.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        if (!cleanedConfig) return {};
        return JSON.parse(cleanedConfig);
      }
      return config;
    } catch (parseErr) {
      console.warn('Chart config parsing failed:', parseErr);
      return {};
    }
  }, [config]);

  // Initialize Chart.js when needed
  useEffect(() => {
    const initializeChart = async () => {
      if (['line', 'bar', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter'].includes(type.toLowerCase())) {
        await registerChartJS();
      }
    };

    initializeChart();
  }, [type]);

  useEffect(() => {
    setIsLoading(true);
    setIsValidData(false);

    // Add a small delay to prevent flickering
    const timer = setTimeout(() => {
      try {
        // Validate parsed data
        if (!parsedData || (typeof parsedData === 'object' && Object.keys(parsedData).length === 0)) {
          setError(null);
          setIsValidData(false);
          setIsLoading(false);
          return;
        }

        // Validate data structure for Chart.js types
        if (['line', 'bar', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter'].includes(type.toLowerCase())) {
          if (!parsedData.datasets || !Array.isArray(parsedData.datasets)) {
            setError(null);
            setIsValidData(false);
            setIsLoading(false);
            return;
          }
        }

        setError(null);
        setIsValidData(true);
      } catch (err) {
        // Log error but don't show to user
        console.warn('Chart rendering error:', err);
        setError(null);
        setIsValidData(false);
      } finally {
        setIsLoading(false);
      }
    }, 100); // Small delay to prevent flickering

    return () => clearTimeout(timer);
  }, [parsedData, type]);

  useEffect(() => {
    if (type.startsWith('d3-') && d3Ref.current && parsedData) {
      renderD3Chart();
    }
  }, [type, parsedData, parsedConfig]);

  const renderD3Chart = () => {
    if (!d3Ref.current || !parsedData) return;

    // Clear previous chart
    d3.select(d3Ref.current).selectAll('*').remove();

    const svg = d3
      .select(d3Ref.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    try {
      const chartType = parsedConfig.chartType || type.replace('d3-', '');
      switch (chartType) {
        case 'bar':
          renderD3BarChart(svg, parsedData, width, height);
          break;
        case 'line':
          renderD3LineChart(svg, parsedData, width, height);
          break;
        case 'scatter':
          renderD3ScatterPlot(svg, parsedData, width, height);
          break;
        case 'pie':
          renderD3PieChart(svg, parsedData, width, height);
          break;
        default:
          setError(`Unsupported D3 chart type: ${chartType}`);
      }
    } catch (err) {
      setError(`Error rendering D3 chart: ${err}`);
    }
  };

  const renderD3BarChart = (svg: any, data: any[], width: number, height: number) => {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const colors = getThemeColors(isDark);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 0])
      .range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => xScale(d.label) || 0)
      .attr('y', (d: any) => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', (d: any) => innerHeight - yScale(d.value))
      .attr('fill', colors.chartColors[0]);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', colors.textMuted);

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', colors.textMuted);

    // Style axis lines
    g.selectAll('.domain')
      .style('stroke', colors.border);
    g.selectAll('.tick line')
      .style('stroke', colors.grid);
  };

  const renderD3LineChart = (svg: any, data: any[], width: number, height: number) => {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const colors = getThemeColors(isDark);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.x) as [number, number])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.y) as [number, number])
      .range([innerHeight, 0]);

    const line = d3
      .line<any>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colors.chartColors[1])
      .attr('stroke-width', 2)
      .attr('d', line);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', colors.textMuted);

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', colors.textMuted);

    // Style axis lines
    g.selectAll('.domain')
      .style('stroke', colors.border);
    g.selectAll('.tick line')
      .style('stroke', colors.grid);
  };

  const renderD3ScatterPlot = (svg: any, data: any[], width: number, height: number) => {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const colors = getThemeColors(isDark);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.x) as [number, number])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.y) as [number, number])
      .range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d: any) => xScale(d.x))
      .attr('cy', (d: any) => yScale(d.y))
      .attr('r', 4)
      .attr('fill', colors.chartColors[2]);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', colors.textMuted);

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', colors.textMuted);

    // Style axis lines
    g.selectAll('.domain')
      .style('stroke', colors.border);
    g.selectAll('.tick line')
      .style('stroke', colors.grid);
  };

  const renderD3PieChart = (svg: any, data: any[], width: number, height: number) => {
    const radius = Math.min(width, height) / 2 - 10;
    const colors = getThemeColors(isDark);

    const pie = d3.pie<any>().value((d) => d.value);
    const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const arcs = g
      .selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any, i: number) => colors.chartColors[i % colors.chartColors.length]);

    arcs
      .append('text')
      .attr('transform', (d: any) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('fill', colors.text)
      .text((d: any) => d.data.label);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
        <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border border-border">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Loading chart...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show placeholder for invalid data (no error message to user)
  if (!isValidData || !parsedData) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
        <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border border-border">
          <p className="text-muted-foreground text-sm">Chart preview unavailable</p>
        </div>
      </div>
    );
  }

  // Chart.js components
  const chartJsComponents = {
    line: ChartComponents.Line,
    bar: ChartComponents.Bar,
    pie: ChartComponents.Pie,
    doughnut: ChartComponents.Doughnut,
    radar: ChartComponents.Radar,
    polarArea: ChartComponents.PolarArea,
    scatter: ChartComponents.Scatter,
  };

  // Handle chart type with config
  const actualType = parsedConfig.chartType || type;
  const ChartComponent = chartJsComponents[actualType as keyof typeof chartJsComponents];

  if (ChartComponent) {
    const themedData = applyThemeToChartData(parsedData, isDark);
    const themedOptions = getChartJsOptions(isDark, { ...options, ...parsedConfig.options });

    return (
      <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
        <ChartComponent
          data={themedData}
          options={themedOptions}
        />
      </div>
    );
  }

  // Plotly charts
  if (type === 'plotly' || type.startsWith('plotly-')) {
    const colors = getThemeColors(isDark);

    return (
      <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
        <Plot
          data={parsedData.data || parsedData}
          layout={{
            width,
            height,
            title: parsedConfig.title || options.title || '',
            paper_bgcolor: colors.background,
            plot_bgcolor: colors.background,
            font: {
              color: colors.text,
            },
            xaxis: {
              gridcolor: colors.grid,
              linecolor: colors.border,
              tickcolor: colors.textMuted,
              tickfont: { color: colors.textMuted },
            },
            yaxis: {
              gridcolor: colors.grid,
              linecolor: colors.border,
              tickcolor: colors.textMuted,
              tickfont: { color: colors.textMuted },
            },
            ...options.layout,
            ...parsedConfig.layout,
          }}
          config={{ responsive: true, ...parsedConfig.config }}
        />
      </div>
    );
  }

  // D3 charts
  if (type === 'd3' || type.startsWith('d3-')) {
    return (
      <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
        <div ref={d3Ref} className="chart-container" />
      </div>
    );
  }

  return (
    <div className={`p-4 border border-destructive/50 rounded-md bg-destructive/10 ${className}`}>
      <p className="text-destructive">Unsupported chart type: {actualType}</p>
    </div>
  );
});

export default ChartRenderer;