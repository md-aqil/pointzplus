module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.(ts|tsx|js)"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-modules-core|react-navigation|@react-navigation/.*|native-base|react-native-svg|lucide-react-native|zustand)",
  ],
  collectCoverageFrom: [
    "store/**/*.ts",
    "lib/**/*.ts",
    "hooks/**/*.ts",
    "!lib/apiClient.ts", // network client — covered via integration tests later
  ],
};
