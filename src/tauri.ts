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
  // 规范化路径：去掉 file:// 前缀、首尾引号与空白
  path = String(path)
    .trim()
    .replace(/^file:\/\/\/?/i, "")
    .replace(/^["']|["']$/g, "");
  if (!path) return false;
  if (isTauri()) {
    try {
      // @ts-ignore - dynamic import in Tauri context
      const mod = await import("@tauri-apps/plugin-opener");
      const opener = mod as any;
      if (kind === "url") {
        const url = /^https?:\/\//i.test(path) ? path : `https://${path}`;
        await opener.openUrl(url);
      } else if (kind === "folder") {
        // 打开文件夹：优先 openPath，失败再退化为 revealItemInDir（在文件管理器选中该文件夹）
        try {
          await opener.openPath(path);
        } catch (e1) {
          try {
            await opener.revealItemInDir(path);
          } catch (e2) {
            throw e1;
          }
        }
      } else {
        await opener.openPath(path);
      }
      return true;
    } catch (e: any) {
      console.error("[openExternal tauri]", e);
      const msg = e?.message || String(e) || "未知错误";
      alert(
        `【打开失败】\n类型：${kind === "folder" ? "文件夹" : kind === "url" ? "网址" : "文件"}\n路径：${path}\n错误：${msg}\n\n请检查：\n1. 文件/文件夹是否存在\n2. 路径是否完整（需含盘符，如 C:\\Users\\xxx）\n3. 路径中是否含特殊字符需要转义`
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
    // @ts-ignore - dynamic import in Tauri context
    const mod = await import("@tauri-apps/plugin-dialog");
    const dlg = mod as any;
    if (kind === "folder") {
      const p = await dlg.open({ directory: true, multiple: false });
      return Array.isArray(p) ? (p[0] || null) : (p || null);
    }
    if (kind === "url") {
      // URL 用 prompt 即可
      const p = window.prompt("请输入 URL（http:// 或 https:// 开头）：", "https://");
      return p && p.trim() ? p.trim() : null;
    }
    const p = await dlg.open({
      directory: false,
      multiple: false,
      filters: [
        { name: "所有文件", extensions: ["*"] },
      ],
    });
    return Array.isArray(p) ? (p[0] || null) : (p || null);
  } catch (e: any) {
    console.error("[pickLocalPath]", e);
    const msg = e?.message || String(e) || "未知错误";
    alert(`【选择失败】\n错误：${msg}\n\n若仍无法选择，可手动在下方输入框填写完整路径。`);
    return null;
  }
}
