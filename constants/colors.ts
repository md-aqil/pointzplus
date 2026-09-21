// constants/colors.ts – Extracted directly from Penpot Design
export const colors = {
  // Brand Core
  primary: "#02EFF4",          // Electric Cyan (Primary CTA & highlights)
  primaryDark: "#01A2FB",      // Deep Cyan/Blue (Gradient endpoints)
  primaryLight: "#35F2F6",     // Soft Cyan
  secondary: "#9C4EBD",        // Purple Accent
  violetDark: "#3F0059",       // Deep Violet

  // Dark & Neutral Bases
  dark: "#070617",             // Obsidian base (Hero typography & dark surfaces)
  darkSurface: "#393845",      // Dark surface / pill background
  darkMuted: "#6A6A74",        // Secondary body text
  muted: "#9C9BA2",            // Input placeholders & subtle labels

  // Light & Surface Tints
  lightBg: "#F5FEFF",          // Main screen container background
  iceBlue: "#E6F6FF",          // Secondary card & category container background
  white: "#FFFFFF",            // Pure white cards & containers
  cardBg: "#FFFFFF",           // Default card background
  gray50: "#F4F4F4",           // Subtle background gray
  gray100: "#E6E6E8",          // Border gray light
  gray200: "#D9D9D9",          // Neutral border
  borderLight: "#E6E6E8",      // Primary input border
  borderBlue: "#E6F6FF",       // Ice blue border

  // Alerts & Status
  alert: "#FF4343",            // Error text & expiring points red
  alertBg: "#FFF6F6",          // Error alert container background
  alertBorder: "#FF4343",      // Error stroke
  success: "#00C853",          // Success state
  successBg: "#E8F5E9",        // Success container background

  // Gradients
  gradients: {
    primary: ["#02EFF4", "#01A2FB"] as const,
    purpleCyan: ["#9C4EBD", "#02EFF4"] as const,
    darkCard: ["#070617", "#393845"] as const,
    iceCard: ["#FFFFFF", "#F5FEFF"] as const,
    cyanSoft: ["#35F2F6", "#01A2FB"] as const,
  }
} as const;

export type ColorToken = keyof typeof colors;
