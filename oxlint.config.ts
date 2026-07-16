import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  plugins: ["import", "vue"],
  rules: {
    "typescript/consistent-return": "off",
    "typescript/no-misused-promises": "error",
    "typescript/no-unsafe-argument": "warn",
    "typescript/no-unsafe-assignment": "warn",
    "typescript/no-unsafe-call": "warn",
    "typescript/no-unsafe-member-access": "warn",
    "typescript/no-unsafe-return": "warn",
    "typescript/switch-exhaustiveness-check": "error",
  },
});
