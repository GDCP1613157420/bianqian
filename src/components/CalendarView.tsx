import { useMemo, useState } from "react";
import { Note } from "../types";
import { todayStr } from "../utils";

const WEEK_HEADERS = ["一", "二", "三", "四", "五", "六", "日"];

interface Props {
  notes: Note[]; // 全部 active 便签（用于统计每天数量）
  selectedDate: string;
  onSelectDate: (date: string) => void; // 点击某天
}

export default function CalendarView({ notes, selectedDate, onSelectDate }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11

  const today = todayStr();

  // 统计每天 active 便签数
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    notes
      .filter((n) => n.status === "active")
      .forEach((n) => {
        const d = n.createdAt.split("T")[0];
        map.set(d, (map.get(d) || 0) + 1);
      });
    return map;
  }, [notes]);

  // 构建月历格子（周一开始）
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // 周一=0: getDay() 周日=0 → (getDay()+6)%7
    const lead = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length < total) arr.push(null);
    return arr;
  }, [year, month]);

  const monthLabel = `${year}年${month + 1}月`;

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  };

  const cellDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="p-2 flex flex-col gap-2">
      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-6 h-6 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs font-bold"
        >
          ‹
        </button>
        <div className="text-sm font-bold text-amber-800">{monthLabel}</div>
        <button
          onClick={nextMonth}
          className="w-6 h-6 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs font-bold"
        >
          ›
        </button>
      </div>

      <button
        onClick={goToday}
        className={`text-xs rounded py-1 transition-colors ${
          year === now.getFullYear() && month === now.getMonth()
            ? "bg-amber-200 text-amber-700 cursor-default"
            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
        }`}
      >
        回到本月
      </button>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 text-center text-xs text-amber-600 font-medium">
        {WEEK_HEADERS.map((w) => (
          <div key={w} className="py-0.5">
            {w}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="h-9" />;
          const ds = cellDateStr(day);
          const count = countByDate.get(ds) || 0;
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const isWeekend = i % 7 === 5 || i % 7 === 6;
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                isSelected
                  ? "bg-amber-400 text-amber-950 font-bold"
                  : isToday
                  ? "bg-amber-200 text-amber-900 font-bold"
                  : isWeekend
                  ? "text-amber-400 hover:bg-amber-100"
                  : "text-gray-600 hover:bg-amber-100"
              }`}
            >
              <span className="text-xs leading-none">{day}</span>
              {/* 有便签的小圆点标记 */}
              {count > 0 && (
                <span
                  className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                    isSelected || isToday ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
              )}
              {/* 数量徽标 */}
              {count > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 text-[9px] px-0.5 rounded-full ${
                    isSelected ? "bg-red-500 text-white" : "bg-red-400 text-white"
                  }`}
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-3 text-[10px] text-amber-500 mt-1 px-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 有便签
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-200 inline-block border border-amber-300" /> 今天
        </span>
        <span className="text-amber-400">点击日期可查看当天便签</span>
      </div>
    </div>
  );
}
