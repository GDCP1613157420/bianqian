/**
 * GitHub Gist 同步服务
 * 用法：
 *   import { syncToGist, loadFromGist } from "./sync";
 *   await syncToGist(notes, token);         // 推送到 Gist
 *   const notes = await loadFromGist(token, gistId); // 从 Gist 拉取
 *
 * Gist ID 存储在 localStorage（键：GIST_ID_KEY）
 * GitHub PAT 存储在 localStorage（键：PAT_KEY）
 */

import { Note } from "./types";

const GIST_ID_KEY = "desktop-sticky-notes-gist-id";
const PAT_KEY = "desktop-sticky-notes-github-pat";
const LAST_SYNC_KEY = "desktop-sticky-notes-last-sync";
const GIST_FILENAME = "desktop-sticky-notes.json";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncConfig {
  pat: string;
  gistId: string;
}

// ---------- 公开 API ----------

/** 仅验证 Token 是否有效 + Gist 权限是否够，不做读写 */
export function testPat(pat: string): Promise<{ login: string; scopes: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.github.com/user", true);
    xhr.setRequestHeader("Authorization", `Bearer ${pat}`);
    xhr.setRequestHeader("Accept", "application/vnd.github+json");
    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const scopes = xhr.getResponseHeader("x-oauth-scopes") || "(fine-grained: 看 token 设置中的 Permissions)";
          resolve({ login: data.login, scopes });
        } catch {
          reject(new Error("返回数据解析失败"));
        }
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const j = JSON.parse(xhr.responseText);
          msg = j.message || j.error || msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("网络错误：请检查网络或代理"));
    xhr.send();
  });
}

/** 推送便签到 GitHub Gist */
export async function pushToGist(notes: Note[], pat: string, gistId?: string): Promise<string> {
  const gistIdToUse = gistId || getGistId();
  const content = JSON.stringify(notes, null, 2);

  if (gistIdToUse) {
    // 更新已有 Gist（GitHub 不需要 sha，直接传 content 覆盖即可）
    const body: Record<string, unknown> = {
      description: "桌面便签数据自动同步",
      files: { [GIST_FILENAME]: { content } },
    };
    const resp = await gistFetch(pat, `gists/${gistIdToUse}`, "PATCH", body);
    return (resp as any).id as string;
  }

  // 无本地 gistId → 搜索账户里是否已有同名 Gist，避免重复创建
  try {
    const gists = await gistFetch(pat, "gists?per_page=100", "GET", null) as any[];
    const existing = gists.find(
      (g) => g.description === "桌面便签数据自动同步" &&
             g.files && g.files[GIST_FILENAME]
    );
    if (existing) {
      // 复用已有 Gist（先 PATCH）
      const body: Record<string, unknown> = {
        description: "桌面便签数据自动同步",
        files: { [GIST_FILENAME]: { content } },
      };
      await gistFetch(pat, `gists/${existing.id}`, "PATCH", body);
      localStorage.setItem(GIST_ID_KEY, existing.id);
      return existing.id;
    }
  } catch {
    // 搜索失败没关系，继续创建新的
  }

  // 真的没有 → 新建 Gist
  const body = {
    description: "桌面便签数据自动同步",
    public: false,
    files: { [GIST_FILENAME]: { content } },
  };
  const resp = await gistFetch(pat, "gists", "POST", body);
  const newId = (resp as any).id as string;
  localStorage.setItem(GIST_ID_KEY, newId);
  return newId;
}

