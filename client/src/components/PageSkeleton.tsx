import { Skeleton } from "@/components/ui/skeleton";

export default function PageSkeleton() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 rounded-lg mb-2" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Content cards */}
      <div className="space-y-6">
        {/* Stat cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* Main content area */}
        <Skeleton className="h-64 rounded-2xl" />

        {/* List items */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
