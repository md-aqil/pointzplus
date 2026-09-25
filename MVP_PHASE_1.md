# 🚀 PointzPlus MVP – Phase 1: Email Sync + Manual Tracker

> ⚠️ **HISTORICAL (Phase 1).** Written when the app ran on an in-memory store with bundled
> sample emails. The sample-statement simulator has been removed and user data now lives in
> PostgreSQL via the API. See `QUICK_START.md` and `PHASE_2_COMPLETE.md` for current state.

## Overview

**PointzPlus** is a fully functional **loyalty points aggregator** built with:
- ✅ **Zustand Store** — Mirror of the API response (starts empty for a new user)
- ✅ **Email Sync Engine** — Gmail OAuth with server-side statement parsing
- ✅ **Manual Tracker** — Add programs manually; writes go to the API
- ✅ **Live Dashboard** — All screens display actual pointsStore data
- ✅ **20+ Popular Programs** — Airlines, hotels, banks, shopping, food, more

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      UI LAYER (Screens)                 │
│  Home | Overview | Deals | Profile | Email Sync | Add   │
├─────────────────────────────────────────────────────────┤
│              HOOKS (usePoints, useAuth)                  │
│  ↓ Fetches computed selectors from store                │
├─────────────────────────────────────────────────────────┤
│           ZUSTAND STORE (pointsStore.ts)                │
│  • accounts: LinkedAccount[]                            │
│  • emailAccounts: EmailSyncAccount[]                    │
│  • getDashboardSummary() → DashboardSummary            │
│  • getCategorySummaries() → CategorySummary[]          │
│  • syncEmail(provider, email) → LinkedAccount[]        │
│  • addManualAccount(data) → LinkedAccount              │
├─────────────────────────────────────────────────────────┤
│         DATA SERVICES (emailParser.ts)                  │
│  • EmailSyncService.parseEmailStatement()              │
│  • STATEMENT_PARSER_RULES (20+ program patterns)       │
│  • MOCK_RAW_EMAILS (removed – unreferenced)            │
├─────────────────────────────────────────────────────────┤
│              TYPE SAFETY (types/loyalty.ts)            │
│  • LinkedAccount, EmailSyncAccount, DashboardSummary   │
│  • Zod schemas for form validation                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 What the MVP Does

### Home Screen
- **Real Dashboard** — Shows total points, monthly earned, expiring soon
- **Live Category Breakdown** — Pills showing each category's points
- **Active Programs List** — All linked accounts with expiry warnings
- **Empty State** — Prompts to connect Email or Add Programs manually
- **Floating Add Button** — Quick access to add programs

### Email Sync Screen (`/email-sync`)
**Step 1:** Click "Gmail" or "Outlook"  
**Step 2:** System connects via real Gmail/Outlook OAuth  
**Step 3:** Email parser scans your inbox for loyalty statements  
**Step 4:** Extracts whichever programs you actually receive mail from  
**Step 5:** Shows success modal → data appears on Home  

**What happens behind the scenes:**
- Regex patterns match domains (airindia.com, marriott.com, hdfcbank.com, etc.)
- Parser extracts account numbers, balances, expiry dates from email text
- Zustand store auto-updates; Home re-renders with new data
- User sees zero manual entry for those accounts

### Manual Add Screen (`/add-account`)
**Step 1:** Select category (Airlines, Hotels, Banking, etc.)  
**Step 2:** Choose brand from list or add custom program  
**Step 3:** Enter account number, points, expiry window  
**OPTIONAL:** Scan statement/receipt photo → OCR auto-fills fields  
**Step 4:** Save → appears on Home instantly  

### Overview Screen
- **Portfolio Value** — Calculated in ₹ based on program valuations
- **Category Breakdown** — Percentage pie-style bars for each category
- **Expiring Soon** — Red alert section showing all accounts with expiry dates
- **Statistics** — Earned this month, categories count, etc.

### Profile Screen (Updated)
- **Loyalty Portfolio Widget** — Shows total points, portfolio value, active count
- **Email Sync Status** — Shows connected provider (Gmail/Outlook) or "Not connected"
- **Quick Actions** — Add Program, View Breakdown buttons
- **Settings** — Profile, Notifications, Privacy, Sign Out

---

## 🔧 Setup & Run

### 1. Install Dependencies (Already Done)
```bash
cd pointzplus-mobile
npm install --legacy-peer-deps
```

### 2. Start the App (Web Preview)
```bash
npx expo start
# Press 'w' for web preview
```

### 3. Test Email Sync Flow
1. Open app → Home screen (empty state)
2. Tap "Email Sync" button → `/email-sync` screen
3. Click "Connect with Google Gmail"
4. Watch progress bar: "Connecting… Searching… Extracting… Normalizing…"
5. See "Sync complete! 5 programs found"
6. Tap "View Updated Dashboard"
7. **Home now shows real data:**
   - InterMiles: 11,450 pts (expiring 2,500)
   - Air India: 4,318 pts (expiring 588)
   - Marriott Bonvoy: 3,500 pts
   - HDFC Regalia: 9,150 pts
   - Flipkart SuperCoins: 8,450 pts

### 4. Test Manual Add Flow
1. On Home or Profile, tap "+ Add Program"
2. Select "Airlines" category
3. Pick "Air India" from list
4. Enter account: "AI-892"
5. Enter balance: "5400"
6. Set expiry: "30 Days"
7. Tap "Save to PointzPlus Wallet"
8. **New account appears in Home list instantly**

### 5. View Analytics
1. From Home, tap the Points Card (top dark banner)
2. **Overview screen shows:**
   - Total portfolio value in ₹
   - Category percentages with progress bars
   - Expiring accounts highlighted in red
   - Statistics cards

