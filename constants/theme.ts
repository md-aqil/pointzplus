// constants/theme.ts
import { colors } from "./colors";

export const theme = {
  colors,
  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: "PlusJakartaSans-Regular",
      medium: "PlusJakartaSans-Medium",
      semiBold: "PlusJakartaSans-SemiBold",
      bold: "PlusJakartaSans-Bold",
      extraBold: "PlusJakartaSans-ExtraBold",
    },
    sizes: {
      xs: 11,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
      "4xl": 36,
    },
  },
  shadows: {
    soft: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    card: {
      shadowColor: "#01A2FB",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    glow: {
      shadowColor: "#02EFF4",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    }
  }
};
