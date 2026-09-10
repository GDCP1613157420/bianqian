// 浏览器构建用的桩：Tauri 窗口 + WebviewWindow
export function getCurrentWindow(): unknown {
  return {};
}

export class WebviewWindow {
  constructor(label: string, options: any) {
    console.warn("[stub] WebviewWindow not available in browser", label, options);
  }
  emit(_event: string, _payload: any) {}
  once(_event: string, _handler: any) {}
  setFocus() {}
}
