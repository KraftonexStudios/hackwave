'use client';

import React, { useEffect, useRef, useState } from 'react';

// Dynamically import mermaid to reduce initial bundle size
let mermaidLib: any = null;
const loadMermaid = async () => {
  if (!mermaidLib) {
    const mermaidModule = await import('mermaid');
    mermaidLib = mermaidModule.default;
  }
  return mermaidLib;
};

interface MermaidProps {
  chart: string;
  className?: string;
}

// Basic syntax validation for common Mermaid diagram issues
const validateMermaidSyntax = (chart: string): { isValid: boolean; error?: string } => {
  if (!chart || typeof chart !== 'string') {
    return { isValid: false, error: 'Empty or invalid chart content' };
  }

  const trimmedChart = chart.trim();

  // Check for common syntax errors
  const commonErrors = [
    { pattern: /\|>(?!\s*[A-Za-z0-9_\[\(])/g, message: 'Invalid arrow syntax: |>' },
    // Removed overly restrictive arrow validation that was causing false positives
    { pattern: /TAGEND/g, message: 'Invalid TAGEND token found' },
    { pattern: /\[.*\|.*\]/g, message: 'Invalid node syntax with pipe character' },
  ];

  for (const error of commonErrors) {
    if (error.pattern.test(trimmedChart)) {
      return { isValid: false, error: error.message };
    }
  }

  // Check for basic diagram type declaration
  const hasValidDiagramType = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph|mindmap|timeline|quadrantChart|xyChart|block-beta)/.test(trimmedChart);

  if (!hasValidDiagramType) {
    return { isValid: false, error: 'Missing or invalid diagram type declaration' };
  }

  return { isValid: true };
};

export function Mermaid({ chart, className = '' }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const [isLoading, setIsLoading] = useState(true);
  const [mermaidReady, setMermaidReady] = useState(false);

  useEffect(() => {
    const initializeMermaid = async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          suppressErrorRendering: true,
        });
        setMermaidReady(true);
      } catch (error) {
        console.error('Failed to load Mermaid:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMermaid();
  }, []);

  useEffect(() => {
    if (ref.current && chart && mermaidReady && mermaidLib) {
      // Validate syntax before attempting to render
      const validation = validateMermaidSyntax(chart);

      if (!validation.isValid) {
        console.warn('Mermaid syntax validation failed:', validation.error);
        if (ref.current) {
          ref.current.innerHTML = `<div class="text-destructive text-sm p-3 border border-destructive/20 bg-destructive/10 rounded-lg">
            <div class="font-medium mb-1">Diagram Syntax Error</div>
            <div class="text-xs opacity-90">${validation.error}</div>
            <details class="mt-2">
              <summary class="text-xs cursor-pointer hover:opacity-80">Show diagram content</summary>
              <pre class="text-xs mt-1 p-2 bg-muted/50 rounded overflow-auto max-h-32">${chart.substring(0, 200)}${chart.length > 200 ? '...' : ''}</pre>
            </details>
          </div>`;
        }
        return;
      }

      try {
        // Clear any previous content
        if (ref.current) {
          ref.current.innerHTML = '<div class="text-muted-foreground text-sm">Rendering diagram...</div>';
        }

        mermaidLib.render(id.current, chart).then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        }).catch((error) => {
          console.error('Mermaid rendering error:', error);
          if (ref.current) {
            const errorMessage = error.message || 'Unknown rendering error';
            ref.current.innerHTML = `<div class="text-destructive text-sm p-3 border border-destructive/20 bg-destructive/10 rounded-lg">
              <div class="font-medium mb-1">Diagram Rendering Error</div>
              <div class="text-xs opacity-90">${errorMessage}</div>
              <details class="mt-2">
                <summary class="text-xs cursor-pointer hover:opacity-80">Show diagram content</summary>
                <pre class="text-xs mt-1 p-2 bg-muted/50 rounded overflow-auto max-h-32">${chart.substring(0, 200)}${chart.length > 200 ? '...' : ''}</pre>
              </details>
            </div>`;
          }
        });
      } catch (error) {
        console.error('Mermaid error:', error);
        if (ref.current) {
          const errorMessage = error instanceof Error ? error.message : 'Invalid diagram syntax';
          ref.current.innerHTML = `<div class="text-destructive text-sm p-3 border border-destructive/20 bg-destructive/10 rounded-lg">
            <div class="font-medium mb-1">Diagram Error</div>
            <div class="text-xs opacity-90">${errorMessage}</div>
            <details class="mt-2">
              <summary class="text-xs cursor-pointer hover:opacity-80">Show diagram content</summary>
              <pre class="text-xs mt-1 p-2 bg-muted/50 rounded overflow-auto max-h-32">${chart.substring(0, 200)}${chart.length > 200 ? '...' : ''}</pre>
            </details>
          </div>`;
        }
      }
    }
  }, [chart, mermaidReady, mermaidLib]);

  if (isLoading) {
    return (
      <div className={`mermaid-container ${className} flex items-center justify-center p-4`}>
        <div className="text-muted-foreground text-sm">Loading diagram...</div>
      </div>
    );
  }

  if (!mermaidReady) {
    return (
      <div className={`mermaid-container ${className} flex items-center justify-center p-4`}>
        <div className="text-destructive text-sm">Failed to load diagram renderer</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`mermaid-container ${className}`}
      style={{ textAlign: 'center' }}
    />
  );
}

export default Mermaid;