---

## 📊 Data Flow (Email Sync Example)

```
User taps "Gmail" on /email-sync
    ↓
usePoints().syncEmail("gmail", "user@gmail.com")
    ↓
EmailSyncService.executeEmailSync()
    ├─ Step 1: Simulate OAuth auth (20% progress)
    ├─ Step 2: Search inbox patterns (45%)
    ├─ Step 3: Parse emails with regex (75%)
    │         • intermi les.com → InterMiles parser
    │         • airindia.com → Air India parser
    │         • marriott.com → Marriott parser
    │         • etc. (5 matches)
    │
    ├─ Step 4: Map to LinkedAccount objects (90%)
    │         [
    │           { id: "acc_sync_1", programId: "intermills", 
    │             currentBalance: 11450, expiringPoints: 2500, ... },
    │           { id: "acc_sync_2", programId: "air_india", ... },
    │           ...
    │         ]
    │
    └─ Step 5: Complete (100%)
    ↓
pointsStore.set({ accounts: [...syncedAccounts, ...old] })
    ↓
Home component re-renders
    ├─ usePoints() pulls new summary data
    ├─ categories updated
    ├─ expiringAccounts populated
    ├─ UI shows all 5 linked programs
    └─ Success modal → "Dashboard"
```

---

## 🗂️ Key Files

| File | Purpose |
|------|---------|
| `store/pointsStore.ts` | **Central Zustand state** — all accounts, sync actions, selectors |
| `services/emailParser.ts` | **Email parsing logic** — regex patterns for real statements (the bundled sample-statement simulator was removed) |
| `types/loyalty.ts` | **Type safety** — LinkedAccount, DashboardSummary, Zod schemas |
| `constants/popularPrograms.ts` | **20+ program catalog** — names, colors, point values, expiry rules |
| `hooks/usePoints.ts` | **React hook** — wraps pointsStore for components |
| `app/(tabs)/home.tsx` | **Home dashboard** — displays real pointsStore data |
| `app/(tabs)/overview.tsx` | **Analytics** — category breakdown, portfolio value |
| `app/(tabs)/profile.tsx` | **Settings** — email sync status, portfolio summary, add/view buttons |
| `app/email-sync.tsx` | **Email sync UI** — Gmail/Outlook picker, progress, success modal |
| `app/add-account.tsx` | **Manual add UI** — category/brand picker, form, receipt scanner sim |

---

## 🎯 Test Scenarios

### Scenario 1: Fresh Install → Email Sync
1. App opens, home is empty
2. User taps "Email Sync"
3. Selects Gmail
4. **Result:** 5 programs auto-added, home shows real data

### Scenario 2: Add Program Manually
1. User on home, taps "+ Add Program"
2. Selects "Banking" → "HDFC Infinia"
3. Enters "****4092", "12000" pts
4. **Result:** Program appears in home, portfolio value updates

### Scenario 3: View Analytics
1. User taps points card on home
2. Goes to Overview
3. **Result:** Sees pie chart breakdown, expiring alerts, portfolio value in ₹

### Scenario 4: Refresh Dashboard
1. User pull-to-refresh on home
2. **Result:** Data reloads, timestamp updates in card

---

## 🔌 Backend Integration (Phase 2)

### What is already wired (Phase 2 shipped)

1. **Real Gmail/Outlook fetch** — the server does the OAuth and inbox scan:
   ```typescript
   // server/services/gmail.service.js fetches via the Gmail API;
   // the client only calls the API and shows progress.
   const result = await apiClient.startEmailSync('google');
   ```
2. **Persist to PostgreSQL** — already the default path:
   ```typescript
   const saved = await apiClient.addAccount({
     programId: account.programId,
     accountNumberMasked: account.accountNumberMasked,
     currentBalance: account.currentBalance,
     expiringPoints: account.expiringPoints,
     expiryDate: account.expiryDate ?? undefined,
   });
   ```
3. **Refresh from the API**:
   ```typescript
   await usePointsStore.getState().refreshAll();
   ```

Still worth doing: real Outlook/Microsoft OAuth credentials, and running the Gmail
sync on a background worker rather than on the HTTP request.

---

## ✅ Verification Checklist

- [ ] Email Sync extracts 5+ programs
- [ ] Home dashboard shows total points, categories, expiring alerts
- [ ] Manual add creates new account instantly
- [ ] Overview shows category percentages and portfolio value in ₹
- [ ] Profile shows email sync status and portfolio widget
- [ ] Refresh updates all data
- [ ] Floating add button works from any tab
- [ ] Links between screens work (Home → Overview, Profile → Email Sync, etc.)

---

## 🚨 Known Limitations (this was the original MVP; most are now fixed)

- ~~Email sync is simulated~~ → **fixed**: real Gmail OAuth, server-side inbox scan
- ~~No real backend (all data in-memory)~~ → **fixed**: local PostgreSQL via the Express API
- Android SMS reader was Phase 2 → **shipped** as `services/smsDetector.ts`
- Push notifications were Phase 2 → **shipped** as `services/pushNotifications.ts`
- Plaid / third-party aggregators **not implemented** (not planned)
- Gmail sync still runs on the HTTP request, not a background worker

---

## 📖 Next Steps

1. **Deploy to Expo Go** — Test on a real Android device
2. **Add real Outlook/Microsoft OAuth** credentials
3. **Move Gmail sync onto a background worker** so it can't block the request
4. **Add automated tests** (unit, API, E2E) and CI
5. **Build web dashboard** — For desktop power users

---

**Ready to launch PointzPlus Phase 1! 🎉**
