export type NoteStatus = "active" | "done" | "deleted";

export type RecurrenceType =
  | "none" // 一次性便签
  | "daily" // 每天
  | "weekly" // 每周特定日（days=星期几数组，0=周日）
  | "monthly-date" // 每月X日（dayOfMonth=1-31）
  | "monthly-weekday"; // 每月第N个星期X（weekOfMonth=1-4, -1=最后; weekday=0-6）

export interface Recurrence {
  type: RecurrenceType;
  // weekly: [0,1,2,3,4,5,6]  0=周日
  days?: number[];
  // monthly-date: 1-31
  dayOfMonth?: number;
  // monthly-weekday
  weekOfMonth?: number; // 1-4 或 -1（最后）
  weekday?: number; // 0-6（0=周日）
  // 选项
  endDate?: string; // 结束日期 ISO（可选，不填=无限）
}

export interface Note {
  id: string;
  // 新：拆分标题与详情
  title: string;
  body: string; // 详情内容（多行）
  // 旧字段保留（兼容）：content = title + '\n' + body（兼容旧便签）
  content?: string; // 兼容旧数据；新数据用 title+body
  createdAt: string;
  updatedAt: string;
  status: NoteStatus;
  doneAt?: string;
  reminderAt?: string;
  // 新字段
  recurrence?: Recurrence;
  parentId?: string; // 父便签（用于周期任务的历史）
  cycleCount?: number; // 已完成周期数
  // 颜色：yellow/pink/blue/green/purple
  color?: "yellow" | "pink" | "blue" | "green" | "purple";
}

export interface NoteGroup {
  date: string;
  notes: Note[];
}
