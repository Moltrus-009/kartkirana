import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-10 py-16 rounded-3xl flex flex-col items-center text-center shadow-xs max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-250">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-primary flex items-center justify-center mb-5 animate-float">
        <Icon className="h-8 w-8" />
      </div>
      
      <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100 mb-2 leading-tight">
        {title}
      </h3>
      
      <p className="text-xs text-slate-400 dark:text-zinc-400 font-bold max-w-xs mb-6">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
