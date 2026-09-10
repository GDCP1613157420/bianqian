import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@tauri-apps/plugin-notification",
        replacement: fileURLToPath(
          new URL("./src/stubs/notification.ts", import.meta.url)
        ),
      },
      {
        find: "@tauri-apps/plugin-opener",
        replacement: fileURLToPath(
          new URL("./src/stubs/opener.ts", import.meta.url)
        ),
      },
      {
        find: "@tauri-apps/api/window",
        replacement: fileURLToPath(
          new URL("./src/stubs/tauri-window.ts", import.meta.url)
        ),
      },
    ],
  },
  base: "./",
  build: {
    outDir: "dist-web",
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: { format: "iife", inlineDynamicImports: true },
    },
  },
});
