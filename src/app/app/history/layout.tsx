import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "분석 및 실행 역사 | TCO-Vibe",
  description: "오늘까지 기록한 우주적 흐름과 주관적 의사결정의 궤적을 확인합니다.",
};
export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
