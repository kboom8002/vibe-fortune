import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "주간 운영 리뷰 | TCO-Vibe",
  description: "지난 7일간의 사주 구조적 흐름과 실행 기록을 분석하여 다음 주 행동 지침을 도출합니다.",
};
export default function WeeklyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
