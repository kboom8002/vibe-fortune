'use client';
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; fallbackMessage?: string; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-red-900/30 backdrop-blur-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-semibold text-zinc-200">일시적 오류가 발생했습니다</h3>
          <p className="text-sm text-zinc-400">{this.props.fallbackMessage || '페이지를 새로고침하거나 나중에 다시 시도해주세요.'}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 text-sm text-zinc-300 flex items-center gap-2 transition-colors">
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            <a href="/app/daily" className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-sm text-indigo-300 flex items-center gap-2 transition-colors">
              <Home className="w-4 h-4" />
              홈으로
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
