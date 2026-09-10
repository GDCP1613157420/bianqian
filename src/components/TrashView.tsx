import { useState } from "react";
import { Note, NoteStatus } from "../types";
import { formatTime, describeRecurrence } from "../utils";
import HierarchicalList from "./HierarchicalList";

interface Props {
  notes: Note[];
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onClear: (status: NoteStatus) => void;
}

function getPeriod(note: Note): string {
  const created = new Date(note.createdAt);
  const done = note.doneAt ? new Date(note.doneAt) : new Date();
  const diffMs = done.getTime() - created.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟`;
  if (diffHr < 24) return `${diffHr}小时`;
  if (diffDay < 30) return `${diffDay}天`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}个月`;
  return `${Math.floor(diffMonth / 12)}年`;
}

export default function TrashView({ notes, onRestore, onDeleteForever, onClear }: Props) {
  const [tab, setTab] = useState<NoteStatus>("done");

  const doneList = notes.filter((n) => n.status === "done");
  const deletedList = notes.filter((n) => n.status === "deleted");
  const list = tab === "done" ? doneList : deletedList;
  const emptyText = tab === "done" ? "暂无已完成的便签" : "暂无已删除的便签";

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2">
        <button
          onClick={() => setTab("done")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "done"
              ? "bg-green-200 text-green-800"
              : "bg-green-50 text-green-600 hover:bg-green-100"
          }`}
        >
          ✅ 已完成 ({doneList.length})
        </button>
        <button
          onClick={() => setTab("deleted")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "deleted"
              ? "bg-red-200 text-red-700"
              : "bg-red-50 text-red-500 hover:bg-red-100"
          }`}
        >
          🗑️ 已删除 ({deletedList.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-stone-400">
            <div className="text-3xl mb-2">{tab === "done" ? "🎉" : "🗑️"}</div>
            <div className="text-sm">{emptyText}</div>
          </div>
        ) : (
          <TrashList
            notes={list}
            tab={tab}
            onRestore={onRestore}
            onDeleteForever={onDeleteForever}
          />
        )}
      </div>

      {list.length > 0 && (
        <div className="p-2 border-t border-stone-100">
          <button
            onClick={() => {
              if (confirm(`确定清空${tab === "done" ? "已完成" : "已删除"}的全部便签？`))
                onClear(tab);
            }}
            className="w-full py-1.5 rounded-lg bg-stone-100 text-stone-500 hover:bg-red-100 hover:text-red-600 text-sm transition-colors"
          >
            清空{tab === "done" ? "已完成" : "已删除"}
          </button>
        </div>
      )}
    </div>
  );
}

function TrashList({
  notes,
  tab,
  onRestore,
  onDeleteForever,
}: {
  notes: Note[];
  tab: NoteStatus;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <HierarchicalList
        notes={notes}
        onSelectNote={() => {}}
        onMarkDone={() => {}}
        onTrash={() => {}}
      />
      <NoteActions notes={notes} tab={tab} onRestore={onRestore} onDeleteForever={onDeleteForever} />
    </div>
  );
}

function NoteActions({
  notes,
  tab,
  onRestore,
  onDeleteForever,
}: {
  notes: Note[];
  tab: NoteStatus;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
}) {
  return (
    <div className="space-y-1 mt-2">
      {notes.map((n) => (
        <div
          key={n.id}
          className={`rounded-lg p-2.5 border text-sm ${
            tab === "done" ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-200"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-stone-700 ${tab === "done" ? "line-through decoration-green-400" : ""}`}>
                {n.title}
              </div>
              {n.body && (
                <div className={`text-xs text-stone-600 mt-0.5 whitespace-pre-wrap break-words ${tab === "done" ? "line-through decoration-green-400" : ""}`}>
                  {n.body}
                </div>
              )}
              <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>📅 {n.createdAt.split("T")[0]}</span>
                <span>⏱ 处理时长：{getPeriod(n)}</span>
                {n.doneAt && (
                  <span>
                    {tab === "done" ? "✅" : "🗑️"} {formatTime(n.doneAt)}
                  </span>
                )}
                {n.cycleCount !== undefined && n.cycleCount > 0 && (
                  <span>🔁 {n.cycleCount} 周期</span>
                )}
                {describeRecurrence(n.recurrence) && (
                  <span>🔁 {describeRecurrence(n.recurrence)}</span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onRestore(n.id)}
                className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                ↩️
              </button>
              <button
                onClick={() => {
                  if (confirm("永久删除？")) onDeleteForever(n.id);
                }}
                className="px-2 py-1 text-xs rounded bg-red-50 text-red-500 hover:bg-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
