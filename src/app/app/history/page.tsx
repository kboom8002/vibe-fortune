"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Clock, FileText, TrendingUp, Calendar } from "lucide-react";

export default function HistoryPage() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [runReceipts, setRunReceipts] = useState<any[]>([]);

  useEffect(() => {
    const lastForecast = localStorage.getItem("last-forecast-request");
    if (lastForecast) {
      setForecasts([JSON.parse(lastForecast)]);
    }

    const receipts = localStorage.getItem("run-receipts");
    if (receipts) {
      setRunReceipts(JSON.parse(receipts));
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full px-6 py-12 relative z-10 flex-1">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            분석 및 실행 역사
          </h1>
          <p className="text-sm text-zinc-400">
            우주적 흐름과 주관적 의사결정의 궤적을 확인합니다.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-indigo-500/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">누적 분석</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{forecasts.length}</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-purple-500/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">실행 기록</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{runReceipts.length}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            최근 활동
          </h2>

          {forecasts.length === 0 && runReceipts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md text-center">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">아직 분석 기록이 없습니다.</p>
              <Link href="/app/daily" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
                첫 번째 바이브 체크인 시작하기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {forecasts.map((forecast, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-indigo-500/10 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-zinc-300 uppercase">{forecast.type} 분석</span>
                    </div>
                    <span className="text-xs text-zinc-500">{new Date(forecast.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <Link href={`/app/result/${forecast.id}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                    결과 보기 →
                  </Link>
                </div>
              ))}

              {runReceipts.map((receipt, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-purple-500/10 transition-all space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-zinc-300 uppercase">실행 기록</span>
                  </div>
                  <p className="text-sm text-zinc-400">{receipt.whatIDid}</p>
                  <span className="text-xs text-zinc-500">{new Date(receipt.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
