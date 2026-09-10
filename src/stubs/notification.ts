// 浏览器构建用的桩：Tauri 通知接口（桌面构建不受影响）
export function sendNotification(_options: unknown): void {
  /* no-op in browser */
}

export function isPermissionGranted(): Promise<boolean> {
  return Promise.resolve(false);
}

export function requestPermission(): Promise<string> {
  return Promise.resolve("denied");
}
