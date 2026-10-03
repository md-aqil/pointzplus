// constants/colors.ts – Official PointzPlus Brand Guidelines & Penpot Design Tokens
export const colors = {
  // Official Brand Guidelines Primary Palette
  pixelBlue: "#01A2FB",        // Primary brand blue (RGB 1, 162, 251 / CMYK 69, 27, 0, 0)
  deepPurple: "#3F0059",       // Primary brand deep purple (RGB 63, 0, 89 / CMYK 84, 100, 26, 33)

  // Official Brand Guidelines Secondary Palette
  cyan: "#02EFF4",             // Dominant secondary cyan (RGB 2, 239, 244 / CMYK 56, 0, 14, 0)
  lightBlue: "#C0ECFF",        // Supporting secondary light blue (RGB 192, 236, 255 / CMYK 22, 0, 0, 0)
  lilac: "#E8B6FF",            // Supporting secondary lilac (RGB 232, 182, 255 / CMYK 13, 30, 0, 0)

  // Official Brand Guidelines Functional Colors
  functionalGreen: "#038237",  // Positive balance / credited amounts / success (RGB 3, 130, 55)
  functionalYellow: "#FFE878", // Reward points / multiplier highlights (RGB 255, 232, 120)
  functionalRed: "#B82020",    // Critical alerts / CTA / expiry warnings (RGB 184, 32, 32)

  // Aliases for Mobile Core & Penpot Architecture
  primary: "#02EFF4",          // Electric Cyan (Primary CTA & highlights)
  primaryDark: "#01A2FB",      // Pixel Blue (Gradient endpoints)
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
  success: "#038237",          // Success state
  successBg: "#E8F5E9",        // Success container background

  // Gradients
  gradients: {
    primary: ["#02EFF4", "#01A2FB"] as const,
    purpleCyan: ["#9C4EBD", "#02EFF4"] as const,
    brandVertical: ["#3F0059", "#01A2FB"] as const,
    darkCard: ["#070617", "#393845"] as const,
    iceCard: ["#FFFFFF", "#F5FEFF"] as const,
    cyanSoft: ["#35F2F6", "#01A2FB"] as const,
  }
} as const;

export type ColorToken = keyof typeof colors;
