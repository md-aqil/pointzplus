# ⚡ PointzPlus – Quick Start (Real Data)

PointzPlus displays **only real data**. Every number on screen comes from your local
PostgreSQL database through the Express API in `server/`. There is no seeded demo
account, no mock portfolio, and no in-memory fallback: if the database has no rows for
you, the screens show an empty state.

---

## Step 1: Create the database (once)

```bash
cd pointzplus-mobile
./setup-database.sh
```

Or manually:

```bash
createdb pointzplus
psql -d pointzplus -f server/db/migrations/20260915_001_init.sql
psql -d pointzplus -f server/db/migrations/20260915_002_seed_programs.sql
psql -d pointzplus -f server/db/migrations/20260915_003_coupons_and_sync_jobs.sql
psql -d pointzplus -f server/db/migrations/20260915_004_security_and_slugs.sql
```

> `002_seed_programs.sql` seeds the **loyalty-programme catalogue** (InterMiles,
> Marriott, HDFC, … with their point values) — it does **not** create balances for you.
> Your linked accounts start empty and only ever come from you (manual add, email sync,
> SMS detection).

## Step 2: Configure and start the API

```bash
cd server
cp .env.example .env
# Set DB_PASSWORD and generate JWT_SECRET:  openssl rand -hex 32
npm install
npm start
```

Verify the API is up:

```bash
curl http://localhost:3001/health
# {"status":"ok","database":"connected", ...}
```

## Step 3: Point the app at the API

Root `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

- iOS simulator / web: `http://localhost:3001/api`
- Android emulator: `http://10.0.2.2:3001/api`
- Physical device: `http://<your-LAN-IP>:3001/api`

## Step 4: Start the app

```bash
npx expo start
```

Press `w` (web), `a` (Android), `i` (iOS), or scan the QR code with Expo Go.

---

## What You'll See

### First run — empty, on purpose

Register, then sign in. The store starts empty (the API returns no accounts for a new
user), so Home shows the empty state rather than invented numbers:

```
Welcome Back
<your name>

┌─────────────────────────────────┐
│  Total Points Portfolio         │
│  0 pts                          │
│  ₹0 estimated value             │
└─────────────────────────────────┘

No Loyalty Programs Yet
[ + Add Program ]    [ Email Sync ]
```

### After you add an account

Home renders exactly what `GET /api/accounts` returns for **your** user — no fallback,
no placeholders. Portfolio value is computed server-side as
`SUM(current_balance × point_value_inr)`.

---

## Test Each Feature

### ✨ Test 1: Create an account and sign in
**Time:** ~60 seconds

