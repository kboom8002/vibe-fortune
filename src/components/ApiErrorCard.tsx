'use client';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface ApiErrorCardProps {
  message: string;
  onRetry?: () => void;
  type?: 'network' | 'server' | 'auth' | 'generic';
}

export default function ApiErrorCard({ message, onRetry, type = 'generic' }: ApiErrorCardProps) {
  const icons = {
    network: WifiOff,
    server: AlertTriangle,
    auth: AlertTriangle,
    generic: AlertTriangle,
  };
  const Icon = icons[type];

  const typeMessages = {
    network: '네트워크 연결을 확인해주세요',
    server: '서버 오류가 발생했습니다',
    auth: '로그인이 필요합니다',
    generic: '오류가 발생했습니다',
  };

  return (
    <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/30 backdrop-blur-md space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-red-400" />
        <span className="text-sm font-medium text-red-300">{typeMessages[type]}</span>
      </div>
      <p className="text-xs text-zinc-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          다시 시도
        </button>
      )}
    </div>
  );
}
