"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { TrendingUp, Shield, Sparkles, AlertTriangle, Calendar, Target, BarChart3, Lightbulb, Layers } from "lucide-react";
import { GapAnalysisPanel } from "@/components/gap-analysis-panel";
import { VibePrescriptionPanel } from "@/components/vibe-prescription-panel";
import DisclaimerBanner from "@/components/DisclaimerBanner";

// ── Types for 4-week breakdown ──
type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
type DomainKey = "career" | "finance" | "relationship" | "health" | "creativity" | "learning";

interface WeekBreakdown {
  weekLabel: string;
  dominantElement: FiveElement;
  elementEmoji: string;
  theme: string;
  strategy: string;
  domains: { key: DomainKey; label: string; energy: "high" | "medium" | "low" }[];
}

const ENERGY_COLORS: Record<string, string> = {
  high: "bg-emerald-500/60",
  medium: "bg-blue-500/40",
  low: "bg-zinc-700/40",
};

const ELEMENT_BG: Record<FiveElement, string> = {
  wood: "from-emerald-950/40 to-emerald-900/20",
  fire: "from-rose-950/40 to-rose-900/20",
  earth: "from-amber-950/40 to-amber-900/20",
  metal: "from-zinc-800/40 to-zinc-700/20",
  water: "from-blue-950/40 to-blue-900/20",
};

const ELEMENT_THEME: Record<FiveElement, string> = {
  wood: "성장·확장", fire: "표현·실행", earth: "안정·축적",
  metal: "정리·최적화", water: "회복·전략",
};

const ELEMENT_EMOJI: Record<FiveElement, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "💧",
};

const ELEMENT_STRATEGY: Record<FiveElement, string> = {
  wood: "새로운 기회를 탐색하고 성장 동력을 확보하세요",
  fire: "적극적으로 표현하고 핵심 프로젝트를 추진하세요",
  earth: "기반을 다지고 안정적인 루틴을 유지하세요",
  metal: "불필요한 것을 정리하고 효율을 극대화하세요",
  water: "충분히 쉬며 전략적 사고에 시간을 투자하세요",
};

const DOMAINS: DomainKey[] = ["career", "finance", "relationship", "health", "creativity", "learning"];
const DOMAIN_LABELS: Record<DomainKey, string> = {
  career: "커리어", finance: "재무", relationship: "관계",
  health: "건강", creativity: "창의", learning: "학습",
};

const DOMAIN_ELEMENT_AFFINITY: Record<DomainKey, Record<FiveElement, "high" | "medium" | "low">> = {
  career:       { wood: "high",   fire: "high",   earth: "medium", metal: "medium", water: "low" },
  finance:      { wood: "low",    fire: "low",    earth: "high",   metal: "high",   water: "medium" },
  relationship: { wood: "medium", fire: "high",   earth: "medium", metal: "low",    water: "high" },
  health:       { wood: "high",   fire: "medium", earth: "high",   metal: "low",    water: "high" },
  creativity:   { wood: "high",   fire: "high",   earth: "low",    metal: "medium", water: "high" },
  learning:     { wood: "high",   fire: "medium", earth: "medium", metal: "high",   water: "high" },
};

const STEM_ELEMENT_MAP: Record<string, FiveElement> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

// ─────────────────────────────────────────────────────────

