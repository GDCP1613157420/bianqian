export type NoteStatus = "active" | "done" | "deleted";

export type RecurrenceType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly-date"
  | "monthly-weekday";

export interface Recurrence {
  type: RecurrenceType;
  days?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  weekday?: number;
  endDate?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
  status: NoteStatus;
  doneAt?: string;
  reminderAt?: string;
  recurrence?: Recurrence;
  parentId?: string;
  cycleCount?: number;
  color?: "yellow" | "pink" | "blue" | "green" | "purple";
  // 新增：工作时间段（可设置未来的开始时间和结束时间）
  scheduledStart?: string; // ISO 字符串
  scheduledEnd?: string;
  // 新增：关联文件链接（点击跳转）
  fileLinks?: FileLink[];
}

export interface FileLink {
  id: string;
  // 标签/显示名
  label: string;
  // 文件路径或 URL
  path: string;
  // 类型：local 文件 / folder 文件夹 / url 网址
  kind: "file" | "folder" | "url";
}

export interface NoteGroup {
  date: string;
  notes: Note[];
}
