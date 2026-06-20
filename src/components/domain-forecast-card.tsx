"use client";
import React, { useState } from "react";

const DOMAIN_ICONS: Record<string, string> = {
  business_finance: "💰",
  relationship_love: "❤️",
  health_recovery: "🏥",
  learning_writing_research: "📚",
  reputation_branding: "🎯",
  risk_legal_safety: "🛡️",
};

const DOMAIN_LABELS_KO: Record<string, string> = {
  business_finance: "사업·재정",
  relationship_love: "관계·애정",
  health_recovery: "건강·회복",
  learning_writing_research: "학습·창작·연구",
  reputation_branding: "브랜딩·평판",
  risk_legal_safety: "리스크·안전",
};

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: "#22c55e",
  fire: "#ef4444",
  earth: "#f59e0b",
  metal: "#94a3b8",
  water: "#3b82f6",
};

const ELEMENT_KO: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

interface DomainForecast {
  domain: string;
  headline?: string;
  narrative?: string;
  elementInfluence: string;
  riskLevel: string;
  mode?: string;
  requiredActions: string[];
  forbiddenActions: string[];
  activatedConcepts: string[];
}

interface Props {
  forecast: DomainForecast;
  isExpanded?: boolean;
}

export function DomainForecastCard({ forecast, isExpanded: defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const icon = DOMAIN_ICONS[forecast.domain] || "📊";
  const label = DOMAIN_LABELS_KO[forecast.domain] || forecast.domain;
  const riskColor = RISK_COLORS[forecast.riskLevel] || "#94a3b8";
  const elementColor = ELEMENT_COLORS[forecast.elementInfluence] || "#94a3b8";
  const elementKo = ELEMENT_KO[forecast.elementInfluence] || forecast.elementInfluence;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: "16px",
      overflow: "hidden",
      transition: "all 0.3s ease",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "15px" }}>{label}</div>
          {forecast.headline && (
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "2px" }}>{forecast.headline}</div>
          )}
          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>모드: {forecast.mode || "Consolidation"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "11px",
            fontWeight: 700,
            color: elementColor,
            background: `${elementColor}22`,
            padding: "2px 8px",
            borderRadius: "99px",
          }}>{elementKo}</span>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: riskColor, flexShrink: 0,
          }} />
          <span style={{
            color: "#94a3b8",
            fontSize: "12px",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}>▼</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {forecast.narrative && (
            <p style={{
              color: "#cbd5e1", fontSize: "14px", lineHeight: "1.8",
              marginTop: "16px", marginBottom: "16px",
              whiteSpace: "pre-line",
            }}>{forecast.narrative}</p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ color: "#22c55e", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>✅ 필수 행동</div>
              {forecast.requiredActions.map((a, i) => (
                <div key={i} style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>• {a}</div>
              ))}
            </div>
            <div>
              <div style={{ color: "#ef4444", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>🚫 금지 사항</div>
              {forecast.forbiddenActions.map((a, i) => (
                <div key={i} style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "4px" }}>• {a}</div>
              ))}
            </div>
          </div>

          {forecast.activatedConcepts.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ color: "#7c3aed", fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>🔗 활성 개념</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {forecast.activatedConcepts.map((c, i) => (
                  <span key={i} style={{
                    fontSize: "11px", color: "#a78bfa",
                    background: "rgba(124,58,237,0.15)",
                    padding: "2px 8px", borderRadius: "99px",
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