1. Open the app → **Sign up** (email + password).
2. Verify OTP. (In development the flow completes locally; production builds never
   fake a success — they tell you email delivery isn't wired yet.)
3. Sign in with the same credentials.

**Why this matters:** every read and write is authenticated with a JWT issued by the
API. The token is stored in SecureStore and re-validated on each cold start
(`app/_layout.tsx` → `restoreSession()` → `GET /api/auth/verify`).

**What you should see:** Home with the **empty state (0 pts)**. That is correct — the
database now has a user, but that user has no linked accounts yet.

---

### ✨ Test 2: Add a program manually (a real database write)
**Time:** ~60 seconds

1. Home → **+ Add Program** (or Profile → "Add Program")
2. **Category:** Banking → **Brand:** SBI Card Reward Points
3. **Fill the form:**
   - Account: `****2891`
   - Points: `18500`
   - Expiring: `3500`
   - Expiry: any date inside the next 45 days
4. **Save to PointzPlus Wallet**

**The actual request:**

```
POST /api/accounts
{ "programId": "<sbi-uuid>", "accountNumberMasked": "****2891",
  "currentBalance": 18500, "expiringPoints": 3500, "expiryDate": "..." }
```

The row is inserted into PostgreSQL (`linked_accounts`), the store refetches, and Home
re-renders. Portfolio value becomes `18500 × point_value_inr` using the catalogue row.

**Prove it's real:** reload the page or restart the app — the account is still there,
because it lives in the database, not in memory.

---

### ✨ Test 3: Portfolio overview (computed from your real rows)
**Time:** ~45 seconds

1. Home → tap the dark **Total Points** card.
2. Overview shows figures derived entirely from your own `linked_accounts` rows:
   - Portfolio value = `Σ(current_balance × point_value_inr)`
   - Earned / redeemed this month from `points_transactions`
   - Category breakdown with percentage bars
   - Expiring section driven by `expiring_points` / `expiry_date`

**With only the one account from Test 2 expect:** a single Banking category at 100% —
not a pre-filled five-category chart. Percentages only reflect what you actually own.

---

### ✨ Test 4: Profile
**Time:** ~30 seconds

1. **Profile** tab.
2. The **Loyalty Portfolio** widget shows your real totals and active-account count.
3. **Data Sync & Integration** lists your actual connections — nothing reads
   "Connected" unless a real `email_sync_accounts` row exists for your user.

---

### ✨ Test 5: Refresh and persistence
**Time:** ~30 seconds

1. On Home, **pull down to refresh** → `refreshAll()` re-fetches accounts, coupons and
   notification history from the API (watch the spinner while the requests are in flight).
2. Kill the app and reopen it → your data is unchanged, because PostgreSQL holds it.
3. Optional proof: `psql -d pointzplus -c "SELECT current_balance FROM linked_accounts;"` —
   the balance you entered in Test 2 is there.

---

## 🎯 Key Things to Notice

| Feature | Where | How It Works |
|---------|-------|-------------|
| **All data** | Home, Overview, Profile, Notifications | Fetched per user from the local API (`lib/apiClient.ts`); the store starts empty |
| **Manual add** | `/add-account` | Zod-validated form → `POST /api/accounts` → row in `linked_accounts` |
| **Email sync** | `/email-sync` | Real Gmail OAuth → `POST /api/email-sync/scan`; failures surface as errors, never invented rows |
| **SMS detection** | Android | `POST /api/sms/detect` parses real bank SMS |
| **Portfolio value** | Overview, Profile | `Σ(current_balance × point_value_inr)` over your own rows |
| **Expiry alerts** | Home, Overview | Driven by real `expiring_points` / `expiry_date`, mirrored to `expiry_alerts` |
| **Empty state** | Home (first run) | Correct behaviour for a user with no accounts yet |
| **Persistence** | Everywhere | PostgreSQL — survives reloads, restarts and reinstalls |

---

## 🚀 What You're Actually Testing

### Data Layer (PostgreSQL, scoped to your user)
- ✅ Accounts you create are rows in `linked_accounts` (owned by your `user_id`)
- ✅ Email sync writes accounts and `extracted_coupons` from your real mailbox
- ✅ Notification history comes from `expiry_alerts`
- ✅ No code path seeds user data — not the app, not the migrations

### UI Layer
- ✅ Screens read from `usePoints()` / the store, which mirrors API responses
- ✅ Selectors recompute on every store update
- ✅ Pull-to-refresh re-fetches from the API

### Type Safety
- ✅ Forms validated with Zod
- ✅ `LinkedAccount`, `CategorySummary`, `NotificationItem` types enforce shape
- ✅ Strict TypeScript across the app and the API client

---

## 📌 Remember

- **Everything you see is yours** — a fresh user starts at 0 pts by design
- **Only the programme catalogue is seeded** (`002_seed_programs.sql`)
- **Persistence is real:** reload, restart or reinstall and your data is still there
- **Local simulation was removed** from the email-sync path, so a sync can only ever
  reflect a real mailbox

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Empty Home screen | Expected until you add an account or connect a mailbox |
| `401 Unauthorized` | Session expired — sign in again |
| `Cannot reach API` | Is `server/` running? Check `curl localhost:3001/health` |
| Android emulator can't connect | Use `http://10.0.2.2:3001/api`, not `localhost` |
| No brands to pick | Re-run `psql -d pointzplus -f server/db/migrations/20260915_002_seed_programs.sql` |
| "Sync failed" | Real Gmail OAuth isn't configured — set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| TypeScript errors | `npx tsc --noEmit` |

---

## 🎉 You're Ready!

Everything in the app is real working code backed by your own database — no demos, seeded
portfolios or screenshots.

**Questions?** See `PHASE_2_COMPLETE.md` (architecture) and `AGENTS.md` (conventions).

**Happy testing! 🚀**
