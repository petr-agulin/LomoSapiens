import { defineConfig } from "vite";

// The service worker is built separately as one self-contained file. It sits beside
// index.html because a worker only controls its own folder, and its name has no hash
// because the browser uses the name to recognise it.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "es2020",
    lib: {
      entry: "src/sw.ts",
      formats: ["iife"],
      name: "lomoSapiensServiceWorker",
      fileName: () => "sw.js",
    },
  },
});
