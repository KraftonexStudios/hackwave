'use client';

import React, { useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mermaid } from './mermaid';
import ChartRenderer from './chart-renderer';
import { cn } from '@/lib/utils';

// Memoize regex patterns for better performance
const MERMAID_REGEX = /```mermaid\n([\s\S]*?)\n```/g;
const CHART_REGEX = /```chart\s+(\w+)\n([\s\S]*?)\n```/g;

interface MarkdownRendererProps {
  content: string;
  className?: string;
  children?: React.ReactNode;
}

export const MarkdownRenderer = memo(({ content, className, children }: MarkdownRendererProps) => {
  // Memoize content processing for better performance
  const { processedContent, mermaidDiagrams, chartBlocks } = useMemo(() => {
    const mermaidDiagrams: string[] = [];
    const chartBlocks: Array<{ type: string; data: string }> = [];

    // Reset regex lastIndex to ensure consistent behavior
    MERMAID_REGEX.lastIndex = 0;
    CHART_REGEX.lastIndex = 0;

    let processedContent = content.replace(MERMAID_REGEX, (match, diagram) => {
      const index = mermaidDiagrams.length;
      mermaidDiagrams.push(diagram.trim());
      return `__MERMAID_PLACEHOLDER_${index}__`;
    });

    processedContent = processedContent.replace(CHART_REGEX, (match, type, data) => {
      const index = chartBlocks.length;
      chartBlocks.push({ type: type.trim(), data: data.trim() });
      return `__CHART_PLACEHOLDER_${index}__`;
    });

    return { processedContent, mermaidDiagrams, chartBlocks };
  }, [content]);

  // Memoize components object to prevent recreation on every render
  const components = useMemo(() => ({
    // Custom rendering for various markdown elements
    h1: ({ children, ...props }: React.ComponentProps<'h1'>) => (
      <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: React.ComponentProps<'h2'>) => (
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: React.ComponentProps<'h3'>) => (
      <h3 className="text-base font-medium mb-2 text-gray-700 dark:text-gray-300" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }: React.ComponentProps<'p'>) => {
      // Check if this paragraph contains a Mermaid or Chart placeholder
      const childText = React.Children.toArray(children)
        .map(child => {
          if (typeof child === 'string') return child;
          if (child && typeof child === 'object' && 'props' in child && child.props && child.props.children) {
            return child.props.children;
          }
          return '';
        })
        .join('')
        .trim();

      const mermaidMatch = childText.match(/^_*MERMAID_PLACEHOLDER_(\d+)_*$/);
      const chartMatch = childText.match(/^_*CHART_PLACEHOLDER_(\d+)_*$/);

      if (mermaidMatch) {
        const index = parseInt(mermaidMatch[1]);
        const diagram = mermaidDiagrams[index];
        return diagram ? (
          <div className="my-4">
            <Mermaid chart={diagram} className="max-w-full" />
          </div>
        ) : null;
      }

      if (chartMatch) {
        const index = parseInt(chartMatch[1]);
        const chart = chartBlocks[index];
        return chart ? (
          <div className="my-4">
            <ChartRenderer
              type={chart.type}
              data={chart.data}
              className="max-w-full"
            />
          </div>
        ) : null;
      }

      return (
        <p className="mb-2 text-sm text-muted-foreground leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
    ul: ({ children, ...props }: React.ComponentProps<'ul'>) => (
      <ul className="list-disc list-inside mb-2 text-sm text-muted-foreground space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: React.ComponentProps<'ol'>) => (
      <ol className="list-decimal list-inside mb-2 text-sm text-muted-foreground space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: React.ComponentProps<'li'>) => (
      <li className="text-sm" {...props}>
        {children}
      </li>
    ),
    code: ({ inline, children, ...props }: React.ComponentProps<'code'> & { inline?: boolean }) => {
      if (inline) {
        return (
          <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground" {...props}>
            {children}
          </code>
        );
      }
      // For block code, just return the code element - pre will be handled separately
      return (
        <code className="text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }: React.ComponentProps<'pre'>) => (
      <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2 text-foreground" {...props}>
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }: React.ComponentProps<'blockquote'>) => (
      <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground mb-2" {...props}>
        {children}
      </blockquote>
    ),
    table: ({ children, ...props }: React.ComponentProps<'table'>) => (
      <div className="overflow-x-auto mb-2">
        <table className="min-w-full border border-border text-xs" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: React.ComponentProps<'th'>) => (
      <th className="border border-border px-2 py-1 bg-muted font-medium text-foreground" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: React.ComponentProps<'td'>) => (
      <td className="border border-border px-2 py-1 text-foreground" {...props}>
        {children}
      </td>
    ),
    strong: ({ children, ...props }: React.ComponentProps<'strong'>) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }: React.ComponentProps<'em'>) => (
      <em className="italic text-muted-foreground" {...props}>
        {children}
      </em>
    ),
  }), [mermaidDiagrams, chartBlocks]);

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;