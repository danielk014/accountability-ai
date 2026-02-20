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

  // Build hourly data for each day of the week
  const chartData = Array.from({ length: 7 }).map((_, dayIdx) => {
    const dayDate = addDays(weekStart, dayIdx);
    const dayStr = format(dayDate, "yyyy-MM-dd");
    const dayName = format(dayDate, "EEE");

    // Count tasks by hour
    const hourCounts = {};
    const hourTasks = {};
    HOURS.forEach(h => {
      hourCounts[h] = 0;
      hourTasks[h] = [];
    });

    const dayTasks = tasks.filter(t => taskAppliesOnDate(t, dayDate) && t.is_active);
    dayTasks.forEach(t => {
      if (t.scheduled_time) {
        const hour = parseInt(t.scheduled_time.split(":")[0]);
        if (hourCounts.hasOwnProperty(hour)) {
          hourCounts[hour]++;
          hourTasks[hour].push(t);
        }
      }
    });

    return {
      day: dayName,
      date: dayStr,
      ...hourCounts,
      tasks: hourTasks,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Last 7 Days Activity</h2>
          <p className="text-xs text-slate-500 mt-1">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="rounded-lg h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(0)}
            className="rounded-lg h-8 w-8 text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
            className="rounded-lg h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: "12px" }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} label={{ value: "Tasks", angle: -90, position: "insideLeft" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          {HOURS.map((hour) => (
            <Bar
              key={hour}
              dataKey={hour}
              stackId="tasks"
              fill={CATEGORY_COLORS[Object.keys(CATEGORY_COLORS)[hour % Object.keys(CATEGORY_COLORS).length]]}
              radius={[4, 4, 0, 0]}
              name={`${hour}:00`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-xs text-slate-600 font-medium">Most Busy Hour</p>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {(() => {
              let maxHour = 0;
              let maxCount = 0;
              HOURS.forEach(h => {
                const total = chartData.reduce((sum, day) => sum + (day[h] || 0), 0);
                if (total > maxCount) {
                  maxCount = total;
                  maxHour = h;
                }
              });
              return `${maxHour}:00`;
            })()}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-xs text-slate-600 font-medium">Total Activities</p>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {chartData.reduce((sum, day) => {
              return sum + HOURS.reduce((daySum, h) => daySum + (day[h] || 0), 0);
            }, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}