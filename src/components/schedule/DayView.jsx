import React, { useState, useRef, useCallback, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { CheckCircle2, Circle, X } from "lucide-react";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm
const SLOT_HEIGHT = 64; // px per hour

const CATEGORY_COLORS = {
  health: "bg-emerald-100 border-emerald-400 text-emerald-800",
  work: "bg-blue-100 border-blue-400 text-blue-800",
  learning: "bg-violet-100 border-violet-400 text-violet-800",
  personal: "bg-slate-100 border-slate-400 text-slate-800",
  social: "bg-pink-100 border-pink-400 text-pink-800",
  mindfulness: "bg-amber-100 border-amber-400 text-amber-800",
  other: "bg-gray-100 border-gray-400 text-gray-800",
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

function formatHour(hour) {
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// Convert pixel top (relative to grid) to HH:MM time string
function topToTime(top) {
  const totalMinutes = Math.round((top / SLOT_HEIGHT) * 60);
  const hour = Math.floor(totalMinutes / 60) + 6;
  const min = totalMinutes % 60;
  return `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Convert HH:MM to pixel top
function timeToTop(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return ((h - 6) + m / 60) * SLOT_HEIGHT;
}

function EventCard({ task, top, done, onToggle, onRemove, onDragEnd, color }) {
  const cardColor = color || CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
  const dragStartY = useRef(null);
  const dragStartTop = useRef(null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        dragStartY.current = e.clientY;
        dragStartTop.current = top;
        e.dataTransfer.setData("timedTaskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={(e) => {
        // Fallback handled by grid drop
      }}
      className={`absolute left-1 right-1 rounded-xl border-l-4 shadow-sm select-none overflow-hidden cursor-grab active:cursor-grabbing ${cardColor} ${done ? "opacity-50" : ""}`}
      style={{ top, height: SLOT_HEIGHT - 4, zIndex: 5 }}
    >
      <div className="flex items-start gap-1.5 px-2 py-1.5 h-full group">
        <button onClick={() => onToggle(task)} className="mt-0.5 flex-shrink-0">
          {done
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            : <Circle className="w-3.5 h-3.5 opacity-60" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold leading-tight ${done ? "line-through" : ""}`}>
            {task.name}
          </span>
          <p className="text-xs opacity-60 mt-0.5">{task.scheduled_time}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(task); }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function DayView({ date, tasks, completions, onToggle, onDropTask, onRemoveTask }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const isToday = isSameDay(date, new Date());
  const nowHour = new Date().getHours();
  const nowMin = new Date().getMinutes();
  const gridRef = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  // localTimes: overrides for scheduled_time while dragging (taskId -> "HH:MM")
  const [localTimes, setLocalTimes] = useState({});
  const pendingSave = useRef({});

  // When tasks update from DB, merge in any pending local overrides so card doesn't snap back
  useEffect(() => {
    if (Object.keys(pendingSave.current).length > 0) {
      setLocalTimes(prev => ({ ...prev, ...pendingSave.current }));
    }
  }, [tasks]);

  const dayTasks = tasks.filter((t) => taskAppliesOnDate(t, date));
  const completedIds = new Set(
    completions.filter((c) => c.completed_date === dateStr).map((c) => c.task_id)
  );

  // Only tasks with an actual time value go on the grid
  const timedTasks = dayTasks.filter((t) => {
    const time = localTimes[t.id] || t.scheduled_time;
    return time && time.trim() !== "";
  });
  const untimedTasks = dayTasks.filter((t) => {
    const time = localTimes[t.id] || t.scheduled_time;
    return !time || time.trim() === "";
  });

  const getGridTop = useCallback((clientY) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, clientY - rect.top);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const timedTaskId = e.dataTransfer.getData("timedTaskId");
    const sidebarTaskId = e.dataTransfer.getData("taskId");
    const yPx = getGridTop(e.clientY);

    if (timedTaskId) {
      const snappedTop = Math.round(yPx / (SLOT_HEIGHT / 4)) * (SLOT_HEIGHT / 4);
      const newTime = topToTime(Math.max(0, snappedTop));
      // Update local state immediately so card stays in new position
      setLocalTimes(prev => ({ ...prev, [timedTaskId]: newTime }));
      pendingSave.current[timedTaskId] = newTime;
      onDropTask?.(timedTaskId, newTime);
    } else if (sidebarTaskId) {
      const snappedTop = Math.round(yPx / (SLOT_HEIGHT / 2)) * (SLOT_HEIGHT / 2);
      const newTime = topToTime(Math.max(0, snappedTop));
      setLocalTimes(prev => ({ ...prev, [sidebarTaskId]: newTime }));
      pendingSave.current[sidebarTaskId] = newTime;
      onDropTask?.(sidebarTaskId, newTime);
    }
    setDragOver(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const yPx = getGridTop(e.clientY);
    const hourIdx = Math.min(Math.floor(yPx / SLOT_HEIGHT), HOURS.length - 1);
    setDragOver(HOURS[hourIdx]);
  };

  const totalGridHeight = HOURS.length * SLOT_HEIGHT;
  const nowTop = (() => {
    const hourIdx = nowHour - 6;
    if (hourIdx < 0 || hourIdx >= HOURS.length) return -1;
    return hourIdx * SLOT_HEIGHT + (nowMin / 60) * SLOT_HEIGHT;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1">
      {/* Hourly timeline */}
      <div
        ref={gridRef}
        className="relative"
        style={{ height: totalGridHeight }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(null)}
      >
        {/* Hour rows (grid lines + labels) */}
        {HOURS.map((hour, idx) => {
          const isCurrentHour = isToday && hour === nowHour;
          return (
            <div
              key={hour}
              className={`absolute left-0 right-0 border-b border-slate-50 ${dragOver === hour ? "bg-indigo-50/50" : ""}`}
              style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            >
              <div className="absolute left-0 w-16 pt-2 pr-3 text-right">
                <span className={`text-xs font-medium ${isCurrentHour ? "text-indigo-600" : "text-slate-400"}`}>
                  {formatHour(hour)}
                </span>
              </div>
              <div className="absolute left-16 right-0 border-b border-dashed border-slate-100" style={{ top: SLOT_HEIGHT / 2 }} />
            </div>
          );
        })}

        {/* Timed task EventCards */}
        {timedTasks.map((task) => {
          const timeStr = localTimes[task.id] || task.scheduled_time;
          const top = timeToTop(timeStr);
          const done = completedIds.has(task.id);
          const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
          return (
            <EventCard
              key={task.id}
              task={{ ...task, scheduled_time: timeStr }}
              top={top}
              done={done}
              color={color}
              onToggle={(t) => onToggle(t, date)}
              onRemove={(t) => onRemoveTask?.(t)}
            />
          );
        })}

        {/* Untimed tasks — shown as a list at the top */}
        {untimedTasks.length > 0 && (
          <div className="absolute left-16 right-2 top-2 z-10 space-y-1">
            {untimedTasks.map((task) => {
              const done = completedIds.has(task.id);
              const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
              return (
                <div
                  key={task.id}
                  className={`group w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left text-xs font-medium transition-all hover:shadow-sm ${
                    done ? "opacity-50 bg-slate-50 border-slate-100 text-slate-400" : color
                  }`}
                >
                  <button onClick={() => onToggle(task, date)} className="flex items-center gap-2 flex-1 min-w-0">
                    {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className={done ? "line-through" : ""}>{task.name}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveTask?.(task); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-black/10 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Current time indicator */}
        {isToday && nowTop >= 0 && (
          <div
            className="absolute left-16 right-0 flex items-center z-20 pointer-events-none"
            style={{ top: nowTop }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 -ml-1.5 flex-shrink-0" />
            <div className="flex-1 h-px bg-indigo-500" />
          </div>
        )}

        {/* Drop hint */}
        {dragOver !== null && (
          <div
            className="absolute left-16 right-2 h-14 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/70 flex items-center justify-center pointer-events-none z-20"
            style={{ top: (HOURS.indexOf(dragOver)) * SLOT_HEIGHT + 4 }}
          >
            <span className="text-xs text-indigo-500 font-medium">Drop here — {formatHour(dragOver)}</span>
          </div>
        )}
      </div>
    </div>
  );
}