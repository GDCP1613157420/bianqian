import { useState, useEffect, useRef } from "react";
import { Note, FileLink, Recurrence } from "../types";
import {
  isoToLocalInput,
  localInputToIso,
  describeRecurrence,
  formatScheduledLabel,
  scheduledStatus,
  timeUntil,
  formatReminderLabel,
} from "../utils";
import { openExternal } from "../tauri";
import ReminderPicker from "./ReminderPicker";
import RecurrenceEditor from "./RecurrenceEditor";

const COLOR_OPTIONS: { value: NonNullable<Note["color"]>; label: string; bg: string; border: string }[] = [
  { value: "yellow", label: "米黄", bg: "bg-yellow-50", border: "border-yellow-300" },
  { value: "pink", label: "粉", bg: "bg-pink-50", border: "border-pink-300" },
  { value: "blue", label: "蓝", bg: "bg-sky-50", border: "border-sky-300" },
  { value: "green", label: "绿", bg: "bg-emerald-50", border: "border-emerald-300" },
  { value: "purple", label: "紫", bg: "bg-violet-50", border: "border-violet-300" },
];

interface Props {
  note: Note | null;
  isStandalone?: boolean; // 是否独立窗口模式
  onClose: () => void;
  onUpdate: (note: Note) => void;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DetailPanel({
  note,
  isStandalone = false,
  onClose,
  onUpdate,
  onMarkDone,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Note | null>(note);
  const [showReminder, setShowReminder] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [newFileLabel, setNewFileLabel] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileKind, setNewFileKind] = useState<FileLink["kind"]>("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(note);
    setEditing(false);
  }, [note?.id]);

  if (!note || !draft) {
    // 占位空态
    return (
      <div
        className={`${isStandalone ? "" : "detail-panel-overlay"} h-full bg-white flex flex-col items-center justify-center text-gray-500 text-sm p-4`}
      >
        <div className="text-3xl mb-2">📝</div>
        <div>点击左侧便签查看详情</div>
        <button
          onClick={onClose}
          className="mt-3 px-3 py-1 text-xs rounded bg-emerald-50 hover:bg-emerald-200 text-gray-700"
        >
          关闭
        </button>
      </div>
    );
  }

  const title = draft.title || draft.content?.split("\n")[0] || "(无标题)";
  const body = draft.body || draft.content?.split("\n").slice(1).join("\n") || "";

  const hasSchedule = !!draft.scheduledStart;
  const sStatus = hasSchedule
    ? scheduledStatus(draft.scheduledStart!, draft.scheduledEnd)
    : null;

  const save = () => {
    if (!draft) return;
    onUpdate({ ...draft, updatedAt: new Date().toISOString() });
    setEditing(false);
  };

  const cancel = () => {
    setDraft(note);
    setEditing(false);
  };

  const setColor = (c: NonNullable<Note["color"]>) => {
    setDraft({ ...draft, color: c });
  };

  const setSchedule = (start: string, end?: string) => {
    setDraft({
      ...draft,
      scheduledStart: start || undefined,
      scheduledEnd: end || undefined,
    });
  };

  const clearSchedule = () => {
    const { scheduledStart, scheduledEnd, ...rest } = draft;
    setDraft(rest as Note);
  };

  const setReminder = (iso: string) => {
    setDraft({ ...draft, reminderAt: iso });
  };
  const clearReminder = () => {
    const { reminderAt, ...rest } = draft;
    setDraft(rest as Note);
  };

  const setRecurrence = (r: Recurrence | undefined) => {
    if (!r) {
      const { recurrence, ...rest } = draft;
      setDraft(rest as Note);
    } else {
      setDraft({ ...draft, recurrence: r });
    }
  };

