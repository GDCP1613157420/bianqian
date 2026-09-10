// 日期工具函数
export const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export const WEEKDAYS_SHORT = ["日", "一", "二", "三", "四", "五", "六"];

// Date -> "YYYY-MM-DD"
export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function todayStr(): string {
  return formatDateStr(new Date());
}

// "YYYY-MM-DD" -> Date（中午，避免时区偏移）
export function dateOf(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

// "YYYY-MM-DD" -> 友好标签：今天/昨天/M月D日 周X
export function formatDateLabel(dateStr: string): string {
  const d = dateOf(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === formatDateStr(today)) return "今天";
  if (dateStr === formatDateStr(yesterday)) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

export function formatFullDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

// 取便签所属日期 "YYYY-MM-DD"
export function noteDate(note: { createdAt: string }): string {
  return note.createdAt.split("T")[0];
}

// HH:mm
export function formatTime(iso: string): string {
  const t = new Date(iso);
  return `${t.getHours().toString().padStart(2, "0")}:${t
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// "YYYY-MM-DDTHH:mm"（本地时间）-> ISO
export function localInputToIso(val: string): string {
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

// ISO -> "YYYY-MM-DDTHH:mm"（本地时间，datetime-local 输入框用）
export function isoToLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// 提醒时间友好标签：今天 16:30 / 明天 09:00 / 9月12日 周五 14:00
export function formatReminderLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return `今天 ${ts}`;
  if (sameDay(d, tomorrow)) return `明天 ${ts}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]} ${ts}`;
}

// ===== 上下级分组工具 =====

// 树形分组：年 -> 月 -> 日 -> 便签数组
export interface YearNode {
  year: string;
  children: MonthNode[];
  total: number;
}
export interface MonthNode {
  month: string; // "2026-09"
  label: string; // "9月"
  children: DayNode[];
  total: number;
}
export interface DayNode {
  date: string; // "2026-09-10"
  label: string; // "今天" / "9月10日 周三"
  notes: import("./types").Note[];
  total: number;
}

import { Note } from "./types";

export function buildHierarchy(notes: Note[]): YearNode[] {
  const yearMap = new Map<string, Map<string, Map<string, Note[]>>>();

  for (const n of notes) {
    const d = noteDate(n);
    const [y, m] = d.split("-");
    if (!yearMap.has(y)) yearMap.set(y, new Map());
    const monthMap = yearMap.get(y)!;
    if (!monthMap.has(m)) monthMap.set(m, new Map());
    const dayMap = monthMap.get(m)!;
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(n);
  }

  // 排序：年/月倒序
  const years: YearNode[] = [];
  const sortedYears = Array.from(yearMap.keys()).sort().reverse();
  for (const y of sortedYears) {
    const monthMap = yearMap.get(y)!;
    const months: MonthNode[] = [];
    const sortedMonths = Array.from(monthMap.keys()).sort().reverse();
    let monthTotal = 0;
    for (const m of sortedMonths) {
      const dayMap = monthMap.get(m)!;
      const days: DayNode[] = [];
      const sortedDays = Array.from(dayMap.keys()).sort().reverse();
      for (const d of sortedDays) {
        const ns = dayMap.get(d)!;
        days.push({
          date: d,
          label: formatDateLabel(d),
          notes: ns,
          total: ns.length,
        });
      }
      months.push({
        month: `${y}-${m}`,
        label: `${parseInt(m, 10)}月`,
        children: days,
        total: days.reduce((a, b) => a + b.total, 0),
      });
      monthTotal += months[months.length - 1].total;
    }
    years.push({
      year: y,
      children: months,
      total: monthTotal,
    });
  }
  return years;
}

// 周期标签：daily/weekly [周一,周三]/monthly-date 5号/monthly-weekday 第2个周二
export function describeRecurrence(r: import("./types").Recurrence | undefined): string {
  if (!r || r.type === "none") return "";
  switch (r.type) {
    case "daily":
      return "每天";
    case "weekly": {
      if (!r.days || r.days.length === 0) return "每周";
      if (r.days.length === 7) return "每天";
      return `每${r.days.map((d) => WEEKDAYS_SHORT[d]).join("、")}`;
    }
    case "monthly-date":
      return `每月${r.dayOfMonth}日`;
    case "monthly-weekday": {
      const nth = [1, 2, 3, 4].includes(r.weekOfMonth || 0)
        ? ["第1个", "第2个", "第3个", "第4个"][(r.weekOfMonth || 1) - 1]
        : "最后一个";
      return `每月${nth}${WEEKDAYS_SHORT[r.weekday || 0]}`;
    }
  }
  return "";
}

// 时间快捷选项
export interface ReminderPreset {
  label: string;
  getValue: () => string; // ISO
}

export function getReminderPresets(): ReminderPreset[] {
  const now = new Date();
  const presets: ReminderPreset[] = [
    {
      label: "1 小时后",
      getValue: () => new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    },
    {
      label: "今晚 8 点",
      getValue: () => {
        const t = new Date(now);
        t.setHours(20, 0, 0, 0);
        if (t <= now) t.setDate(t.getDate() + 1);
        return t.toISOString();
      },
    },
    {
      label: "明早 9 点",
      getValue: () => {
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        t.setHours(9, 0, 0, 0);
        return t.toISOString();
      },
    },
    {
      label: "明晚 8 点",
      getValue: () => {
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        t.setHours(20, 0, 0, 0);
        return t.toISOString();
      },
    },
    {
      label: "下周一 9 点",
      getValue: () => {
        const t = new Date(now);
        const wd = t.getDay();
        const delta = wd === 1 ? 7 : (8 - wd) % 7;
        t.setDate(t.getDate() + delta);
        t.setHours(9, 0, 0, 0);
        return t.toISOString();
      },
    },
  ];
  return presets;
}
