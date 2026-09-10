// Tauri 环境检测与兼容封装
// 在浏览器中预览时（无 Tauri 运行时），窗口 API 自动降级为空操作

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface PreviewWindow {
  setAlwaysOnTop(v: boolean): Promise<void>;
  minimize(): Promise<void>;
  hide(): Promise<void>;
}

// 返回 null 表示浏览器预览模式
export async function getAppWindow(): Promise<PreviewWindow | null> {
  if (!isTauri()) return null;
  try {
    const mod = await import(/* @vite-ignore */ "@tauri-apps/api/window");
    return (mod as any).getCurrentWindow() as unknown as PreviewWindow;
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
  if (isTauri()) {
    try {
      // @ts-ignore - dynamic import in Tauri context
      const mod = await import("@tauri-apps/plugin-opener");
      const opener = mod as any;
      if (kind === "url") {
        await opener.openUrl(path);
      } else {
        await opener.openPath(path);
      }
      return true;
    } catch (e) {
      console.error("[openExternal tauri]", e);
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
      `【浏览器预览模式】\n无法直接打开本地 ${kind === "folder" ? "文件夹" : "文件"}：\n${path}\n\n请打包为桌面应用后使用此功能。`
    );
    return false;
  } catch {
    return false;
  }
}
