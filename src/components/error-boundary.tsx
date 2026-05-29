"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center space-y-6 p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-xl font-bold text-zinc-100">예기치 않은 오류가 발생했습니다</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {this.state.error?.message || "알 수 없는 오류입니다."}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-transform active:scale-[0.98]"
              >
                다시 시도하기
              </button>
              <button
                onClick={() => window.location.href = "/app/daily"}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium py-3 rounded-xl border border-zinc-800 transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              문제가 계속되면 페이지를 새로고침해 주세요.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
