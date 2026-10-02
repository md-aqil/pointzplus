// constants/categories.ts – Static category METADATA only (no user data).
// Points/brand counts MUST come from the backend via usePoints().
// (Fake totals were removed Oct 2026 – never put mock balances here.)
export interface Category {
  id: string;
  name: string;
  iconName: string;
  accentColor: string;
  bgColor: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "airlines",
    name: "Airlines",
    iconName: "Plane",
    accentColor: "#01A2FB",
    bgColor: "#E6F6FF",
  },
  {
    id: "hotels",
    name: "Hotels",
    iconName: "Building2",
    accentColor: "#9C4EBD",
    bgColor: "#FDF4FF",
  },
  {
    id: "health",
    name: "Health",
    iconName: "HeartPulse",
    accentColor: "#02EFF4",
    bgColor: "#E6FFFF",
  },
  {
    id: "telecom",
    name: "Telecom",
    iconName: "Radio",
    accentColor: "#070617",
    bgColor: "#F5FEFF",
  },
  {
    id: "shopping",
    name: "Shopping",
    iconName: "ShoppingBag",
    accentColor: "#01A2FB",
    bgColor: "#E6F6FF",
  },
  {
    id: "other",
    name: "Growth & Other Rewards",
    iconName: "Layers",
    accentColor: "#9C4EBD",
    bgColor: "#FDF4FF",
  },
  {
    id: "retail",
    name: "Retail & Shopping",
    iconName: "ShoppingBag",
    accentColor: "#01A2FB",
    bgColor: "#E6F6FF",
  },
  {
    id: "dining",
    name: "Dining & Food",
    iconName: "Utensils",
    accentColor: "#9C4EBD",
    bgColor: "#FDF4FF",
  },
  {
    id: "banking",
    name: "Banking & Cards",
    iconName: "CreditCard",
    accentColor: "#02EFF4",
    bgColor: "#E6FFFF",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    iconName: "Film",
    accentColor: "#070617",
    bgColor: "#F5FEFF",
  },
];
