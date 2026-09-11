import { useState, useEffect, useRef } from "react";
import { Note, NoteStatus } from "./types";
import { loadNotes, saveNotes, generateId } from "./storage";
import {
  buildHierarchy,
  formatDateLabel,
  todayStr,
  noteDate,
  localInputToIso,
  formatReminderLabel,
  describeRecurrence,
} from "./utils";
import { isTauri, getAppWindow } from "./tauri";
import {
  fullSync,
  getStoredPat,
  setStoredPat,
  getGistId,
  clearGistId,
  getLastSyncTime,
  formatLastSync,
  SyncStatus,
} from "./sync";
import NoteCard from "./components/NoteCard";
import CalendarView from "./components/CalendarView";
import TrashView from "./components/TrashView";
import HierarchicalList from "./components/HierarchicalList";
import DetailPanel from "./components/DetailPanel";
import ReminderPicker from "./components/ReminderPicker";
import RecurrenceEditor from "./components/RecurrenceEditor";

type View = "list" | "calendar" | "trash";
type ListMode = "today" | "all" | "tree" | "scheduled";

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [view, setView] = useState<View>("list");
  const [listMode, setListMode] = useState<ListMode>("all");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newColor, setNewColor] = useState<Note["color"]>("yellow");
  const [addShowReminder, setAddShowReminder] = useState(false);
  const [addShowRecurrence, setAddShowRecurrence] = useState(false);
  const [addShowSchedule, setAddShowSchedule] = useState(false);
  const [addReminder, setAddReminder] = useState<string>("");
  const [addRecurrence, setAddRecurrence] = useState<import("./types").Recurrence | undefined>();
  const [addStart, setAddStart] = useState<string>("");
  const [addEnd, setAddEnd] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const firedRemindersRef = useRef<Set<string>>(new Set());

  // 同步状态
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncPat, setSyncPat] = useState(() => getStoredPat());

  // 持久化
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // 自动同步（保存后）
  useEffect(() => {
    const pat = getStoredPat();
    const id = getGistId();
    if (!pat) return;
    (async () => {
      try {
        await fullSync(
          notes, pat, id,
          (msg) => setSyncMsg(msg)
        );
        setSyncStatus("success");
        setSyncMsg(formatLastSync(getLastSyncTime()));
      } catch (e: any) {
        setSyncStatus("error");
        setSyncMsg(e.message || "同步失败");
      }
    })();
  }, [notes]);

  const handleSync = async () => {
    const pat = getStoredPat();
    if (!pat) { setShowSyncSettings(true); return; }
    setSyncStatus("syncing");
    setSyncMsg("同步中…");
    try {
      const { notes: merged, changed } = await fullSync(
        notes, pat, getGistId(),
        (msg) => setSyncMsg(msg)
      );
      setNotes(merged);
      setSyncStatus(changed ? "success" : "success");
      setSyncMsg(formatLastSync(getLastSyncTime()));
    } catch (e: any) {
      setSyncStatus("error");
      setSyncMsg(e.message || "同步失败");
    }
  };

  const handleSaveSyncSettings = () => {
    if (syncPat.trim()) {
      setStoredPat(syncPat.trim());
      setShowSyncSettings(false);
      // 立即触发一次同步
      handleSync();
    }
  };

  const handleClearSync = () => {
    setStoredPat("");
    clearGistId();
    setSyncPat("");
    setSyncStatus("idle");
    setSyncMsg("");
    setShowSyncSettings(false);
  };

  // 窗口置顶（仅 Tauri）
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      const w = await getAppWindow();
      if (w) {
        await w.setAlwaysOnTop(false);
      }
    })();
  }, []);


  // 提醒引擎
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const n of notes) {
        if (n.status !== "active" || !n.reminderAt) continue;
        const t = new Date(n.reminderAt).getTime();
        if (t <= now && !firedRemindersRef.current.has(n.id)) {
          firedRemindersRef.current.add(n.id);
          fireNotification(n);
        }
      }
    };
    const id = setInterval(tick, 15 * 1000);
    tick();
    return () => clearInterval(id);
  }, [notes]);

  const fireNotification = async (n: Note) => {
    const title = n.title || n.content?.split("\n")[0] || "便签提醒";
    if (isTauri()) {
      const mod = await import(/* @vite-ignore */ "@tauri-apps/plugin-notification");
      (mod as any).sendNotification({ title, body: n.body || "" });
    } else if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body: n.body || "" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") new Notification(title, { body: n.body || "" });
        });
      }
    }
  };

  // 操作
  const addNote = () => {
    if (!newTitle.trim() && !newBody.trim()) return;
    const now = new Date();
    // 如果设置了 scheduledStart，用它作为 createdAt（这样日历和分组按计划时间显示）
    const createdAt = addStart
      ? localInputToIso(addStart) || now.toISOString()
      : now.toISOString();
    const n: Note = {
      id: generateId(),
      title: newTitle.trim() || newBody.trim().split("\n")[0] || "(无标题)",
      body: newBody.trim(),
      content: (newTitle.trim() + "\n" + newBody.trim()).trim(),
      createdAt,
      updatedAt: createdAt,
      status: "active",
      color: newColor,
      ...(addReminder ? { reminderAt: addReminder } : {}),
      ...(addRecurrence ? { recurrence: addRecurrence } : {}),
      ...(addStart ? { scheduledStart: localInputToIso(addStart) } : {}),
      ...(addEnd ? { scheduledEnd: localInputToIso(addEnd) } : {}),
    };
    setNotes((prev) => [n, ...prev]);
    setNewTitle("");
    setNewBody("");
    setNewColor("yellow");
    setAddReminder("");
    setAddRecurrence(undefined);
    setAddStart("");
    setAddEnd("");
    setAdding(false);
  };

  const updateNote = (n: Note) => {
    setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x)));
  };

  const setStatus = (id: string, status: NoteStatus) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              status,
              doneAt: status === "done" ? new Date().toISOString() : undefined,
            }
          : n
      )
    );
  };

  const markDone = (id: string) => setStatus(id, "done");
  const restore = (id: string) => setStatus(id, "active");
  const softDelete = (id: string) => setStatus(id, "deleted");
  const hardDelete = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const startEdit = (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    setEditingId(id);
    setEditTitle(n.title);
    setEditBody(n.body || "");
  };
  const saveEdit = () => {
    if (!editingId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId
          ? {
              ...n,
              title: editTitle.trim() || "(无标题)",
              body: editBody,
              content: (editTitle.trim() + "\n" + editBody).trim(),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
    setEditingId(null);
  };

  // 过滤
  const today = todayStr();
  const activeNotes = notes.filter((n) => n.status === "active");
  const todayNotes = activeNotes.filter((n) => noteDate(n) === today);
  const scheduledNotes = activeNotes
    .filter((n) => n.scheduledStart)
    .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
  const hierarchy = buildHierarchy(activeNotes);

  let displayNotes: Note[] = [];
  if (listMode === "today") displayNotes = todayNotes;
  else if (listMode === "all") displayNotes = activeNotes;
  else if (listMode === "scheduled") displayNotes = scheduledNotes;

  // 按日期分组
  const dateMap = new Map<string, Note[]>();
  for (const n of displayNotes) {
    const d = noteDate(n);
    if (!dateMap.has(d)) dateMap.set(d, []);
    dateMap.get(d)!.push(n);
  }
  const sortedDates = Array.from(dateMap.keys()).sort().reverse();

  // 选中的便签
  const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

  // 窗口控制
  const toggleAlwaysOnTop = async () => {
    if (!isTauri()) return;
    const w = await getAppWindow();
    if (!w) return;
    const next = !isAlwaysOnTop;
    await w.setAlwaysOnTop(next);
    setIsAlwaysOnTop(next);
  };

  const handleClose = async () => {
    const w = await getAppWindow();
    if (w) await w.hide();
  };
  const handleMinimize = async () => {
    const w = await getAppWindow();
    if (w) await w.minimize();
  };

  const headerBtnCls = "px-2 py-1 text-xs rounded bg-white text-gray-800 hover:bg-emerald-200 border border-emerald-200";

  return (
    <>
      {/* 主窗口 */}
      <div className="h-screen w-full bg-white flex flex-col text-gray-900 text-sm">
        {/* 顶栏 - 可拖动窗口区域 */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-emerald-100 border-b border-emerald-200" data-tauri-drag-region>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setView("list"); setListMode("all"); }}
              className={`${headerBtnCls} ${view === "list" && listMode === "all" ? "bg-emerald-200 font-bold" : ""}`}
             title="全部"
            >
              📋
            </button>
            <button
              onClick={() => { setView("list"); setListMode("today"); }}
              className={`${headerBtnCls} ${view === "list" && listMode === "today" ? "bg-emerald-200 font-bold" : ""}`}
             title="今天"
            >
              ⭐
            </button>
            <button
              onClick={() => setListMode("scheduled")}
              className={`${headerBtnCls} ${listMode === "scheduled" ? "bg-emerald-200 font-bold" : ""}`}
             title="计划"
            >
              📅
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`${headerBtnCls} ${view === "calendar" ? "bg-emerald-200 font-bold" : ""}`}
             title="日历"
            >
              🗓
            </button>
            <button
              onClick={() => setView("trash")}
              className={`${headerBtnCls} ${view === "trash" ? "bg-emerald-200 font-bold" : ""}`}
             title="回收"
            >
              🗑
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleAlwaysOnTop}
              className={`${headerBtnCls} ${isAlwaysOnTop ? "bg-amber-200 text-amber-800" : ""}`}
              title="窗口置顶（仅在打包为桌面应用后生效）"
            >
              📌{isAlwaysOnTop ? "已" : ""}
            </button>
            {/* 同步状态指示 */}
            <button
              onClick={handleSync}
              className={`${headerBtnCls} ${
                syncStatus === "syncing" ? "bg-blue-100 text-blue-700 animate-pulse" :
                syncStatus === "success" && syncMsg ? "bg-emerald-100 text-emerald-700" :
                syncStatus === "error" ? "bg-red-100 text-red-700" :
                ""
              }`}
              title={syncMsg || "同步到云端"}
            >
              {syncStatus === "syncing" ? "🔄" : syncStatus === "success" ? "✅" : syncStatus === "error" ? "⚠️" : "☁️"}
            </button>
            <button onClick={() => setShowSyncSettings(true)} className={headerBtnCls} title="同步设置">⚙️</button>
            <button onClick={handleMinimize} className={headerBtnCls} title="最小化">─</button>
            <button onClick={handleClose} className={headerBtnCls} title="关闭到托盘">✕</button>
          </div>
        </div>

        {/* 主体 */}
        <div className="flex-1 overflow-y-auto p-2">
          {view === "list" && listMode === "tree" && (
            <HierarchicalList
              hierarchy={hierarchy}
              onSelect={(id) => setSelectedNoteId(id)}
              onEdit={startEdit}
              onMarkDone={markDone}
              onRestore={restore}
              onDelete={softDelete}
            />
          )}

          {view === "list" && listMode !== "tree" && (
            <>
              {!isTauri() && (
                <div className="text-[10px] text-emerald-700 bg-emerald-50 rounded px-2 py-1 mb-2">
                  💡 浏览器预览：📌 置顶、⏰ 系统通知、📂 本地文件跳转需打包为桌面应用
                </div>
              )}
              {listMode === "scheduled" && (
                <div className="mb-2 text-[11px] text-gray-600 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                  📅 按计划开始时间排序（{scheduledNotes.length} 条）
                </div>
              )}
              {listMode === "today" && (
                <div className="mb-2 text-[11px] text-gray-600 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                  ⭐ 今天的便签（{todayNotes.length} 条）
                </div>
              )}
              {sortedDates.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  {listMode === "scheduled" ? "暂无计划任务" : "暂无便签，点击下方 + 新建"}
                </div>
              ) : (
                sortedDates.map((d) => (
                  <div key={d} className="mb-3">
                    <div className="text-xs font-bold text-gray-600 mb-1 px-1">
                      {formatDateLabel(d)}
                    </div>
                    <div className="space-y-1.5">
                      {dateMap.get(d)!.map((n) =>
                        editingId === n.id ? (
                          <div
                            key={n.id}
                            className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 space-y-1"
                          >
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full text-sm font-bold px-1.5 py-1 rounded border border-emerald-200 bg-white"
                              placeholder="标题"
                              autoFocus
                            />
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              className="w-full text-xs px-1.5 py-1 rounded border border-emerald-200 bg-white resize-none"
                              placeholder="详情"
                              rows={3}
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 text-xs rounded bg-emerald-100 text-gray-700"
                              >
                                取消
                              </button>
                              <button
                                onClick={saveEdit}
                                className="px-2 py-1 text-xs rounded bg-emerald-200 text-emerald-800 font-bold"
                              >
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <NoteCard
                            key={n.id}
                            note={n}
                            onEdit={startEdit}
                            onSelect={(id) => setSelectedNoteId(id)}
                            onMarkDone={markDone}
                            onRestore={restore}
                            onDelete={softDelete}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {view === "calendar" && (
            <CalendarView
              notes={notes}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          {view === "trash" && (
            <TrashView
              notes={notes}
              onRestore={restore}
              onDelete={softDelete}
              onDeleteForever={hardDelete}
              onSelect={(id) => setSelectedNoteId(id)}
            />
          )}
        </div>

        {/* 底部新建按钮 */}
        <div className="p-2 border-t border-emerald-200 bg-emerald-50">
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-2 rounded-lg bg-stone-700 text-white font-bold hover:bg-stone-800"
            >
              + 新建便签
            </button>
          ) : (
            <div className="space-y-1.5 bg-white border border-emerald-200 rounded-lg p-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="标题（必填或填详情）"
                className="w-full text-sm font-bold px-2 py-1.5 rounded border border-emerald-200 focus:outline-none focus:border-stone-400"
                autoFocus
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="详情..."
                className="w-full text-xs px-2 py-1 rounded border border-emerald-200 resize-none focus:outline-none focus:border-stone-400"
                rows={3}
              />

              {/* 时间段 */}
              <div>
                <button
                  onClick={() => setAddShowSchedule(!addShowSchedule)}
                  className="text-[11px] text-gray-600 hover:underline"
                >
                  📅 工作时间段 {addStart && `(已设置)`}
                </button>
                {addShowSchedule && (
                  <div className="mt-1 space-y-1 bg-emerald-50 p-1.5 rounded">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600 w-10">开始</span>
                      <input
                        type="datetime-local"
                        value={addStart}
                        onChange={(e) => setAddStart(e.target.value)}
                        className="flex-1 text-[11px] rounded border border-emerald-200 px-1 py-0.5 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-600 w-10">结束</span>
                      <input
                        type="datetime-local"
                        value={addEnd}
                        onChange={(e) => setAddEnd(e.target.value)}
                        className="flex-1 text-[11px] rounded border border-emerald-200 px-1 py-0.5 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 提醒 */}
              <div>
                <button
                  onClick={() => setAddShowReminder(!addShowReminder)}
                  className="text-[11px] text-gray-600 hover:underline"
                >
                  ⏰ 提醒 {addReminder && `(${formatReminderLabel(addReminder)})`}
                </button>
                {addShowReminder && (
                  <div className="mt-1">
                    <ReminderPicker
                      currentIso={addReminder}
                      onSet={(iso) => setAddReminder(iso)}
                      onClear={() => setAddReminder("")}
                      onClose={() => setAddShowReminder(false)}
                    />
                  </div>
                )}
              </div>

              {/* 周期 */}
              <div>
                <button
                  onClick={() => setAddShowRecurrence(!addShowRecurrence)}
                  className="text-[11px] text-gray-600 hover:underline"
                >
                  🔁 长期任务 {addRecurrence && `(${describeRecurrence(addRecurrence)})`}
                </button>
                {addShowRecurrence && (
                  <div className="mt-1">
                    <RecurrenceEditor
                      value={addRecurrence}
                      onChange={(r) => setAddRecurrence(r)}
                      onClose={() => setAddShowRecurrence(false)}
                    />
                  </div>
                )}
              </div>

              {/* 颜色 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-600">颜色：</span>
                {(["yellow", "pink", "blue", "green", "purple"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${
                      newColor === c ? "ring-2 ring-stone-400 border-emerald-300" : "border-emerald-200"
                    } ${
                      c === "yellow" ? "bg-yellow-100" :
                      c === "pink" ? "bg-pink-100" :
                      c === "blue" ? "bg-sky-100" :
                      c === "green" ? "bg-emerald-100" :
                      "bg-violet-100"
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setAdding(false);
                    setNewTitle("");
                    setNewBody("");
                    setAddReminder("");
                    setAddRecurrence(undefined);
                    setAddStart("");
                    setAddEnd("");
                    setAddShowReminder(false);
                    setAddShowRecurrence(false);
                    setAddShowSchedule(false);
                  }}
                  className="px-3 py-1 text-xs rounded bg-emerald-100 text-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={addNote}
                  className="px-3 py-1 text-xs rounded bg-emerald-200 text-emerald-800 font-bold"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 详情面板：内嵌浮层（exe 和浏览器统一渲染） */}
      {selectedNote && (
        <div className="detail-panel-overlay">
          <DetailPanel
            note={selectedNote}
            onClose={() => setSelectedNoteId(null)}
            onUpdate={updateNote}
            onMarkDone={(id) => { markDone(id); setSelectedNoteId(null); }}
            onDelete={(id) => { softDelete(id); setSelectedNoteId(null); }}
          />
        </div>
      )}

      {/* 同步设置弹窗 */}
      {showSyncSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-[300px] max-h-[80vh] overflow-y-auto">
            <div className="bg-emerald-100 px-4 py-3 rounded-t-xl flex items-center justify-between">
              <span className="font-bold text-gray-800">☁️ 云端同步设置</span>
              <button onClick={() => setShowSyncSettings(false)} className="text-gray-500 hover:text-gray-800 text-lg">✕</button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <div className="font-bold text-gray-700 mb-1">GitHub Token</div>
                <input
                  type="password"
                  value={syncPat}
                  onChange={(e) => setSyncPat(e.target.value)}
                  placeholder="github_pat_xxxx…"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <div className="text-[11px] text-gray-500 mt-1">
                  需要 GitHub 账号。创建 Token：
                  <span className="text-blue-600">Settings → Developer settings → Personal access tokens → Tokens (classic)</span>
                  ，勾选 <b>gist</b> 权限。
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded p-2 text-[11px] text-blue-700">
                📋 如何获取 Token：<br/>
                1. github.com → 右上角头像 → Settings<br/>
                2. 左侧 "Developer settings"<br/>
                3. Personal access tokens → Tokens (classic)<br/>
                4. Generate new token (classic)<br/>
                5. 勾选 <b>gist</b> → Generate<br/>
                6. 复制 Token 粘贴到上方
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSyncSettings}
                  className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600"
                >
                  保存并同步
                </button>
                {getStoredPat() && (
                  <button
                    onClick={handleClearSync}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-xs"
                  >
                    清除
                  </button>
                )}
              </div>
              {getStoredPat() && (
                <div className="text-[11px] text-gray-500 text-center">
                  已绑定 · 上次同步：{formatLastSync(getLastSyncTime())}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
