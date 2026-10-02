# PointzPlus Code Guardrails — MUST READ before writing code

> This file exists because a full audit (Oct 2026) found duplicated logic,
> un-memoized selectors, mock data shipped to prod, and dead dependencies.
> Every contributor — human or AI model — MUST follow these rules.
> If a rule blocks you, fix the underlying code, don't work around this file.

## 0. Golden rule

**One job → one place.** Before creating ANY new file, function, constant,
type, or endpoint, search the codebase (`grep` / codebase search) for an
existing one that does the same work. If it exists, reuse it. Duplication is
the #1 defect in this repo's history.

---

## 1. State management (Zustand) — DOS and DON'TS

### ✅ DO
- Subscribe with **per-field selectors**: `usePointsStore((s) => s.accounts)`.
- Derive data with `useMemo` keyed on the subscribed slices:
  ```ts
  const accounts = usePointsStore((s) => s.accounts);
  const summary = useMemo(() => getDashboardSummary(), [getDashboardSummary, accounts, monthlyFlows]);
  ```
- Keep actions (`fetch*`, `sync*`, `acknowledge*`) as stable store functions
  selected individually — never spread the whole store into a component.
- Guard network actions against repeat calls: `refreshAll()` skips when the
  last successful refresh was < 30s ago unless `force=true` (pull-to-refresh
  and explicit retry buttons pass `force=true`; mount effects do NOT).

### ❌ DON'T
- **NEVER** call `useAuthStore()` / `usePointsStore()` with NO selector
  (subscribes to the entire store → every consumer re-renders on ANY change).
  `hooks/useAuth.ts` had this bug; it is fixed — don't regress it.
- **NEVER** compute `getDashboardSummary()` / `getCategorySummaries()` /
  `getExpiringAccounts()` directly in render without `useMemo`. They allocate
  new objects every call and cascade re-renders to all children.
- **NEVER** add a second global store for data the points/auth store owns.
- **NEVER** `set()` progress state at 2s-poll frequency when nothing changed
  (compare step/percent/detection-count first).

## 2. Rendering performance (React Native)

### ✅ DO
- `React.memo` all list-row components (`BrandPointCard`, `NotificationCard`,
  `CategoryCard`, `MailboxCard`) and heavy SVG (`PointsDonutChart` + `useMemo`
  for arc math).
- `useCallback` for handlers passed to memo'd children; stable `key={id}`.
- Debounce all search inputs (≥300ms) before hitting the network.
- `FlatList` (or FlashList) for any list that can exceed ~20 rows
  (notifications, search results, category brands). No `.map()` of unbounded
  arrays inside `ScrollView`.

### ❌ DON'T
- No `toLocaleString()` / `new Date()` / regex work inside render bodies —
  hoist into `useMemo` or module helpers.
- No fire-on-mount fetches in every tab screen without the `refreshAll`
  time-guard. Mount effects must be idempotent and cheap.
- No `Promise.all(list.map(each => fetch))` for bulk ops (e.g. mark-all-read)
  — add a batch endpoint instead.

## 3. Single source of truth

