import { useState, useEffect } from "react";
import { Note, Recurrence } from "../types";
import {
  formatFullDate,
  formatTime,
  formatReminderLabel,
  describeRecurrence,
} from "../utils";
import ReminderPicker from "./ReminderPicker";
import RecurrenceEditor from "./RecurrenceEditor";

interface Props {
  note: Note;
  onUpdate: (patch: Partial<Note>) => void;
  onClose: () => void;
  onDelete: () => void;
  onDone: () => void;
}

const COLOR_OPTIONS: { value: NonNullable<Note["color"]>; bg: string; label: string }[] = [
  { value: "yellow", bg: "bg-sticky-yellow", label: "黄" },
  { value: "pink", bg: "bg-pink-200", label: "粉" },
  { value: "blue", bg: "bg-blue-200", label: "蓝" },
  { value: "green", bg: "bg-green-200", label: "绿" },
  { value: "purple", bg: "bg-purple-200", label: "紫" },
];

export default function DetailPanel({
  note,
  onUpdate,
  onClose,
  onDelete,
  onDone,
}: Props) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [editing, setEditing] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
  }, [note.id]);

  const save = () => {
    onUpdate({
      title: title.trim() || "（无标题）",
      body,
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
  };

  return (
    <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r-2 border-amber-300 shadow-2xl z-30 flex flex-col rounded-l-xl">
      {/* 顶部 */}
      <div className="flex items-center justify-between p-2 bg-amber-100 border-b border-amber-200">
        <span className="text-xs font-bold text-amber-800">📝 便签详情</span>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded text-amber-600 hover:bg-amber-200 text-xs"
        >
          ◀
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* 标题 */}
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-base font-bold text-gray-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 outline-none focus:border-amber-400"
            placeholder="标题..."
            autoFocus
          />
        ) : (
          <div className="text-base font-bold text-gray-800 break-words">
            {note.title}
          </div>
        )}

        {/* 详情 */}
        {editing ? (
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            className="w-full min-h-32 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 outline-none focus:border-amber-400 resize-none leading-relaxed"
            placeholder="详情内容..."
          />
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed min-h-16">
            {note.body || (
              <span className="text-amber-300 italic">（无详情）</span>
            )}
          </div>
        )}

        {/* 元信息 */}
        <div className="text-[10px] text-amber-500 space-y-0.5 border-t border-amber-100 pt-2">
          <div>📅 创建：{formatFullDate(new Date(note.createdAt))} {formatTime(note.createdAt)}</div>
          {note.updatedAt !== note.createdAt && (
            <div>✏️ 更新：{formatTime(note.updatedAt)}</div>
          )}
          {note.cycleCount !== undefined && note.cycleCount > 0 && (
            <div>🔁 已完成 {note.cycleCount} 个周期</div>
          )}
        </div>

        {/* 颜色选择 */}
        <div>
          <div className="text-[10px] text-amber-600 mb-1">颜色：</div>
          <div className="flex gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => onUpdate({ color: c.value })}
                className={`w-6 h-6 rounded-full ${c.bg} border-2 transition-all ${
                  (note.color || "yellow") === c.value
                    ? "border-amber-600 scale-110"
                    : "border-transparent hover:border-amber-300"
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* 提醒 */}
        <div>
          <button
            onClick={() => {
              setShowReminder(!showReminder);
              setShowRecurrence(false);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            {note.reminderAt ? (
              <span>⏰ {formatReminderLabel(note.reminderAt)}</span>
            ) : (
              <span className="text-amber-400">+ 设置提醒</span>
            )}
          </button>
          {showReminder && (
            <ReminderPicker
              currentIso={note.reminderAt}
              onSet={(iso) => onUpdate({ reminderAt: iso })}
              onClear={() => onUpdate({ reminderAt: undefined })}
              onClose={() => setShowReminder(false)}
            />
          )}
        </div>

        {/* 周期 */}
        <div>
          <button
            onClick={() => {
              setShowRecurrence(!showRecurrence);
              setShowReminder(false);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            {note.recurrence ? (
              <span>🔁 {describeRecurrence(note.recurrence)}</span>
            ) : (
              <span className="text-amber-400">+ 设为长期任务</span>
            )}
          </button>
          {showRecurrence && (
            <RecurrenceEditor
              value={note.recurrence}
              onChange={(r: Recurrence | undefined) => onUpdate({ recurrence: r })}
              onClose={() => setShowRecurrence(false)}
            />
          )}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="p-2 border-t border-amber-200 flex gap-1">
        {editing ? (
          <>
            <button
              onClick={() => {
                setTitle(note.title);
                setBody(note.body);
                setEditing(false);
              }}
              className="flex-1 py-1.5 text-xs rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={save}
              className="flex-1 py-1.5 text-xs rounded bg-amber-400 text-amber-900 font-medium hover:bg-amber-500"
            >
              保存
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-1.5 text-xs rounded bg-amber-300 text-amber-900 hover:bg-amber-400"
            >
              ✏️ 编辑
            </button>
            <button
              onClick={onDone}
              className="flex-1 py-1.5 text-xs rounded bg-green-300 text-green-900 hover:bg-green-400"
            >
              ✅ 完成
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </div>
  );
}
