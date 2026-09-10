import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
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
      {
        find: "@tauri-apps/api/webviewWindow",
        replacement: fileURLToPath(
          new URL("./src/stubs/tauri-window.ts", import.meta.url)
        ),
      },
    ],
  },
});
