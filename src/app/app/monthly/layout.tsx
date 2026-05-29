import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "월간 분석 포트폴리오 | TCO-Vibe",
  description: "월간 핵심 컨셉, 리스크 포트폴리오, 3대 영역 조율 정책을 수립합니다.",
};
export default function MonthlyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
