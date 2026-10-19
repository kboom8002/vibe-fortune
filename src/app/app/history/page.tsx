"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Clock, FileText, TrendingUp, Calendar, CheckCircle2, ArrowRight } from "lucide-react";

export default function HistoryPage() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [runReceipts, setRunReceipts] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "forecasts" | "receipts">("all");

  useEffect(() => {
    const loadHistory = async () => {
      let localForecasts: any[] = [];
      let localReceipts: any[] = [];

      try {
        const lastForecast = localStorage.getItem("last-forecast-request");
        if (lastForecast) {
          localForecasts = [JSON.parse(lastForecast)];
        }
      } catch { /* ignore */ }

      try {
        const storedReceipts =
          localStorage.getItem("user-run-receipts") || localStorage.getItem("run-receipts");
        if (storedReceipts) {
          localReceipts = JSON.parse(storedReceipts);
        }
      } catch { /* ignore */ }

      // Call GET /api/history first; merge/display DB forecasts and receipts if authenticated
      try {
        const res = await fetch("/api/history");
        if (res.ok) {
          const data = await res.json();
          const apiForecasts = Array.isArray(data.forecasts) ? data.forecasts : [];
          const apiReceipts = Array.isArray(data.receipts) ? data.receipts : [];

          if (apiForecasts.length > 0 || apiReceipts.length > 0) {
            // Merge DB records with local records avoiding duplicate IDs
            const seenF = new Set(apiForecasts.map((f: any) => f.id));
            const mergedF = [
              ...apiForecasts.map((f: any) => ({
                ...f,
                type: f.mode || f.type || "daily",
              })),
              ...localForecasts.filter((lf) => !seenF.has(lf.id)),
            ];

            const seenR = new Set(apiReceipts.map((r: any) => r.id));
            const mergedR = [
              ...apiReceipts,
              ...localReceipts.filter((lr) => !seenR.has(lr.id)),
            ];

            setForecasts(mergedF);
            setRunReceipts(mergedR);
            return;
          }
        }
      } catch {
        // Fallback to localStorage in guest/offline mode
      }

      setForecasts(localForecasts);
      setRunReceipts(localReceipts);
    };

    loadHistory();
  }, []);

  const showForecasts = filter === "all" || filter === "forecasts";
  const showReceipts = filter === "all" || filter === "receipts";

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
            우주적 흐름(사주 Prior)과 주관적 의사결정(Run-Receipt)의 궤적을 확인합니다.
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
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">실행 기록 (Run-Receipt)</span>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{runReceipts.length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            최근 활동 타임라인
          </h2>
          <div className="flex gap-1.5 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
            {[
              { key: "all", label: "전체" },
              { key: "forecasts", label: "운영 보드" },
              { key: "receipts", label: "실행 기록" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-indigo-600/80 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {forecasts.length === 0 && runReceipts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md text-center">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">아직 분석 기록이 없습니다.</p>
              <Link href="/app/daily" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
                첫 번째 바이브 체크인 시작하기 →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {showForecasts &&
                forecasts.map((forecast, idx) => (
                  <div
                    key={forecast.id || `f-${idx}`}
                    className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-indigo-500/20 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-zinc-300 uppercase">
                          {forecast.type || forecast.mode || "daily"} 운영 보드 분석
                        </span>
                        {forecast.grade && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            등급 {forecast.grade}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {forecast.createdAt ? new Date(forecast.createdAt).toLocaleDateString("ko-KR") : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/app/result/${forecast.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                      >
                        <span>결과 보드 보기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/app/run-receipt/${forecast.id}`}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                      >
                        + 실행 기록(Run-Receipt) 작성
                      </Link>
                    </div>
                  </div>
                ))}

              {showReceipts &&
                runReceipts.map((receipt, idx) => (
                  <div
                    key={receipt.id || `r-${idx}`}
                    className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-purple-500/20 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-zinc-300 uppercase">실행 기록 (Run-Receipt)</span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString("ko-KR") : ""}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 font-medium">{receipt.whatIDid}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400 pt-1">
                      {receipt.whatIDeferred && receipt.whatIDeferred !== "N/A" && (
                        <div>
                          <span className="text-zinc-500">보류한 결정: </span>
                          <span>{receipt.whatIDeferred}</span>
                        </div>
                      )}
                      {receipt.whatILearned && receipt.whatILearned !== "N/A" && (
                        <div>
                          <span className="text-zinc-500">배운 점: </span>
                          <span>{receipt.whatILearned}</span>
                        </div>
                      )}
                      {receipt.nextAction && receipt.nextAction !== "N/A" && (
                        <div className="sm:col-span-2 text-indigo-300">
                          <span className="text-zinc-500">다음 액션: </span>
                          <span>{receipt.nextAction}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
