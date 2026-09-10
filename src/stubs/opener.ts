// 浏览器构建用的桩：Tauri opener 插件
export async function openPath(_path: string): Promise<void> {
  console.warn("[stub] openPath not available in browser");
}
export async function openUrl(_url: string): Promise<void> {
  console.warn("[stub] openUrl not available in browser");
}
export async function revealItemInDir(_path: string): Promise<void> {
  console.warn("[stub] revealItemInDir not available in browser");
}
