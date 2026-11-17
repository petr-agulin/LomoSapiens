/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative paths, so the build works at a domain root or in a folder.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist" },
  // The tests read the app's stylesheet as text, to check its two sets of dark colours match (src/lib/theme.test.ts).
  test: { css: { include: [/src\/index\.css/] } },
});
