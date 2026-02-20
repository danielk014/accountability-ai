import React from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";

const CATEGORY_DOT = {
  health: "bg-emerald-400",
  work: "bg-blue-400",
  learning: "bg-violet-400",
  personal: "bg-slate-400",
  social: "bg-pink-400",
  mindfulness: "bg-amber-400",
  other: "bg-gray-400",
};

const CATEGORY_BLOCK = {
  health: "bg-emerald-100 border-emerald-200 text-emerald-800",
  work: "bg-blue-100 border-blue-200 text-blue-800",
  learning: "bg-violet-100 border-violet-200 text-violet-800",
  personal: "bg-slate-100 border-slate-200 text-slate-700",
  social: "bg-pink-100 border-pink-200 text-pink-800",
  mindfulness: "bg-amber-100 border-amber-200 text-amber-800",
  other: "bg-gray-100 border-gray-200 text-gray-800",
};

function taskAppliesOnDate(task, date) {
  const dow = format(date, "EEEE").toLowerCase();
  const isWeekday = !["saturday", "sunday"].includes(dow);
  const dateStr = format(date, "yyyy-MM-dd");

  if (task.frequency === "once") {
    return task.scheduled_date === dateStr;
  }
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekdays") return isWeekday;
  if (task.frequency === "weekends") return !isWeekday;
  if (task.frequency === dow) return true;
  return false;
}

export default function WeekView({ date, tasks, completions, onToggle }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-r border-slate-100 last:border-0 ${isToday ? "bg-indigo-50" : ""}`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-indigo-500" : "text-slate-400"}`}>
                {format(day, "EEE")}
              </p>
              <p className={`text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center mx-auto rounded-full ${
                isToday ? "bg-indigo-600 text-white" : "text-slate-800"
              }`}>
                {format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Task grid */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isToday = isSameDay(day, new Date());
          const dayTasks = tasks.filter((t) => taskAppliesOnDate(t, day));
          const completedIds = new Set(
            completions.filter((c) => c.completed_date === dateStr).map((c) => c.task_id)
          );

          const sorted = [...dayTasks].sort((a, b) =>
            (a.scheduled_time || "99:99").localeCompare(b.scheduled_time || "99:99")
          );

          return (
            <div
              key={day.toISOString()}
              className={`p-2 border-r border-slate-100 last:border-0 space-y-1 ${isToday ? "bg-indigo-50/30" : ""}`}
            >
              {sorted.map((task) => {
                const done = completedIds.has(task.id);
                const blockColor = CATEGORY_BLOCK[task.category] || CATEGORY_BLOCK.other;
                const dotColor = CATEGORY_DOT[task.category] || CATEGORY_DOT.other;

                return (
                  <button
                    key={task.id}
                    onClick={() => onToggle(task, day)}
                    title={task.name}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all hover:shadow-sm ${
                      done ? "opacity-40 bg-slate-50 border-slate-100" : blockColor
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    )}
                    <span className={`text-xs font-medium truncate ${done ? "line-through text-slate-400" : ""}`}>
                      {task.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}