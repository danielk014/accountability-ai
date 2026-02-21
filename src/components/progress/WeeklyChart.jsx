import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export default function WeeklyChart({ completions, tasks }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayCompletions = completions.filter(c => c.completed_date === dateStr).length;
    const activeTasks = tasks.filter(t => t.is_active !== false).length;

    return {
      day: format(date, "EEE"),
      date: format(date, "MMM d"),
      completed: dayCompletions,
      total: activeTasks,
      rate: activeTasks > 0 ? Math.round((dayCompletions / activeTasks) * 100) : 0,
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg">
          <p className="text-xs font-semibold text-slate-700">{d.date}</p>
          <p className="text-xs text-slate-500">{d.completed}/{d.total} completed ({d.rate}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Last 7 days</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={days} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
          <Bar dataKey="completed" fill="#6366f1" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}