"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  calculateChart,
  calculateMajorLuck,
  calculateAnnualLuck,
  calculateAllTenGods,
  analyzeInteractions,
  analyzeDivineKillers,
} from "@/lib/manse";
import { DomainForecastCard } from "@/components/domain-forecast-card";
import { GapAnalysisPanel } from "@/components/gap-analysis-panel";
import { VibePrescriptionPanel } from "@/components/vibe-prescription-panel";
import { ConceptActivationPanel } from "@/components/ConceptActivationPanel";
import { ContextMappingPanel } from "@/components/ContextMappingPanel";
import { OperatorTracePanel } from "@/components/OperatorTracePanel";
import { FortuneChatPanel } from "@/components/chat/FortuneChatPanel";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import RlhfTransparencyBanner from "@/components/RlhfTransparencyBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import FortuneLoadingScreen from "@/components/FortuneLoadingScreen";
import FortuneTrendCard from "@/components/FortuneTrendCard";
import {
  Sparkles,
  ShieldAlert,
  Brain,
  Activity,
  Calendar,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  XCircle,
  HelpCircle,
  Clock,
  TrendingUp,
  Zap,
  Target,
  ArrowRight,
  Star,
  CheckCircle2,
  Compass,
  Layers,
} from "lucide-react";

// 오행 컬러 매핑
const ELEMENT_COLORS: Record<string, string> = {
  "목": "text-green-400",
  "木": "text-green-400",
  "화": "text-rose-400",
  "火": "text-rose-400",
  "토": "text-amber-400",
  "土": "text-amber-400",
  "금": "text-zinc-300",
  "金": "text-zinc-300",
  "수": "text-sky-400",
  "水": "text-sky-400",
};
const ELEMENT_BG: Record<string, string> = {
  "목": "bg-green-500/10 border-green-500/30",
  "木": "bg-green-500/10 border-green-500/30",
  "화": "bg-rose-500/10 border-rose-500/30",
  "火": "bg-rose-500/10 border-rose-500/30",
  "토": "bg-amber-500/10 border-amber-500/30",
  "土": "bg-amber-500/10 border-amber-500/30",
  "금": "bg-zinc-500/10 border-zinc-500/30",
  "金": "bg-zinc-500/10 border-zinc-500/30",
  "수": "bg-sky-500/10 border-sky-500/30",
  "水": "bg-sky-500/10 border-sky-500/30",
};

type ResultTab = "action" | "domains" | "prior" | "all";

