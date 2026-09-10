import { useState } from "react";
import { Note } from "../types";

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
  notes: Note[];
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;       // done -> deleted
  onDeleteForever: (id: string) => void; // 真删
}

function formatArchive(n: Note): string {
  if (n.status === "done" && n.doneAt) {
    const ms = new Date(n.doneAt).getTime() - new Date(n.createdAt).getTime();
    if (ms < 0) return "";
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "刚刚完成";
    if (mins < 60) return `${mins}分钟完成`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}小时${mins % 60}分完成`;
    const days = Math.floor(hrs / 24);
    return `${days}天${hrs % 24}小时完成`;
  }
  if (n.status === "deleted") {
    return "已删除";
  }
  return "";
}

function NoteRow({
  note,
  onSelect,
  onRestore,
  onDelete,
  onDeleteForever,
}: {
  note: Note;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteForever: (id: string) => void;
}) {
  const title = note.title || note.content?.split("\n")[0] || "(无标题)";
  const body = note.body || note.content?.split("\n").slice(1).join("\n") || "";
  const colorBg = COLOR_BG[note.color || "yellow"];
  const colorBorder = COLOR_BORDER[note.color || "yellow"];
  const archive = formatArchive(note);

  return (
    <div className={`p-2 rounded-lg ${colorBg} border ${colorBorder}`}>
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium cursor-pointer hover:underline ${
              note.status === "done" ? "line-through text-gray-600" : "text-gray-500 line-through"
            }`}
            onClick={() => onSelect(note.id)}
          >
            {title}
          </div>
          {body && (
            <div className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{body}</div>
          )}
          <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
            <div>⏱ {archive}</div>
            {note.doneAt && (
              <div>
                {note.status === "done" ? "完成" : "删除"}：
                {new Date(note.doneAt).toLocaleString("zh-CN", { hour12: false })}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => onRestore(note.id)}
            className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            title="还原"
          >
            ↩️ 还原
          </button>
          {note.status === "done" ? (
            <button
              onClick={() => onDelete(note.id)}
              className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-gray-700 hover:bg-emerald-300"
              title="移到已删除"
            >
              🗑 删除
            </button>
          ) : (
            <button
              onClick={() => onDeleteForever(note.id)}
              className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 text-red-600 hover:bg-red-200"
              title="永久删除"
            >
              ✕ 永久删
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrashView({ notes, onSelect, onRestore, onDelete, onDeleteForever }: Props) {
  const [tab, setTab] = useState<"done" | "deleted">("done");
  const list = notes
    .filter((n) => n.status === tab)
    .sort((a, b) => {
      const ta = new Date(a.doneAt || a.updatedAt || a.createdAt).getTime();
      const tb = new Date(b.doneAt || b.updatedAt || b.createdAt).getTime();
      return tb - ta;
    });

  const clearAll = () => {
    if (!confirm(`确定清空所有"${tab === "done" ? "已完成" : "已删除"}"吗？此操作不可恢复。`)) return;
    list.forEach((n) => onDeleteForever(n.id));
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setTab("done")}
          className={`flex-1 py-1.5 text-xs rounded font-bold ${
            tab === "done" ? "bg-emerald-200 text-gray-900" : "bg-emerald-50 text-gray-600"
          }`}
        >
          ✅ 已完成（{notes.filter((n) => n.status === "done").length}）
        </button>
        <button
          onClick={() => setTab("deleted")}
          className={`flex-1 py-1.5 text-xs rounded font-bold ${
            tab === "deleted" ? "bg-emerald-200 text-gray-900" : "bg-emerald-50 text-gray-600"
          }`}
        >
          🗑 已删除（{notes.filter((n) => n.status === "deleted").length}）
        </button>
        {list.length > 0 && (
          <button
            onClick={clearAll}
            className="px-2 py-1 text-[10px] rounded bg-red-100 text-red-600 hover:bg-red-200"
          >
            清空
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-8">
          {tab === "done" ? "暂无已完成" : "暂无已删除"}
        </div>
      ) : (
        <div className="space-y-1.5">
          {list.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              onSelect={onSelect}
              onRestore={onRestore}
              onDelete={onDelete}
              onDeleteForever={onDeleteForever}
            />
          ))}
        </div>
      )}
    </div>
  );
}
