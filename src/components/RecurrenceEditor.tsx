import { useState } from "react";
import { Recurrence, RecurrenceType } from "../types";
import { WEEKDAYS_SHORT } from "../utils";

interface Props {
  value: Recurrence | undefined;
  onChange: (r: Recurrence | undefined) => void;
  onClose: () => void;
}

const TYPE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "不重复" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly-date", label: "每月某日" },
  { value: "monthly-weekday", label: "每月第N个周X" },
];

const MONTH_WEEKS = [
  { value: 1, label: "第1个" },
  { value: 2, label: "第2个" },
  { value: 3, label: "第3个" },
  { value: 4, label: "第4个" },
  { value: -1, label: "最后1个" },
];

export default function RecurrenceEditor({ value, onChange, onClose }: Props) {
  const [type, setType] = useState<RecurrenceType>(value?.type || "none");
  const [days, setDays] = useState<number[]>(value?.days || []);
  const [dayOfMonth, setDayOfMonth] = useState<number>(value?.dayOfMonth || 1);
  const [weekOfMonth, setWeekOfMonth] = useState<number>(value?.weekOfMonth || 1);
  const [weekday, setWeekday] = useState<number>(value?.weekday ?? 1);

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const save = () => {
    if (type === "none") {
      onChange(undefined);
    } else if (type === "daily") {
      onChange({ type: "daily" });
    } else if (type === "weekly") {
      onChange({ type: "weekly", days: days.length ? days : [1] });
    } else if (type === "monthly-date") {
      onChange({ type: "monthly-date", dayOfMonth });
    } else if (type === "monthly-weekday") {
      onChange({ type: "monthly-weekday", weekOfMonth, weekday });
    }
    onClose();
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 mt-1.5 space-y-2">
      <div className="text-sm font-bold text-stone-700">🔁 长期任务 - 重复规则</div>

      <div className="flex flex-wrap gap-1">
        {TYPE_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setType(o.value)}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              type === o.value
                ? "bg-stone-300 text-stone-800 font-bold"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {type === "weekly" && (
        <div>
          <div className="text-[11px] text-stone-500 mb-1">选择周几：</div>
          <div className="flex gap-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                  days.includes(i)
                    ? "bg-stone-300 text-stone-800"
                    : "bg-white text-stone-400 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "monthly-date" && (
        <div>
          <div className="text-[11px] text-stone-500 mb-1">每月几号：</div>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
            className="w-full text-sm rounded border border-stone-200 px-2 py-1 bg-white text-stone-700"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d} 日</option>
            ))}
          </select>
        </div>
      )}

      {type === "monthly-weekday" && (
        <div className="space-y-1">
          <div className="text-[11px] text-stone-500">第几个：</div>
          <div className="flex flex-wrap gap-1">
            {MONTH_WEEKS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWeekOfMonth(w.value)}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  weekOfMonth === w.value
                    ? "bg-stone-300 text-stone-800 font-bold"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-stone-500">星期几：</div>
          <div className="flex gap-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <button
                key={i}
                onClick={() => setWeekday(i)}
                className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                  weekday === i
                    ? "bg-stone-300 text-stone-800"
                    : "bg-white text-stone-400 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {type !== "none" && (
        <div className="text-[11px] text-stone-500 bg-stone-100 rounded px-2 py-1">
          💡 完成后会自动创建下一周期的便签
        </div>
      )}

      <div className="flex justify-end gap-1">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm rounded bg-stone-100 text-stone-500 hover:bg-stone-200"
        >
          取消
        </button>
        <button
          onClick={save}
          className="px-3 py-1 text-sm rounded bg-stone-300 text-stone-800 font-medium hover:bg-stone-400"
        >
          保存
        </button>
      </div>
    </div>
  );
}
