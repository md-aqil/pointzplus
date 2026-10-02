# PointzPlus Mobile - Core Architecture & Guidelines

# Expo SDK Version Requirement
Expo HAS CHANGED. Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

## Technical Stack Overview

```
┌────────────────────────────────────────────────────────┐
│               POINTZPLUS REACT NATIVE STACK            │
├───────────────────────┬────────────────────────────────┤
│ Framework & Runtime   │ Expo SDK (Managed Workflow)    │
│ Language              │ TypeScript (Strict mode)       │
│ Navigation            │ Expo Router (File-based routing)│
│ UI & Styling          │ NativeWind v4 (Tailwind CSS)   │
│ Animations & Gestures │ React Native Reanimated 3/4    │
│ Typography            │ Plus Jakarta Sans (400-700)    │
│ Charts & Analytics    │ Victory Native XL / Skia       │
│ State Management      │ Zustand + TanStack React Query │
│ Backend & Database    │ Local PostgreSQL (API services)│
│ Form & Validation     │ React Hook Form + Zod          │
│ Icons & Assets        │ Lucide React Native            │
│ Testing & E2E         │ Maestro / Jest + RNTL          │
└───────────────────────┴────────────────────────────────┘
```

---

## Directory & File Layout

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

## Penpot Design System Guidelines

- **Primary Canvas Resolution**: `393 × 852 px` (standard iOS / Android viewport base).
- **Brand Colors**:
  - `primary`: `#02EFF4` (Electric Cyan)
  - `primaryDark`: `#01A2FB`
  - `violet`: `#9C4EBD` (Accent Purple)
  - `dark`: `#070617` (Deep Obsidian base)
  - `darkSurface`: `#393845`
  - `muted`: `#6A6A74` / `#9C9BA2`
  - `lightBg`: `#F5FEFF` / `#E6F6FF`
  - `alert`: `#FF4343` / `#FFF6F6`
  - `borderLight`: `#E6E6E8`
- **Typography**: `Plus Jakarta Sans` across all headings, body, labels, and CTAs (weights 400, 500, 600, 700).
- **Backend Architecture**: Local PostgreSQL database accessed through the Express API in `server/` (no third-party BaaS).

---

## Mandatory Reading for Every Contributor (human or AI)

> **Read `CODE_GUARDRAILS.md` (repo root) BEFORE writing any code.** It is the
> binding DO/DON'T companion to this file — born from the Oct 2026 audit that
> found duplicated logic, un-memoized selectors, shipped mock data, and dead
> deps. `AGENTS.md` tells you *what the architecture is*;
> `CODE_GUARDRAILS.md` tells you *what mistakes to never repeat*.
