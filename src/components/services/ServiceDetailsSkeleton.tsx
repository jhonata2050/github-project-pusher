import { Skeleton } from "@/components/ui/skeleton";

export function ServiceDetailsSkeleton() {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
      <Skeleton className="h-64 rounded-3xl md:col-span-2" />
      <Skeleton className="h-64 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}
