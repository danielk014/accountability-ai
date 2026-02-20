import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPicker({ selectedDate, onSelectDate }) {
  const [open, setOpen] = useState(false);
  const [baseMonth, setBaseMonth] = useState(selectedDate || new Date());

  const handlePrevMonth = () => setBaseMonth(subMonths(baseMonth, 1));
  const handleNextMonth = () => setBaseMonth(addMonths(baseMonth, 1));

  const monthStart = startOfMonth(baseMonth);
  const monthEnd = endOfMonth(baseMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with days from previous/next month
  const firstDayOfWeek = monthStart.getDay();
  const prevMonthEnd = subMonths(monthStart, 1);
  const prevMonthStart = startOfMonth(prevMonthEnd);
  const prevMonthDays = eachDayOfInterval({
    start: prevMonthStart,
    end: prevMonthEnd,
  }).slice(-firstDayOfWeek);

  const nextMonthDays = 42 - (prevMonthDays.length + daysInMonth.length);
  const allDays = [
    ...prevMonthDays,
    ...daysInMonth,
    ...Array.from({ length: nextMonthDays }, (_, i) =>
      addMonths(monthEnd, 1).setDate ? new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, i + 1) : null
    ).filter(Boolean),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        {format(selectedDate || new Date(), "EEEE, MMMM d")}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              {format(baseMonth, "MMMM yyyy")}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_SHORT.map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === baseMonth.getMonth();
              const isSelected = isSameDay(day, selectedDate || new Date());
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => {
                    onSelectDate(day);
                    setOpen(false);
                  }}
                  className={`
                    h-8 w-8 rounded-lg text-xs font-medium transition-all
                    ${!isCurrentMonth ? "text-slate-300" : ""}
                    ${isSelected ? "bg-indigo-600 text-white" : ""}
                    ${!isSelected && isCurrentMonth ? "text-slate-700 hover:bg-slate-100" : ""}
                    ${isToday && !isSelected ? "border border-indigo-300" : ""}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}