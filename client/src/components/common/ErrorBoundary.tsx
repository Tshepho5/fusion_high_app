import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });

    const msg = error?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk')) {
      const alreadyAutoRefreshed = sessionStorage.getItem('error_boundary_chunk_reload');
      if (!alreadyAutoRefreshed) {
        sessionStorage.setItem('error_boundary_chunk_reload', 'true');
        if ('caches' in window) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
        }
        window.location.reload();
      }
    }
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleReload = async () => {
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch (_) {}
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk');

      return (
        <div className="min-h-[360px] w-full flex items-center justify-center p-6 my-4 animate-fade-in select-none">
          <div className="max-w-lg w-full rounded-3xl bg-surface-dark border border-rose-500/30 p-6 sm:p-8 shadow-2xl space-y-5 text-center relative overflow-hidden backdrop-blur-md">
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold font-display text-white">
                {isChunkError
                  ? 'System Update Available'
                  : this.props.fallbackTitle || 'Something interrupted this view'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                {isChunkError
                  ? 'A new version of Geleza SA was deployed. Please reload to activate the latest dashboard.'
                  : this.props.fallbackMessage ||
                    'An unexpected rendering issue occurred. Your data is safe. You can retry loading this section or refresh.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-glow-indigo flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isChunkError
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-glow-cyan'
                    : 'bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isChunkError ? 'Update & Reload' : 'Reload Page'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('user');
                  } catch (_) {}
                  window.location.href = '/';
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Clear Cache & Return Home</span>
              </button>
            </div>

            {/* Error Details for Debugging */}
            {this.state.error && (
              <details open className="mt-4 text-left rounded-2xl bg-black/50 border border-white/10 p-3.5 text-[11px] text-rose-300 font-mono overflow-auto max-h-80 select-text">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200 select-none pb-1 font-sans font-bold text-xs flex items-center justify-between">
                  <span>Technical Details</span>
                  <span className="text-[10px] text-slate-500 font-mono">React Trace</span>
                </summary>
                <p className="font-bold text-rose-400 mt-2 break-all whitespace-pre-wrap">
                  {typeof this.state.error === 'object'
                    ? (this.state.error.message || this.state.error.toString())
                    : String(this.state.error)}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap font-mono border-t border-white/10 pt-2 leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
