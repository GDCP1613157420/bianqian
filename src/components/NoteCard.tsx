import { useState, useRef } from "react";
import { Note } from "../types";
import { formatTime, formatReminderLabel, describeRecurrence } from "../utils";

interface Props {
  note: Note;
  onClick: () => void;
  onSwipeDelete: () => void;
}

const SWIPE_THRESHOLD = 80;
const UNDO_SECONDS = 3;

export default function NoteCard({ note, onClick, onSwipeDelete }: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(UNDO_SECONDS);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startXRef = useRef(0);
  const offsetRef = useRef(0);

  const colorBg = {
    yellow: "bg-sticky-yellow",
    pink: "bg-sticky-pink",
    blue: "bg-sticky-blue",
    green: "bg-sticky-green",
    purple: "bg-sticky-purple",
  }[note.color || "yellow"];

  const rec = describeRecurrence(note.recurrence);

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const startUndoCountdown = () => {
    clearUndoTimer();
    setUndoCountdown(UNDO_SECONDS);
    undoTimerRef.current = setInterval(() => {
      setUndoCountdown((c) => {
        if (c <= 1) {
          clearUndoTimer();
          setPendingDelete(false);
          return UNDO_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (pendingDelete) return;
    if ((e.target as HTMLElement).closest("button")) return;
    startXRef.current = e.clientX - offsetRef.current;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startXRef.current;
    offsetRef.current = dx;
    setOffset(dx);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const dx = offsetRef.current;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      offsetRef.current = 0;
      setOffset(0);
      setPendingDelete(true);
      startUndoCountdown();
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden shadow-sm group">
      <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-300 flex items-center">
        <div className="flex items-center justify-between w-full px-3 text-white text-xs font-medium select-none">
          <span>滑动删除</span>
          <span className="text-base">🗑️</span>
        </div>
      </div>

      {pendingDelete && (
        <div className="absolute inset-0 bg-red-400 rounded-lg flex items-center justify-center gap-3 z-10">
          <span className="text-white font-medium text-sm">松手删除？</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                clearUndoTimer();
                setPendingDelete(false);
              }}
              className="px-2 py-1 rounded bg-white/30 hover:bg-white/50 text-white text-xs font-medium"
            >
              撤销
            </button>
            <button
              onClick={() => {
                clearUndoTimer();
                onSwipeDelete();
              }}
              className="px-2 py-1 rounded bg-white text-red-600 font-bold text-xs hover:bg-red-50"
            >
              确认{undoCountdown > 0 && <span className="ml-1 opacity-70">({undoCountdown}s)</span>}
            </button>
          </div>
        </div>
      )}

      <div
        className={`relative ${colorBg} border border-stone-200 rounded-lg p-3 touch-none cursor-pointer ${
          dragging ? "" : "transition-transform duration-200 ease-out"
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (pendingDelete) return;
          onClick();
        }}
      >
        <div className="text-sm font-bold text-stone-800 break-words">
          {note.title || "（无标题）"}
        </div>
        {note.body && (
          <div className="text-xs text-stone-600 mt-1 break-words whitespace-pre-wrap line-clamp-3">
            {note.body}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[11px] flex-wrap">
          <span className="text-stone-500">🕐 {formatTime(note.updatedAt)}</span>
          {note.reminderAt && <span className="text-blue-600">⏰ {formatReminderLabel(note.reminderAt)}</span>}
          {rec && <span className="text-stone-600 bg-stone-100 px-1 rounded">🔁 {rec}</span>}
        </div>
      </div>
    </div>
  );
}
