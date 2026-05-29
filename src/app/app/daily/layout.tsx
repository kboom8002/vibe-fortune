import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "오늘의 바이브 체크인 | TCO-Vibe",
  description: "현재의 기분, 활력, 포커스 상태를 기록하고 사주 구조와 결합한 맞춤형 처방을 산출합니다.",
};
export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
