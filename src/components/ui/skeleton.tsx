import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      className={cn(
        "animate-pulse rounded-xl bg-zinc-800/50",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" data-testid="page-skeleton">
      <div className="text-center space-y-3">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
