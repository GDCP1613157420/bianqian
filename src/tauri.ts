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
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow() as unknown as PreviewWindow;
  } catch {
    return null;
  }
}
