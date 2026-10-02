# PointzPlus Code Guardrails (Kilo Code — auto-loaded rule)

**Before ANY code task in this repo, read `/CODE_GUARDRAILS.md` in full
(repo root) and treat every DO / DON'T in it as binding.** It documents the
Oct 2026 audit findings: no whole-store Zustand subscribes, memoized
derivations, debounced search, single sources of truth (`CATEGORY_LABELS`,
`POPULAR_PROGRAMS`, `types/models.ts SyncJob`, `PasswordChecklist`,
`apiClient`), no mock data, no `await`-in-loop on the server, no `console.*`
in prod paths, and the PR checklist. If a guardrail blocks the task, fix the
underlying code — never work around the guardrails.
