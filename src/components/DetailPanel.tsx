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
  archiveInfo?: string; // 归档时间段信息
}

const COLOR_OPTIONS: { value: NonNullable<Note["color"]>; bg: string; label: string }[] = [
  { value: "yellow", bg: "bg-sticky-yellow", label: "黄" },
  { value: "pink", bg: "bg-sticky-pink", label: "粉" },
  { value: "blue", bg: "bg-sticky-blue", label: "蓝" },
  { value: "green", bg: "bg-sticky-green", label: "绿" },
  { value: "purple", bg: "bg-sticky-purple", label: "紫" },
];

export default function DetailPanel({
  note,
  onUpdate,
  onClose,
  onDelete,
  onDone,
  archiveInfo,
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
    // fixed 在整个 APP 外部左侧，不占用主窗口空间
    <div className="detail-panel-overlay bg-stone-50 flex flex-col">
      {/* 顶部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-stone-100 border-b border-stone-200">
        <span className="text-sm font-bold text-stone-700">📝 便签详情</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded text-stone-500 hover:bg-stone-200 text-xs flex items-center justify-center"
          title="关闭详情"
        >
          ◀ 收起
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 标题 */}
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-base font-bold text-stone-800 bg-white border border-stone-300 rounded px-2 py-1.5 outline-none focus:border-stone-400"
            placeholder="标题..."
            autoFocus
          />
        ) : (
          <div className="text-base font-bold text-stone-800 break-words">
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
            className="w-full min-h-32 text-sm text-stone-700 bg-white border border-stone-300 rounded px-2 py-1.5 outline-none focus:border-stone-400 resize-none leading-relaxed"
            placeholder="详情内容..."
          />
        ) : (
          <div className="text-sm text-stone-700 whitespace-pre-wrap break-words leading-relaxed min-h-16">
            {note.body || (
              <span className="text-stone-300 italic">（无详情）</span>
            )}
          </div>
        )}

        {/* 归档时间段（已完成时显示） */}
        {archiveInfo && (
          <div className="text-xs text-stone-500 bg-stone-100 rounded-lg px-2.5 py-2 border border-stone-200">
            {archiveInfo}
          </div>
        )}

        {/* 元信息 */}
        <div className="text-xs text-stone-500 space-y-0.5 border-t border-stone-100 pt-2">
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
          <div className="text-xs text-stone-600 mb-1">颜色：</div>
          <div className="flex gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => onUpdate({ color: c.value })}
                className={`w-7 h-7 rounded-full ${c.bg} border-2 transition-all ${
                  (note.color || "yellow") === c.value
                    ? "border-stone-600 scale-110"
                    : "border-transparent hover:border-stone-300"
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
            className="w-full text-left text-sm px-2.5 py-2 rounded-lg bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors"
          >
            {note.reminderAt ? (
              <span className="text-stone-700">⏰ {formatReminderLabel(note.reminderAt)}</span>
            ) : (
              <span className="text-stone-400">+ 设置提醒</span>
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
            className="w-full text-left text-sm px-2.5 py-2 rounded-lg bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors"
          >
            {note.recurrence ? (
              <span className="text-stone-700">🔁 {describeRecurrence(note.recurrence)}</span>
            ) : (
              <span className="text-stone-400">+ 设为长期任务</span>
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
      <div className="p-2 border-t border-stone-200 flex gap-1">
        {editing ? (
          <>
            <button
              onClick={() => {
                setTitle(note.title);
                setBody(note.body);
                setEditing(false);
              }}
              className="flex-1 py-1.5 text-sm rounded bg-stone-100 text-stone-500 hover:bg-stone-200"
            >
              取消
            </button>
            <button
              onClick={save}
              className="flex-1 py-1.5 text-sm rounded bg-stone-300 text-stone-800 font-medium hover:bg-stone-400"
            >
              保存
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-1.5 text-sm rounded bg-stone-200 text-stone-700 hover:bg-stone-300"
            >
              ✏️ 编辑
            </button>
            <button
              onClick={onDone}
              className="flex-1 py-1.5 text-sm rounded bg-green-100 text-green-700 hover:bg-green-200"
            >
              ✅ 完成
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm rounded bg-red-50 text-red-500 hover:bg-red-100"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </div>
  );
}