  const addFileLink = () => {
    if (!newFileLabel.trim() || !newFilePath.trim()) return;
    const link: FileLink = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: newFileLabel.trim(),
      path: newFilePath.trim(),
      kind: newFileKind,
    };
    setDraft({ ...draft, fileLinks: [...(draft.fileLinks || []), link] });
    setNewFileLabel("");
    setNewFilePath("");
  };

  const removeFileLink = (id: string) => {
    setDraft({
      ...draft,
      fileLinks: (draft.fileLinks || []).filter((l) => l.id !== id),
    });
  };

  const handleOpenFile = (link: FileLink) => {
    openExternal(link.path, link.kind);
  };

  const handlePickFile = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // 浏览器模式：只能拿到文件名，不能拿真实路径
    const path = (f as any).path || f.name;
    setNewFileLabel(f.name);
    setNewFilePath(path);
    setNewFileKind("file");
  };

  return (
    <div
      className={`${isStandalone ? "" : "detail-panel-overlay"} h-full bg-white flex flex-col`}
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-200 bg-white">
        <div className="text-xs text-gray-600 font-bold">📋 详情面板</div>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-800 hover:bg-emerald-300"
              >
                ✏️ 编辑
              </button>
              {note.status === "active" && (
                <button
                  onClick={() => onMarkDone(note.id)}
                  className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                >
                  ✓ 完成
                </button>
              )}
              <button
                onClick={() => onDelete(note.id)}
                className="px-2 py-1 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200"
              >
                ✕
              </button>
            </>
          )}
          {editing && (
            <>
              <button
                onClick={cancel}
                className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-700 hover:bg-emerald-300"
              >
                取消
              </button>
              <button
                onClick={save}
                className="px-2 py-1 text-xs rounded bg-emerald-200 text-emerald-800 hover:bg-emerald-300 font-bold"
              >
                保存
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-700 hover:bg-emerald-300"
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 已完成便签归档信息 */}
        {note.status === "done" && note.doneAt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs text-emerald-700">
            <div className="font-bold mb-0.5">📦 已归档</div>
            <div>
              处理时长：
              {(() => {
                const ms = new Date(note.doneAt).getTime() - new Date(note.createdAt).getTime();
                if (ms < 60000) return "刚刚完成";
                const mins = Math.floor(ms / 60000);
                if (mins < 60) return `${mins}分钟`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}小时${mins % 60}分`;
                const days = Math.floor(hrs / 24);
                return `${days}天${hrs % 24}小时`;
              })()}
            </div>
            <div>
              完成时间：
              {new Date(note.doneAt).toLocaleString("zh-CN", { hour12: false })}
            </div>
          </div>
        )}

        {/* 标题 */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">标题</label>
          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full text-base font-bold text-gray-900 bg-white rounded border border-emerald-200 px-2 py-1.5 focus:outline-none focus:border-stone-400"
              placeholder="便签标题"
            />
          ) : (
            <div className="text-base font-bold text-gray-900">{title}</div>
          )}
        </div>

        {/* 详情 */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">详情</label>
          {editing ? (
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="w-full min-h-[80px] text-sm text-gray-800 bg-white rounded border border-emerald-200 px-2 py-1.5 focus:outline-none focus:border-stone-400 resize-none"
              placeholder="详细内容..."
            />
          ) : (
            <div className="text-sm text-gray-800 whitespace-pre-wrap min-h-[40px]">
              {body || <span className="text-gray-500">（无详情）</span>}
            </div>
          )}
        </div>

        {/* 颜色 */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">颜色</label>
          <div className="flex gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => editing && setColor(c.value)}
                disabled={!editing}
                className={`w-7 h-7 rounded-full border-2 ${c.bg} ${
                  draft.color === c.value ? c.border + " ring-2 ring-stone-400" : "border-emerald-200"
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* 时间段（工作计划时间点或时间段） */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">
            📅 工作时间段
          </label>
          {editing ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-600 w-12 shrink-0">开始</span>
                <input
                  type="datetime-local"
                  value={draft.scheduledStart ? isoToLocalInput(draft.scheduledStart) : ""}
                  onChange={(e) => {
                    const iso = e.target.value ? localInputToIso(e.target.value) : "";
                    setSchedule(iso, draft.scheduledEnd);
                  }}
                  className="flex-1 text-xs rounded border border-emerald-200 px-1.5 py-1 bg-white text-gray-800"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-600 w-12 shrink-0">结束</span>
                <input
                  type="datetime-local"
                  value={draft.scheduledEnd ? isoToLocalInput(draft.scheduledEnd) : ""}
                  onChange={(e) => {
                    const iso = e.target.value ? localInputToIso(e.target.value) : "";
                    setSchedule(draft.scheduledStart || "", iso);
                  }}
                  className="flex-1 text-xs rounded border border-emerald-200 px-1.5 py-1 bg-white text-gray-800"
                />
              </div>
              <div className="text-[10px] text-gray-500">
                💡 可设置未来某个时间点（仅开始）或时间段（开始+结束）
              </div>
              {hasSchedule && (
                <button
                  onClick={clearSchedule}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  清除时间段
                </button>
              )}
            </div>
          ) : hasSchedule ? (
            <div className="space-y-1">
              <div
                className={`text-sm font-medium ${
                  sStatus === "upcoming"
                    ? "text-blue-600"
                    : sStatus === "ongoing"
                    ? "text-amber-600"
                    : "text-gray-600"
                }`}
              >
                {sStatus === "upcoming"
                  ? `🔜 ${timeUntil(draft.scheduledStart!)}`
                  : sStatus === "ongoing"
                  ? `▶️ 进行中`
                  : `✓ 已过`}
              </div>
              <div className="text-xs text-gray-700">
                {formatScheduledLabel(draft.scheduledStart!, draft.scheduledEnd)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">（未设置）</div>
          )}
        </div>

        {/* 提醒 */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">
            ⏰ 提醒
          </label>
          {editing ? (
            <>
              {draft.reminderAt && (
                <div className="text-xs text-gray-700 mb-1">
                  当前：{formatReminderLabel(draft.reminderAt)}
                </div>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowReminder(!showReminder)}
                  className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-800 hover:bg-emerald-300"
                >
                  {showReminder ? "收起" : draft.reminderAt ? "修改提醒" : "设置提醒"}
                </button>
                {draft.reminderAt && (
                  <button
                    onClick={clearReminder}
                    className="px-2 py-1 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    清除
                  </button>
                )}
              </div>
              {showReminder && (
                <ReminderPicker
                  currentIso={draft.reminderAt}
                  onSet={setReminder}
                  onClear={clearReminder}
                  onClose={() => setShowReminder(false)}
                />
              )}
            </>
          ) : draft.reminderAt ? (
            <div className="text-sm text-gray-800">⏰ {formatReminderLabel(draft.reminderAt)}</div>
          ) : (
            <div className="text-xs text-gray-500">（未设置）</div>
          )}
        </div>

        {/* 周期 */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">
            🔁 长期任务
          </label>
          {editing ? (
            <>
              {draft.recurrence && (
                <div className="text-xs text-gray-700 mb-1">
                  当前：{describeRecurrence(draft.recurrence)}
                </div>
              )}
              <button
                onClick={() => setShowRecurrence(!showRecurrence)}
                className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-800 hover:bg-emerald-300"
              >
                {showRecurrence ? "收起" : draft.recurrence ? "修改规则" : "设置重复"}
              </button>
              {showRecurrence && (
                <RecurrenceEditor
                  value={draft.recurrence}
                  onChange={setRecurrence}
                  onClose={() => setShowRecurrence(false)}
                />
              )}
            </>
          ) : draft.recurrence ? (
            <div className="text-sm text-gray-800">🔁 {describeRecurrence(draft.recurrence)}</div>
          ) : (
            <div className="text-xs text-gray-500">（无重复）</div>
          )}
        </div>

        {/* 文件链接 */}
        <div>
          <label className="text-[11px] text-gray-600 font-bold block mb-1">
            📎 关联文件（点击打开）
          </label>
          <div className="space-y-1">
            {(draft.fileLinks || []).map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded px-2 py-1"
              >
                <span className="text-sm">
                  {link.kind === "folder" ? "📁" : link.kind === "url" ? "🔗" : "📄"}
                </span>
                <button
                  onClick={() => handleOpenFile(link)}
                  className="flex-1 min-w-0 text-left text-xs text-gray-800 hover:underline truncate"
                  title={link.path}
                >
                  <span className="font-medium">{link.label}</span>
                  <span className="text-gray-500 ml-1 text-[10px]">{link.path}</span>
                </button>
                {editing && (
                  <button
                    onClick={() => removeFileLink(link.id)}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {(!draft.fileLinks || draft.fileLinks.length === 0) && !editing && (
              <div className="text-xs text-gray-500">（无关联文件）</div>
            )}
          </div>

          {editing && (
            <div className="mt-1.5 space-y-1.5">
              <div className="flex gap-1.5">
                <select
                  value={newFileKind}
                  onChange={(e) => setNewFileKind(e.target.value as FileLink["kind"])}
                  className="text-xs rounded border border-emerald-200 px-1.5 py-1 bg-white text-gray-800"
                >
                  <option value="file">📄 本地文件</option>
                  <option value="folder">📁 本地文件夹</option>
                  <option value="url">🔗 网址</option>
                </select>
                <input
                  value={newFileLabel}
                  onChange={(e) => setNewFileLabel(e.target.value)}
                  placeholder="标签（如：项目文档）"
                  className="flex-1 min-w-0 text-xs rounded border border-emerald-200 px-1.5 py-1 bg-white text-gray-800"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder={
                    newFileKind === "url"
                      ? "https://..."
                      : "/Users/.../file.txt 或 C:\\path\\to\\file"
                  }
                  className="flex-1 min-w-0 text-xs rounded border border-emerald-200 px-1.5 py-1 bg-white text-gray-800"
                />
                {newFileKind !== "url" && (
                  <button
                    onClick={handlePickFile}
                    className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-800 hover:bg-emerald-300 shrink-0"
                    title="选择文件"
                  >
                    📂
                  </button>
                )}
                <button
                  onClick={addFileLink}
                  disabled={!newFileLabel.trim() || !newFilePath.trim()}
                  className="px-2 py-1 text-xs rounded bg-emerald-200 text-emerald-800 hover:bg-emerald-300 font-medium disabled:opacity-40 shrink-0"
                >
                  +
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />
              <div className="text-[10px] text-gray-500">
                💡 浏览器预览下"选择文件"只能取文件名；打包后可直接打开本地文件/文件夹
              </div>
            </div>
          )}
        </div>

        {/* 元信息 */}
        <div className="text-[10px] text-gray-500 border-t border-stone-100 pt-2 space-y-0.5">
          <div>创建：{new Date(note.createdAt).toLocaleString("zh-CN", { hour12: false })}</div>
          {note.updatedAt !== note.createdAt && (
            <div>更新：{new Date(note.updatedAt).toLocaleString("zh-CN", { hour12: false })}</div>
          )}
          {note.recurrence && (
            <div>📌 长期任务：{describeRecurrence(note.recurrence)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
