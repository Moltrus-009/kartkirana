import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Rider App ErrorBoundary Caught Error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-900 border border-slate-800 text-white rounded-3xl space-y-4 text-left my-4 shadow-2xl">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              {this.props.fallbackTitle || 'Display Recovery Mode'}
            </h3>
          </div>
          <p className="text-xs text-slate-300 font-semibold leading-relaxed">
            A temporary display error occurred in this view. Your delivery progress and active order data remain safe.
          </p>
          {this.state.error?.message && (
            <p className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Reload Delivery View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
