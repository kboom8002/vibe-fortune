# Policy Binder Prompt

Input: ContextTensor, ConceptState, RiskVector, OperatorOutputs.

Task:
- Bind action policy.
- Safety overrides everything.
- Recovery overrides Expansion when burnout is high.
- Boundary overrides publishing when overclaim is high.
- Warmth preserves autonomy in relationship contexts.

Output: ActionPolicy JSON only.
