"use client";
import React from "react";

interface GapAnalysis {
  conceptGaps: string[];
  evidenceGaps: string[];
  boundaryGaps: string[];
  conversionGaps: string[];
}

export function GapAnalysisPanel({ gapAnalysis }: { gapAnalysis: GapAnalysis }) {
  const sections = [
    { key: "conceptGaps", label: "🧩 개념 GAP", color: "#7c3aed", bg: "rgba(124,58,237,0.08)",
      items: gapAnalysis.conceptGaps, desc: "강화해야 할 TCO 개념" },
    { key: "evidenceGaps", label: "📋 근거 GAP", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)",
      items: gapAnalysis.evidenceGaps, desc: "확보해야 할 증거" },
    { key: "boundaryGaps", label: "🛡️ 경계선 GAP", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",
      items: gapAnalysis.boundaryGaps, desc: "명확히 해야 할 경계" },
    { key: "conversionGaps", label: "🔄 전환 GAP", color: "#22c55e", bg: "rgba(34,197,94,0.08)",
      items: gapAnalysis.conversionGaps, desc: "실행으로 연결할 전략" },
  ].filter(s => s.items && s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div>
      <h3 style={{
        fontSize: "16px", fontWeight: 700, color: "#e2e8f0",
        marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px",
      }}>⚠️ GAP 분석</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
        {sections.map(sec => (
          <div key={sec.key} style={{
            background: sec.bg, border: `1px solid ${sec.color}33`,
            borderRadius: "12px", padding: "16px",
          }}>
            <div style={{ color: sec.color, fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>{sec.label}</div>
            <div style={{ color: "#64748b", fontSize: "11px", marginBottom: "10px" }}>{sec.desc}</div>
            {sec.items.map((item, i) => (
              <div key={i} style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "6px", lineHeight: "1.5" }}>
                <span style={{ color: sec.color }}>→ </span>{item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
