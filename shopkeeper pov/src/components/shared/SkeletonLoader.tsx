

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-2xl animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
        <div className="w-20 h-4 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
      </div>
      <div className="w-28 h-6 bg-slate-200 dark:bg-zinc-700 rounded-md"></div>
      <div className="w-16 h-3.5 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-slate-50 dark:border-dark-border/40">
      <td className="p-4"><div className="w-16 h-4 bg-slate-100 dark:bg-zinc-800 rounded-md"></div></td>
      <td className="p-4"><div className="w-32 h-4 bg-slate-200 dark:bg-zinc-700 rounded-md"></div></td>
      <td className="p-4"><div className="w-24 h-4 bg-slate-100 dark:bg-zinc-800 rounded-md"></div></td>
      <td className="p-4"><div className="w-12 h-4 bg-slate-100 dark:bg-zinc-800 rounded-md"></div></td>
      <td className="p-4"><div className="w-16 h-6 bg-slate-200 dark:bg-zinc-700 rounded-full"></div></td>
      <td className="p-4"><div className="w-14 h-4 bg-slate-100 dark:bg-zinc-800 rounded-md"></div></td>
    </tr>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <CardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-4 rounded-2xl animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
            <div className="space-y-2">
              <div className="w-36 h-4 bg-slate-200 dark:bg-zinc-700 rounded-md"></div>
              <div className="w-24 h-3 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
            </div>
          </div>
          <div className="w-16 h-6 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
        </div>
      ))}
    </div>
  );
}
