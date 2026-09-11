// Tauri 环境检测与兼容封装
// 浏览器预览时（无 Tauri 运行时），窗口 API 自动降级为空操作。
//
// ⚠️ 重要：这里用【静态 import】而不是动态 import(/* @vite-ignore */ ...)。
// 原因：打包 exe 用的 vite.config.ts 之前把这几个 Tauri 模块 alias 成了浏览器桩(stub)，
// 而动态 import 加 @vite-ignore 又绕过了 alias，导致 exe 里原生能力(置顶/最小化/打开文件/通知)
// 全部变成 no-op——这正是"PC 端功能全丢"的根因。
// 现在统一静态 import，由各自的构建配置决定最终解析成真模块(exe)还是桩(web)。
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/* 是否运行在原生 App 里（Capacitor Android / iOS） */
export function isCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  const Cap = (window as any).Capacitor;
  if (Cap && typeof Cap.isNativePlatform === "function") {
    try { return !!Cap.isNativePlatform(); } catch { /* ignore */ }
  }
  return false;
}

/* 是否移动端窄屏（用于在桌面/手机间切换部分 UI，如隐藏最小化/关闭） */
export function isMobileWidth(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 520;
}

export interface PreviewWindow {
  setAlwaysOnTop(v: boolean): Promise<void>;
  minimize(): Promise<void>;
  hide(): Promise<void>;
}

// 返回 null 表示浏览器预览模式
export function getAppWindow(): PreviewWindow | null {
  if (!isTauri()) return null;
  try {
    return getCurrentWindow() as unknown as PreviewWindow;
  } catch {
    return null;
  }
}

// 打开本地文件 / 文件夹 / URL
// kind: "file" / "folder" / "url"
export async function openExternal(
  path: string,
  kind: "file" | "folder" | "url"
): Promise<boolean> {
  if (!path) return false;
  // 规范化路径：去掉 file:// 前缀、首尾引号与空白
  path = String(path)
    .trim()
    .replace(/^file:\/\/\/?/i, "")
    .replace(/^["']|["']$/g, "");
  if (!path) return false;
  if (isTauri()) {
    try {
      if (kind === "url") {
        const url = /^https?:\/\//i.test(path) ? path : `https://${path}`;
        await openUrl(url);
      } else if (kind === "folder") {
        // 打开文件夹：优先 openPath，失败再退化为 revealItemInDir（在文件管理器选中该文件夹）
        try {
          await openPath(path);
        } catch (e1) {
          try {
            await revealItemInDir(path);
          } catch {
            throw e1;
          }
        }
      } else {
        await openPath(path);
      }
      return true;
    } catch (e: any) {
      console.error("[openExternal tauri]", e);
      const msg = e?.message || String(e) || "未知错误";
      alert(
        `【打开失败】\n类型：${kind === "folder" ? "文件夹" : kind === "url" ? "网址" : "文件"}\n路径：${path}\n错误：${msg}\n\n请检查：\n1. 文件/文件夹是否存在\n2. 路径是否完整（Windows 需含盘符，如 C:\\Users\\xxx）\n3. 路径中是否含特殊字符需要转义`
      );
      return false;
    }
  }
  // 浏览器预览：用 window.open 兜底
  try {
    if (kind === "url") {
      const url = /^https?:\/\//i.test(path) ? path : `https://${path}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
    alert(
      `【浏览器预览模式】\n无法直接打开本地 ${kind === "folder" ? "文件夹" : "文件"}：\n${path}\n\n请打包为桌面应用后使用此功能。必要时可手动复制上方路径到资源管理器打开。`
    );
    return false;
  } catch {
    return false;
  }
}

// 弹出原生文件/文件夹选择对话框（仅 Tauri 环境）
// kind: "file" / "folder" / "url"
export async function pickLocalPath(
  kind: "file" | "folder" | "url"
): Promise<string | null> {
  if (!isTauri()) {
    alert("【浏览器预览模式】\n选文件功能仅在桌面应用中可用。\n请手动输入完整路径。");
    return null;
  }
  try {
    if (kind === "url") {
      // URL 用 prompt 即可
      const p = window.prompt("请输入 URL（http:// 或 https:// 开头）：", "https://");
      return p && p.trim() ? p.trim() : null;
    }
    const p = await openDialog({
      directory: kind === "folder",
      multiple: false,
      ...(kind === "folder"
        ? {}
        : { filters: [{ name: "所有文件", extensions: ["*"] }] }),
    });
    return Array.isArray(p) ? p[0] || null : p || null;
  } catch (e: any) {
    console.error("[pickLocalPath]", e);
    const msg = e?.message || String(e) || "未知错误";
    alert(`【选择失败】\n错误：${msg}\n\n若仍无法选择，可手动在下方输入框填写完整路径。`);
    return null;
  }
}
