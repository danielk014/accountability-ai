import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";

const CATEGORY_COLORS = {
  health: "bg-emerald-50 border-emerald-200 text-emerald-700",
  work: "bg-blue-50 border-blue-200 text-blue-700",
  learning: "bg-violet-50 border-violet-200 text-violet-700",
  personal: "bg-slate-50 border-slate-200 text-slate-700",
  social: "bg-pink-50 border-pink-200 text-pink-700",
  mindfulness: "bg-amber-50 border-amber-200 text-amber-700",
  other: "bg-gray-50 border-gray-200 text-gray-700",
};

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
}

export default function DailySchedule({ tasks, completedTaskIds, onToggle }) {
  const timedTasks = tasks
    .filter(t => t.scheduled_time)
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  const untimedTasks = tasks.filter(t => !t.scheduled_time);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const renderTask = (task, index) => {
    const done = completedTaskIds.has(task.id);
    const isPast = task.scheduled_time && task.scheduled_time < currentTime && !done;
    const colorClass = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        onClick={() => onToggle(task)}
        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
          done ? "bg-slate-50 border-slate-100 opacity-60" : colorClass
        }`}
      >
        <div className="flex-shrink-0">
          {done ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className={`w-5 h-5 ${isPast ? "text-red-400" : "text-slate-300"}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${done ? "line-through text-slate-400" : "text-slate-800"}`}>
            {task.name}
          </p>
          {task.scheduled_time && (
            <p className={`text-xs mt-0.5 ${isPast && !done ? "text-red-400 font-medium" : "text-slate-400"}`}>
              {formatTime(task.scheduled_time)} {isPast && !done ? "· overdue" : ""}
            </p>
          )}
        </div>
        {(task.streak > 0) && (
          <span className="text-xs font-bold text-amber-500 flex-shrink-0">🔥{task.streak}</span>
        )}
      </motion.div>
    );
  };

  if (tasks.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800">Today's Schedule</h2>
      </div>

      <div className="space-y-2">
        {timedTasks.map((task, i) => renderTask(task, i))}
        {untimedTasks.length > 0 && timedTasks.length > 0 && (
          <p className="text-xs text-slate-400 font-medium pt-1 pb-0.5">No specific time</p>
        )}
        {untimedTasks.map((task, i) => renderTask(task, timedTasks.length + i))}
      </div>
    </div>
  );
}