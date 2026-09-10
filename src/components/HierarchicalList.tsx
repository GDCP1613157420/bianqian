import { useState } from "react";
import { Note } from "../types";
import { formatScheduledLabel, scheduledStatus, timeUntil } from "../utils";

const COLOR_BG: Record<string, string> = {
  yellow: "bg-yellow-50",
  pink: "bg-pink-50",
  blue: "bg-sky-50",
  green: "bg-emerald-50",
  purple: "bg-violet-50",
};

const COLOR_BORDER: Record<string, string> = {
  yellow: "border-yellow-200",
  pink: "border-pink-200",
  blue: "border-sky-200",
  green: "border-emerald-200",
  purple: "border-violet-200",
};

interface Props {
  hierarchy: import("../utils").YearNode[];
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onMarkDone: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HierarchicalList({
  hierarchy,
  onSelect,
  onEdit,
  onMarkDone,
  onRestore,
  onDelete,
}: Props) {
  return (
    <div className="space-y-2">
      {hierarchy.map((y) => (
        <YearBlock
          key={y.year}
          node={y}
          onSelect={onSelect}
          onEdit={onEdit}
          onMarkDone={onMarkDone}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function YearBlock({ node, onSelect, onEdit, onMarkDone, onRestore, onDelete }: any) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-emerald-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 bg-emerald-50 text-left text-sm font-bold text-gray-800 hover:bg-emerald-200 flex justify-between items-center"
      >
        <span>📅 {node.year} 年</span>
        <span className="text-xs text-gray-600">
          {open ? "▼" : "▶"} 共 {node.total}
        </span>
      </button>
      {open && (
        <div className="p-2 space-y-1.5">
          {node.children.map((m: any) => (
            <MonthBlock
              key={m.month}
              node={m}
              onSelect={onSelect}
              onEdit={onEdit}
              onMarkDone={onMarkDone}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthBlock({ node, onSelect, onEdit, onMarkDone, onRestore, onDelete }: any) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-stone-100 rounded">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-2 py-1.5 bg-white text-left text-xs font-bold text-gray-700 hover:bg-emerald-100 flex justify-between items-center"
      >
        <span>📆 {node.label}</span>
        <span className="text-[10px] text-gray-500">
          {open ? "▼" : "▶"} {node.total}
        </span>
      </button>
      {open && (
        <div className="p-1.5 space-y-1">
          {node.children.map((d: any) => (
            <DayBlock
              key={d.date}
              node={d}
              onSelect={onSelect}
              onEdit={onEdit}
              onMarkDone={onMarkDone}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayBlock({ node, onSelect, onEdit, onMarkDone, onRestore, onDelete }: any) {
  return (
    <div className="pl-1">
      <div className="text-[11px] text-gray-600 font-medium px-1 py-0.5">
        {node.label}（{node.notes.length}）
      </div>
      <div className="space-y-1">
        {node.notes.map((n: Note) => (
          <NoteRow
            key={n.id}
            note={n}
            onSelect={onSelect}
            onEdit={onEdit}
            onMarkDone={onMarkDone}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function NoteRow({ note, onSelect, onEdit, onMarkDone, onRestore, onDelete }: any) {
  const title = note.title || note.content?.split("\n")[0] || "(无标题)";
  const body = note.body || note.content?.split("\n").slice(1).join("\n") || "";
  const isDone = note.status === "done";
  const colorBg = COLOR_BG[note.color || "yellow"];
  const colorBorder = COLOR_BORDER[note.color || "yellow"];

  const hasSchedule = !!note.scheduledStart;
  const sStatus = hasSchedule ? scheduledStatus(note.scheduledStart!, note.scheduledEnd) : null;
  const scheduleLabel = hasSchedule
    ? formatScheduledLabel(note.scheduledStart!, note.scheduledEnd)
    : "";

  // 已完成便签显示归档信息
  const archiveInfo = (() => {
    if (note.status !== "done" || !note.doneAt) return null;
    const start = new Date(note.createdAt);
    const end = new Date(note.doneAt);
    const ms = end.getTime() - start.getTime();
    if (ms < 0) return null;
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "⏱ 刚刚完成";
    if (mins < 60) return `⏱ ${mins}分钟完成`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `⏱ ${hrs}小时${mins % 60}分完成`;
    const days = Math.floor(hrs / 24);
    return `⏱ ${days}天${hrs % 24}小时完成`;
  })();

  if (note.status === "deleted") {
    return (
      <div className="p-1.5 rounded bg-white border border-stone-100 flex items-center gap-1.5">
        <span className="text-gray-500 line-through text-xs truncate flex-1">{title}</span>
        <button onClick={() => onRestore(note.id)} className="text-emerald-500 text-[10px]">
          ↩
        </button>
        <button onClick={() => onDelete(note.id)} className="text-red-400 text-[10px]">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={`p-1.5 rounded ${colorBg} border ${colorBorder} flex items-start gap-1.5`}>
      <button
        onClick={() => onMarkDone(note.id)}
        className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 ${
          isDone
            ? "border-emerald-500 bg-emerald-500"
            : "border-stone-400 hover:border-emerald-500 hover:bg-emerald-100"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium cursor-pointer hover:underline ${
            isDone ? "line-through text-gray-500" : "text-gray-800"
          }`}
          onClick={() => onSelect(note.id)}
        >
          {title}
        </div>
        {body && !isDone && (
          <div className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{body}</div>
        )}

        {/* 时间段徽标 */}
        {hasSchedule && sStatus && !isDone && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                sStatus === "upcoming"
                  ? "bg-blue-100 text-blue-700"
                  : sStatus === "ongoing"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-50 text-gray-600"
              }`}
            >
              {sStatus === "upcoming"
                ? `🔜 ${timeUntil(note.scheduledStart!)}`
                : sStatus === "ongoing"
                ? `▶️ 进行中`
                : `✓ 已过`}
            </span>
            <span className="text-[10px] text-gray-500">{scheduleLabel}</span>
          </div>
        )}

        {/* 文件链接 */}
        {note.fileLinks && note.fileLinks.length > 0 && !isDone && (
          <div className="mt-1 flex flex-wrap gap-1">
            {note.fileLinks.slice(0, 3).map((fl: any) => (
              <span
                key={fl.id}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 text-gray-700 border border-emerald-200"
              >
                {fl.kind === "folder" ? "📁" : fl.kind === "url" ? "🔗" : "📄"} {fl.label}
              </span>
            ))}
            {note.fileLinks.length > 3 && (
              <span className="text-[10px] text-gray-500">+{note.fileLinks.length - 3}</span>
            )}
          </div>
        )}

        {/* 归档信息 */}
        {archiveInfo && (
          <div className="text-[10px] text-gray-500 mt-0.5">{archiveInfo}</div>
        )}
      </div>
      <button
        onClick={() => onEdit(note.id)}
        className="text-gray-500 hover:text-gray-900 text-xs shrink-0"
        title="编辑"
      >
        ✏️
      </button>
      {isDone && (
        <button
          onClick={() => onDelete(note.id)}
          className="text-red-400 hover:text-red-600 text-xs shrink-0"
          title="删除"
        >
          ✕
        </button>
      )}
    </div>
  );
}
