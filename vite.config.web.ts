import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// 浏览器单文件构建：把 Tauri 相关模块换成桩，产物为纯前端
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
