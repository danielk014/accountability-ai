import React from "react";
import { format, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

export default function HabitGrid({ tasks, completions }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));

  const activeTasks = tasks.filter(t => t.is_active !== false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Habit tracker — last 30 days</h3>
      <div className="space-y-3">
        {activeTasks.map(task => {
          const taskCompletions = new Set(
            completions.filter(c => c.task_id === task.id).map(c => c.completed_date)
          );

          return (
            <div key={task.id} className="flex items-center gap-3">
              <div className="w-28 truncate text-xs font-medium text-slate-600 flex items-center gap-1.5">
                {task.streak > 0 && <Flame className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                <span className="truncate">{task.name}</span>
              </div>
              <div className="flex gap-0.5 flex-1">
                {days.map((day, i) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const done = taskCompletions.has(dateStr);
                  return (
                    <div
                      key={i}
                      title={`${format(day, "MMM d")} — ${done ? "Done" : "Missed"}`}
                      className={cn(
                        "flex-1 h-5 rounded-sm transition-colors",
                        done ? "bg-emerald-400" : "bg-slate-100"
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {activeTasks.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No habits yet — add some to start tracking!</p>
      )}
    </div>
  );
}