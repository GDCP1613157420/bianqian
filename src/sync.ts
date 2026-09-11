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

/** 推送便签到 GitHub Gist */
export async function pushToGist(notes: Note[], pat: string, gistId?: string): Promise<string> {
  const gistIdToUse = gistId || getGistId();
  const content = JSON.stringify(notes, null, 2);

  if (gistIdToUse) {
    // 更新已有 Gist
    const files = await getGistFiles(pat, gistIdToUse);
    const fileSha = files[GIST_FILENAME]?.sha;
    const body: Record<string, unknown> = {
      description: "桌面便签数据自动同步",
      files: {
        [GIST_FILENAME]: { content: content, ...(fileSha ? { sha: fileSha } : {}) },
      },
    };
    const resp = await gistFetch(pat, `gists/${gistIdToUse}`, "PATCH", body);
    return (resp as any).id as string;
  } else {
    // 新建 Gist
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
}

/** 从 GitHub Gist 拉取便签（返回 Note[]，出错抛异常） */
export async function pullFromGist(pat: string, gistId: string): Promise<Note[]> {
  const resp = await gistFetch(pat, `gists/${gistId}`, "GET", null);
  const files = (resp as any).files as Record<string, { content: string; encoding: string }>;
  const file = files[GIST_FILENAME];
  if (!file) throw new Error("Gist 中未找到便签文件");
  const text = decodeURIComponent(escape(atob(file.content)));
  return JSON.parse(text) as Note[];
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

  if (currentGistId) {
    try {
      remoteNotes = await pullFromGist(pat, currentGistId);
    } catch (e: any) {
      // Gist 不存在或无法访问，当作空远程
      if (e.message?.includes("Not Found") || e.message?.includes("404")) {
        currentGistId = "";
      } else {
        throw new Error(`拉取失败：${e.message}`);
      }
    }
  }

  // 合并：以 updatedAt 更新的为准
  const merged = mergeNotes(localNotes, remoteNotes);
  const localChanged = merged.some((n) =>
    remoteNotes.some((r) => r.id === n.id && r.updatedAt !== n.updatedAt)
  );
  const remoteChanged = merged.some((n) =>
    localNotes.some((l) => l.id === n.id && l.updatedAt !== n.updatedAt)
  );
  const changed = localChanged || remoteChanged;

  if (changed) {
    onProgress?.("正在保存到 GitHub…");
    currentGistId = await pushToGist(merged, pat, currentGistId || undefined);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  onProgress?.("同步完成");
  return { notes: merged, gistId: currentGistId, changed };
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

async function getGistFiles(pat: string, gistId: string): Promise<Record<string, { sha?: string }>> {
  try {
    const resp = await gistFetch(pat, `gists/${gistId}`, "GET", null);
    return ((resp as any).files || {}) as Record<string, { sha?: string }>;
  } catch {
    return {};
  }
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
