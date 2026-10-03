// @ts-check
const { FlatCompat } = require("@eslint/eslintrc");
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  ...compat.extends("expo", "plugin:@typescript-eslint/recommended"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "web-build/**",
      "logs/**",
      "server/**", // plain JS, has its own runtime; typecheck via tests
      ".expo/**",
    ],
  },
];