export default function ForecastResultPage() {
  const router = useRouter();
  const params = useParams();
  const forecastIdStr = Array.isArray(params.id) ? params.id[0] : params.id || "";

  const getSyncLabel = (score: number) => {
    if (score >= 90) return { text: "우주적 정렬 (Cosmic Alignment)", color: "text-emerald-400" };
    if (score >= 75) return { text: "높은 동화 (High Alignment)", color: "text-indigo-400" };
    if (score >= 50) return { text: "보통 정합 (Moderate Alignment)", color: "text-amber-400" };
    return { text: "재조율 필요 (Re-alignment Needed)", color: "text-rose-400" };
  };

  const [activeTab, setActiveTab] = useState<ResultTab>("action");
  const [profile, setProfile] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [majorLuck, setMajorLuck] = useState<any>(null);
  const [annualLuck, setAnnualLuck] = useState<any>(null);
  const [tenGods, setTenGods] = useState<Record<string, string> | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [divineKillers, setDivineKillers] = useState<any[]>([]);
  const [vibe, setVibe] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [outputData, setOutputData] = useState<any>(null);
  const [conceptState, setConceptState] = useState<any>(null);
  const [richOutput, setRichOutput] = useState<any>(null);
  const [riskVector, setRiskVector] = useState<any>(null);
  const [bestTimeWindows, setBestTimeWindows] = useState<string[]>([]);
  const [reflectionQuestion, setReflectionQuestion] = useState<string>("");
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState("");

  // RLHF & Vibe Estimation States
  const [estimatedVibe, setEstimatedVibe] = useState<any>(null);
  const [forecastId, setForecastId] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const buildDeterministicExtras = (chartResult: any, vibeData: any, apiRisk?: any, apiOutputJson?: any) => {
    const energy = vibeData?.energy ?? 5;
    const arousal = vibeData?.arousal ?? 5;
    const focus = vibeData?.focus ?? 5;
    const valence = vibeData?.valence ?? 5;
    const socialLoad = vibeData?.socialLoad ?? 5;
    const sleepHours = vibeData?.sleepHours ?? 7;

    const clamp01 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;

    const computedRisk = {
      overextension: apiRisk?.overextension ?? clamp01((arousal / 10) * 0.5 + ((10 - focus) / 10) * 0.3),
      scopeLeak: apiRisk?.scopeLeak ?? clamp01(((10 - focus) / 10) * 0.6 + (arousal / 10) * 0.2),
      overclaim: apiRisk?.overclaim ?? clamp01((arousal / 10) * 0.4 + (valence / 10) * 0.3),
      burnout: apiRisk?.burnout ?? clamp01(((10 - energy) / 10) * 0.6 + (sleepHours < 6 ? 0.3 : 0.1)),
      relationshipDryness: apiRisk?.relationshipDryness ?? clamp01((socialLoad / 10) * 0.5 + ((10 - valence) / 10) * 0.3),
      emotionalOverreaction: apiRisk?.emotionalOverreaction ?? clamp01((arousal / 10) * 0.5 + ((10 - valence) / 10) * 0.4),
      legalSafetyRisk: apiRisk?.legalSafetyRisk ?? clamp01(((10 - focus) / 10) * 0.4 + (arousal / 10) * 0.2),
      missedOpportunity: apiRisk?.missedOpportunity ?? clamp01(((10 - energy) / 10) * 0.4 + ((10 - valence) / 10) * 0.3),
      primaryRisk:
        apiRisk?.primaryRisk ||
        apiOutputJson?.riskVectorSummary?.primaryRisk ||
        (energy < 4 ? "burnout" : arousal > 7 ? "overextension" : focus < 4 ? "scopeLeak" : "relationshipDryness"),
      secondaryRisk:
        apiRisk?.secondaryRisk ||
        apiOutputJson?.riskVectorSummary?.secondaryRisk ||
        (socialLoad > 7 ? "emotionalOverreaction" : "overclaim"),
      riskLevel:
        apiOutputJson?.riskVectorSummary?.riskLevel || (energy < 4 || arousal > 8 ? "high" : energy < 6 ? "medium" : "low"),
    };

    setRiskVector(computedRisk);
    try {
      localStorage.setItem("last-risk-vector", JSON.stringify(computedRisk));
    } catch {
      /* ignore */
    }

    const rawWindows = apiOutputJson?.bestTimeWindows;
    const windows: string[] =
      Array.isArray(rawWindows) && rawWindows.length > 0
        ? rawWindows.map((w: any) =>
            typeof w === "string" ? w : `${w.window || "09:00–11:30"} — ${w.focus || "핵심 과제 집중"} (${w.mode || "Consolidation"})`
          )
        : [
            "09:00–11:30 (巳時) — 핵심 우선순위 1건 몰입 및 구조 정리",
            "14:00–16:30 (未時) — 대외 소통·협업 조율 및 데이터 검증",
            "20:30–22:00 (戌時) — 에너지 회복 루틴 및 Run-Receipt 점검",
          ];
    setBestTimeWindows(windows);

    const rq: string =
      apiOutputJson?.reflectionQuestion ||
      "오늘 반드시 끝내야 할 핵심 행동 1가지와, 과감히 내일로 보류할 결정 1가지는 무엇인가요?";
    setReflectionQuestion(rq);
  };

  useEffect(() => {
    const storedProfile = localStorage.getItem("user-birth-profile");
    const storedVibe = localStorage.getItem("last-vibe-checkin");

    if (!storedProfile) {
      router.push("/app/onboarding");
      return;
    }

    const profileData = JSON.parse(storedProfile);
    setProfile(profileData);
    const parsedVibe = storedVibe ? JSON.parse(storedVibe) : null;
    if (parsedVibe) setVibe(parsedVibe);

    try {
      const savedChecks = localStorage.getItem(`checked-actions-${forecastIdStr}`);
      if (savedChecks) setCheckedActions(JSON.parse(savedChecks));
    } catch {
      /* ignore */
    }

    // 1. 사주 차트 즉시 계산 (결정론적)
    try {
      const storedChart = localStorage.getItem("user-manse-chart");
      let chartResult;

      if (storedChart) {
        chartResult = JSON.parse(storedChart);
      } else {
        let birthDateTimeStr = profileData.birthDateTime;
        if (!birthDateTimeStr) {
          const birthDate = profileData.birthDate || "1990-01-01";
          const birthTime = profileData.birthTime || "12:00";
          birthDateTimeStr = `${birthDate}T${birthTime}:00`;
        }
        chartResult = calculateChart({
          birthDateTime: birthDateTimeStr,
          timezone: profileData.timezone || "Asia/Seoul",
          gender: profileData.gender || "male",
        });
        localStorage.setItem("user-manse-chart", JSON.stringify(chartResult));
      }

      setChart(chartResult);

      // 대운 계산
      try {
        const ml = calculateMajorLuck({
          chart: chartResult,
          gender: profileData.gender || "male",
        });
        setMajorLuck(ml);
      } catch (e) {
        console.warn("대운 계산 실패:", e);
      }

      // 세운 계산
      try {
        const now = new Date();
        const al = calculateAnnualLuck({
          year: now.getFullYear(),
        });
        setAnnualLuck(al);
      } catch (e) {
        console.warn("세운 계산 실패:", e);
      }

      // 십신 계산
      try {
        setTenGods(calculateAllTenGods(chartResult));
      } catch (e) {
        console.warn("십신 계산 실패:", e);
      }
      // 합충형파해
      try {
        setInteractions(analyzeInteractions(chartResult));
      } catch (e) {
        console.warn("합충 계산 실패:", e);
      }
      // 신살
      try {
        setDivineKillers(analyzeDivineKillers(chartResult));
      } catch (e) {
        console.warn("신살 계산 실패:", e);
      }

      // 2. 즉시 결정론적 프리뷰 보드를 먼저 세팅해 0초 대기로 화면을 표시한 뒤, LLM 비동기 정밀 보정 실행
      generateLocalForecast(chartResult, parsedVibe || {});
      if (parsedVibe) {
        fetchForecast(profileData, chartResult, parsedVibe);
      }
    } catch (err) {
      console.error("사주 계산 오류:", err);
    }
  }, [router, forecastIdStr]);

  const fetchForecast = async (profileData: any, chartResult: any, vibeData: any) => {
    setLlmLoading(true);
    setLlmError("");
    try {
      let personalContext: any = undefined;
      try {
        const storedCtx = localStorage.getItem("personal-context");
        if (storedCtx) personalContext = JSON.parse(storedCtx);
      } catch {
        /* ignore parse errors */
      }

      let recentRunReceipts: any[] | undefined = undefined;
      try {
        const storedReceipts = localStorage.getItem("user-run-receipts") || localStorage.getItem("run-receipts");
        if (storedReceipts) recentRunReceipts = JSON.parse(storedReceipts);
      } catch {
        /* ignore parse errors */
      }

      const rawFocus = vibeData?.currentFocus;
      const focusArray = (Array.isArray(rawFocus) ? rawFocus : [rawFocus || "business_finance"]).map((f: string) =>
        f === "health_energy" ? "health_recovery" : f
      );

      const res = await fetch("/api/forecast/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: new Date().toISOString().split("T")[0],
          currentFocus: focusArray,
          userMessage: vibeData?.oneLineEvent || undefined,
          vibeCheckIn: vibeData,
          birthProfile: profileData,
          providedChart: profileData?.providedChart || undefined,
          personalContext,
          recentRunReceipts,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const fo = data.forecastOutput;
        if (fo) {
          const outputJson = (fo.outputJson || fo || {}) as any;
          const reqActions =
            fo.actionPolicy?.requiredActions ||
            data.actionPolicy?.requiredActions ||
            outputJson.requiredActions ||
            outputJson.actionPolicy?.requiredActions ||
            [];
          const forbActions =
            fo.actionPolicy?.forbiddenActions ||
            data.actionPolicy?.forbiddenActions ||
            outputJson.forbiddenActions ||
            outputJson.actionPolicy?.forbiddenActions ||
            [];
          const defActions =
            fo.actionPolicy?.deferredActions ||
            data.actionPolicy?.deferredActions ||
            outputJson.deferredActions ||
            outputJson.actionPolicy?.deferredActions ||
            [];
          const boundNotes =
            fo.actionPolicy?.boundaryNotes ||
            data.actionPolicy?.boundaryNotes ||
            outputJson.boundaryNotes ||
            outputJson.actionPolicy?.boundaryNotes ||
            outputJson.safetyNotes ||
            [];

          const summaryText =
            outputJson.summary ||
            outputJson.oneLineConclusion ||
            fo.oneLineConclusion ||
            fo.outputMarkdown?.substring(0, 200) ||
            "";

          const mappedForecast = {
            summary: summaryText,
            conceptState:
              data.actionPolicy?.mode ||
              outputJson.actionPolicy?.mode ||
              outputJson.conceptState ||
              outputJson.coreConceptState ||
              outputJson.coreConcept ||
              "Consolidation",
            conceptStateDescription:
              outputJson.conceptStateDescription ||
              outputJson.conceptExplanation ||
              outputJson.structuralPriorSummary ||
              "",
            actionPolicyExplanation:
              outputJson.actionPolicyExplanation || outputJson.actionExplanation || outputJson.vibeSummary || "",
            grade: outputJson.grade || fo.grade || "A",
            requiredActions:
              reqActions.length > 0
                ? reqActions
                : ["핵심 업무 1가지를 정의하고 완결하기", "우선순위 외 요청은 오후로 보류하기"],
            forbiddenActions:
              forbActions.length > 0 ? forbActions : ["검증 없는 성급한 확약 및 무리한 일정 확장"],
            deferredActions:
              defActions.length > 0 ? defActions : ["비긴급 행정 처리 및 부차적 의사결정"],
            boundaryNotes: boundNotes,
            promptVersions: data.promptVersions,
          };

          if (mappedForecast.summary) {
            setForecast(mappedForecast);
            setForecastId(fo.id || forecastIdStr || "");
            setOutputData(outputJson);
            if (data.richOutput && Object.keys(data.richOutput).length > 0) {
              setRichOutput(data.richOutput);
            } else {
              setRichOutput(generateLocalRichOutput(chartResult, vibeData));
            }
            setConceptState(outputJson?.conceptState || null);
            buildDeterministicExtras(chartResult, vibeData, data.riskVector || outputJson.riskVector, outputJson);
            if (data.estimatedVibe) {
              setEstimatedVibe(data.estimatedVibe);
            }
            localStorage.setItem("last-generated-forecast", JSON.stringify(mappedForecast));
          }
        }
      }
    } catch {
      // Keep local deterministic forecast already rendered
    } finally {
      setLlmLoading(false);
    }
  };

  // 로컬 richOutput 생성 (6대 영역, GAP 분석, Vibe 처방 — 결정론적)
  const generateLocalRichOutput = (chartResult: any, vibeData: any) => {
    const dm = chartResult.dayMaster;
    const elementProfile = chartResult.elementProfile || chartResult.fiveElementDistribution || {};
    const energy = vibeData?.energy ?? 5;
    const focus = vibeData?.focus ?? 5;
    const valence = vibeData?.valence ?? 5;

    const elements = ["목", "화", "토", "금", "수"];
    const elementCounts: Record<string, number> = {};
    for (const el of elements) {
      elementCounts[el] = (elementProfile[el] as number) || 0;
    }
    const totalCount = Object.values(elementCounts).reduce((a, b) => a + b, 0) || 8;
    const avgCount = totalCount / 5;

    const conceptGaps: string[] = [];
    const evidenceGaps: string[] = [];
    const boundaryGaps: string[] = [];
    const conversionGaps: string[] = [];

    for (const [el, count] of Object.entries(elementCounts)) {
      if (count < avgCount * 0.6) {
        const elNames: Record<string, string> = {
          "목": "성장·확장",
          "화": "표현·열정",
          "토": "안정·체계",
          "금": "결단·정리",
          "수": "유연·축적",
        };
        conceptGaps.push(`${el}(${elNames[el] || el}) 기운이 약합니다 — ${elNames[el]} 영역의 의식적 강화가 필요합니다`);
      }
    }

    if (energy < 4) evidenceGaps.push("활력이 낮은 상태 — 충분한 수면과 가벼운 운동으로 에너지 회복이 우선입니다");
    if (focus < 4) evidenceGaps.push("집중력이 분산된 상태 — 짧은 타이머 집중법(25분)으로 몰입 패턴을 만들어보세요");
    if (valence < 4) boundaryGaps.push("기분이 낮은 상태 — 과도한 의사결정을 피하고 작은 성취에 집중하세요");
    if (energy >= 7 && focus >= 7) conversionGaps.push("높은 에너지와 집중력 — 지금이 핵심 프로젝트를 진전시킬 최적의 타이밍입니다");
    if (vibeData?.socialLoad > 7) boundaryGaps.push("사회적 부하가 높습니다 — 혼자만의 시간을 확보하여 재충전하세요");

    if (conceptGaps.length === 0) conceptGaps.push("전반적인 오행 균형이 양호합니다 — 현재 리듬을 유지하세요");
    if (conversionGaps.length === 0) conversionGaps.push("오늘의 행동 정책을 구체적인 1개 실행 항목으로 전환하세요");

    const domainElement: Record<string, string> = {
      business_finance:
        dm?.element === "목" || dm?.element === "木" || dm?.element === "wood"
          ? "wood"
          : dm?.element === "금" || dm?.element === "金" || dm?.element === "metal"
          ? "metal"
          : "earth",
      relationship_love: dm?.element === "화" || dm?.element === "火" || dm?.element === "fire" ? "fire" : "wood",
      health_recovery: "water",
      learning_writing_research: dm?.element === "수" || dm?.element === "水" || dm?.element === "water" ? "water" : "wood",
      reputation_branding: "fire",
      risk_legal_safety: "metal",
    };

    const domainNarratives: Record<
      string,
      { headline: string; narrative: string; requiredActions: string[]; forbiddenActions: string[] }
    > = {
      business_finance: {
        headline: `${dm?.stem || "?"}${
          dm?.element === "wood" || dm?.element === "목"
            ? "의 성장 기운이 사업 확장을 지지합니다"
            : "의 기운 아래 재정 안정에 집중하는 날"
        }`,
        narrative: `일간 ${dm?.stem || "?"}(${dm?.element || "?"})의 에너지가 사업·재정 영역에 작용하고 있습니다. ${
          energy >= 6
            ? "현재 활력이 충분하여 새로운 비즈니스 기회를 탐색하기 좋은 조건입니다. 핵심 프로젝트의 진전을 위해 오전 시간대를 활용하세요."
            : "에너지 레벨이 보통 이하이므로 새로운 투자나 계약보다는 기존 업무의 완결에 집중하는 것이 유리합니다."
        } 용신 ${dm?.yongSin || "?"} 기운이 강해지는 시간대에 중요 의사결정을 배치하면 보다 나은 결과를 기대할 수 있습니다.`,
        requiredActions: ["핵심 업무 1가지를 정의하고 완결하기", "재정 현황 5분 점검"],
        forbiddenActions: ["사전 조율 없는 대규모 투자 결정"],
      },
      relationship_love: {
        headline: `관계에 ${valence >= 6 ? "따뜻한 온기를 불어넣을" : "조용한 성찰이 필요한"} 시간`,
        narrative: `오늘의 인간관계 영역은 ${
          valence >= 6
            ? "긍정적인 정서 에너지가 흐르고 있어 소통과 교류에 적합합니다. 중요한 사람에게 짧은 안부를 전하거나, 가벼운 만남을 통해 관계의 질을 높이세요."
            : "정서적 에너지가 다소 낮으므로 깊은 대화보다는 가벼운 접촉에 머무르는 것이 현명합니다. 혼자만의 시간을 통해 내면을 돌보는 것도 관계 건강의 일부입니다."
        } 상대의 자율성을 존중하면서 자연스러운 교류를 이어가세요.`,
        requiredActions: ["중요한 사람에게 짧은 안부 1개", "경청 연습 — 상대 말에 2초 더 귀 기울이기"],
        forbiddenActions: ["감정적 장문 메시지 발송"],
      },
      health_recovery: {
        headline: `${energy < 5 ? "회복과 재충전이 우선인" : "활력을 유지하며 건강을 다지는"} 날`,
        narrative: `현재 에너지 레벨(${energy}/10)을 기준으로 ${
          energy < 5
            ? "회복 모드에 진입하는 것이 바람직합니다. 무리한 운동보다는 가벼운 스트레칭이나 산책으로 몸의 기운 순환을 돕고, 충분한 수면을 확보하세요."
            : "건강 유지를 위한 적극적인 활동이 가능합니다. 규칙적인 식사와 적절한 운동으로 현재의 좋은 컨디션을 이어가세요."
        } 오행의 균형 속에서 몸의 신호에 귀 기울이는 것이 장기 건강의 핵심입니다.`,
        requiredActions: [energy < 5 ? "7시간 이상 수면 확보" : "30분 규칙적 운동", "물 2리터 이상 섭취"],
        forbiddenActions: [energy < 5 ? "야근 및 과도한 체력 소모" : "수면 부족한 상태에서 고강도 운동"],
      },
      learning_writing_research: {
        headline: `${focus >= 6 ? "깊은 몰입이 가능한 학습의" : "가벼운 탐색으로 시작하는"} 날`,
        narrative: `인지 집중도(${focus}/10)가 ${
          focus >= 6
            ? "높아 깊은 학습이나 창작 작업에 적합합니다. 25분 집중 + 5분 휴식의 포모도로 기법이 효과적입니다."
            : "보통 수준이므로 새로운 주제 탐색이나 가벼운 리서치부터 시작하는 것이 좋습니다."
        } 일간 ${dm?.stem || "?"}의 에너지와 학습 영역의 조화를 통해 지식 축적의 기반을 다질 수 있습니다.`,
        requiredActions: [focus >= 6 ? "핵심 프로젝트 1시간 집중 블록" : "관심 분야 15분 리서치", "학습 내용 3줄 요약 기록"],
        forbiddenActions: ["무관한 SNS 30분 이상 탐색"],
      },
      reputation_branding: {
        headline: `${energy >= 6 && valence >= 6 ? "존재감을 드러낼" : "조용히 실력을 쌓을"} 시간`,
        narrative: `브랜딩·평판 영역에서 화(火)와 금(金)의 기운이 작용합니다. ${
          energy >= 6 && valence >= 6
            ? "현재 에너지와 정서 상태가 양호하여 자기 표현과 대외 활동에 적합합니다."
            : "내면의 실력 축적에 집중하는 것이 장기적으로 더 효과적입니다. 구체적인 성과물을 만드는 데 에너지를 쓰세요."
        }`,
        requiredActions: ["포트폴리오 또는 성과 기록 1건 업데이트", "전문 분야 인사이트 1개 정리"],
        forbiddenActions: ["과장된 자기소개 또는 미검증 성과 주장"],
      },
      risk_legal_safety: {
        headline: `${energy < 4 || valence < 4 ? "신중한 판단이 필요한" : "리스크를 점검하고 정리하는"} 시간`,
        narrative: `리스크·안전 영역에서 금(金)과 수(水)의 기운이 경계와 점검을 요청합니다. ${
          energy < 4 || valence < 4
            ? "에너지가 낮은 상태에서의 중요 계약이나 법적 결정은 피하는 것이 현명합니다."
            : "전반적으로 안정된 상태이므로 미결 사항을 정리하고, 재정·법적 서류를 점검하는 데 적합합니다."
        } 충동적 결정을 자제하고 24시간 보류 원칙을 적용하면 불필요한 리스크를 줄일 수 있습니다.`,
        requiredActions: ["미결 서류/계약 1건 검토", "재정 지출 내역 5분 점검"],
        forbiddenActions: ["충동적 대규모 투자 결정", "법적 문서 서명 시 전문가 상담 없이 진행"],
      },
    };

    const domainForecasts = Object.entries(domainNarratives).map(([domain, data]) => ({
      domain,
      headline: data.headline,
      narrative: data.narrative,
      elementInfluence: domainElement[domain] || "earth",
      activatedConcepts: [],
      riskLevel: energy < 4 && domain === "risk_legal_safety" ? "high" : energy < 5 ? "medium" : "low",
      policyMode: energy < 4 ? "Recovery" : energy >= 7 ? "Expansion" : "Consolidation",
      requiredActions: data.requiredActions,
      forbiddenActions: data.forbiddenActions,
    }));

    const normalizeEl = (el?: string): string => {
      if (!el) return "earth";
      const map: Record<string, string> = {
        "목": "wood",
        "木": "wood",
        "화": "fire",
        "火": "fire",
        "토": "earth",
        "土": "earth",
        "금": "metal",
        "金": "metal",
        "수": "water",
        "水": "water",
      };
      return map[el] || el.toLowerCase();
    };

    const dmEl = normalizeEl(dm?.element);
    const yongSinEl = normalizeEl(dm?.yongSin);
    const homoEl = yongSinEl || dmEl || "earth";

    const elKeys = ["목", "화", "토", "금", "수"];
    let weakest = "수";
    let minVal = Infinity;
    for (const k of elKeys) {
      const v = (elementProfile[k] as number) || 0;
      if (v < minVal) {
        minVal = v;
        weakest = k;
      }
    }
    const compEl = normalizeEl(weakest);

    const SENSORY: Record<string, Record<string, string>> = {
      wood: { color: "초록·연두", light: "아침 햇살", space: "식물이 있는 공간", rhythm: "경쾌한 어쿠스틱", ritual: "새벽 산책", scent: "페퍼민트" },
      fire: { color: "빨강·주황", light: "따뜻한 조명", space: "활기찬 카페", rhythm: "에너제틱한 팝", ritual: "감사 일기", scent: "시나몬" },
      earth: { color: "베이지·황토", light: "자연광", space: "정돈된 공간", rhythm: "잔잔한 클래식", ritual: "루틴 고수", scent: "샌달우드" },
      metal: { color: "흰색·실버", light: "선명한 조명", space: "미니멀 공간", rhythm: "앰비언트", ritual: "정리 시간", scent: "유칼립투스" },
      water: { color: "남색·검정", light: "간접 조명", space: "조용한 서재", rhythm: "로파이·재즈", ritual: "취침 전 일기", scent: "라벤더" },
    };

    const EL_LABELS: Record<string, { homo: string; comp: string; homoR: string; compR: string; actions: string[] }> = {
      wood: {
        homo: "성장의 씨앗을 틔우는 처방",
        comp: "뿌리를 내리는 보충 처방",
        homoR: "목(木)의 성장 에너지가 일간의 기운과 조화를 이룹니다. 새로운 시도와 확장의 기운을 증폭시켜 현재의 상승 흐름을 활용하세요.",
        compR: "목(木)의 기운이 부족합니다. 성장과 확장의 에너지를 보충하면 정체를 타개하고 새로운 돌파구를 찾을 수 있습니다.",
        actions: ["새로운 아이디어 3개 적기", "아침 스트레칭", "식물 공간에서 사색", "새 프로젝트 첫 단계"],
      },
      fire: {
        homo: "열정의 불꽃을 피우는 처방",
        comp: "온기를 불어넣는 보충 처방",
        homoR: "화(火)의 열정 에너지가 활발합니다. 표현력과 리더십을 키워 추진력을 극대화하세요.",
        compR: "화(火) 기운이 약해 활력이 저하되어 있습니다. 따뜻함과 열정을 보충하면 무기력함을 벗어날 수 있습니다.",
        actions: ["감사 메시지 보내기", "30분 운동", "성과 공유", "밝은 옷 입기"],
      },
      earth: {
        homo: "단단한 기반을 다지는 처방",
        comp: "흔들리는 토대를 강화하는 처방",
        homoR: "토(土)의 안정 에너지로 체계적 정리와 구조화를 통해 안정감을 공고히 하세요.",
        compR: "토(土) 기운이 약해 불안정합니다. 안정과 체계의 에너지를 보충하면 기반을 다잡을 수 있습니다.",
        actions: ["할 일 목록 정리", "공간 정돈", "규칙적 식사", "5분 명상"],
      },
      metal: {
        homo: "날카로운 결단의 처방",
        comp: "선명한 윤곽을 그리는 처방",
        homoR: "금(金)의 결단 에너지가 작용합니다. 불필요한 것을 정리하고 핵심에 집중하세요.",
        compR: "금(金) 기운이 부족하여 판단력이 흐려져 있습니다. 결단의 에너지를 보충하세요.",
        actions: ["미결 사항 1개 결정", "정리 15분", "불필요한 약속 정리", "핵심 업무 집중"],
      },
      water: {
        homo: "깊은 흐름을 따르는 처방",
        comp: "메마른 곳에 물을 대는 처방",
        homoR: "수(水)의 유연한 에너지가 흐릅니다. 깊은 사색과 연구로 이 기운을 활용하세요.",
        compR: "수(水) 기운이 약하여 유연성이 저하되어 있습니다. 물의 에너지를 보충하세요.",
        actions: ["20분 독서", "물 2L 섭취", "저녁 산책", "새 관점 탐색"],
      },
    };

    const homoData = EL_LABELS[homoEl] || EL_LABELS.earth;
    const compData = EL_LABELS[compEl] || EL_LABELS.water;

    const vibePrescription = {
      homomorphic: {
        element: homoEl,
        label: homoData.homo,
        rationale: homoData.homoR,
        actions: homoData.actions,
        sensory: SENSORY[homoEl] || SENSORY.earth,
      },
      complementary: {
        element: compEl,
        label: compData.comp,
        rationale: compData.compR,
        actions: compData.actions,
        sensory: SENSORY[compEl] || SENSORY.water,
      },
    };

    return {
      gapAnalysis: { conceptGaps, evidenceGaps, boundaryGaps, conversionGaps },
      domainForecasts,
      vibePrescription,
      structuralPriorSummary: `일간 ${dm?.stem || "?"}(${dm?.element || "?"})${
        dm?.strength?.judgment === "strong" ? "은 강한 자기 주도력의 기반을 갖추고 있습니다" : "은 유연한 협력과 적응력이 핵심 자산입니다"
      }. 용신 ${dm?.yongSin || "?"} 기운의 활용이 오늘의 핵심 전략입니다.`,
      vibeSummary: `에너지(${energy}/10)${energy >= 6 ? "가 충분하고" : "가 보충이 필요하며"} 집중력(${focus}/10)${
        focus >= 6 ? "이 높아 실행에 적합합니다" : "이 낮아 짧은 집중 블록이 효과적입니다"
      }. 정서(${valence}/10)${valence >= 6 ? "가 안정적이어서 대인 교류에 유리합니다" : "가 낮아 내면 돌봄이 우선입니다"}.`,
    };
  };

  // LLM 없이도 사주 기반 로컬 포캐스트 생성
  const generateLocalForecast = (chartResult: any, vibeData: any) => {
    const dm = chartResult.dayMaster;
    const energy = vibeData?.energy ?? 5;
    const focus = vibeData?.focus ?? 5;
    const valence = vibeData?.valence ?? 5;

    const gradeScore = Math.round((energy + focus + valence) / 3);
    const grade = gradeScore >= 7 ? "S" : gradeScore >= 5 ? "A" : gradeScore >= 3 ? "B" : "C";

    const localForecastObj = {
      summary: `오늘 일간 ${dm.stem}(${dm.element})의 기류 아래, 현재 기분지수(${valence}/10)와 활력(${energy}/10)을 고려하여 핵심 가치에 집중하는 것이 이롭습니다.`,
      conceptState: energy < 4 ? "Recovery" : gradeScore >= 6 ? "Expansion" : "Consolidation",
      conceptStateDescription:
        gradeScore >= 5
          ? "확장과 전진에 적합한 컨디션입니다. 새로운 시도를 적극 추진하세요."
          : "내면 정리와 기존 업무 마무리에 집중하는 것이 효과적입니다.",
      actionPolicyExplanation: `${dm.element} 오행 기운과 현재 바이브 상태를 종합하면, ${
        gradeScore >= 5 ? "적극적 행동이 권장됩니다" : "신중한 접근이 유리합니다"
      }.`,
      grade,
      requiredActions: [
        "핵심 업무 1가지를 정의하고 완결하기",
        `${dm.element === "木" || dm.element === "목" || dm.element === "wood" ? "새로운 아이디어를 적극 제안" : "기존 계획의 완성도를 높이기"}`,
      ],
      forbiddenActions: [
        "사전 조율 없는 대규모 투자 결정이나 구두 확약",
        `${energy < 5 ? "무리한 야근 및 체력 소모" : "중요하지 않은 회의에 과도한 시간 소비"}`,
      ],
      deferredActions: ["긴급하지 않은 행정 업무 처리", "장기 계획 재수립 (주말로 이연)"],
      boundaryNotes:
        energy < 4 ? ["활력이 낮은 상태입니다. 반드시 2시간 이상 휴식을 확보하세요."] : [],
    };

    setForecast(localForecastObj);
    localStorage.setItem("last-generated-forecast", JSON.stringify(localForecastObj));

    setEstimatedVibe({
      valence: Math.min(10, Math.max(0, valence + 1)),
      arousal: Math.min(10, Math.max(0, (vibeData?.arousal ?? 5) - 1)),
      energy: energy,
      focus: focus,
      socialLoad: vibeData?.socialLoad ?? 5,
    });
    setForecastId(forecastIdStr || "local-forecast-id");

    const localRichOutput = generateLocalRichOutput(chartResult, vibeData);
    setRichOutput(localRichOutput);
    buildDeterministicExtras(chartResult, vibeData);
  };

  const toggleActionCheck = (idx: number) => {
    setCheckedActions((prev) => {
      const next = { ...prev, [idx]: !prev[idx] };
      try {
        localStorage.setItem(`checked-actions-${forecastId || forecastIdStr}`, JSON.stringify(next));
        if (forecastIdStr && forecastId && forecastId !== forecastIdStr) {
          localStorage.setItem(`checked-actions-${forecastIdStr}`, JSON.stringify(next));
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleFeedbackSubmit = async () => {
    if (rating === 0) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch("/api/forecast/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecastOutputId: forecastId,
          rating,
          feedbackTags: selectedTags,
          comment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.rlhfBias) {
          localStorage.setItem("local-rlhf-bias", JSON.stringify(data.rlhfBias));
        }
        setFeedbackSubmitted(true);
      }
    } catch (err) {
      console.error("Feedback submit failed:", err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  if (!chart) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center font-sans">
        <FortuneLoadingScreen stage="chart" />
      </div>
    );
  }

  const pillars = chart.pillars;
  const dm = chart.dayMaster;
  const totalActions = forecast?.requiredActions?.length || 0;
  const completedCount = Object.values(checkedActions).filter(Boolean).length;
  const completionPct = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-x-hidden font-sans pb-24 md:pb-12">
      <Navbar />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-glow pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-glow pointer-events-none" aria-hidden="true" />

      <main className="py-8 px-6 flex-1" role="main" aria-label="운세 결과">
        <ErrorBoundary fallbackMessage="운세 결과를 표시하는 중 오류가 발생했습니다. 새로고침하거나 다시 진단해주세요.">
          <div className="max-w-4xl w-full mx-auto space-y-6 relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1
                    id="heading-daily-board"
                    className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                  >
                    일일 운영 보드
                  </h1>
                  {llmLoading && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] text-indigo-300 animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      AI 정밀 보정 중...
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  {profile?.name || "사용자"} | {new Date().toLocaleDateString("ko-KR")} | 일간(DM): {dm.stem}({dm.element})
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  href="/app/daily"
                  aria-label="바이브 체크인을 다시 진단합니다"
                  className={cn(buttonVariants({ variant: "outline" }), "border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 gap-2 text-xs")}
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> 다시 진단
                </Link>
                <Link
                  href={`/app/run-receipt/${forecastId || forecastIdStr}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl border-0 gap-1.5 text-xs"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Run-Receipt 기록
                </Link>
              </div>
            </div>

            {/* RLHF 투명성 배너 */}
            <RlhfTransparencyBanner />

            {/* ═══════════════════════════════════════════════ */}
            {/* ABOVE THE FOLD: TodayBoardHeroCard (핵심 결론 + 정책 모드 + 실행 진척도) */}
            {/* ═══════════════════════════════════════════════ */}
            {forecast && (
              <div
                className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-indigo-950/25 to-zinc-900/90 border border-indigo-500/30 shadow-2xl shadow-indigo-950/30 space-y-5"
                role="region"
                aria-labelledby="heading-total-fortune"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      id="heading-total-fortune"
                      className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider"
                    >
                      정책 모드: {forecast.conceptState || "Consolidation"}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-medium">
                      일간 {dm.stem}({dm.element}) · 용신 {dm.yongSin || "균형"}
                    </span>
                    {riskVector?.primaryRisk && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                        주의 리스크: {riskVector.primaryRisk}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-950/80 border border-indigo-500/30">
                    <span className="text-[11px] text-zinc-400">오늘의 운영 등급</span>
                    <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                      {forecast.grade || "A"}
                    </span>
                  </div>
                </div>

                <p className="text-lg sm:text-xl font-bold leading-relaxed text-zinc-50">
                  &ldquo;{forecast.summary}&rdquo;
                </p>

                {/* Action Progress Bar & Quick Run-Receipt Link */}
                <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        오늘의 필수 행동 달성률
                      </span>
                      <span className="text-indigo-300 font-mono font-bold">
                        {completedCount} / {totalActions} 완료 ({completionPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.max(6, completionPct)}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/app/run-receipt/${forecastId || forecastIdStr}`}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    <span>체크한 행동으로 Run-Receipt 작성</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* 안전선 알림 (BoundaryAlert — 즉시 노출) */}
            {forecast?.boundaryNotes && forecast.boundaryNotes.length > 0 && (
              <div className="p-5 rounded-2xl bg-amber-950/25 border border-amber-900/40 flex items-start gap-4">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-amber-200 text-sm">안전선 준수 알림 (Safety Boundary)</h4>
                  <ul className="list-disc pl-4 text-xs text-amber-300/85 leading-relaxed space-y-1">
                    {forecast.boundaryNotes.map((note: string, idx: number) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* 3-TAB PROGRESSIVE DISCLOSURE NAVIGATION */}
            {/* ═══════════════════════════════════════════════ */}
            <div className="p-1.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("action")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  activeTab === "action"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>오늘의 행동 보드</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("domains")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  activeTab === "domains"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>6대 영역 & 바이브 처방</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("prior")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  activeTab === "prior"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>사주 원국 & 추론 근거</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>전체 펼쳐보기</span>
              </button>
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* TAB 1: ⚡ 오늘의 행동 보드 (Action Policy, Time Windows, Risk Vector, Reflection, Run-Receipt) */}
            {/* ═══════════════════════════════════════════════ */}
            {(activeTab === "action" || activeTab === "all") && forecast && (
              <div className="space-y-6 animate-fadeIn">
                {/* 행동 지침 (Interactive ActionPolicyChecklist + ForbiddenRuleList) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="region" aria-labelledby="heading-action-guide">
                  <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-emerald-500/25 backdrop-blur-md space-y-5">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h3
                        id="heading-action-guide"
                        className="text-sm font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" aria-hidden="true" /> 필수 행동 체크리스트 (Do)
                      </h3>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        {completedCount} / {totalActions} 완료
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {forecast.requiredActions?.map((action: string, idx: number) => {
                        const isChecked = Boolean(checkedActions[idx]);
                        return (
                          <li key={idx}>
                            <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/40 transition-colors cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleActionCheck(idx)}
                                className="mt-1 w-4 h-4 rounded border-emerald-500/50 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span
                                className={cn(
                                  "text-sm leading-relaxed font-medium transition-colors",
                                  isChecked ? "line-through text-zinc-500" : "text-zinc-100"
                                )}
                              >
                                {action}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[11px] text-zinc-500">
                      * 체크한 항목은 Run-Receipt 작성 페이지에 자동으로 채워집니다.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-rose-500/25 backdrop-blur-md space-y-4">
                      <h3 className="text-sm font-semibold text-rose-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-400" aria-hidden="true" /> 금지 행동 (Don&apos;t)
                      </h3>
                      <ul className="space-y-3">
                        {forecast.forbiddenActions?.map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                              !
                            </span>
                            <span className="text-sm text-zinc-200 leading-relaxed font-medium">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 rounded-3xl bg-zinc-900/40 border border-amber-500/25 backdrop-blur-md space-y-3">
                      <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" /> 보류 권장 결정 (Defer / Delay)
                      </h3>
                      <ul className="space-y-2">
                        {forecast.deferredActions?.map((action: string, idx: number) => (
                          <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* BestTimeWindowList (최적 행동 시간대) */}
                {bestTimeWindows.length > 0 && (
                  <div
                    className="p-6 sm:p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4"
                    role="region"
                    aria-labelledby="heading-time-windows"
                  >
                    <h3
                      id="heading-time-windows"
                      className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4 text-sky-400" aria-hidden="true" />
                      오늘의 최적 실행 시간대 (Best Time Windows)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {bestTimeWindows.map((win, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-3">
                          <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-xs text-zinc-300 leading-relaxed">{win}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RiskVectorCard (8 Operational Risk Axes) */}
                {riskVector && (
                  <div
                    className="p-6 sm:p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6"
                    role="region"
                    aria-labelledby="heading-risk-vector"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-4">
                      <h3
                        id="heading-risk-vector"
                        className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
                        운영 리스크 벡터 (Risk Vector)
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {riskVector.primaryRisk && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold">
                            핵심 주의: {riskVector.primaryRisk}
                          </span>
                        )}
                        {riskVector.secondaryRisk && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                            부차 주의: {riskVector.secondaryRisk}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: "overextension", label: "과잉 확장 (Overextension)" },
                        { key: "scopeLeak", label: "범위 누수 (Scope Leak)" },
                        { key: "overclaim", label: "과장 확약 (Overclaim)" },
                        { key: "burnout", label: "번아웃 위험 (Burnout)" },
                        { key: "relationshipDryness", label: "관계 건조화 (Dryness)" },
                        { key: "emotionalOverreaction", label: "감정 과잉반응 (Overreaction)" },
                        { key: "legalSafetyRisk", label: "법적·안전 리스크 (Legal/Safety)" },
                        { key: "missedOpportunity", label: "기회 유실 (Missed Opp.)" },
                      ].map(({ key, label }) => {
                        const rawScore = Number(riskVector[key] ?? 0.3);
                        const pct = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
                        const barColor = pct >= 65 ? "bg-rose-500" : pct >= 40 ? "bg-amber-500" : "bg-emerald-500";
                        return (
                          <div key={key} className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400 font-medium truncate" title={label}>
                                {label.split(" (")[0]}
                              </span>
                              <span className="text-zinc-300 font-mono text-[11px]">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 오늘의 성찰 질문 (reflectionQuestion) */}
                {reflectionQuestion && (
                  <div
                    className="p-6 sm:p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-3"
                    role="region"
                    aria-labelledby="heading-reflection"
                  >
                    <h3 id="heading-reflection" className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400" aria-hidden="true" />
                      오늘의 성찰 질문 (Reflection)
                    </h3>
                    <p className="text-sm text-zinc-300 italic leading-relaxed">&ldquo;{reflectionQuestion}&rdquo;</p>
                  </div>
                )}

                {/* RunReceiptCTA (Flow B/C Connection) */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-zinc-900/40 border border-indigo-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" />
                      학습 루프 연결 (Run-Receipt)
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100">
                      오늘 실행한 것을 기록하고 내일의 운영판을 더 정확하게 만들기
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                      오늘 어떤 행동을 선택했고 무엇을 보류했는지 Run-Receipt로 남기면, 다음 일간·주간·월간 보드가 나의 실제 실행 패턴을 반영합니다.
                    </p>
                  </div>
                  <Link
                    href={`/app/run-receipt/${forecastId || forecastIdStr}`}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl border-0 shrink-0 gap-2"
                    )}
                  >
                    <span>Run-Receipt 작성하기</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* TAB 2: 🧭 6대 영역 & 바이브 처방 (Domain Forecasts, Vibe Prescription, Vibe Sync, GAP, Trend) */}
            {/* ═══════════════════════════════════════════════ */}
            {(activeTab === "domains" || activeTab === "all") && forecast && (
              <div className="space-y-6 animate-fadeIn">
                {/* 6대 영역별 상세 운세 */}
                {richOutput?.domainForecasts && richOutput.domainForecasts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 px-1">
                      <Target className="w-4 h-4 text-emerald-400" />
                      6대 영역별 상세 운세
                    </h3>
                    {richOutput.domainForecasts.map((df: any) => (
                      <DomainForecastCard key={df.domain} forecast={df} />
                    ))}
                  </div>
                )}

                {/* Vibe 처방 */}
                {richOutput?.vibePrescription && <VibePrescriptionPanel {...richOutput.vibePrescription} />}

                {/* 바이브 동기화 분석 (Vibe Sync Meter) */}
                {vibe &&
                  estimatedVibe &&
                  (() => {
                    const valenceDiff = Math.abs((vibe.valence ?? 5) - (estimatedVibe.valence ?? 5));
                    const arousalDiff = Math.abs((vibe.arousal ?? 5) - (estimatedVibe.arousal ?? 5));
                    const energyDiff = Math.abs((vibe.energy ?? 5) - (estimatedVibe.energy ?? 5));
                    const focusDiff = Math.abs((vibe.focus ?? 5) - (estimatedVibe.focus ?? 5));
                    const socialDiff = Math.abs((vibe.socialLoad ?? vibe.social_load ?? 5) - (estimatedVibe.socialLoad ?? 5));
                    const totalDiff = valenceDiff + arousalDiff + energyDiff + focusDiff + socialDiff;
                    const alignmentScore = Math.max(0, 100 - totalDiff * 2);
                    const syncInfo = getSyncLabel(alignmentScore);

                    return (
                      <div
                        className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6"
                        role="region"
                        aria-labelledby="heading-vibe-sync"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
                          <div className="space-y-1">
                            <h3
                              id="heading-vibe-sync"
                              className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2"
                            >
                              <Activity className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                              바이브 동기화 분석 (Vibe Sync Meter)
                            </h3>
                            <p className="text-xs text-zinc-500">자가 진단 바이브와 우주적/역사적 기류 추정 바이브 간의 일치도입니다.</p>
                          </div>
                          <div className="flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-full border border-zinc-800">
                            <span className="text-xs text-zinc-400">동기화율:</span>
                            <span className={cn("text-sm font-bold", syncInfo.color)}>
                              {alignmentScore}% ({syncInfo.text})
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {[
                            { label: "정서 밸런스 (Valence)", mVal: vibe.valence ?? 5, eVal: estimatedVibe.valence ?? 5 },
                            { label: "각성/긴장도 (Arousal)", mVal: vibe.arousal ?? 5, eVal: estimatedVibe.arousal ?? 5 },
                            { label: "신체 활력 (Energy)", mVal: vibe.energy ?? 5, eVal: estimatedVibe.energy ?? 5 },
                            { label: "인지 몰입도 (Focus)", mVal: vibe.focus ?? 5, eVal: estimatedVibe.focus ?? 5 },
                            { label: "사회적 부하 (Social Load)", mVal: vibe.socialLoad ?? vibe.social_load ?? 5, eVal: estimatedVibe.socialLoad ?? 5 },
                          ].map((dim, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-300 font-medium">{dim.label}</span>
                                <span className="text-zinc-500">
                                  자가: <strong className="text-sky-400">{dim.mVal}</strong> | 추정:{" "}
                                  <strong className="text-indigo-400">{dim.eVal}</strong>
                                </span>
                              </div>
                              <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden relative flex flex-col justify-center">
                                <div
                                  className="absolute h-1.5 bg-sky-400/80 rounded-full top-0.5 left-0 transition-all duration-500"
                                  style={{ width: `${dim.mVal * 10}%` }}
                                />
                                <div
                                  className="absolute h-1.5 bg-indigo-500/80 rounded-full bottom-0.5 left-0 transition-all duration-500"
                                  style={{ width: `${dim.eVal * 10}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                {/* GAP 분석 */}
                {richOutput?.gapAnalysis && <GapAnalysisPanel gapAnalysis={richOutput.gapAnalysis} />}

                {/* 운세 트렌드 비교 */}
                <FortuneTrendCard currentGrade={forecast.grade || "A"} />
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* TAB 3: ☯ 사주 원국 & 추론 근거 (4 Pillars, Luck, Ten Gods, Interactions, TCO Trace, RLHF) */}
            {/* ═══════════════════════════════════════════════ */}
            {(activeTab === "prior" || activeTab === "all") && (
              <div className="space-y-6 animate-fadeIn">
                {/* 사주 팔자 차트 */}
                <div
                  className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6"
                  role="region"
                  aria-labelledby="heading-chart"
                >
                  <h2
                    id="heading-chart"
                    className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3"
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                    사주 팔자 (四柱八字)
                  </h2>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    {(["year", "month", "day", "hour"] as const).map((pillar) => {
                      const p = pillars[pillar];
                      const stemEl = p.stemElement || "";
                      const branchEl = p.branchElement || "";
                      const label = pillar === "year" ? "년주" : pillar === "month" ? "월주" : pillar === "day" ? "일주" : "시주";
                      return (
                        <div key={pillar} className="space-y-2">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</span>
                          <div className={`p-4 rounded-2xl border ${ELEMENT_BG[stemEl] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                            <div className={`text-2xl font-bold ${ELEMENT_COLORS[stemEl] || "text-zinc-300"}`}>{p.stem}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              {stemEl} ({p.stemPolarity === "양" ? "+" : "-"})
                            </div>
                          </div>
                          <div className={`p-4 rounded-2xl border ${ELEMENT_BG[branchEl] || "bg-zinc-800/30 border-zinc-700/50"}`}>
                            <div className={`text-2xl font-bold ${ELEMENT_COLORS[branchEl] || "text-zinc-300"}`}>{p.branch}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">{branchEl}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 오행 분포 */}
                  {(chart.elementProfile || chart.fiveElementDistribution) && (
                    <div className="mt-4 space-y-3">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">오행 분포</h3>
                      <div className="flex gap-2">
                        {Object.entries((chart.elementProfile || chart.fiveElementDistribution) as Record<string, number>).map(
                          ([element, count]) => (
                            <div
                              key={element}
                              className={`flex-1 p-3 rounded-xl text-center border ${
                                ELEMENT_BG[element] || "bg-zinc-800/30 border-zinc-700/50"
                              }`}
                            >
                              <div className={`text-lg font-bold ${ELEMENT_COLORS[element] || "text-zinc-300"}`}>{element}</div>
                              <div className="text-xs text-zinc-500">{count as number}</div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 대운 & 세운 */}
                {(majorLuck || annualLuck) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const luckPeriods = majorLuck?.cycles || majorLuck?.periods || [];
                      if (!majorLuck || luckPeriods.length === 0) return null;
                      const nowYear = new Date().getFullYear();
                      const birthYear =
                        parseInt((profile?.birthDateTime || profile?.birthDate || "1990").substring(0, 4), 10) || 1990;
                      const currentAge = Math.max(1, nowYear - birthYear);
                      const current =
                        luckPeriods.find((p: any) => currentAge >= p.startAge && currentAge < p.startAge + 10) || luckPeriods[0];
                      return (
                        <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                            현재 대운
                          </h3>
                          {current ? (
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-4 rounded-2xl border text-center ${
                                  ELEMENT_BG[current.stemElement] || "bg-zinc-800/30 border-zinc-700/50"
                                }`}
                              >
                                <div className={`text-xl font-bold ${ELEMENT_COLORS[current.stemElement] || "text-zinc-300"}`}>
                                  {current.ganzhi || `${current.stem || ""}${current.branch || ""}`}
                                </div>
                                {current.stemElement && (
                                  <div className="text-[10px] text-zinc-500">
                                    {current.stemElement} · {current.branchElement}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400 space-y-1">
                                <p className="font-medium text-zinc-200">
                                  {current.startAge}세 ~ {current.startAge + 9}세 대운
                                </p>
                                <p className="text-zinc-500">
                                  10년 주기의 구조적 배경 흐름 ({majorLuck.direction === "forward" ? "순행" : "역행"})
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500">대운 산출 중...</p>
                          )}
                        </div>
                      );
                    })()}
                    {annualLuck &&
                      (() => {
                        const alPillar = annualLuck.pillar || annualLuck;
                        return (
                          <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                              <Zap className="w-4 h-4 text-amber-400" />
                              {annualLuck.year || new Date().getFullYear()}년 세운
                            </h3>
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-4 rounded-2xl border text-center ${
                                  ELEMENT_BG[alPillar.stemElement] || "bg-zinc-800/30 border-zinc-700/50"
                                }`}
                              >
                                <div className={`text-xl font-bold ${ELEMENT_COLORS[alPillar.stemElement] || "text-zinc-300"}`}>
                                  {alPillar.label || `${alPillar.stem || ""}${alPillar.branch || ""}`}
                                </div>
                                {alPillar.stemElement && (
                                  <div className="text-[10px] text-zinc-500">
                                    {alPillar.stemElement} · {alPillar.branchElement}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                <p>올해의 흐름을 지배하는 기운</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                )}

                {/* 십신 (Ten Gods) */}
                {tenGods && (
                  <div
                    className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4"
                    role="region"
                    aria-labelledby="heading-ten-gods"
                  >
                    <h2
                      id="heading-ten-gods"
                      className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3"
                    >
                      <Target className="w-4 h-4 text-purple-400" aria-hidden="true" />
                      십신 (十神) 분석
                    </h2>
                    <div className="grid grid-cols-4 gap-3 text-center text-xs">
                      {(["year", "month", "day", "hour"] as const).map((p) => {
                        const label = p === "year" ? "년주" : p === "month" ? "월주" : p === "day" ? "일주" : "시주";
                        const stemKey = p + "Stem";
                        const branchKey = p + "Branch";
                        return (
                          <div key={p} className="space-y-1">
                            <span className="text-[10px] text-zinc-500 font-semibold">{label}</span>
                            <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                              <span className="text-indigo-300 font-medium">{tenGods[stemKey]}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                              <span className="text-purple-300 font-medium">{tenGods[branchKey]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 합충형파해 + 신살 */}
                {(interactions.length > 0 || divineKillers.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {interactions.length > 0 && (
                      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 text-amber-400" />
                          합충형파해 ({interactions.length}건)
                        </h3>
                        <div className="space-y-2">
                          {interactions.slice(0, 8).map((inter: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  (inter.type || "").includes("합")
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : (inter.type || "").includes("충")
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {inter.type || "기타"}
                              </span>
                              <span className="text-zinc-400">{inter.description || `${(inter.involved || []).join(" · ")}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {divineKillers.length > 0 && (
                      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
                        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          신살 ({divineKillers.length}건)
                        </h3>
                        <div className="space-y-2">
                          {divineKillers.map((dk: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  (dk.type || dk.name || "").includes("귀인")
                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {dk.type || dk.name || "기타"}
                              </span>
                              <span className="text-zinc-400">
                                {dk.description || `${dk.position || ""} ${dk.targetBranch || dk.branch || ""}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 세부 분석 & 구조적 사전값 요약 */}
                {forecast && (
                  <div
                    className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4"
                    role="region"
                    aria-labelledby="heading-detail-analysis"
                  >
                    <h3
                      id="heading-detail-analysis"
                      className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4 text-purple-400" aria-hidden="true" /> 구조적 사전값 & 행동 조율 해설
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <strong className="text-zinc-100">개념 분석:</strong> {forecast.conceptStateDescription}
                    </p>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <strong className="text-zinc-100">행동 조율:</strong> {forecast.actionPolicyExplanation}
                    </p>
                    {richOutput?.structuralPriorSummary && (
                      <p className="text-sm text-zinc-400 leading-relaxed pt-2 border-t border-zinc-800/60">
                        <strong className="text-indigo-300">사전값 요약:</strong> {richOutput.structuralPriorSummary}
                      </p>
                    )}
                  </div>
                )}

                {/* TCO 개념 활성화 & 오퍼레이터 추적 & 개인 맥락 */}
                <ConceptActivationPanel chartData={chart} vibeData={vibe} />
                <OperatorTracePanel chartData={chart} vibeData={vibe} />
                <ContextMappingPanel
                  personalContext={(() => {
                    try {
                      const c = localStorage.getItem("personal-context");
                      return c ? JSON.parse(c) : undefined;
                    } catch {
                      return undefined;
                    }
                  })()}
                />

                {/* 오늘의 피드백 및 RLHF 조정 폼 */}
                <div
                  className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-6"
                  role="region"
                  aria-labelledby="heading-feedback"
                >
                  <h3
                    id="heading-feedback"
                    className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2"
                  >
                    <Star className="w-4 h-4 text-amber-400" aria-hidden="true" /> 오늘의 피드백 & 조정 (RLHF)
                  </h3>

                  {feedbackSubmitted ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                        <Sparkles className="w-6 h-6 animate-pulse text-indigo-400" />
                      </div>
                      <h4 className="text-zinc-200 font-semibold text-sm">피드백이 성공적으로 반영되었습니다!</h4>
                      <p className="text-xs text-zinc-500">조정된 피드백 변수가 다음 운세 및 조율 행동 정책 생성에 즉시 적용됩니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">오늘 지침의 전반적인 유용성에 대해 별점을 남겨주세요.</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              aria-label={`${star}점 별점 부여`}
                              aria-pressed={rating >= star}
                              className="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded transition-all"
                            >
                              <Star
                                aria-hidden="true"
                                className={cn(
                                  "w-6 h-6 transition-colors",
                                  rating >= star ? "text-amber-400 fill-amber-400" : "text-zinc-600 hover:text-amber-300"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {rating > 0 && rating <= 3 && (
                        <div className="space-y-3 animate-fadeIn">
                          <label className="text-xs text-zinc-400 font-medium">
                            불편하셨던 부분이 있다면 피드백 태그를 선택해주세요 (중복 가능)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: "too_demanding", label: "지침이 무리함 (Too Demanding)" },
                              { key: "too_vague", label: "내용이 너무 모호함 (Too Vague)" },
                              { key: "too_negative", label: "불안감을 과도하게 유발 (Too Negative)" },
                              { key: "inaccurate", label: "오늘 바이브/실제 컨디션과 맞지 않음" },
                            ].map((tag) => (
                              <button
                                key={tag.key}
                                type="button"
                                onClick={() => toggleTag(tag.key)}
                                className={cn(
                                  "text-xs px-3 py-1.5 rounded-full border transition-all",
                                  selectedTags.includes(tag.key)
                                    ? "bg-indigo-500/10 border-indigo-400 text-indigo-300 font-semibold"
                                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                                )}
                              >
                                {tag.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {rating >= 4 && (
                        <div className="space-y-3 animate-fadeIn">
                          <label className="text-xs text-zinc-400 font-medium">
                            좋았던 점이 있다면 피드백 태그를 선택해주세요 (중복 가능)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: "accurate", label: "오늘 내 에너지/컨디션과 정확히 일치함" },
                              { key: "appropriate", label: "행동 가이드라인이 실행하기 아주 적절했음" },
                              { key: "helpful_tone", label: "격려해주거나 명확한 코칭 톤이 마음에 듦" },
                            ].map((tag) => (
                              <button
                                key={tag.key}
                                type="button"
                                onClick={() => toggleTag(tag.key)}
                                className={cn(
                                  "text-xs px-3 py-1.5 rounded-full border transition-all",
                                  selectedTags.includes(tag.key)
                                    ? "bg-emerald-500/10 border-emerald-400 text-emerald-300 font-semibold"
                                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                                )}
                              >
                                {tag.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">의견 보내기 (선택)</label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="이 조율 지침을 개인화하는 데 필요한 세부 맥락이나 조언이 있다면 남겨주세요."
                          aria-label="추가 의견을 입력하세요"
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-3 h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-zinc-700 transition-colors"
                        />
                      </div>

                      <Button
                        type="button"
                        disabled={rating === 0 || submittingFeedback}
                        onClick={handleFeedbackSubmit}
                        aria-label="피드백을 제출하고 개인 조율 규칙을 보정합니다"
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                      >
                        {submittingFeedback ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                            <span>피드백 전송 중...</span>
                          </>
                        ) : (
                          <span>피드백 제출 및 개인 룰 보정</span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 면책 조항 */}
            {(() => {
              const disclaimerLevels: ("general" | "health" | "finance_legal")[] = ["general"];
              if (richOutput?.domainForecasts?.some((d: any) => d.domain === "health_recovery")) disclaimerLevels.push("health");
              if (
                richOutput?.domainForecasts?.some((d: any) => ["business_finance", "risk_legal_safety"].includes(d.domain))
              )
                disclaimerLevels.push("finance_legal");
              return <DisclaimerBanner levels={disclaimerLevels} />;
            })()}
          </div>
        </ErrorBoundary>

        {/* 운세 코치 채팅 패널 */}
        {chart && forecast && (
          <FortuneChatPanel
            chartData={chart}
            personalContext={(() => {
              try {
                const c = localStorage.getItem("personal-context");
                return c ? JSON.parse(c) : null;
              } catch {
                return null;
              }
            })()}
            forecastSummary={forecast?.summary || ""}
            forecastId={forecastId || forecastIdStr}
          />
        )}
      </main>
    </div>
  );
}
