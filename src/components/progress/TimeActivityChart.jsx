import React, { useState } from "react";
import { format, subWeeks, startOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm
const CATEGORY_COLORS = {
  health: "#10b981",
  work: "#3b82f6",
  learning: "#8b5cf6",
  personal: "#64748b",
  social: "#ec4899",
  mindfulness: "#f59e0b",
  other: "#9ca3af",
};

const CATEGORY_LABEL_COLORS = {
  health: "bg-emerald-100 text-emerald-700",
  work: "bg-blue-100 text-blue-700",
  learning: "bg-violet-100 text-violet-700",
  personal: "bg-slate-100 text-slate-700",
  social: "bg-pink-100 text-pink-700",
  mindfulness: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-700",
};

function taskAppliesOnDate(task, date) {
  const dow = format(date, "EEEE").toLowerCase();
  const isWeekday = !["saturday", "sunday"].includes(dow);
  const dateStr = format(date, "yyyy-MM-dd");

  if (task.frequency === "once") return task.scheduled_date === dateStr;
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekdays") return isWeekday;
  if (task.frequency === "weekends") return !isWeekday;
  if (task.frequency === dow) return true;
  return false;
}

export default function TimeActivityChart({ tasks, completions = [] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null);
  const weekStart = startOfWeek(subWeeks(new Date(), -weekOffset));

  // Build data for each day of the week
  const chartData = Array.from({ length: 7 }).map((_, dayIdx) => {
    const dayDate = addDays(weekStart, dayIdx);
    const dayStr = format(dayDate, "yyyy-MM-dd");
    const dayName = format(dayDate, "EEE");

    // Get completed tasks for this day
    const dayCompletions = completions.filter(c => c.completed_date === dayStr);
    const completedTaskCount = dayCompletions.length;

    return {
      day: dayName,
      date: dayStr,
      tasks: completedTaskCount,
      completions: dayCompletions,
    };
  });

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Last 7 Days</h2>
          <p className="text-xs text-slate-500 mt-1">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="rounded-lg h-9 w-9"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setWeekOffset(0)}
            className="rounded-lg text-xs h-9"
          >
            This week
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
            className="rounded-lg h-9 w-9"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="space-y-3">
        {chartData.map((day, idx) => (
          <div key={day.date} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">{day.day}</p>
                <p className="text-xs text-slate-500">{format(addDays(weekStart, idx), "MMM d, yyyy")}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  expandedDay === day.date ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedDay === day.date && (
              <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                {HOURS.map(hour => {
                  const tasksAtHour = day.tasks[hour] || [];
                  const hasActivity = tasksAtHour.length > 0;
                  return (
                    <div key={hour} className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-slate-500 w-12">{hour}:00</span>
                        {hasActivity ? (
                          <div className="flex flex-wrap gap-1 flex-1">
                            {tasksAtHour.map(task => (
                              <span
                                key={task.id}
                                className={`text-xs px-2 py-1 rounded-full ${CATEGORY_LABEL_COLORS[task.category]}`}
                              >
                                {task.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">No activities</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}