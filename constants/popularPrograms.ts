// constants/popularPrograms.ts – Top 20+ supported loyalty programs catalog
import type { ComponentType } from "react";
import { LoyaltyProgram } from "../types/loyalty";
import {
  Plane,
  Building2,
  CreditCard,
  ShoppingBag,
  Bike,
  Utensils,
  Fuel,
  Film,
  HeartPulse,
  Radio,
  ShoppingCart,
  Compass,
  Layers,
  Sparkles,
  Gift,
  Tag,
  Zap,
} from "lucide-react-native";

export const POPULAR_PROGRAMS: LoyaltyProgram[] = [
  // ─── Airlines ──────────────────────────────────────────────
  {
    id: "intermills",
    name: "InterMiles Airline",
    category: "airlines",
    logoInitial: "✈️",
    accentColor: "#01A2FB",
    defaultExpiryMonths: 18,
    pointValueINR: 0.25,
  },
  {
    id: "air_india",
    name: "Air India Flying Returns",
    category: "airlines",
    logoInitial: "🇮🇳",
    accentColor: "#E31837",
    defaultExpiryMonths: 24,
    pointValueINR: 0.45,
  },
  {
    id: "club_vistara",
    name: "Club Vistara (CV Points)",
    category: "airlines",
    logoInitial: "💜",
    accentColor: "#5B1C56",
    defaultExpiryMonths: 36,
    pointValueINR: 0.60,
  },
  {
    id: "indigo_6e",
    name: "IndiGo 6E Rewards",
    category: "airlines",
    logoInitial: "💙",
    accentColor: "#00529B",
    defaultExpiryMonths: 24,
    pointValueINR: 0.35,
  },

  // ─── Hotels ────────────────────────────────────────────────
  {
    id: "marriott_bonvoy",
    name: "Marriott Bonvoy",
    category: "hotels",
    logoInitial: "🏨",
    accentColor: "#9C4EBD",
    defaultExpiryMonths: 24,
    pointValueINR: 0.70,
  },
  {
    id: "hilton_honors",
    name: "Hilton Honors",
    category: "hotels",
    logoInitial: "💎",
    accentColor: "#002B49",
    defaultExpiryMonths: 24,
    pointValueINR: 0.40,
  },
  {
    id: "taj_epicure",
    name: "Taj Epicure / Tata Neu",
    category: "hotels",
    logoInitial: "👑",
    accentColor: "#B38F48",
    defaultExpiryMonths: 12,
    pointValueINR: 1.00,
  },
  {
    id: "accor_all",
    name: "Accor Live Limitless (ALL)",
    category: "hotels",
    logoInitial: "🌟",
    accentColor: "#122A4E",
    defaultExpiryMonths: 12,
    pointValueINR: 1.80,
  },

  // ─── Banking & Cards ───────────────────────────────────────
  {
    id: "hdfc_mycards",
    name: "HDFC Regalia / Infinia Points",
    category: "banking",
    logoInitial: "💳",
    accentColor: "#004C8F",
    defaultExpiryMonths: 24,
    pointValueINR: 1.00,
  },
  {
    id: "sbi_rewardz",
    name: "SBI Card Reward Points",
    category: "banking",
    logoInitial: "🔵",
    accentColor: "#280071",
    defaultExpiryMonths: 24,
    pointValueINR: 0.25,
  },
  {
    id: "icici_rewards",
    name: "ICICI Rewards (i-Points)",
    category: "banking",
    logoInitial: "🟠",
    accentColor: "#B32800",
    defaultExpiryMonths: 36,
    pointValueINR: 0.25,
  },
  {
    id: "axis_edge",
    name: "Axis EDGE REWARDS",
    category: "banking",
    logoInitial: "🔴",
    accentColor: "#97144D",
    defaultExpiryMonths: 36,
    pointValueINR: 0.20,
  },
  {
    id: "amex_mr",
    name: "American Express Membership Rewards",
    category: "banking",
    logoInitial: "🟦",
    accentColor: "#0077A6",
    defaultExpiryMonths: 0, // No expiry!
    pointValueINR: 0.50,
  },

  // ─── Shopping & Retail ─────────────────────────────────────
  {
    id: "flipkart_supercoins",
    name: "Flipkart SuperCoins",
    category: "shopping",
    logoInitial: "🛍️",
    accentColor: "#2874F0",
    defaultExpiryMonths: 12,
    pointValueINR: 1.00,
  },
  {
    id: "amazon_pay_rewards",
    name: "Amazon Pay Rewards & Cashback",
    category: "shopping",
    logoInitial: "📦",
    accentColor: "#FF9900",
    defaultExpiryMonths: 12,
    pointValueINR: 1.00,
  },
  {
    id: "reliance_one",
    name: "Reliance One (R-One)",
    category: "shopping",
    logoInitial: "🛒",
    accentColor: "#E21836",
    defaultExpiryMonths: 12,
    pointValueINR: 0.35,
  },

  // ─── Food & Dining ─────────────────────────────────────────
  {
    id: "swiggy_one",
    name: "Swiggy One & Instamart Points",
    category: "food_delivery",
    logoInitial: "🛵",
    accentColor: "#FC8019",
    defaultExpiryMonths: 6,
    pointValueINR: 1.00,
  },
  {
    id: "zomato_gold",
    name: "Zomato Gold & Dining Credits",
    category: "dining",
    logoInitial: "🍽️",
    accentColor: "#CB202D",
    defaultExpiryMonths: 6,
    pointValueINR: 1.00,
  },

  // ─── Fuel ──────────────────────────────────────────────────
  {
    id: "iocl_xtrarewards",
    name: "IndianOil XTRAREWARDS",
    category: "fuel",
    logoInitial: "⛽",
    accentColor: "#EE1C25",
    defaultExpiryMonths: 12,
    pointValueINR: 0.30,
  },
  {
    id: "bpcl_smartdrive",
    name: "BPCL SmartDrive / PetroBonus",
    category: "fuel",
    logoInitial: "🚗",
    accentColor: "#FDB813",
    defaultExpiryMonths: 12,
    pointValueINR: 0.30,
  },

  // ─── Entertainment ─────────────────────────────────────────
  {
    id: "bookmyshow",
    name: "BookMyShow Rewards",
    category: "entertainment",
    logoInitial: "🎬",
    accentColor: "#EC1C24",
    defaultExpiryMonths: 12,
    pointValueINR: 1.00,
  },

  // ─── Health & Telecom ──────────────────────────────────────
  {
    id: "cult_fit",
    name: "Cult.fit FitCoins",
    category: "health",
    logoInitial: "💪",
    accentColor: "#FF3269",
    defaultExpiryMonths: 12,
    pointValueINR: 0.50,
  },
  {
    id: "airtel_thanks",
    name: "Airtel Thanks Rewards",
    category: "telecom",
    logoInitial: "📶",
    accentColor: "#E40000",
    defaultExpiryMonths: 12,
    pointValueINR: 0.25,
  },
];

