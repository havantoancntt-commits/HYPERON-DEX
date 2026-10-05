import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HYPERON Sentinel Caught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      window.location.hash = '';
    } catch {
      // ignore
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A12] text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-[#0C1222] border border-rose-500/40 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                {this.props.fallbackTitle || 'Hệ Thống Đã Bảo Vệ Khỏi Lỗi Render'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                HYPERON Sentinel Shield đã cô lập và ngăn chặn sự cố. Bạn có thể khôi phục lại phiên làm việc mà không làm mất dữ liệu.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-left font-mono text-xs text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Home className="w-4 h-4" />
                Về Trang Chủ
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Tải Lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
