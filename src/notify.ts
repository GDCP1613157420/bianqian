import { isTauri } from "./tauri";

// 通知能力封装：桌面端走 Tauri 插件，浏览器预览走 Web Notification API

export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauri()) {
    // Tauri 插件弹系统通知，无需单独授权
    return true;
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

export async function showNotification(title: string, body: string): Promise<void> {
  if (isTauri()) {
    try {
      const { sendNotification } = await import("@tauri-apps/plugin-notification");
      sendNotification({ title, body });
      return;
    } catch {
      // 插件不可用时退回 Web 通知
    }
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}