| Concern | Canonical home | DON'T recreate in |
|---|---|---|
| Category meta (name, icon, color, bg) | `constants/popularPrograms.ts` `CATEGORY_LABELS` (+ ONE icon map — extend it, don't fork it) | screen-local `switch`es, palettes, `getCategoryMeta` clones |
| Loyalty program catalog (client) | `constants/popularPrograms.ts` `POPULAR_PROGRAMS` | `constants/categories.ts` brand lists |
| `SyncJob` type | `types/models.ts` | `types/loyalty.ts` (dup removed — keep it out) |
| Password rules UI | `components/ui/PasswordChecklist.tsx` | inline regex arrays in auth screens |
| Display name fallback | `store/authStore.ts` `formatNameFromEmail` (or a shared helper) | `email.split("@")[0]` copies per screen |
| Colors | `constants/colors.ts` + tailwind tokens (`bg-primary`, `text-muted`, …) | raw hex in `className`/`style` |
| API access | `lib/apiClient.ts` | raw `fetch`/`axios` in screens, hardcoded URLs |
| Push/notification logic | `services/pushNotifications.ts` | screen-local SecureStore ledgers |

- **Mock/fake data is BANNED from shipped code.** No hardcoded points,
  balances, brand counts, or demo user ids (`user-1`). Empty state = empty
  array + honest empty-state UI. (`constants/categories.ts` once shipped fake
  `totalPoints: 15768` — reintroducing this is a P0 defect.)
- Deleted dead code stays deleted: `PointsCard` (unused hero card),
  `BRANDS` mock array, `expo-blur`/`expo-sms` deps, `getExpiringAlerts`
  duplicate endpoint. Don't re-add equivalents without a design review.
- `web/` prototype (broken imports, demo ids) is pending deletion — do NOT
  extend it; new web work must use `apiClient` conventions and CI.

---

## 4. API & server (Express + PostgreSQL)

### ✅ DO
- Layer discipline: route (validate) → controller (HTTP) → service (rules) →
  repo (SQL). No SQL in services, no business rules in controllers.
- Return the shared `ApiError` envelope (`error`, `code`, optional `details`).
- Cursor pagination (`lib/pagination.js`) for every unbounded list.
- One batch endpoint beats N per-item calls (`acknowledge-all` > N × `acknowledge/:id`).

### ❌ DON'T
- **NEVER** `await` inside a per-message/per-row loop when the iterations are
  independent. The Gmail scan loop (`gmail.service.js`) once did ~500
  sequential queries + 100 sequential AI calls per scan. Batch writes
  (`INSERT … ON CONFLICT`, multi-row inserts, `UPDATE … FROM`) and bound
  concurrency (`p-limit` 3–5) for AI parsing.
- **NEVER** `console.log` per query / per poll / per request in production
  paths (`db.js query()` logger, 2s poll logs). Gate behind `DEBUG_*` env.
- **NEVER** mount the same router at two paths (`/api/analytics` +
  `/api/alerts`) or keep two endpoints for one job (`/alerts/expiring` vs
  `/notifications/expiry`). One URL per resource.
- **NEVER** add an in-memory cache/rate-limit without a comment stating the
  single-instance assumption (breaks silently under horizontal scale).

---

## 5. Dependencies & repo hygiene

### ✅ DO
- Every `package.json` dep must have ≥1 import in shipped code. Run the
  unused-dep grep before merging:
  `grep -rl "expo-foo" app components hooks lib store services constants types`.
- `npx tsc --noEmit` clean before merge (tsconfig excludes `web/` + `server/`).
- Keep `.gitignore` covering: `.env*`, `dist/`, `web-build/`, `logs/`,
  `database:connected`-style marker files, `*.png` design dumps.

### ❌ DON'T
- No committed secrets (`.env`), marker files (`status:ok`), design PNGs,
  build output (`dist/`), or nested checkouts (`.kilo/worktrees/` lives
  OUTSIDE the repo).
- No second apps inside the repo (`web/` is pending deletion for broken
  imports + demo ids — don't re-add a prototype without wiring it to
  `apiClient` conventions and CI).
- No `any` creep: new API client methods get typed signatures; new store
  fields get interface entries.
- No `setTimeout(..., 500)` to "wait out" async work (home/overview had this
  in pull-to-refresh) — `await` the real promise, then set state.

---

## 6. Checklist before every PR / AI patch

- [ ] Searched for existing helpers/types/endpoints first (rule 0)?
- [ ] Selectors per-field, derivations memoized, no whole-store subscribes?
- [ ] No new raw hex (use tokens), no new screen-local category switches?
- [ ] Search inputs debounced, mount fetches guarded, no N+1 client calls?
- [ ] Server: no `await`-in-loop, no per-row queries, pagination on lists?
- [ ] No `console.*` in prod paths, no mock data, no new deps without usage?
- [ ] `npx tsc --noEmit` passes?

| Display name fallback | `store/authStore.ts` `formatNameFromEmail` (or a shared helper) | `email.split("@")[0]` copies per screen |
| Colors | `constants/colors.ts` + tailwind tokens (`bg-primary`, `text-muted`, …) | raw hex in `className`/`style` |
| API access | `lib/apiClient.ts` | raw `fetch`/`axios` in screens, hardcoded URLs |
| Push/notification logic | `services/pushNotifications.ts` | screen-local SecureStore ledgers |

- **Mock/fake data is BANNED from shipped code.** No hardcoded points,
  balances, brand counts, or demo user ids (`user-1`). Empty state = empty
  array + honest empty-state UI. (`constants/categories.ts` once shipped fake
  `totalPoints: 15768` — reintroducing this is a P0 defect.)
- Deleted dead code stays deleted: `PointsCard` (unused hero card),
  `BRANDS` mock array, `web/` prototype (broken imports, demo ids),
  `expo-blur`/`expo-sms` deps, `getExpiringAlerts` duplicate endpoint.
  Don't re-add equivalents without a design review.

<!--APPEND-->
