import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // 关键：显式定义 NODE_ENV=production，否则 @vitejs/plugin-react 会打包开发版 React
  // （开发版含描述组件栈的 <script> 字面量，内联到单文件 HTML 会把脚本提前截断）
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
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
