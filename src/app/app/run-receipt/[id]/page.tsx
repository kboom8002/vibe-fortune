"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  AlertCircle,
  Share2,
  ShieldAlert,
  Code2,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const WHY_CHIPS = [
  "오늘 우선순위 1순위 과업이라서",
  "현재 에너지·집중력 수준에 가장 적합해서",
  "리스크 경계 수칙을 준수하기 위해",
];

const AI_HELP_CHIPS = [
  "핵심 행동 1가지에 집중하도록 가이드",
  "무리한 확장·과로 방지 리마인드",
  "최적 실행 시간대 배치에 도움",
];

export default function RunReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const forecastOutputIdStr = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string) || "local-forecast";

  const [forecast, setForecast] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Form states
  const [whatIDid, setWhatIDid] = useState("");
  const [whyIChoseIt, setWhyIChoseIt] = useState("");
  const [whatAIHelped, setWhatAIHelped] = useState("");
  const [myJudgment, setMyJudgment] = useState("");
  const [whatIDeferred, setWhatIDeferred] = useState("");
  const [whatILearned, setWhatILearned] = useState("");
  const [nextAction, setNextAction] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const storedForecast = localStorage.getItem("last-generated-forecast");
      if (storedForecast) {
        const parsedForecast = JSON.parse(storedForecast);
        setForecast(parsedForecast);

        // Auto-prefill whatIDid from checked actions on the Result page!
        const savedChecksRaw = localStorage.getItem(`checked-actions-${forecastOutputIdStr}`);
        if (savedChecksRaw && Array.isArray(parsedForecast.requiredActions)) {
          const savedChecks = JSON.parse(savedChecksRaw) as Record<string, boolean>;
          const checkedTexts = parsedForecast.requiredActions.filter(
            (_: string, idx: number) => Boolean(savedChecks[idx])
          );
          if (checkedTexts.length > 0) {
            setWhatIDid(checkedTexts.join(", "));
          }
        }

        // Auto-prefill first deferred action if available
        if (Array.isArray(parsedForecast.deferredActions) && parsedForecast.deferredActions.length > 0) {
          setWhatIDeferred(parsedForecast.deferredActions[0]);
        }
      }
    } catch {
      // ignore
    }
  }, [forecastOutputIdStr]);

  const toggleTextItem = (currentValue: string, setter: (v: string) => void, item: string) => {
    const parts = currentValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.includes(item)) {
      setter(parts.filter((p) => p !== item).join(", "));
    } else {
      setter([...parts, item].join(", "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!whatIDid.trim()) {
        throw new Error("실행 내역(What I Did)은 필수 입력 항목입니다.");
      }

      let runReceipt: any = {
        id: crypto.randomUUID(),
        userId: "local-user",
        forecastOutputId: forecastOutputIdStr,
        whatIDid,
        whyIChoseIt,
        whatAIHelped,
        myJudgment,
        whatIDeferred,
        whatILearned,
        nextAction,
        createdAt: new Date().toISOString(),
      };

      // Call POST /api/run-receipt with graceful fallback if 401 in local guest mode
      try {
        const res = await fetch("/api/run-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forecastOutputId: forecastOutputIdStr,
            whatIDid,
            whyIChoseIt: whyIChoseIt || undefined,
            whatAIHelped: whatAIHelped || undefined,
            myJudgment: myJudgment || undefined,
            whatIDeferred: whatIDeferred || undefined,
            whatILearned: whatILearned || undefined,
            nextAction: nextAction || undefined,
          }),
        });
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.runReceipt) {
            runReceipt = apiData.runReceipt;
          }
        }
      } catch {
        // Fallback to localStorage in guest/offline mode
      }

      // Store in BOTH localStorage keys ("user-run-receipts" and "run-receipts") to prevent key mismatch
      const existingRaw = localStorage.getItem("user-run-receipts") || localStorage.getItem("run-receipts");
      const receipts = existingRaw ? JSON.parse(existingRaw) : [];
      receipts.unshift(runReceipt);
      const serialized = JSON.stringify(receipts);
      localStorage.setItem("user-run-receipts", serialized);
      localStorage.setItem("run-receipts", serialized);

      router.push("/app/history");
    } catch (err: any) {
      setError(err.message || "실행 기록 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden font-sans pb-20 md:pb-0">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <main className="flex-1 flex flex-col justify-center items-center px-6 py-10">
        <div className="max-w-2xl w-full space-y-6 bg-zinc-900/40 border border-zinc-800/80 p-6 sm:p-8 rounded-3xl backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-zinc-800 text-zinc-400">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                오늘의 실행 기록 (Run Receipt)
              </h2>
              <p className="text-xs text-zinc-400">
                칩을 탭하여 10초 만에 오늘 실행한 행동과 보류한 결정을 기록하세요.
              </p>
            </div>
          </div>

          {/* Forecast summary info */}
          {forecast && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">연결된 운세 요약</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold">
                    등급: {forecast.grade || "—"}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">
                  {forecast.summary || "운세 요약 없음"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const date = new Date().toLocaleDateString("ko-KR");
                    const text = `TCO-Vibe 운세 영수증 | ${date} | 요약: ${forecast.summary || "—"} | 등급: ${forecast.grade || "—"}`;
                    navigator.clipboard.writeText(text).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    });
                  }}
                  className="w-full gap-2 border-zinc-800 hover:border-indigo-500/40 text-zinc-300 text-xs"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      클립보드에 복사됨!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      영수증 공유 (Share Receipt)
                    </>
                  )}
                </Button>
              </div>

              {/* Safety Flags */}
              {forecast.boundaryNotes && forecast.boundaryNotes.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">안전 플래그 (Safety Flags)</span>
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {forecast.boundaryNotes.map((note: string, idx: number) => (
                      <li key={idx} className="text-xs text-amber-300/80 list-disc leading-relaxed">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. What I Did (with 1-Tap Chips from forecast.requiredActions) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                실제 내가 행동한 것 (What I Did) <span className="text-red-500">*</span>
              </label>
              {forecast?.requiredActions && forecast.requiredActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {forecast.requiredActions.map((act: string, idx: number) => {
                    const isSelected = whatIDid.includes(act);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTextItem(whatIDid, setWhatIDid, act)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-medium"
                            : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>{act}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <textarea
                required
                rows={2}
                value={whatIDid}
                onChange={(e) => setWhatIDid(e.target.value)}
                placeholder="위 추천 행동 칩을 탭하거나, 오늘 실제로 실행한 결정을 입력해 주세요"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700 resize-none"
              />
            </div>

            {/* 2. What I Deferred (with 1-Tap Chips from forecast.deferredActions) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                보류하거나 지연시킨 행동 (What I Deferred)
              </label>
              {forecast?.deferredActions && forecast.deferredActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {forecast.deferredActions.map((act: string, idx: number) => {
                    const isSelected = whatIDeferred.includes(act);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTextItem(whatIDeferred, setWhatIDeferred, act)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-medium"
                            : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        ⏸ {act}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                value={whatIDeferred}
                onChange={(e) => setWhatIDeferred(e.target.value)}
                placeholder="충동적 확장이나 내일로 넘긴 과제"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
              />
            </div>

            {/* 3. Quick Reason & AI Help Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  그 행동을 선택한 이유 (Why I Chose It)
                </label>
                <div className="flex flex-wrap gap-1">
                  {WHY_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setWhyIChoseIt(chip)}
                      className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                        whyIChoseIt === chip
                          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={whyIChoseIt}
                  onChange={(e) => setWhyIChoseIt(e.target.value)}
                  placeholder="의사결정의 직관 혹은 상황적 근거"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  AI의 어떤 조언이 도움되었나 (What AI Helped)
                </label>
                <div className="flex flex-wrap gap-1">
                  {AI_HELP_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setWhatAIHelped(chip)}
                      className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                        whatAIHelped === chip
                          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={whatAIHelped}
                  onChange={(e) => setWhatAIHelped(e.target.value)}
                  placeholder="예: 과로 방지 및 경계 경고 리마인더"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>

            {/* Collapsible Optional Deep Reflection Fields */}
            <div className="pt-2 border-t border-zinc-800/70">
              <button
                type="button"
                onClick={() => setShowAdvancedFields((prev) => !prev)}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                {showAdvancedFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>세부 회고·주관적 판단·내일 액션 추가 기록 (선택)</span>
              </button>

              {showAdvancedFields && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      나의 주관적 판단 (My Judgment)
                    </label>
                    <input
                      type="text"
                      value={myJudgment}
                      onChange={(e) => setMyJudgment(e.target.value)}
                      placeholder="나만의 독자적 의사결정"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      오늘 배운 교훈 (What I Learned)
                    </label>
                    <input
                      type="text"
                      value={whatILearned}
                      onChange={(e) => setWhatILearned(e.target.value)}
                      placeholder="발견한 나만의 패턴"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      다음 단계 액션 (Next Action)
                    </label>
                    <input
                      type="text"
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      placeholder="내일의 운영에 연계할 다짐"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {forecast?.promptVersions && showAdvancedFields && (
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">프롬프트 버전</span>
                </div>
                <pre className="text-[10px] text-zinc-500 overflow-x-auto">
                  {typeof forecast.promptVersions === "string"
                    ? forecast.promptVersions
                    : JSON.stringify(forecast.promptVersions, null, 2)}
                </pre>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-indigo-500/10 border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {loading ? "실행 기록 저장 중..." : "오늘의 실행 일지 기록 완료"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