export const CATEGORY_LABELS: Record<string, { name: string; icon: string; color: string; bgColor: string }> = {
  airlines: { name: "Airlines", icon: "Plane", color: "#01A2FB", bgColor: "#E6F6FF" },
  hotels: { name: "Hotels", icon: "Building2", color: "#9C4EBD", bgColor: "#FDF4FF" },
  banking: { name: "Banking & Cards", icon: "CreditCard", color: "#02EFF4", bgColor: "#E6FFFF" },
  shopping: { name: "Retail & Shopping", icon: "ShoppingBag", color: "#FF9900", bgColor: "#FFF7ED" },
  food_delivery: { name: "Food Delivery", icon: "Bike", color: "#FC8019", bgColor: "#FFF1EB" },
  dining: { name: "Dining Out", icon: "Utensils", color: "#CB202D", bgColor: "#FEF2F2" },
  fuel: { name: "Fuel & Mobility", icon: "Fuel", color: "#EE1C25", bgColor: "#FFF5F5" },
  entertainment: { name: "Entertainment", icon: "Film", color: "#EC1C24", bgColor: "#FDF2F8" },
  health: { name: "Health & Fitness", icon: "HeartPulse", color: "#02EFF4", bgColor: "#E6FFFF" },
  telecom: { name: "Telecom", icon: "Radio", color: "#070617", bgColor: "#F5FEFF" },
  groceries: { name: "Groceries", icon: "ShoppingCart", color: "#10B981", bgColor: "#ECFDF5" },
  travel: { name: "Travel & Tours", icon: "Compass", color: "#8B5CF6", bgColor: "#F5F3FF" },
  other: { name: "Growth & Other", icon: "Layers", color: "#9C4EBD", bgColor: "#FDF4FF" },
};

// ─── ONE category icon map (guardrails §3 — extend it, never fork it) ────────
// Keyed by the lucide component name stored in CATEGORY_LABELS[].icon, so every
// screen resolves the same glyph for a category instead of redeclaring a switch.
export type CategoryIconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export const CATEGORY_ICONS: Record<string, CategoryIconComponent> = {
  Plane,
  Building2,
  CreditCard,
  ShoppingBag,
  Bike,
  Utensils,
  Fuel,
  Film,
  HeartPulse,
  Radio,
  ShoppingCart,
  Compass,
  Layers,
  Sparkles,
  Gift,
  Tag,
  Zap,
};

/** Runtime guard confirming the resolved export is an instantiable React component/function */
function isValidIcon(val: unknown): val is CategoryIconComponent {
  if (typeof val === "function") return true;
  if (typeof val === "object" && val !== null && "$$typeof" in val) return true;
  return false;
}

/** Non-canonical category ids that appear in backend data → canonical label id. */
const CATEGORY_ID_ALIASES: Record<string, string> = {
  retail: "shopping",
  supermarket: "groceries",
  wellness: "health",
  food: "dining",
};

/** Resolve the icon component for a category id (falls back safely to Layers, never undefined). */
export function getCategoryIconComponent(catId?: string | null): CategoryIconComponent {
  if (!catId) return Layers;
  const id = CATEGORY_ID_ALIASES[catId] ?? catId;
  const label = CATEGORY_LABELS[id];
  if (label?.icon) {
    const candidate = CATEGORY_ICONS[label.icon];
    if (isValidIcon(candidate)) return candidate;
  }
  const directCandidate = CATEGORY_ICONS[catId];
  if (isValidIcon(directCandidate)) return directCandidate;

  return Layers;
}

/** Resolve an icon component by lucide name (e.g. "Plane"), falling back safely to Layers (never undefined). */
export function getIconComponentByName(iconName?: string | null): CategoryIconComponent {
  if (!iconName) return Layers;
  const candidate = CATEGORY_ICONS[iconName];
  return isValidIcon(candidate) ? candidate : Layers;
}

// Dev-time validation: assert every CATEGORY_LABELS icon has a matching CATEGORY_ICONS entry
if (__DEV__) {
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    if (!isValidIcon(CATEGORY_ICONS[label.icon])) {
      console.warn(`[popularPrograms] CATEGORY_LABELS["${key}"] references invalid or missing icon "${label.icon}"`);
    }
  }
}
