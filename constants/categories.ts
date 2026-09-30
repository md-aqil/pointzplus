// constants/categories.ts – Extracted from Penpot Design
export interface Brand {
  id: string;
  name: string;
  category: string;
  points: number;
  expiringPoints?: number;
  expiryDate?: string;
  logoUrl?: string;
  accentColor: string;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  brandCount: number;
  totalPoints: number;
  accentColor: string;
  bgColor: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "airlines",
    name: "Airlines",
    iconName: "Plane",
    brandCount: 4,
    totalPoints: 15768,
    accentColor: "#01A2FB",
    bgColor: "#E6F6FF",
  },
  {
    id: "hotels",
    name: "Hotels",
    iconName: "Building2",
    brandCount: 2,
    totalPoints: 5780,
    accentColor: "#9C4EBD",
    bgColor: "#FDF4FF",
  },
  {
    id: "health",
    name: "Health",
    iconName: "HeartPulse",
    brandCount: 5,
    totalPoints: 1289,
    accentColor: "#02EFF4",
    bgColor: "#E6FFFF",
  },
  {
    id: "telecom",
    name: "Telecom",
    iconName: "Radio",
    brandCount: 2,
    totalPoints: 248,
    accentColor: "#070617",
    bgColor: "#F5FEFF",
  },
  {
    id: "shopping",
    name: "Shopping",
    iconName: "ShoppingBag",
    brandCount: 6,
    totalPoints: 8450,
    accentColor: "#01A2FB",
    bgColor: "#E6F6FF",
  },
  {
    id: "other",
    name: "Growth & Other Rewards",
    iconName: "Layers",
    brandCount: 3,
    totalPoints: 880,
    accentColor: "#9C4EBD",
    bgColor: "#FDF4FF",
  },
  {
    id: "retail",
    name: "Retail & Shopping",
    iconName: "ShoppingBag",
    brandCount: 6,
    totalPoints: 8450,
    accentColor: "#01A2FB",
    bgColor: "#E6F6FF",
  },
  {
    id: "dining",
    name: "Dining & Food",
    iconName: "Utensils",
    brandCount: 3,
    totalPoints: 4200,
    accentColor: "#9C4EBD",
    bgColor: "#FDF4FF",
  },
  {
    id: "banking",
    name: "Banking & Cards",
    iconName: "CreditCard",
    brandCount: 3,
    totalPoints: 9150,
    accentColor: "#02EFF4",
    bgColor: "#E6FFFF",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    iconName: "Film",
    brandCount: 2,
    totalPoints: 1600,
    accentColor: "#070617",
    bgColor: "#F5FEFF",
  },
];

export const BRANDS: Brand[] = [
  {
    id: "intermills",
    name: "InterMills airline",
    category: "airlines",
    points: 11450,
    expiringPoints: 2500,
    expiryDate: "18 Aug 2026",
    accentColor: "#01A2FB",
  },
  {
    id: "indian-airline",
    name: "Indian airline",
    category: "airlines",
    points: 4318,
    expiringPoints: 588,
    expiryDate: "30 Sep 2026",
    accentColor: "#02EFF4",
  },
  {
    id: "marriott-bonvoy",
    name: "Marriott Bonvoy",
    category: "hotels",
    points: 3500,
    expiringPoints: 1000,
    expiryDate: "15 Oct 2026",
    accentColor: "#9C4EBD",
  },
  {
    id: "hilton-honors",
    name: "Hilton Honors",
    category: "hotels",
    points: 2280,
    accentColor: "#01A2FB",
  },
  {
    id: "airtel-thanks",
    name: "Airtel Thanks",
    category: "telecom",
    points: 248,
    accentColor: "#070617",
  },
  {
    id: "cult-pass",
    name: "Cult.fit Health",
    category: "health",
    points: 1289,
    accentColor: "#02EFF4",
  }
];
