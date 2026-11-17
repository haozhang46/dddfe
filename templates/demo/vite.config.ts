import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // Playwright lives under e2e/; do not run it with vitest
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
