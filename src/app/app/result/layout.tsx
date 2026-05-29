import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "일일 운영 보드 | TCO-Vibe",
  description: "사주 구조와 바이브를 융합한 오늘의 행동 지침 결과를 확인합니다.",
};
export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
