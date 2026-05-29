# 10_IMPLEMENTATION_PLAN.md
# Implementation Plan

Version: 0.2

---

## 1. Rule

Claude must implement only the current milestone. Do not add post-MVP features without explicit instruction.

---

## M0. Repo Bootstrap

- [ ] Create Next.js App Router project.
- [ ] Configure TypeScript strict mode.
- [ ] Configure Tailwind and shadcn/ui.
- [ ] Configure `@/*` path alias.
- [ ] Add `.env.example`.
- [ ] Add README and AGENTS reading instructions.

Definition of Done:

- [ ] `npm run dev` works.
- [ ] `/` renders landing page.

---

## M1. Schema and Supabase Foundation

- [ ] Add `/schemas` Zod contracts.
- [ ] Create Supabase migration 0001 initial schema.
- [ ] Create RLS migration.
- [ ] Create index migration.
- [ ] Implement Supabase browser/server clients.

DoD:

- [ ] Local type checking passes.
- [ ] RLS policies exist for user-owned data.

---

## M2. Manse Engine v1

- [ ] Implement `/src/lib/manse` deterministic module.
- [ ] Add reference cases.
- [ ] Add unit tests for pillars, luck, consistency.

DoD:

- [ ] LLM is not called from Manse Engine.
- [ ] Reference cases pass MVP threshold.

---

## M3. Vibe Check-in and Daily UI

- [ ] Implement onboarding and birth profile form.
- [ ] Implement VibeSliderGroup.
- [ ] Implement Daily Loop page.
- [ ] Save VibeCheckIn and ForecastRequest.

DoD:

- [ ] User can create a daily request.

---

## M4. LangGraph Agent Runtime

- [ ] Implement agent state.
- [ ] Implement InputIntakeNode.
- [ ] Implement SafetyGateNode.
- [ ] Implement ManseCalculatorNode.
- [ ] Implement ContextTensorBuilderNode.
- [ ] Implement RiskVectorizerNode.
- [ ] Implement OperatorExecutorNode.
- [ ] Implement PolicyBinderNode.
- [ ] Implement ForecastWriterNode.
- [ ] Implement SafetyBoundaryReviewerNode.

DoD:

- [ ] Mock forecast generation works without real model.
- [ ] Real provider can be enabled via adapter.

---

## M5. Forecast Generation and Result UI

- [ ] Implement DailyForecastOutput template.
- [ ] Implement TodayBoardCard.
- [ ] Implement RiskVectorCard.
- [ ] Implement ActionPolicyChecklist.
- [ ] Persist ForecastOutput.

DoD:

- [ ] `/app/daily/result/[id]` renders daily board.

---

## M6. Run-Receipt and History

- [ ] Implement RunReceiptForm.
- [ ] Save RunReceipt.
- [ ] Show history list.
- [ ] Generate simple recomposition summary.

DoD:

- [ ] User can log what they did after a forecast.

---

## M7. Weekly / Monthly Forecast

- [ ] Use recent RunReceipts.
- [ ] Add weekly trajectory output.
- [ ] Add monthly concept portfolio output.

DoD:

- [ ] Weekly/monthly outputs pass schema.

---

## M8. Eval and Safety Harness

- [ ] Add QBS fixtures.
- [ ] Add safety cases.
- [ ] Add judge output schema.
- [ ] Generate eval report.

DoD:

- [ ] Release gates pass.

---

## M9. Beta Polish

- [ ] Mobile UI polish.
- [ ] Empty/error states.
- [ ] BoundaryAlert UI.
- [ ] Privacy copy.
- [ ] Deployment checklist.