/** 从 GitHub Gist 拉取便签（返回 Note[]，出错抛异常） */
export async function pullFromGist(pat: string, gistId: string): Promise<Note[]> {
  const resp = await gistFetch(pat, `gists/${gistId}`, "GET", null);
  const files = (resp as any).files as Record<
    string,
    { content: string; truncated?: boolean; raw_url?: string }
  >;
  const file = files[GIST_FILENAME];
  if (!file) throw new Error("Gist 中未找到便签文件");
  // 注意：Gist API 返回的 content 是明文，不是 base64（旧代码误用 atob 导致每次都拉取失败）
  let text = file.content || "";
  if (!text || file.truncated) {
    throw new Error("便签文件过大，暂不支持同步");
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch {
    throw new Error("远端便签数据格式损坏");
  }
}

/** 完整同步：拉取 → 合并（以 updatedAt 更新的为准）→ 推送 */
export async function fullSync(
  localNotes: Note[],
  pat: string,
  gistId: string | null,
  onProgress?: (msg: string) => void
): Promise<{ notes: Note[]; gistId: string; changed: boolean }> {
  onProgress?.("正在连接 GitHub…");
  let remoteNotes: Note[] = [];
  let currentGistId = gistId || getGistId();
  const hadGistId = !!currentGistId;

  if (currentGistId) {
    try {
      remoteNotes = await pullFromGist(pat, currentGistId);
    } catch (e: any) {
      // Gist 不存在 / 还没建文件，都当作空远程
      const m = e?.message || "";
      if (m.includes("Not Found") || m.includes("404") || m.includes("未找到便签文件")) {
        // Gist 已在远端被删除：清掉本地缓存 ID，否则下次会用旧 ID 去 PATCH 报 404
        currentGistId = "";
        remoteNotes = [];
        localStorage.removeItem(GIST_ID_KEY);
      } else {
        throw new Error(`拉取失败：${m}`);
      }
    }
  }

  // 合并：以 updatedAt 更新的为准
  const merged = mergeNotes(localNotes, remoteNotes);

  // 用 id+updatedAt 指纹判断是否需要推送/拉取（顺序无关）
  const sig = (arr: Note[]) =>
    JSON.stringify(arr.map((n) => [n.id, n.updatedAt]).sort());
  const mergedSig = sig(merged);
  // 首次同步（没有 gistId / gist 被删）必须推送，否则永远建不出远程数据
  const needPush = !currentGistId || mergedSig !== sig(remoteNotes);
  const needPull = mergedSig !== sig(localNotes);

  if (needPush) {
    onProgress?.("正在保存到 GitHub…");
    currentGistId = await pushToGist(merged, pat, currentGistId || undefined);
  }

  // 只要成功走完就算同步成功（不再依赖是否发生变更）
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

  onProgress?.("同步完成");
  return { notes: merged, gistId: currentGistId, changed: needPush || needPull || !hadGistId };
}

// ---------- helpers ----------

function mergeNotes(local: Note[], remote: Note[]): Note[] {
  const map = new Map<string, Note>();
  for (const n of [...local, ...remote]) {
    const existing = map.get(n.id);
    if (!existing || new Date(n.updatedAt) > new Date(existing.updatedAt)) {
      map.set(n.id, n);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function gistFetch(pat: string, path: string, method: string, body: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `https://api.github.com/${path}`, true);
    xhr.setRequestHeader("Authorization", `Bearer ${pat}`);
    xhr.setRequestHeader("Accept", "application/vnd.github+json");
    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
    if (body) xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.status === 204 ? {} : JSON.parse(xhr.responseText));
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const j = JSON.parse(xhr.responseText);
          msg = j.message || j.error || msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("网络错误，请检查网络连接"));
    xhr.send(body ? JSON.stringify(body) : undefined);
  });
}

// ---------- localStorage 读写 ----------

export function getStoredPat(): string {
  return localStorage.getItem(PAT_KEY) || "";
}

export function setStoredPat(pat: string): void {
  if (pat) localStorage.setItem(PAT_KEY, pat);
  else localStorage.removeItem(PAT_KEY);
}

export function getGistId(): string {
  return localStorage.getItem(GIST_ID_KEY) || "";
}

export function clearGistId(): void {
  localStorage.removeItem(GIST_ID_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function getLastSyncTime(): string {
  return localStorage.getItem(LAST_SYNC_KEY) || "";
}

export function formatLastSync(iso: string): string {
  if (!iso) return "从未同步";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} 小时前`;
  return `${Math.floor(diffHrs / 24)} 天前`;
}
