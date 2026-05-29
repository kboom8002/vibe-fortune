# 11_TRACEABILITY_MATRIX.md
# Feature Traceability Matrix

Version: 0.2

---

## 1. Purpose

This matrix prevents Claude from implementing partial features without API, DB, UI, schema, safety, and test coverage.

---

## 2. MVP Traceability Matrix

| Feature | Route | API | DB Tables | LangGraph Nodes | Schemas | Safety | Tests | Milestone |
|---|---|---|---|---|---|---|---|---|
| Birth Profile Setup | `/app/onboarding/birth` | `POST /api/profile/birth` | `birth_profiles`, `manse_charts`, `major_luck_cycles` | BirthDataNormalizerNode, ManseCalculatorNode, ChartConsistencyCheckerNode | BirthProfileSchema, ManseChartSchema | sensitive birth data RLS, no LLM calculation | manse reference cases, RLS tests | M1-M2 |
| Daily Vibe Check-in | `/app/daily` | `POST /api/vibe-checkin` | `vibe_checkins` | VibeCheckInParserNode | VibeCheckInSchema | no diagnosis, state not identity | schema test, ethics test | M3 |
| Daily Forecast Board | `/app/daily/result/[id]` | `POST /api/forecast/daily` | `forecast_requests`, `context_tensors`, `risk_vectors`, `action_policies`, `forecast_outputs` | ContextTensorBuilderNode, RiskVectorizerNode, OperatorExecutorNode, PolicyBinderNode, ForecastWriterNode, SafetyBoundaryReviewerNode | ForecastOutputSchema, RiskVectorSchema, ActionPolicySchema | no deterministic prediction, boundary notes | QBS-D, safety cases | M4-M5 |
| Run-Receipt | `/app/run-receipt/[forecastId]` | `POST /api/run-receipt` | `run_receipts` | RunReceiptLoggerNode | RunReceiptSchema | no shame, no coercion | recomposition cases | M6 |
| Weekly Review | `/app/weekly` | `POST /api/forecast/weekly` | `run_receipts`, `forecast_outputs` | RecompositionEngineNode, ForecastWriterNode | WeeklyForecastOutputSchema | no deterministic forecast | QBS-W | M7 |
| Monthly Plan | `/app/monthly` | `POST /api/forecast/monthly` | `context_tensors`, `risk_vectors`, `action_policies`, `forecast_outputs` | RecompositionEngineNode, PolicyBinderNode | MonthlyForecastOutputSchema | health/legal/investment boundary | QBS-M | M7 |
| Safety Challenge Handling | all | all forecast APIs | `safety_events` | SafetyGateNode, SafetyBoundaryReviewerNode | SafetyEventSchema | block/redirect/log | forbidden-output cases | M8 |

---

## 3. Implementation Rule

A feature is not complete unless all columns are implemented or explicitly marked `deferred` with reason.
