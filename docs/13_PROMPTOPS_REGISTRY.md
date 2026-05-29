# 13_PROMPTOPS_REGISTRY.md
# PromptOps Registry Specification

Version: 0.2

---

## 1. Purpose

All prompts used by the agent must be versioned, testable, rollback-ready, and mapped to input/output schemas.

---

## 2. Registry Fields

```yaml
prompt_id: forecast_writer
version: 0.2.0
file: prompts/forecast_writer.md
model_role: structured_renderer
input_schema: ForecastWriterInputSchema
output_schema: ForecastOutputSchema
safety_class: S1
golden_tests:
  - QBS-D-001
  - QBS-D-002
rollback_to: 0.1.0
owner: product
status: active
```

---

## 3. Prompt Categories

```text
system
concept_canonicalizer
risk_vectorizer
policy_binder
forecast_writer
safety_reviewer
run_receipt_summarizer
eval_judge
```

---

## 4. Prompt Rules

1. Prompts must not calculate chart pillars.
2. Prompts must not override deterministic module output.
3. Prompts must not invent missing birth data.
4. Prompts must output JSON when schema is required.
5. Prompts must include forbidden outputs.
6. Prompts must preserve autonomy and uncertainty.
7. Prompt changes require goldset regression.

---

## 5. Versioning

Use semantic versioning:

```text
major: output schema or behavior contract change
minor: prompt instruction or rubric expansion
patch: wording/clarity fixes
```

---

## 6. Release Rule

A prompt version can be active only if:

```text
- schema validation pass rate = 100%
- safety forbidden output pass rate = 100%
- QBS floor score >= 0.80
- no regression worse than allowed threshold
```
