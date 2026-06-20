"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, AlertCircle, Share2, ShieldAlert, Code2, CheckCircle } from "lucide-react";

export default function RunReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const [forecast, setForecast] = useState<any>(null);
  const [copied, setCopied] = useState(false);

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
    const storedForecast = localStorage.getItem("last-generated-forecast");
    if (storedForecast) {
      setForecast(JSON.parse(storedForecast));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!whatIDid) {
        throw new Error("실행 내역(What I Did)은 필수 입력 항목입니다.");
      }

      const runReceipt = {
        id: crypto.randomUUID(),
        userId: "local-user",
        forecastOutputId: params.id,
        whatIDid,
        whyIChoseIt,
        whatAIHelped,
        myJudgment,
        whatIDeferred,
        whatILearned,
        nextAction,
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage
      const existing = localStorage.getItem("user-run-receipts");
      const receipts = existing ? JSON.parse(existing) : [];
      receipts.push(runReceipt);
      localStorage.setItem("user-run-receipts", JSON.stringify(receipts));

      router.push("/app/history");
    } catch (err: any) {
      setError(err.message || "실행 기록 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden font-sans">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12">

      <div className="max-w-2xl w-full space-y-8 bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-3xl backdrop-blur-md relative z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-zinc-800 text-zinc-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              오늘의 실행 기록 (Run Receipt)
            </h2>
            <p className="text-xs text-zinc-400">
              보드의 지침을 어떻게 실행하고 조율했는지 기록하여 나만의 최적화 루프를 만듭니다.
            </p>
          </div>
        </div>

        {/* Forecast summary info */}
        {forecast && (
          <div className="space-y-4">
            {/* Summary & Share */}
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
                    <li key={idx} className="text-xs text-amber-300/80 list-disc leading-relaxed">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prompt Versions */}
            {forecast.promptVersions && (
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">프롬프트 버전</span>
                </div>
                <pre className="text-[11px] text-zinc-500 bg-zinc-950 border border-zinc-800/50 rounded-lg p-3 overflow-x-auto">
                  {typeof forecast.promptVersions === 'string'
                    ? forecast.promptVersions
                    : JSON.stringify(forecast.promptVersions, null, 2)}
                </pre>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* What I Did */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                실제 내가 행동한 것 (What I Did) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={whatIDid}
                onChange={(e) => setWhatIDid(e.target.value)}
                placeholder="지침에 맞춰 오늘 어떤 결정을 내리고 실행했는지 요약해 주세요"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700 resize-none"
              />
            </div>

            {/* Grid fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  그 행동을 선택한 이유 (Why I Chose It)
                </label>
                <input
                  type="text"
                  value={whyIChoseIt}
                  onChange={(e) => setWhyIChoseIt(e.target.value)}
                  placeholder="의사결정의 직관 혹은 상황적 근거"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  보류하거나 지연시킨 행동 (What I Deferred)
                </label>
                <input
                  type="text"
                  value={whatIDeferred}
                  onChange={(e) => setWhatIDeferred(e.target.value)}
                  placeholder="충동적 확장이나 다음으로 넘긴 과제"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  AI의 어떤 조언이 도움되었나 (What AI Helped)
                </label>
                <input
                  type="text"
                  value={whatAIHelped}
                  onChange={(e) => setWhatAIHelped(e.target.value)}
                  placeholder="예: 과로 방지 및 경계 경고 리마인더"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  지침과 다른 나의 주관적 판단 (My Judgment)
                </label>
                <input
                  type="text"
                  value={myJudgment}
                  onChange={(e) => setMyJudgment(e.target.value)}
                  placeholder="상황에 따른 나만의 독자적 의사결정"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  오늘 하루 배운 교훈 (What I Learned)
                </label>
                <input
                  type="text"
                  value={whatILearned}
                  onChange={(e) => setWhatILearned(e.target.value)}
                  placeholder="경험을 통해 발견한 나만의 패턴"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  다음 단계 액션 (Next Action)
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="내일의 운영에 연계할 다짐"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-500/10 border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
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
