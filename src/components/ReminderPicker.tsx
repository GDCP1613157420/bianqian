import { useState } from "react";
import { getReminderPresets, isoToLocalInput, localInputToIso, formatReminderLabel } from "../utils";

interface Props {
  currentIso: string | undefined;
  onSet: (iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function ReminderPicker({ currentIso, onSet, onClear, onClose }: Props) {
  const [dateVal, setDateVal] = useState(() => {
    if (currentIso) return isoToLocalInput(currentIso).split("T")[0];
    const t = new Date(Date.now() + 60 * 60 * 1000);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [timeVal, setTimeVal] = useState(() => {
    if (currentIso) return isoToLocalInput(currentIso).split("T")[1];
    return "09:00";
  });

  const presets = getReminderPresets();

  const handleSave = () => {
    if (!dateVal || !timeVal) return;
    const iso = localInputToIso(`${dateVal}T${timeVal}`);
    if (iso) {
      onSet(iso);
      onClose();
    }
  };

  const handlePreset = (getValue: () => string) => {
    onSet(getValue());
    onClose();
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-1.5 space-y-2">
      <div className="text-xs font-bold text-amber-800">⏰ 设置提醒时间</div>

      {currentIso && (
        <div className="text-[10px] text-amber-600">
          当前：{formatReminderLabel(currentIso)}
        </div>
      )}

      {/* 日期 + 时间选择器 */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-amber-700 shrink-0">日期：</label>
        <input
          type="date"
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          className="flex-1 min-w-0 text-xs rounded border border-amber-200 px-1.5 py-1 text-gray-700 bg-white"
        />
        <label className="text-[10px] text-amber-700 shrink-0">时间：</label>
        <input
          type="time"
          value={timeVal}
          onChange={(e) => setTimeVal(e.target.value)}
          className="w-20 text-xs rounded border border-amber-200 px-1.5 py-1 text-gray-700 bg-white"
        />
      </div>

      {/* 快捷选项 */}
      <div>
        <div className="text-[10px] text-amber-600 mb-1">快捷：</div>
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p.getValue)}
              className="px-2 py-1 text-[10px] rounded bg-white text-amber-700 border border-amber-200 hover:bg-amber-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between gap-1">
        <button
          onClick={() => {
            onClear();
            onClose();
          }}
          className="px-3 py-1 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200"
        >
          清除提醒
        </button>
        <div className="flex gap-1">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!dateVal || !timeVal}
            className="px-3 py-1 text-xs rounded bg-amber-400 text-amber-900 font-medium hover:bg-amber-500 disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
