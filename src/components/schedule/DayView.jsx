import React from "react";
import { format, isSameDay } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm

const CATEGORY_COLORS = {
  health: "bg-emerald-100 border-emerald-300 text-emerald-800",
  work: "bg-blue-100 border-blue-300 text-blue-800",
  learning: "bg-violet-100 border-violet-300 text-violet-800",
  personal: "bg-slate-100 border-slate-300 text-slate-800",
  social: "bg-pink-100 border-pink-300 text-pink-800",
  mindfulness: "bg-amber-100 border-amber-300 text-amber-800",
  other: "bg-gray-100 border-gray-300 text-gray-800",
};

function taskAppliesOnDate(task, date) {
  const dow = format(date, "EEEE").toLowerCase();
  const isWeekday = !["saturday", "sunday"].includes(dow);
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekdays") return isWeekday;
  if (task.frequency === "weekends") return !isWeekday;
  if (task.frequency === dow) return true;
  if (task.frequency === "once") return true;
  return false;
}

export default function DayView({ date, tasks, completions, onToggle }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const isToday = isSameDay(date, new Date());
  const nowHour = new Date().getHours();
  const nowMin = new Date().getMinutes();

  const dayTasks = tasks.filter((t) => taskAppliesOnDate(t, date));
  const completedIds = new Set(
    completions.filter((c) => c.completed_date === dateStr).map((c) => c.task_id)
  );

  // Group by hour slot
  const timedTasks = dayTasks.filter((t) => t.scheduled_time);
  const untimedTasks = dayTasks.filter((t) => !t.scheduled_time);

  const tasksByHour = {};
  timedTasks.forEach((t) => {
    const hour = parseInt(t.scheduled_time.split(":")[0]);
    if (!tasksByHour[hour]) tasksByHour[hour] = [];
    tasksByHour[hour].push(t);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* All-day / unscheduled */}
      {untimedTasks.length > 0 && (
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Anytime</p>
          <div className="flex flex-wrap gap-2">
            {untimedTasks.map((task) => {
              const done = completedIds.has(task.id);
              const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
              return (
                <button
                  key={task.id}
                  onClick={() => onToggle(task, date)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    done ? "opacity-50 line-through bg-slate-50 border-slate-200 text-slate-400" : color
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5" />}
                  {task.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly timeline */}
      <div className="relative">
        {HOURS.map((hour) => {
          const tasks = tasksByHour[hour] || [];
          const isCurrentHour = isToday && hour === nowHour;
          return (
            <div key={hour} className="flex border-b border-slate-50 last:border-0 min-h-[56px]">
              {/* Time label */}
              <div className="w-16 flex-shrink-0 pt-3 pr-3 text-right">
                <span className={`text-xs font-medium ${isCurrentHour ? "text-indigo-600" : "text-slate-400"}`}>
                  {hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 pt-2 pb-2 pl-3 pr-4 relative">
                {/* Current time line */}
                {isCurrentHour && (
                  <div
                    className="absolute left-0 right-4 flex items-center z-10 pointer-events-none"
                    style={{ top: `${(nowMin / 60) * 100}%` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 -ml-1.5" />
                    <div className="flex-1 h-px bg-indigo-500" />
                  </div>
                )}

                <div className="space-y-1.5">
                  {tasks.map((task) => {
                    const done = completedIds.has(task.id);
                    const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
                    return (
                      <button
                        key={task.id}
                        onClick={() => onToggle(task, date)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm font-medium transition-all hover:shadow-sm ${
                          done ? "opacity-50 bg-slate-50 border-slate-100 text-slate-400" : color
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className={done ? "line-through" : ""}>{task.name}</span>
                        {task.scheduled_time && (
                          <span className="ml-auto text-xs opacity-60">{task.scheduled_time}</span>
                        )}
                        {task.streak > 0 && (
                          <span className="text-xs font-bold text-amber-500">🔥{task.streak}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}