export const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-4">
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
  </div>
);
