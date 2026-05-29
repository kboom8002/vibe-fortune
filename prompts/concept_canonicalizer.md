# Concept Canonicalizer Prompt

Input: ContextTensor, chart/luck summaries, vibe state, user focus.

Task:
- Convert user context into canonical TCO concepts.
- Identify activeConcepts, suppressedConcepts, conceptGaps, evidenceGaps, boundaryGaps, conversionGaps.
- Do not invent chart values.
- Do not use deterministic fate language.

Output: ConceptState JSON only.
