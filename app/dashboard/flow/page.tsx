'use client';

import { FlowVisualization } from '@/components/flow/flow-visualization';
import { Card } from '@/components/ui/card';

export default function FlowPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Debate Flow Visualization</h1>
          <p className="text-muted-foreground">
            Interactive visualization of AI agent debates and question distribution
          </p>
        </div>
        
        <Card className="h-[calc(100vh-200px)]">
          <FlowVisualization />
        </Card>
      </div>
    </div>
  );
}