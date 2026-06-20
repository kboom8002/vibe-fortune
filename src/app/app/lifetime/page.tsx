"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Clock, Star, TrendingUp, User, Target, ArrowRight } from "lucide-react";

const ELEMENT_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  wood: { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  fire: { bar: "bg-rose-500", text: "text-rose-400", bg: "bg-rose-500/10" },
  earth: { bar: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" },
  metal: { bar: "bg-zinc-300", text: "text-zinc-300", bg: "bg-zinc-300/10" },
  water: { bar: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10" },
};

const ELEMENT_LABELS: Record<string, string> = {
  wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)",
};

export default function LifetimePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLifetime = async () => {
      try {
        const storedProfile = localStorage.getItem("user-birth-profile");
        if (!storedProfile) {
          setError("출생 정보가 없습니다. 먼저 온보딩을 완료해주세요.");
          setLoading(false);
          return;
        }
        const profile = JSON.parse(storedProfile);

        const res = await fetch("/api/forecast/lifetime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ birthProfile: profile }),
        });

        if (res.ok) {
          const d = await res.json();
          setData(d.lifetimeFortune);
        } else {
          const storedChart = localStorage.getItem("user-manse-chart");
          if (storedChart) {
            setData(generateLocalLifetime(JSON.parse(storedChart), profile));
          } else {
            setError("인생 총운 데이터를 불러올 수 없습니다.");
          }
        }
      } catch {
        const storedChart = localStorage.getItem("user-manse-chart");
        const storedProfile = localStorage.getItem("user-birth-profile");
        if (storedChart && storedProfile) {
          setData(generateLocalLifetime(JSON.parse(storedChart), JSON.parse(storedProfile)));
        } else {
          setError("오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLifetime();
  }, []);

  function generateLocalLifetime(chart: any, profile: any) {
    const dm = chart.dayMaster || {};
    const currentYear = new Date().getFullYear();
    const birthYear = profile.birthDateTime
      ? new Date(profile.birthDateTime).getFullYear()
      : parseInt(profile.birthDate?.split("-")[0] || "1990");
    const currentAge = currentYear - birthYear;
    const lifeCyclePhase =
      currentAge < 30 ? "성장 초기" : currentAge < 45 ? "도약기" : currentAge < 60 ? "성숙기" : "통합기";

    return {
      lifetimeNarrative: `일간 ${dm.stem || "?"} (${dm.element || "?"})을 타고난 당신의 생애는 ${
        dm.strength?.judgment === "strong" ? "강한 자기 주도력" : "섬세한 감수성과 유연함"
      }을 핵심 자산으로 합니다. 용신 ${dm.yongSin || "?"} 기운이 들어오는 시기에 중요한 도약이 일어날 가능성이 높습니다.`,
      currentDecadeSummary: `현재 ${lifeCyclePhase} 단계에 있습니다. 이 시기는 일간의 기운과 조화를 이루는 방향으로 에너지를 집중하는 것이 중요합니다.`,
      currentYearSummary: `${currentYear}년은 현재 대운의 맥락 안에서 ${dm.yongSin || "?"} 기운을 어떻게 활용하느냐가 핵심입니다.`,
      decadeTimeline: [],
      currentPositioning: {
        lifeCyclePhase,
        dominantElement: dm.element || "earth",
        yongSinAlignment: 65,
        keyTheme: `${lifeCyclePhase} 전략적 포지셔닝`,
        strategicAdvice: `용신 ${dm.yongSin || "?"} 기운을 강화하는 환경과 역할을 선택하는 것이 생애 전체적으로 가장 중요한 전략입니다.`,
      },
      fiveElementDistribution: chart.fiveElementDistribution,
      dayMaster: chart.dayMaster,
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Clock className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-zinc-400 text-sm">인생 총운을 분석하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-rose-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Compute max value for ohaeng bar chart scaling
  const dist = data?.fiveElementDistribution;
  const distMax = dist ? Math.max(...Object.values(dist).map((v: any) => Number(v) || 0), 1) : 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-3xl pointer-events-none" />

      <main className="py-12 px-6 flex-1">
        <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">
          {/* Header */}
          <div className="text-center space-y-3 border-b border-zinc-800/80 pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              인생 총운 분석
            </h1>
            <p className="text-sm text-zinc-400">생애 전체의 기운 흐름과 전략적 포지셔닝을 확인합니다.</p>
          </div>

          {/* 오행 분포 */}
          {dist && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-blue-400 inline-block" />
                오행 분포
              </h2>
              <div className="space-y-3">
                {(["wood", "fire", "earth", "metal", "water"] as const).map((el) => {
                  const count = Number(dist[el]) || 0;
                  const pct = distMax > 0 ? Math.round((count / distMax) * 100) : 0;
                  const colors = ELEMENT_COLORS[el];
                  const isDayMaster = data?.dayMaster?.element === el;
                  return (
                    <div key={el} className="flex items-center gap-3">
                      <div className={`w-16 text-xs font-semibold ${colors.text} flex items-center gap-1`}>
                        {ELEMENT_LABELS[el]}
                        {isDayMaster && <span className="text-[10px] text-zinc-500">(일간)</span>}
                      </div>
                      <div className="flex-1 h-3 bg-zinc-800/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-6 text-xs text-zinc-500 text-right">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lifetime Narrative */}
          {data?.lifetimeNarrative && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Star className="w-4 h-4 text-amber-400" />
                생애 총론
              </h2>
              <p className="text-base text-zinc-200 leading-relaxed">{data.lifetimeNarrative}</p>
            </div>
          )}

          {/* Current Decade */}
          {data?.currentDecadeSummary && (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-900/30 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-800/30 pb-3">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                현재 대운 (지금 이 시기)
              </h2>
              <p className="text-base text-zinc-200 leading-relaxed">{data.currentDecadeSummary}</p>
            </div>
          )}

          {/* Current Year */}
          {data?.currentYearSummary && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Target className="w-4 h-4 text-emerald-400" />
                올해 세운
              </h2>
              <p className="text-base text-zinc-200 leading-relaxed">{data.currentYearSummary}</p>
            </div>
          )}

          {/* Decade Timeline */}
          {data?.decadeTimeline && data.decadeTimeline.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                대운 타임라인
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {data.decadeTimeline.map((decade: any, i: number) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-56 p-5 rounded-2xl backdrop-blur-md space-y-3 transition-all ${
                      decade.isCurrent
                        ? "bg-indigo-950/50 border-2 border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
                        : "bg-zinc-900/30 border border-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-500 font-semibold uppercase">{decade.ageRange}</div>
                      {decade.isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                          현재
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-zinc-200">{decade.theme || decade.pillar?.label}</div>
                    <div className="text-xs text-zinc-500">{decade.pillar?.label}</div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{decade.narrative}</p>
                    {decade.opportunities && (
                      <div>
                        <div className="text-xs text-emerald-400 font-semibold mb-1">기회</div>
                        {decade.opportunities.slice(0, 2).map((o: string, j: number) => (
                          <div key={j} className="text-xs text-zinc-500">• {o}</div>
                        ))}
                      </div>
                    )}
                    {decade.challenges && (
                      <div>
                        <div className="text-xs text-amber-400 font-semibold mb-1">과제</div>
                        {decade.challenges.slice(0, 2).map((c: string, j: number) => (
                          <div key={j} className="text-xs text-zinc-500">• {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Positioning */}
          {data?.currentPositioning && (
            <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
                <User className="w-4 h-4 text-sky-400" />
                현재 포지셔닝
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">생애 주기 단계</div>
                  <div className="text-lg font-bold text-indigo-300">{data.currentPositioning.lifeCyclePhase}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mt-4">핵심 테마</div>
                  <div className="text-sm text-zinc-300">{data.currentPositioning.keyTheme}</div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">전략적 조언</div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{data.currentPositioning.strategicAdvice}</p>
                  {data.currentPositioning.personalizedStrategy && (
                    <div className="mt-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/20">
                      <div className="flex items-start gap-2 text-sm text-indigo-300">
                        <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{data.currentPositioning.personalizedStrategy}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {data.currentPositioning.yongSinAlignment !== undefined && (
                <div className="pt-4 border-t border-zinc-800/40">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">용신 정렬도</span>
                    <span className="text-indigo-400 font-semibold">{data.currentPositioning.yongSinAlignment}%</span>
                  </div>
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                      style={{ width: `${data.currentPositioning.yongSinAlignment}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-center pt-4">
            <p className="text-xs text-zinc-600">
              인생 총운 분석은 명리학적 구조에 근거한 참고 정보이며, 중요한 의사결정 시 전문가와 상담을 권장합니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
