import { useState, useEffect, useRef } from "react";
import { Note, NoteStatus } from "./types";
import { loadNotes, saveNotes, generateId, nextOccurrence } from "./storage";
import { getAppWindow, PreviewWindow } from "./tauri";
import NoteCard from "./components/NoteCard";
import CalendarView from "./components/CalendarView";
import TrashView from "./components/TrashView";
import HierarchicalList from "./components/HierarchicalList";
import DetailPanel from "./components/DetailPanel";
import ReminderPicker from "./components/ReminderPicker";
import RecurrenceEditor from "./components/RecurrenceEditor";
import { showNotification, requestNotificationPermission } from "./notify";
import { notePreview } from "./storage";

type View = "list" | "calendar" | "trash";
type ListMode = "today" | "all";

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<View>("list");
  const [listMode, setListMode] = useState<ListMode>("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [appWindow, setAppWindow] = useState<PreviewWindow | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [addShowReminder, setAddShowReminder] = useState(false);
  const [addShowRecurrence, setAddShowRecurrence] = useState(false);
  const [addReminder, setAddReminder] = useState<string | undefined>();
  const [addRecurrence, setAddRecurrence] = useState<Note["recurrence"]>();
  const newTitleRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const firedRemindersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNotes(loadNotes());
    getAppWindow().then((w) => {
      setAppWindow(w);
      if (w) w.setAlwaysOnTop(false);
    });
  }, []);

  const persist = (next: Note[]) => {
    setNotes(next);
    saveNotes(next);
  };

  const activeNotes = notes.filter((n) => n.status === "active");
  const selectedNote = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

  const addNote = () => {
    const title = newTitle.trim() || "（无标题）";
    const body = newBody.trim();
    if (!title && !body) return;
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      title,
      body,
      createdAt: selectedDate + "T" + new Date().toISOString().split("T")[1],
      updatedAt: now,
      status: "active",
      ...(addReminder ? { reminderAt: addReminder } : {}),
      ...(addRecurrence ? { recurrence: addRecurrence } : {}),
    };
    persist([note, ...notes]);
    setNewTitle("");
    setNewBody("");
    setAdding(false);
    setAddReminder(undefined);
    setAddRecurrence(undefined);
    setAddShowReminder(false);
    setAddShowRecurrence(false);
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    persist(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const markDone = (n: Note) => {
    const now = new Date().toISOString();
    if (n.recurrence && n.recurrence.type !== "none") {
      const nextIso = nextOccurrence(n.recurrence, new Date());
      if (nextIso) {
        const nextNote: Note = {
          id: generateId(),
          title: n.title,
          body: n.body,
          createdAt: nextIso,
          updatedAt: nextIso,
          status: "active",
          parentId: n.id,
          cycleCount: (n.cycleCount || 0) + 1,
          recurrence: n.recurrence,
          color: n.color,
        };
        persist([
          ...notes.map((x) =>
            x.id === n.id ? { ...x, status: "done" as NoteStatus, doneAt: now } : x
          ),
          nextNote,
        ]);
        return;
      }
    }
    persist(
      notes.map((x) =>
        x.id === n.id ? { ...x, status: "done" as NoteStatus, doneAt: now } : x
      )
    );
  };

  const trashNote = (n: Note) => {
    persist(
      notes.map((x) =>
        x.id === n.id ? { ...x, status: "deleted" as NoteStatus, doneAt: new Date().toISOString() } : x
      )
    );
    if (selectedNoteId === n.id) setSelectedNoteId(null);
  };

  const restoreNote = (id: string) => {
    persist(notes.map((n) => (n.id === id ? { ...n, status: "active" as NoteStatus, doneAt: undefined } : n)));
  };
  const deleteForever = (id: string) => persist(notes.filter((n) => n.id !== id));
  const clearTrash = (status: NoteStatus) => persist(notes.filter((n) => n.status !== status));

  useEffect(() => {
    requestNotificationPermission();
    const check = () => {
      const now = Date.now();
      notesRef.current.forEach((n) => {
        if (
          n.status === "active" &&
          n.reminderAt &&
          !firedRemindersRef.current.has(n.id) &&
          new Date(n.reminderAt).getTime() <= now
        ) {
          firedRemindersRef.current.add(n.id);
          showNotification("⏰ 便签提醒", notePreview(n, 100) || "(空便签)");
        }
      });
    };
    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, []);

  const toggleAlwaysOnTop = async () => {
    const v = !isAlwaysOnTop;
    setIsAlwaysOnTop(v);
    if (appWindow) await appWindow.setAlwaysOnTop(v);
  };
  const handleClose = async () => {
    if (appWindow) await appWindow.hide();
  };
  const handleMinimize = async () => {
    if (appWindow) await appWindow.minimize();
  };

  const navDates: string[] = [];
  for (let i = -7; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    navDates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  const dateMap = new Map<string, Note[]>();
  activeNotes.forEach((n) => {
    const d = n.createdAt.split("T")[0];
    if (!dateMap.has(d)) dateMap.set(d, []);
    dateMap.get(d)!.push(n);
  });

  const todayNotes = dateMap.get(selectedDate) || [];
  const trashCount = notes.filter((n) => n.status !== "active").length;

  // ===== 归档时间段计算 =====
  function getArchivePeriod(note: Note): string {
    const created = new Date(note.createdAt);
    const done = note.doneAt ? new Date(note.doneAt) : new Date();
    const diffMs = done.getTime() - created.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟`;
    if (diffHr < 24) return `${diffHr} 小时`;
    if (diffDay < 30) return `${diffDay} 天`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth} 个月`;
    return `${Math.floor(diffMonth / 12)} 年`;
  }

  function formatArchiveTime(note: Note): string {
    const period = getArchivePeriod(note);
    const done = note.doneAt ? new Date(note.doneAt) : null;
    if (!done) return `⏱ 处理时长：${period}`;
    const doneStr = `${done.getFullYear()}-${String(done.getMonth() + 1).padStart(2, "0")}-${String(done.getDate()).padStart(2, "0")} ${String(done.getHours()).padStart(2, "0")}:${String(done.getMinutes()).padStart(2, "0")}`;
    return `⏱ 创建→完成：${period} ｜ 完成于 ${doneStr}`;
  }

  return (
    <>
      {/* ===== 详情面板：fixed 在 APP 外部左侧 ===== */}
      {selectedNote && (
        <DetailPanel
          note={selectedNote}
          onUpdate={(patch) => updateNote(selectedNote.id, patch)}
          onClose={() => setSelectedNoteId(null)}
          onDelete={() => trashNote(selectedNote)}
          onDone={() => markDone(selectedNote)}
          archiveInfo={selectedNote.status === "done" ? formatArchiveTime(selectedNote) : undefined}
        />
      )}

      {/* ===== 主窗口 ===== */}
      <div className="flex flex-col h-full bg-stone-50 rounded-xl shadow-2xl overflow-hidden select-none relative">
        {/* 标题栏 — 柔和配色 */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-stone-100 border-b border-stone-200">
          <div data-tauri-drag-region className="flex items-center gap-1.5 min-w-0">
            <span className="text-base">📝</span>
            <span data-tauri-drag-region className="font-bold text-stone-700 text-sm whitespace-nowrap">
              桌面便签
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="flex bg-stone-200/70 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setView("list")}
                title="便签列表"
                className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                  view === "list" ? "bg-white text-stone-700 font-bold shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                📋
              </button>
              <button
                onClick={() => setView("calendar")}
                title="日期表格"
                className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                  view === "calendar" ? "bg-white text-stone-700 font-bold shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                📅
              </button>
              <button
                onClick={() => setView("trash")}
                title="回收站"
                className={`px-2 py-0.5 rounded-md text-xs transition-colors relative ${
                  view === "trash" ? "bg-white text-stone-700 font-bold shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
              >
                🗑️
                {trashCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-400 text-white text-[9px] px-1 rounded-full leading-none py-0.5">
                    {trashCount > 99 ? "99+" : trashCount}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={toggleAlwaysOnTop}
              title={isAlwaysOnTop ? "取消置顶" : "置顶窗口"}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${
                isAlwaysOnTop ? "bg-amber-200 text-amber-800" : "bg-stone-50 text-stone-400 hover:bg-stone-100"
              }`}
            >
              📌
            </button>
            <button
              onClick={handleMinimize}
              title="最小化"
              className="w-6 h-6 rounded bg-stone-50 text-stone-500 hover:bg-stone-200 flex items-center justify-center text-[10px] transition-colors"
            >
              ─
            </button>
            <button
              onClick={handleClose}
              title="最小化到托盘"
              className="w-6 h-6 rounded bg-stone-50 text-stone-500 hover:bg-red-200 hover:text-red-600 flex items-center justify-center text-[10px] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 置顶提示（浏览器预览下无效时提示用户） */}
        {isAlwaysOnTop && !appWindow && (
          <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[11px] text-center">
            ⚠️ 置顶功能需打包为桌面应用后生效，浏览器预览中无法置顶
          </div>
        )}

        {/* 视图内容 */}
        {view === "calendar" ? (
          <CalendarView notes={notes} selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setListMode("today"); setView("list"); }} />
        ) : view === "trash" ? (
          <TrashView notes={notes} onRestore={restoreNote} onDeleteForever={deleteForever} onClear={clearTrash} />
        ) : (
          <>
            {listMode === "today" && (
              <div className="flex items-center gap-1 px-2 py-1.5 bg-stone-50 border-b border-stone-200 overflow-x-auto">
                {navDates.map((d) => {
                  const hasNotes = dateMap.has(d);
                  const isSelected = d === selectedDate;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`relative px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                        isSelected
                          ? "bg-stone-300 text-stone-800 font-bold"
                          : hasNotes
                          ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          : "text-stone-400 hover:bg-stone-100"
                      }`}
                    >
                      {formatLabel(d)}
                      {hasNotes && !isSelected && (
                        <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-red-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs text-stone-600 font-medium">
                  {listMode === "all"
                    ? `📚 全部时间 · ${activeNotes.length} 条`
                    : `📅 ${formatFullDate(new Date(selectedDate))} · ${todayNotes.length} 条`}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setListMode(listMode === "today" ? "all" : "today")}
                    className="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200"
                  >
                    {listMode === "all" ? "📅 今日视图" : "📚 全部时间"}
                  </button>
                </div>
              </div>

              {adding && (
                <div className="relative rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 space-y-1.5">
                    <input
                      ref={(el) => { newTitleRef.current = el as unknown as HTMLTextAreaElement; }}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addNote();
                        }
                        if (e.key === "Escape") {
                          setAdding(false);
                          setNewTitle("");
                          setNewBody("");
                        }
                      }}
                      placeholder="标题…"
                      className="w-full bg-transparent outline-none text-base font-bold text-stone-800 placeholder-stone-400"
                      autoFocus
                    />
                    <textarea
                      value={newBody}
                      onChange={(e) => {
                        setNewBody(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === "Enter") addNote();
                        if (e.key === "Escape") {
                          setAdding(false);
                          setNewTitle("");
                          setNewBody("");
                        }
                      }}
                      placeholder="详情内容… (Ctrl+Enter 保存)"
                      className="w-full bg-transparent outline-none resize-none text-sm text-stone-700 placeholder-stone-400 leading-relaxed"
                      rows={3}
                    />

                    {addShowReminder && (
                      <ReminderPicker
                        currentIso={addReminder}
                        onSet={(iso) => setAddReminder(iso)}
                        onClear={() => setAddReminder(undefined)}
                        onClose={() => setAddShowReminder(false)}
                      />
                    )}
                    {addShowRecurrence && (
                      <RecurrenceEditor
                        value={addRecurrence}
                        onChange={setAddRecurrence}
                        onClose={() => setAddShowRecurrence(false)}
                      />
                    )}

                    {!addShowReminder && !addShowRecurrence && (
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() => setAddShowReminder(true)}
                          className={`text-[11px] px-2 py-0.5 rounded ${
                            addReminder
                              ? "bg-blue-100 text-blue-700"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {addReminder ? "⏰ 已设" : "⏰ 提醒"}
                        </button>
                        <button
                          onClick={() => setAddShowRecurrence(true)}
                          className={`text-[11px] px-2 py-0.5 rounded ${
                            addRecurrence
                              ? "bg-purple-100 text-purple-700"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {addRecurrence ? "🔁 已设" : "🔁 周期"}
                        </button>
                      </div>
                    )}

                    <div className="flex justify-end gap-1 pt-1">
                      <button
                        onClick={() => {
                          setAdding(false);
                          setNewTitle("");
                          setNewBody("");
                          setAddReminder(undefined);
                          setAddRecurrence(undefined);
                          setAddShowReminder(false);
                          setAddShowRecurrence(false);
                        }}
                        className="px-2 py-1 text-xs rounded bg-stone-100 text-stone-500 hover:bg-stone-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={addNote}
                        disabled={!newTitle.trim() && !newBody.trim()}
                        className="px-2 py-1 text-xs rounded bg-stone-300 text-stone-800 font-medium hover:bg-stone-400 disabled:opacity-40"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {listMode === "today" ? (
                <>
                  {todayNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => setSelectedNoteId(note.id)}
                      onSwipeDelete={() => trashNote(note)}
                    />
                  ))}
                  {todayNotes.length === 0 && !adding && (
                    <div className="flex flex-col items-center justify-center py-8 text-stone-400">
                      <div className="text-3xl mb-2">📋</div>
                      <div className="text-sm">这一天还没有便签</div>
                      <div className="text-[11px] text-stone-300 mt-1">点下方"+ 添加便签"按钮</div>
                    </div>
                  )}
                </>
              ) : (
                <HierarchicalList
                  notes={activeNotes}
                  onSelectNote={(n) => setSelectedNoteId(n.id)}
                  onMarkDone={markDone}
                  onTrash={trashNote}
                />
              )}
            </div>

            <div className="p-2 bg-stone-50 border-t border-stone-200">
              <button
                onClick={() => {
                  setAdding(true);
                  setTimeout(() => newTitleRef.current?.focus(), 10);
                }}
                className="w-full py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-base leading-none">+</span> 添加便签
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function formatLabel(dateStr: string): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  const yest = new Date(t);
  yest.setDate(yest.getDate() - 1);
  const yesterday = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  if (dateStr === today) return "今天";
  if (dateStr === yesterday) return "昨天";
  const d2 = new Date(dateStr + "T12:00:00");
  const wd = ["日", "一", "二", "三", "四", "五", "六"][d2.getDay()];
  return `${d2.getMonth() + 1}/${d2.getDate()}周${wd}`;
}

function formatFullDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
