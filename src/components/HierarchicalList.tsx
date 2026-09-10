import { useState } from "react";
import { Note } from "../types";
import { YearNode, buildHierarchy, describeRecurrence, formatTime, formatReminderLabel } from "../utils";

interface Props {
  notes: Note[]; // 已过滤（如 active + 不含 deleted）
  onSelectNote: (n: Note) => void;
  onMarkDone: (n: Note) => void;
  onTrash: (n: Note) => void;
}

export default function HierarchicalList({ notes, onSelectNote, onMarkDone, onTrash }: Props) {
  const tree = buildHierarchy(notes);

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-amber-400">
        <div className="text-4xl mb-2">📋</div>
        <div className="text-sm">还没有任何便签</div>
        <div className="text-[10px] text-amber-300 mt-1">点下方"+ 添加便签"开始记录</div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tree.map((y) => (
        <YearBlock key={y.year} year={y} onSelectNote={onSelectNote} onMarkDone={onMarkDone} onTrash={onTrash} />
      ))}
    </div>
  );
}

function YearBlock({ year, onSelectNote, onMarkDone, onTrash }: { year: YearNode; onSelectNote: Props["onSelectNote"]; onMarkDone: Props["onMarkDone"]; onTrash: Props["onTrash"] }) {
  const [open, setOpen] = useState(true);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set([year.children[0]?.month].filter(Boolean)));

  return (
    <div className="rounded-lg overflow-hidden border border-amber-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-amber-300/50 hover:bg-amber-300 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-amber-700">{open ? "▼" : "▶"}</span>
          <span className="text-sm font-bold text-amber-900">📅 {year.year} 年</span>
        </div>
        <span className="text-[10px] text-amber-700 bg-white/60 px-1.5 py-0.5 rounded-full">
          {year.total} 条
        </span>
      </button>

      {open && (
        <div className="bg-amber-50/40">
          {year.children.map((m) => {
            const isOpen = openMonths.has(m.month);
            return (
              <div key={m.month} className="border-t border-amber-200/60">
                <button
                  onClick={() => {
                    const next = new Set(openMonths);
                    if (isOpen) next.delete(m.month);
                    else next.add(m.month);
                    setOpenMonths(next);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1 hover:bg-amber-100/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-amber-600">{isOpen ? "▼" : "▶"}</span>
                    <span className="text-xs font-medium text-amber-800">🗓️ {m.label}</span>
                  </div>
                  <span className="text-[10px] text-amber-600">{m.total} 条</span>
                </button>

                {isOpen && (
                  <div className="bg-white/40 px-2 pb-1.5 space-y-1">
                    {m.children.map((d) => (
                      <div key={d.date} className="mt-1">
                        <div className="flex items-center gap-1.5 px-1 py-0.5">
                          <span className="text-[10px] text-amber-500">
                            {d.label}
                          </span>
                          <span className="text-[9px] text-amber-400">· {d.total} 条</span>
                        </div>
                        <div className="space-y-1">
                          {d.notes.map((n) => (
                            <NoteRow
                              key={n.id}
                              note={n}
                              onClick={() => onSelectNote(n)}
                              onDone={() => onMarkDone(n)}
                              onTrash={() => onTrash(n)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteRow({ note, onClick, onDone, onTrash }: { note: Note; onClick: () => void; onDone: () => void; onTrash: () => void }) {
  const colorBg = {
    yellow: "bg-sticky-yellow",
    pink: "bg-pink-200",
    blue: "bg-blue-200",
    green: "bg-green-200",
    purple: "bg-purple-200",
  }[note.color || "yellow"];

  const rec = describeRecurrence(note.recurrence);

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-md p-2 ${colorBg} border border-amber-200/60 hover:border-amber-400 hover:shadow-sm transition-all`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-800 break-words line-clamp-1">
              {note.title}
            </span>
            {rec && (
              <span className="text-[9px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded shrink-0">
                🔁 {rec}
              </span>
            )}
          </div>
          {note.body && (
            <div className="text-xs text-gray-600 mt-0.5 line-clamp-2 break-words whitespace-pre-wrap">
              {note.body}
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-amber-600 mt-1">
            <span>🕐 {formatTime(note.updatedAt)}</span>
            {note.reminderAt && <span>⏰ {formatReminderLabel(note.reminderAt)}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            className="px-1.5 py-0.5 text-[10px] rounded bg-green-200 text-green-800 hover:bg-green-300"
            title="标记完成"
          >
            ✅
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrash();
            }}
            className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 text-red-600 hover:bg-red-200"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
