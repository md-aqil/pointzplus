// tailwind.config.js – NativeWind config for PointzPlus
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#02EFF4",
          dark: "#01A2FB",
          light: "#35F2F6",
        },
        violet: {
          DEFAULT: "#9C4EBD",
          dark: "#3F0059",
        },
        dark: {
          DEFAULT: "#070617",
          surface: "#393845",
          muted: "#6A6A74",
        },
        muted: "#9C9BA2",
        ice: {
          DEFAULT: "#F5FEFF",
          dark: "#E6F6FF",
        },
        alert: {
          DEFAULT: "#FF4343",
          bg: "#FFF6F6",
        },
        border: {
          light: "#E6E6E8",
          blue: "#E6F6FF",
        },
      },
      fontFamily: {
        sans: ["PlusJakartaSans-Regular"],
        regular: ["PlusJakartaSans-Regular"],
        medium: ["PlusJakartaSans-Medium"],
        semibold: ["PlusJakartaSans-SemiBold"],
        bold: ["PlusJakartaSans-Bold"],
        extrabold: ["PlusJakartaSans-ExtraBold"],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
    },
  },
  plugins: [],
};
