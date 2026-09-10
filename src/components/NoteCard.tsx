import { useState, useRef } from "react";
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

const SWIPE_THRESHOLD = 80;
const UNDO_SECONDS = 3;

interface Props {
  note: Note;
  onEdit: (id: string) => void;
  onSelect: (id: string) => void;
  onMarkDone: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NoteCard({
  note,
  onEdit,
  onSelect,
  onMarkDone,
  onRestore,
  onDelete,
}: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [undoCount, setUndoCount] = useState(UNDO_SECONDS);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);

  const title = note.title || note.content?.split("\n")[0] || "(无标题)";
  const body = note.body || note.content?.split("\n").slice(1).join("\n") || "";

  const colorBg = COLOR_BG[note.color || "yellow"];
  const colorBorder = COLOR_BORDER[note.color || "yellow"];

  // 时间段状态
  const hasSchedule = !!(note.scheduledStart);
  const sStatus = hasSchedule ? scheduledStatus(note.scheduledStart!, note.scheduledEnd) : null;
  const scheduleLabel = hasSchedule
    ? formatScheduledLabel(note.scheduledStart!, note.scheduledEnd)
    : "";

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    draggingRef.current = true;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;
    if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
      setSwipeX(Math.max(dx, -SWIPE_THRESHOLD - 20));
    }
  };
  const handleTouchEnd = () => {
    draggingRef.current = false;
    if (swipeX < -SWIPE_THRESHOLD) {
      setSwipeX(-SWIPE_THRESHOLD);
      setConfirming(true);
      setUndoCount(UNDO_SECONDS);
      const interval = setInterval(() => {
        setUndoCount((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      setSwipeX(0);
    }
  };

  const handleConfirmDelete = () => {
    setConfirming(false);
    onDelete(note.id);
  };
  const handleUndo = () => {
    setConfirming(false);
    setSwipeX(0);
  };

  if (note.status === "done") {
    return (
      <div className={`p-2 rounded-lg ${colorBg} border ${colorBorder} flex items-start gap-2`}>
        <button
          onClick={() => onRestore(note.id)}
          className="text-emerald-500 hover:text-emerald-700 text-sm shrink-0 mt-0.5"
          title="还原"
        >
          ↩️
        </button>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium text-stone-600 line-through cursor-pointer hover:underline"
            onClick={() => onSelect(note.id)}
          >
            {title}
          </div>
          {body && (
            <div className="text-xs text-stone-400 line-clamp-2 mt-0.5">{body}</div>
          )}
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="text-red-400 hover:text-red-600 text-sm shrink-0 mt-0.5"
          title="永久删除"
        >
          ✕
        </button>
      </div>
    );
  }

  if (note.status === "deleted") {
    return (
      <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-stone-400 line-through truncate">
            {title}
          </div>
        </div>
        <button
          onClick={() => onRestore(note.id)}
          className="text-emerald-500 hover:text-emerald-700 text-sm shrink-0"
          title="还原"
        >
          ↩️
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className="text-red-400 hover:text-red-600 text-sm shrink-0"
          title="永久删除"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 滑动时的红色删除背景 */}
      {swipeX !== 0 && (
        <div
          className="absolute inset-0 bg-red-400 rounded-lg flex items-center justify-end pr-4 text-white text-sm font-bold"
          style={{ opacity: Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1) }}
        >
          左滑删除 →
        </div>
      )}

      <div
        className={`relative p-2 rounded-lg ${colorBg} border ${colorBorder} ${note.status !== "active" ? "opacity-60" : ""}`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: draggingRef.current ? "none" : "transform 0.2s",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-2">
          <button
            onClick={() => onMarkDone(note.id)}
            className="w-4 h-4 rounded-full border-2 border-stone-400 hover:border-emerald-500 hover:bg-emerald-100 shrink-0 mt-0.5"
            title="完成"
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-bold text-stone-700 cursor-pointer hover:underline"
              onClick={() => onSelect(note.id)}
            >
              {title}
            </div>
            {body && (
              <div
                className="text-xs text-stone-500 line-clamp-2 mt-0.5 cursor-pointer"
                onClick={() => onSelect(note.id)}
              >
                {body}
              </div>
            )}

            {/* 时间段徽标 */}
            {hasSchedule && sStatus && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    sStatus === "upcoming"
                      ? "bg-blue-100 text-blue-700"
                      : sStatus === "ongoing"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                  title={scheduleLabel}
                >
                  {sStatus === "upcoming"
                    ? `🔜 ${timeUntil(note.scheduledStart!)}`
                    : sStatus === "ongoing"
                    ? `▶️ 进行中`
                    : `✓ 已过`}
                </span>
                <span className="text-[10px] text-stone-400">{scheduleLabel}</span>
              </div>
            )}

            {/* 文件链接徽标 */}
            {note.fileLinks && note.fileLinks.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {note.fileLinks.slice(0, 3).map((fl) => (
                  <span
                    key={fl.id}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500"
                  >
                    {fl.kind === "folder" ? "📁" : fl.kind === "url" ? "🔗" : "📄"} {fl.label}
                  </span>
                ))}
                {note.fileLinks.length > 3 && (
                  <span className="text-[10px] text-stone-400">
                    +{note.fileLinks.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => onEdit(note.id)}
            className="text-stone-400 hover:text-stone-700 text-sm shrink-0"
            title="编辑"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* 滑动删除确认弹层 */}
      {confirming && (
        <div className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-between px-3 z-10">
          <div className="text-white text-sm font-bold">确认删除？</div>
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              className="px-2 py-1 rounded bg-white text-red-500 text-xs font-bold hover:bg-red-50"
            >
              撤销 ({undoCount})
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-2 py-1 rounded bg-red-700 text-white text-xs font-bold hover:bg-red-800"
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
