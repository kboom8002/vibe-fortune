"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-900/10 blur-glow pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 mb-3">
          예기치 않은 오류가 발생했습니다
        </h1>
        
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
          {error.message || "안전성 정책 점검 또는 서버 응답 문제일 수 있습니다. 다시 시도해주세요."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs mx-auto">
          <Button 
            onClick={() => reset()} 
            className="flex-1 gap-2 bg-zinc-100 text-zinc-900 hover:bg-white"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </Button>
          
          <Button 
            onClick={() => window.location.href = "/app/daily"} 
            variant="outline"
            className="flex-1 gap-2 border-zinc-800 text-zinc-300 hover:text-white"
          >
            <Home className="w-4 h-4" />
            홈으로
          </Button>
        </div>
      </div>
    </div>
  );
}
