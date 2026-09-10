import { Note, Recurrence } from "./types";

const STORAGE_KEY = "desktop-sticky-notes";

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (parsed as Partial<Note>[]).map((n) => migrate(n));
  } catch {
    return [];
  }
}

// 兼容旧数据：旧便签只有 content，新便签用 title+body
function migrate(n: Partial<Note>): Note {
  let title = (n.title || "").trim();
  let body = (n.body || "").trim();
  // 旧数据：content = "标题\n详情" 或 "详情"
  if (!title && !body && n.content) {
    const lines = (n.content as string).split("\n");
    title = lines[0] || "（无标题）";
    body = lines.slice(1).join("\n");
  }
  if (!title) title = "（无标题）";
  return {
    id: n.id || generateId(),
    title,
    body,
    content: n.content,
    createdAt: n.createdAt || new Date().toISOString(),
    updatedAt: n.updatedAt || n.createdAt || new Date().toISOString(),
    status: (n.status as Note["status"]) || "active",
    ...(n.doneAt ? { doneAt: n.doneAt } : {}),
    ...(n.reminderAt ? { reminderAt: n.reminderAt } : {}),
    ...(n.recurrence ? { recurrence: n.recurrence } : {}),
    ...(n.parentId ? { parentId: n.parentId } : {}),
    ...(n.cycleCount !== undefined ? { cycleCount: n.cycleCount } : {}),
    ...(n.color ? { color: n.color } : {}),
  };
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// 把便签的 title+body 拼成展示用字符串（用于通知/列表预览）
export function notePreview(n: Note, max = 60): string {
  const t = (n.title || "").trim();
  const b = (n.body || "").trim();
  const full = b ? `${t} — ${b}` : t;
  return full.length > max ? full.slice(0, max) + "…" : full;
}

// Recurrence: 计算下一次发生时间（基于"完成时间 now"）
// 返回 ISO 字符串；若 recurrence.type==='none' 或无 recurrence 返回 null
export function nextOccurrence(r: Recurrence | undefined, from: Date = new Date()): string | null {
  if (!r || r.type === "none") return null;
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(0);
  next.setHours(0);

  // 应用 endDate 检查
  if (r.endDate && new Date(r.endDate) < next) return null;

  switch (r.type) {
    case "daily": {
      // 明天同时间（用 now 时刻）
      const t = new Date(from);
      t.setDate(t.getDate() + 1);
      return t.toISOString();
    }
    case "weekly": {
      if (!r.days || r.days.length === 0) return null;
      // 找下一个匹配的星期几
      const todayWd = from.getDay();
      const sorted = [...r.days].sort((a, b) => a - b);
      // 找今天之后的第一个
      let delta = sorted.find((d) => d > todayWd);
      if (delta === undefined) delta = sorted[0]; // 下周
      const days = delta > todayWd ? delta - todayWd : 7 - todayWd + delta;
      const t = new Date(from);
      t.setDate(t.getDate() + days);
      return t.toISOString();
    }
    case "monthly-date": {
      if (!r.dayOfMonth) return null;
      const t = new Date(from);
      t.setDate(r.dayOfMonth);
      t.setHours(from.getHours(), from.getMinutes(), 0, 0);
      if (t <= from) t.setMonth(t.getMonth() + 1);
      return t.toISOString();
    }
    case "monthly-weekday": {
      if (r.weekday === undefined || r.weekOfMonth === undefined) return null;
      const t = computeNthWeekday(from.getFullYear(), from.getMonth() + 1, r.weekOfMonth, r.weekday);
      if (t <= from) {
        // 下个月
        return computeNthWeekday(
          from.getMonth() + 2 > 12 ? from.getFullYear() + 1 : from.getFullYear(),
          ((from.getMonth() + 2 - 1) % 12) + 1,
          r.weekOfMonth,
          r.weekday
        ).toISOString();
      }
      return t.toISOString();
    }
  }
  return null;
}

// 计算某年某月 第N个星期X 的日期
// weekOfMonth: 1-4 或 -1（最后）
function computeNthWeekday(year: number, month: number, weekOfMonth: number, weekday: number): Date {
  if (weekOfMonth === -1) {
    // 最后一个：找该月最后一个该星期几
    const last = new Date(year, month, 0); // 该月0日=上月最后一天
    const offset = (weekday - last.getDay() + 7) % 7;
    last.setDate(last.getDate() - offset);
    return last;
  }
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (weekOfMonth - 1) * 7;
  return new Date(year, month - 1, day);
}
