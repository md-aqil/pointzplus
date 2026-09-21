# PointzPlus Mobile 🚀

A modern loyalty & rewards management mobile application built with **React Native**, **Expo SDK 57**, and **NativeWind (Tailwind CSS)**, designed from the ground up to match the **Penpot UI/UX design specifications** with 100% visual fidelity.

---

## 🛠️ Technology Stack

```
┌────────────────────────────────────────────────────────┐
│               POINTZPLUS REACT NATIVE STACK            │
├───────────────────────┬────────────────────────────────┤
│ Framework & Runtime   │ Expo SDK 57 (Managed Workflow) │
│ Language              │ TypeScript (Strict mode)       │
│ Navigation            │ Expo Router (File-based routing)│
│ UI & Styling          │ NativeWind v4 (Tailwind CSS)   │
│ Animations & Gestures │ React Native Reanimated 3/4    │
│ Typography            │ Plus Jakarta Sans (400 - 700)  │
│ Charts & Analytics    │ Victory Native XL / Skia       │
│ State Management      │ Zustand + TanStack React Query │
│ Backend & Database    │ Local PostgreSQL (API Service) │
│ Form & Validation     │ React Hook Form + Zod          │
│ Icons & Assets        │ Lucide React Native            │
│ Testing & E2E         │ Maestro / Jest + RNTL          │
└───────────────────────┴────────────────────────────────┘
```

---

## 📁 Project Architecture

```
pointzplus-mobile/
├── app/                        # Expo Router Navigation
│   ├── (auth)/                 # Sign in, Sign up, OTP, Forgot Password
│   │   ├── sign-in.tsx
│   │   ├── register.tsx
│   │   ├── otp-verification.tsx
│   │   ├── reset-password.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                 # Bottom Tab Navigator
│   │   ├── _layout.tsx
│   │   ├── home.tsx            # Home Dashboard & Expiry carousel
│   │   ├── overview.tsx        # Points Breakdown & Analytics
│   │   ├── deals.tsx           # Discover & Partner Offers
│   │   └── profile.tsx         # User Profile & Settings
│   ├── category/
│   │   ├── index.tsx           # All Categories list
│   │   └── [id].tsx            # Dynamic category detail (Airlines, Hotels, etc.)
│   ├── settings/               # Sync & Notification configs
│   │   ├── profile-settings.tsx
│   │   ├── notification-settings.tsx
│   │   └── delete-account.tsx
│   ├── legal/
│   │   └── privacy.tsx         # Terms & Conditions / Privacy Policy
│   ├── search.tsx              # Search categories and brands
│   ├── notifications.tsx       # All & Unread notifications
│   ├── onboarding.tsx          # 3-slide value proposition carousel
│   └── _layout.tsx             # Root layout, fonts & providers
│
├── components/                 # Atomic Reusable UI Components
│   ├── ui/                     # Button, Input, Card, Badge, Modal, Header
│   ├── charts/                 # PointsPieChart, BreakdownBar
│   ├── cards/                  # CategoryCard, BrandPointCard, ExpiryCard
│   └── forms/                  # OTPInput, PasswordChecklist
│
├── constants/                  # Extracted from Penpot Design
│   ├── colors.ts               # Primary: #02EFF4, Violet: #9C4EBD, Dark: #070617
│   ├── categories.ts           # 12 categories & brand metadata
│   └── theme.ts
│
├── hooks/                      # Custom hooks (usePoints, useAuth, useSync)
├── lib/                        # Local DB API client, Storage, Notification engine
├── store/                      # Zustand slices (authStore, pointsStore)
├── types/                      # Zod schemas & TypeScript definitions
└── tests/                      # Unit & Maestro E2E flows
```

---

## 🎨 Design Tokens (from Penpot)

| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `primary` | `#02EFF4` | Main brand cyan / CTA active states |
| `primaryDark`| `#01A2FB` | Deep cyan/blue gradient end |
| `violet` | `#9C4EBD` | Secondary accent violet |
| `dark` | `#070617` | Obsidian dark base |
| `darkSurface` | `#393845` | Dark card backgrounds & pill borders |
| `iceBlue` | `#F5FEFF` | Light screen containers |
| `iceBlueDark` | `#E6F6FF` | Card backgrounds |
| `alertRed` | `#FF4343` | Error highlights and expiring points |
| `font` | `Plus Jakarta Sans` | Primary brand typography |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npx expo start
```
