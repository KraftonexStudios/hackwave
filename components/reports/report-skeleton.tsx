import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-24" /> {/* Back button */}
          <div>
            <Skeleton className="h-8 w-48 mb-2" /> {/* Title */}
            <Skeleton className="h-4 w-64" /> {/* Description */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" /> {/* Generate button */}
          <Skeleton className="h-10 w-10" /> {/* More actions */}
        </div>
      </div>

      {/* Session Overview Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" /> {/* Title */}
              <Skeleton className="h-4 w-96" /> {/* Description */}
            </div>
            <Skeleton className="h-6 w-20" /> {/* Status badge */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-8 mx-auto mb-2" /> {/* Number */}
                <Skeleton className="h-4 w-16 mx-auto" /> {/* Label */}
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <Skeleton className="h-5 w-32 mb-2" /> {/* Agents title */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-24" /> /* Agent badges */
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <Skeleton className="h-5 w-24 mb-2" /> {/* Description title */}
            <Skeleton className="h-4 w-full" /> {/* Description text */}
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs Skeleton */}
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" /> /* Tab buttons */
          ))}
        </div>

        {/* Report Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" /> {/* Report title */}
              <Skeleton className="h-4 w-64" /> {/* Report description */}
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" /> {/* Generate button */}
              <Skeleton className="h-9 w-16" /> {/* PDF button */}
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-28 mb-2" /> {/* Report type */}
                  <Skeleton className="h-4 w-48" /> {/* Generated date */}
                </div>
                <Skeleton className="h-6 w-16" /> {/* Type badge */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" style={{ width: `${Math.random() * 40 + 60}%` }} />
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Skeleton className="h-4 w-32 mb-2" /> {/* Metadata title */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-20" /> /* Metadata items */
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}