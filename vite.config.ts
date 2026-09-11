import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚠️ 这是【打包桌面 exe】用的配置（Tauri build 读取 src-tauri/tauri.conf.json 里的
// beforeBuildCommand: npm run build -> tsc && vite build）。
// 这里【绝对不能】把 @tauri-apps/* alias 成 src/stubs/* 桩文件，否则 exe 里
// 置顶/最小化/关闭、打开本地文件、系统通知等原生能力会全部变成 no-op。
// 浏览器桩只应该出现在 vite.config.web.ts 里。
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
});
