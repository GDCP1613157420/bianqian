// 浏览器构建用的桩：Tauri 窗口接口（桌面构建不受影响）
export function getCurrentWindow(): unknown {
  return {};
}
