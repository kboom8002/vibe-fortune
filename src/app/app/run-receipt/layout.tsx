import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "실행 기록 | TCO-Vibe",
  description: "보드의 지침을 어떻게 실행하고 조율했는지 기록합니다.",
};
export default function RunReceiptLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
