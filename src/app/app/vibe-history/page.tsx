"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Activity, TrendingUp, Calendar, BarChart3 } from "lucide-react";

interface VibeEntry {
  energy: number;
  valence: number;
  arousal: number;
  focus: number;
  socialLoad: number;
  date: string;
}

type RangeKey = "7" | "30" | "90";

const AXIS_KEYS = ["energy", "valence", "arousal", "focus", "socialLoad"] as const;
type AxisKey = (typeof AXIS_KEYS)[number];

const AXIS_META: Record<AxisKey, { label: string; color: string; stroke: string }> = {
  energy:     { label: "활력",     color: "text-emerald-400", stroke: "#34d399" },
  valence:    { label: "정서가",   color: "text-amber-400",   stroke: "#fbbf24" },
  arousal:    { label: "각성도",   color: "text-rose-400",    stroke: "#fb7185" },
  focus:      { label: "집중력",   color: "text-blue-400",    stroke: "#60a5fa" },
  socialLoad: { label: "관계부하", color: "text-purple-400",  stroke: "#c084fc" },
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default function VibeHistoryPage() {
  const [history, setHistory] = useState<VibeEntry[]>([]);
  const [range, setRange] = useState<RangeKey>("7");
  const [hoveredPoint, setHoveredPoint] = useState<{ axis: AxisKey; idx: number; x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vibe-history");
      if (stored) {
        const parsed: VibeEntry[] = JSON.parse(stored);
        setHistory(parsed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }
    } catch {}
  }, []);

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const days = parseInt(range);
    const cutoff = now - days * 86_400_000;
    return history.filter((e) => new Date(e.date).getTime() >= cutoff);
  }, [history, range]);

  // Stats
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const result: Record<AxisKey, { avg: number; min: number; max: number }> = {} as any;
    for (const key of AXIS_KEYS) {
      const vals = filteredHistory.map((e) => e[key]);
      result[key] = {
        avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    }
    return result;
  }, [filteredHistory]);

  // Day-of-week patterns
  const dayPatterns = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const buckets: Record<number, { energy: number[]; valence: number[]; arousal: number[]; focus: number[]; socialLoad: number[] }> = {};
    for (let d = 0; d < 7; d++) buckets[d] = { energy: [], valence: [], arousal: [], focus: [], socialLoad: [] };
    for (const e of filteredHistory) {
      const dow = new Date(e.date).getDay();
      for (const key of AXIS_KEYS) buckets[dow][key].push(e[key]);
    }
    const result: { day: string; axis: AxisKey; avg: number }[] = [];
    for (let d = 0; d < 7; d++) {
      for (const key of AXIS_KEYS) {
        const arr = buckets[d][key];
        if (arr.length > 0) {
          result.push({ day: DAY_NAMES[d], axis: key, avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 });
        }
      }
    }
    return result;
  }, [filteredHistory]);

  // SVG chart dimensions
  const W = 700;
  const H = 300;
  const PAD_L = 40;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const buildPath = useCallback(
    (key: AxisKey) => {
      if (filteredHistory.length === 0) return "";
      const n = filteredHistory.length;
      return filteredHistory
        .map((e, i) => {
          const x = PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
          const y = PAD_T + chartH - (e[key] / 10) * chartH;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    },
    [filteredHistory, chartW, chartH]
  );

  const getPointCoords = useCallback(
    (key: AxisKey, idx: number) => {
      const n = filteredHistory.length;
      const e = filteredHistory[idx];
      const x = PAD_L + (n === 1 ? chartW / 2 : (idx / (n - 1)) * chartW);
      const y = PAD_T + chartH - (e[key] / 10) * chartH;
      return { x, y };
    },
    [filteredHistory, chartW, chartH]
  );

  // X-axis labels
  const xLabels = useMemo(() => {
    if (filteredHistory.length === 0) return [];
    const n = filteredHistory.length;
    const maxLabels = 8;
    const step = Math.max(1, Math.floor(n / maxLabels));
    const labels: { x: number; text: string }[] = [];
    for (let i = 0; i < n; i += step) {
      const x = PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
      const d = new Date(filteredHistory[i].date);
      labels.push({ x, text: `${d.getMonth() + 1}/${d.getDate()}` });
    }
    return labels;
  }, [filteredHistory, chartW]);

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4 max-w-md">
            <Activity className="w-12 h-12 text-zinc-700 mx-auto" />
            <h2 className="text-lg font-semibold text-zinc-300">아직 Vibe 기록이 없습니다</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              일일 운세에서 Vibe 체크인을 시작해보세요. 체크인할 때마다 여기에 트렌드가 표시됩니다.
            </p>
            <a
              href="/app/daily"
              className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              Vibe 체크인 시작
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full px-6 py-12 relative z-10 flex-1 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Vibe 기록
          </h1>
          <p className="text-xs text-zinc-400">체크인 히스토리 · 트렌드 분석</p>
        </div>

        {/* Range Tabs */}
        <div className="flex gap-2">
          {(["7", "30", "90"] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                range === r
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                  : "bg-zinc-900/30 border-zinc-800/50 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {r}일
            </button>
          ))}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md text-center">
            <p className="text-sm text-zinc-500">선택한 기간에 해당하는 기록이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Trend Chart */}
            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                5축 트렌드
              </h2>

              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {AXIS_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: AXIS_META[key].stroke }} />
                    <span className={`text-[11px] ${AXIS_META[key].color}`}>{AXIS_META[key].label}</span>
                  </div>
                ))}
              </div>

              {/* SVG Chart */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full min-w-[500px]"
                  style={{ maxHeight: 340 }}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Grid lines */}
                  {[0, 2, 4, 6, 8, 10].map((v) => {
                    const y = PAD_T + chartH - (v / 10) * chartH;
                    return (
                      <g key={v}>
                        <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#27272a" strokeWidth={0.5} />
                        <text x={PAD_L - 8} y={y + 4} textAnchor="end" className="fill-zinc-600 text-[10px]">
                          {v}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-axis labels */}
                  {xLabels.map((l, i) => (
                    <text key={i} x={l.x} y={H - 8} textAnchor="middle" className="fill-zinc-600 text-[10px]">
                      {l.text}
                    </text>
                  ))}

                  {/* Lines */}
                  {AXIS_KEYS.map((key) => (
                    <path key={key} d={buildPath(key)} fill="none" stroke={AXIS_META[key].stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
                  ))}

                  {/* Hover hit areas */}
                  {AXIS_KEYS.map((key) =>
                    filteredHistory.map((_, idx) => {
                      const { x, y } = getPointCoords(key, idx);
                      return (
                        <circle
                          key={`${key}-${idx}`}
                          cx={x}
                          cy={y}
                          r={6}
                          fill="transparent"
                          onMouseEnter={() => setHoveredPoint({ axis: key, idx, x, y })}
                        />
                      );
                    })
                  )}

                  {/* Data dots */}
                  {AXIS_KEYS.map((key) =>
                    filteredHistory.map((_, idx) => {
                      const { x, y } = getPointCoords(key, idx);
                      return (
                        <circle key={`dot-${key}-${idx}`} cx={x} cy={y} r={2.5} fill={AXIS_META[key].stroke} opacity={0.9} />
                      );
                    })
                  )}

                  {/* Tooltip */}
                  {hoveredPoint && (() => {
                    const entry = filteredHistory[hoveredPoint.idx];
                    const d = new Date(entry.date);
                    const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${DAY_NAMES[d.getDay()]}`;
                    const val = entry[hoveredPoint.axis];
                    const label = AXIS_META[hoveredPoint.axis].label;
                    const tooltipW = 110;
                    const tooltipH = 36;
                    let tx = hoveredPoint.x - tooltipW / 2;
                    let ty = hoveredPoint.y - tooltipH - 10;
                    if (tx < PAD_L) tx = PAD_L;
                    if (tx + tooltipW > W - PAD_R) tx = W - PAD_R - tooltipW;
                    if (ty < 0) ty = hoveredPoint.y + 12;
                    return (
                      <g>
                        <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={8} fill="#18181b" stroke="#3f3f46" strokeWidth={1} />
                        <text x={tx + tooltipW / 2} y={ty + 14} textAnchor="middle" className="fill-zinc-400 text-[9px]">{dateStr}</text>
                        <text x={tx + tooltipW / 2} y={ty + 28} textAnchor="middle" className="fill-zinc-200 text-[11px] font-bold">
                          {label}: {val}
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  통계 요약
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {AXIS_KEYS.map((key) => (
                    <div key={key} className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/60 space-y-2">
                      <span className={`text-xs font-semibold ${AXIS_META[key].color}`}>{AXIS_META[key].label}</span>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>평균</span>
                          <span className="text-zinc-200 font-mono font-bold">{stats[key].avg}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>최고</span>
                          <span className="text-zinc-200 font-mono">{stats[key].max}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>최저</span>
                          <span className="text-zinc-200 font-mono">{stats[key].min}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day-of-week Patterns */}
            {dayPatterns && dayPatterns.length > 0 && (
              <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  요일별 패턴
                </h2>
                <div className="grid grid-cols-7 gap-2">
                  {DAY_NAMES.map((day, di) => {
                    const dayData = dayPatterns.filter((p) => p.day === day);
                    if (dayData.length === 0) return (
                      <div key={di} className="p-3 rounded-xl bg-zinc-950/30 border border-zinc-800/40 text-center">
                        <span className="text-xs font-semibold text-zinc-500 block mb-2">{day}</span>
                        <span className="text-[10px] text-zinc-700">—</span>
                      </div>
                    );
                    return (
                      <div key={di} className="p-3 rounded-xl bg-zinc-950/30 border border-zinc-800/40 text-center space-y-1">
                        <span className="text-xs font-semibold text-zinc-300 block mb-1">{day}</span>
                        {dayData.map((p) => (
                          <div key={p.axis} className="flex items-center justify-between text-[10px]">
                            <span className={AXIS_META[p.axis].color}>{AXIS_META[p.axis].label.charAt(0)}</span>
                            <span className="text-zinc-400 font-mono">{p.avg}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
