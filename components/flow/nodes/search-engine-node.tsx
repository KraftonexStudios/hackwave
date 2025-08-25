'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, ExternalLink, Clock, Globe } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp?: string;
  relevanceScore?: number;
}

interface SearchEngineNodeData {
  query: string;
  results: SearchResult[];
  timestamp: string;
  totalResults?: number;
  processingTime?: number;
  isLoading?: boolean;
}

const getSourceColor = (source: string) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getSourceInitials = (source: string) => {
  return source.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

export function SearchEngineNode({ data }: { data: SearchEngineNodeData }) {
  const displayResults = data.results?.slice(0, 5) || [];

  // Debug logging
  console.log('🔍 SearchEngineNode render:', {
    query: data.query,
    resultsCount: data.results?.length || 0,
    isLoading: data.isLoading,
    totalResults: data.totalResults,
    processingTime: data.processingTime,
    displayResultsCount: displayResults.length
  });

  return (
    <div className="w-[700px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <Card className="border-2 shadow-lg border-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                Search Engine Results
                {data.isLoading && (
                  <div className="flex items-center space-x-1">
                    <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full"></div>
                    <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                    <div className="animate-pulse w-1 h-1 bg-blue-500 rounded-full" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Globe className="h-3 w-3" />
                <span>Query: "{data.query}"</span>
                {data.processingTime && (
                  <>
                    <span>•</span>
                    <span>{data.processingTime}ms</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {data.totalResults || displayResults.length} results
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {data.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <div className="animate-spin w-4 h-4 border border-muted border-t-primary rounded-full"></div>
                <span className="text-sm">Fetching web results via ScraperAPI...</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {displayResults.map((result, index) => {
                const sourceColor = getSourceColor(result.source);
                const sourceInitials = getSourceInitials(result.source);

                return (
                  <Card key={index} className="border hover:border-primary/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-6 w-6 flex-shrink-0" style={{ backgroundColor: sourceColor }}>
                          <AvatarFallback className="text-white text-xs font-semibold">
                            {sourceInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm text-primary hover:text-primary/80 cursor-pointer line-clamp-2">
                              {result.title}
                            </h4>
                            <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {result.snippet}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-green-600 truncate">
                              {result.source}
                            </span>
                            {result.relevanceScore && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {Math.round(result.relevanceScore * 100)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-center text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3 mr-1" />
            <span>Scraped at {data.timestamp}</span>
          </div>
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}