export default function MonthlyPage() {
  const [data, setData] = useState<any>(null);
  const [richData, setRichData] = useState<any>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeekBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const month = new Date().toISOString().substring(0, 7);

        let personalContext: any = undefined;
        try {
          const storedCtx = localStorage.getItem("personal-context");
          if (storedCtx) personalContext = JSON.parse(storedCtx);
        } catch { /* ignore */ }

        const res = await fetch("/api/forecast/monthly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetMonth: month, currentFocus: ["business_finance"], personalContext }),
        });

        if (res.ok) {
          const apiData = await res.json();

          if (apiData.weeklyBreakdown && apiData.weeklyBreakdown.length > 0) {
            setWeeklyBreakdown(apiData.weeklyBreakdown);
          } else {
            generateLocalWeeklyBreakdown();
          }

          if (apiData.forecastOutput) {
            const fo = apiData.forecastOutput;
            const mapped = {
              conclusion: fo.oneLineConclusion || fo.conclusion || "",
              conceptPortfolio: (fo.monthlyConceptPortfolio || []).map((c: string, i: number) => ({
                name: c.split("(")[0]?.trim() || c,
                weight: i === 0 ? 0.4 : 0.3,
                state: c.toLowerCase().includes("consolidation") ? "consolidation" : c.toLowerCase().includes("expansion") ? "expansion" : "cleanup",
              })),
              riskPortfolio: (fo.monthlyRiskPortfolio || []).map((r: string) => ({
                domain: r.split(" ")[0] || "일반",
                level: "medium",
                note: r,
              })),
              threePillars: {
                revenue: { score: 65, advice: (fo.revenuePolicy || [])[0] || "기존 매출원 최적화" },
                relationship: { score: 55, advice: (fo.relationshipPolicy || [])[0] || "핵심 관계에 집중" },
                recovery: { score: 75, advice: (fo.recoveryPolicy || [])[0] || "규칙적 운동과 수면" },
              },
              actionCalendar: (fo.monthlyActionCalendar || []).map((w: any) => ({
                week: w.week,
                focus: w.recommendedFocus || "",
              })),
            };
            localStorage.setItem("monthly-forecast-cache", JSON.stringify(mapped));
            setData(mapped);
            if (apiData.richOutput) {
              setRichData(apiData.richOutput);
            }
          } else {
            generateLocalMonthly();
          }
        } else {
          generateLocalMonthly();
          generateLocalWeeklyBreakdown();
        }
      } catch {
        generateLocalMonthly();
        generateLocalWeeklyBreakdown();
      } finally {
        setLoading(false);
      }
    };

    const generateLocalWeeklyBreakdown = () => {
      try {
        const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
        const WEEK_LABELS = ["1주차", "2주차", "3주차", "4주차"];
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const breakdown: WeekBreakdown[] = [];

        for (let w = 0; w < 4; w++) {
          const midDay = Math.min(1 + w * 7 + 3, new Date(year, month, 0).getDate());
          const d = new Date(year, month - 1, midDay);
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const dd = d.getDate();
          const jdn = Math.floor(367 * y - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4) + Math.floor(275 * m / 9) + dd + 1721013.5);
          const stemIdx = ((jdn - 1) % 10 + 10) % 10;
          const stem = STEMS[stemIdx];
          const element: FiveElement = STEM_ELEMENT_MAP[stem] || "earth";

          breakdown.push({
            weekLabel: WEEK_LABELS[w],
            dominantElement: element,
            elementEmoji: ELEMENT_EMOJI[element],
            theme: ELEMENT_THEME[element],
            strategy: ELEMENT_STRATEGY[element],
            domains: DOMAINS.map(dk => ({
              key: dk,
              label: DOMAIN_LABELS[dk],
              energy: DOMAIN_ELEMENT_AFFINITY[dk][element],
            })),
          });
        }
        setWeeklyBreakdown(breakdown);
      } catch {}
    };

    const generateLocalMonthly = () => {
      const cached = localStorage.getItem("monthly-forecast-cache");
      if (cached) {
        setData(JSON.parse(cached));
        return;
      }
      const storedChart = localStorage.getItem("user-manse-chart");
      let dmElement = "토";
      if (storedChart) {
        try { dmElement = JSON.parse(storedChart).dayMaster?.element || "토"; } catch { }
      }
      const elementMap: Record<string, string> = { "木": "목성(木)", "火": "화성(火)", "土": "토성(土)", "金": "금성(金)", "水": "수성(水)", "목": "목성(木)", "화": "화성(火)", "토": "토성(土)", "금": "금성(金)", "수": "수성(水)" };

      const monthlyData = {
        conclusion: `이번 달은 ${elementMap[dmElement] || "토성(土)"}의 영향으로 내면 탐색과 전략 수립에 적합합니다.`,
        conceptPortfolio: [{ name: "재정비", weight: 0.4, state: "cleanup" }, { name: "학습", weight: 0.3, state: "expansion" }, { name: "관계정리", weight: 0.3, state: "consolidation" }],
        riskPortfolio: [{ domain: "재무", level: "medium", note: "불필요한 지출 모니터링 필요" }, { domain: "건강", level: "low", note: "수면 패턴 안정적" }, { domain: "관계", level: "high", note: "핵심 관계 재정립 시점" }],
        threePillars: { revenue: { score: 65, advice: "보수적 운영, 기존 매출원 최적화" }, relationship: { score: 45, advice: "핵심 인맥 3인에 집중, 확장 자제" }, recovery: { score: 80, advice: "규칙적 수면과 주 2회 운동 유지" } },
        actionCalendar: [{ week: "1주차", focus: "현황 진단" }, { week: "2주차", focus: "우선순위 재설정" }, { week: "3주차", focus: "관계 소통" }, { week: "4주차", focus: "회고" }],
      };
      localStorage.setItem("monthly-forecast-cache", JSON.stringify(monthlyData));
      setData(monthlyData);
    };

    fetchData();
  }, []);

  const mockData = data || {
    conclusion: "",
    conceptPortfolio: [],
    riskPortfolio: [],
    threePillars: { revenue: { score: 0, advice: "" }, relationship: { score: 0, advice: "" }, recovery: { score: 0, advice: "" } },
    actionCalendar: [],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="max-w-4xl mx-auto w-full px-6 py-12 relative z-10 flex-1">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            월간 분석 포트폴리오
          </h1>
        </div>

        <div className="space-y-6">
          {/* 4-Week Strategy Calendar & Heatmap */}
          {weeklyBreakdown.length > 0 && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                이번 달 4주 전략 캘린더
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {weeklyBreakdown.map((w, i) => (
                  <div key={i} className={`p-4 rounded-2xl bg-gradient-to-br ${ELEMENT_BG[w.dominantElement]} border border-zinc-800/50 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">{w.weekLabel}</span>
                      <span className="text-lg">{w.elementEmoji}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-200">{w.theme}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{w.strategy}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">영역별 에너지 히트맵</h4>
                <div className="grid gap-1" style={{ gridTemplateColumns: '80px repeat(4, 1fr)' }}>
                  <div />
                  {weeklyBreakdown.map((w, i) => (
                    <div key={i} className="text-center text-[10px] text-zinc-500 font-medium pb-1">{w.weekLabel}</div>
                  ))}
                  {weeklyBreakdown[0]?.domains.map((domain, di) => (
                    <>
                      <div key={`label-${di}`} className="text-xs text-zinc-400 flex items-center">{domain.label}</div>
                      {weeklyBreakdown.map((w, wi) => {
                        const energy = w.domains[di]?.energy || 'low';
                        return (
                          <div
                            key={`${di}-${wi}`}
                            className={`h-6 rounded ${ENERGY_COLORS[energy]} flex items-center justify-center`}
                            title={`${domain.label} ${w.weekLabel}: ${energy}`}
                          >
                            <span className="text-[8px] text-zinc-300 font-medium">
                              {energy === 'high' ? '▲' : energy === 'medium' ? '●' : '▽'}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conclusion */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md">
            <p className="text-lg text-zinc-200 leading-relaxed font-medium">{mockData.conclusion}</p>
          </div>

          {/* Concept Portfolio */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              컨셉 포트폴리오
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockData.conceptPortfolio.map((c: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-indigo-500/10 transition-all space-y-2">
                  <span className="text-lg font-bold text-indigo-400">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.weight * 100}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500">{Math.round(c.weight * 100)}%</span>
                  </div>
                  <span className="text-xs text-zinc-500">{c.state}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Portfolio */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              리스크 포트폴리오
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockData.riskPortfolio.map((r: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-purple-500/10 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-300">{r.domain}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.level === "high" ? "bg-rose-500/20 text-rose-400" :
                      r.level === "medium" ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>{r.level}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{r.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Three Pillars */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              3대 영역 조율
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "revenue", label: "수익", icon: TrendingUp, color: "text-emerald-400" },
                { key: "relationship", label: "관계", icon: Target, color: "text-purple-400" },
                { key: "recovery", label: "회복", icon: Shield, color: "text-sky-400" },
              ].map(({ key, label, icon: Icon, color }) => {
                const pillar = mockData.threePillars[key as keyof typeof mockData.threePillars];
                return (
                  <div key={key} className="p-6 rounded-2xl bg-zinc-900/20 border border-zinc-800 hover:border-pink-500/10 transition-all space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-semibold text-zinc-300">{label}</span>
                      <span className="text-xs text-zinc-500 ml-auto">{pillar.score}점</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pillar.score}%` }} />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{pillar.advice}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Calendar */}
          <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              행동 캘린더
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {mockData.actionCalendar.map((a: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{a.week}</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{a.focus}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GAP Analysis (from richOutput) */}
          {richData?.gapAnalysis && (
            <GapAnalysisPanel gapAnalysis={richData.gapAnalysis} />
          )}

          {/* Vibe Prescription (from richOutput) */}
          {richData?.vibePrescription && (
            <VibePrescriptionPanel {...richData.vibePrescription} />
          )}

          {/* 면책 조항 */}
          <DisclaimerBanner levels={['general']} />
        </div>
      </div>
    </div>
  );
}
