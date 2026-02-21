import React, { useState, useRef, useCallback } from "react";

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

  if (task.frequency === "once") {
    return task.scheduled_date === dateStr;
  }
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

// Placed event card with drag-to-move
function EventCard({ task, top, height, done, onToggle, onMove, onRemove, color }) {
  const color2 = color || CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData("placedTaskId", task.id);
    e.dataTransfer.setData("dragOffsetY", String(e.nativeEvent.offsetY));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`absolute left-1 right-1 rounded-xl border-l-4 shadow-sm select-none overflow-hidden cursor-grab active:cursor-grabbing ${color2} ${done ? "opacity-50" : ""}`}
      style={{ top, height: Math.max(height, 28), zIndex: 5 }}
    >
      <div className="flex items-start gap-1.5 px-2 py-1.5 h-full">
        <button onClick={() => onToggle(task)} className="mt-0.5 flex-shrink-0">
          {done
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            : <Circle className="w-3.5 h-3.5 opacity-60" />}
        </button>
        <span className={`text-xs font-medium flex-1 leading-tight ${done ? "line-through" : ""}`}>
          {task.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(task.id); }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 opacity-50 hover:opacity-100 transition-opacity"
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

  const [dragOver, setDragOver] = useState(null); // hour being dragged over
  // placed events: { taskId, top (px), height (px) }
  const [placedEvents, setPlacedEvents] = useState({});

  const dayTasks = tasks.filter((t) => taskAppliesOnDate(t, date));
  const completedIds = new Set(
    completions.filter((c) => c.completed_date === dateStr).map((c) => c.task_id)
  );

  // Tasks with a scheduled_time always show in their time slot (never excluded by placedEvents)
  const timedTasks = dayTasks.filter((t) => t.scheduled_time);
  const untimedTasks = dayTasks.filter((t) => !t.scheduled_time && !placedEvents[t.id]);

  // Group timed tasks by hour for rendering inside hour rows
  const tasksByHour = {};
  timedTasks.forEach((t) => {
    const hour = parseInt(t.scheduled_time.split(":")[0]);
    if (!tasksByHour[hour]) tasksByHour[hour] = [];
    tasksByHour[hour].push(t);
  });

  const getGridTop = useCallback((clientY) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, clientY - rect.top);
  }, []);

  // Returns a non-overlapping top for a given taskId, desired top, and height
  const resolveNoOverlap = useCallback((currentEvents, taskId, desiredTop, height) => {
    const others = Object.entries(currentEvents)
      .filter(([id]) => id !== taskId)
      .map(([, ev]) => ev)
      .sort((a, b) => a.top - b.top);

    let top = Math.max(0, desiredTop);

    // Keep nudging down until no collision
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of others) {
        const overlapStart = Math.max(top, other.top);
        const overlapEnd = Math.min(top + height, other.top + other.height);
        if (overlapEnd > overlapStart) {
          // Push down below this event
          top = other.top + other.height;
          changed = true;
        }
      }
    }
    return top;
  }, []);

  const handleDrop = (e) => {
   e.preventDefault();
   const placedTaskId = e.dataTransfer.getData("placedTaskId");
   const taskId = e.dataTransfer.getData("taskId");
   const yPx = getGridTop(e.clientY);

   if (placedTaskId) {
     // Moving an already-placed event
     const offsetY = parseInt(e.dataTransfer.getData("dragOffsetY") || "0");
     const desiredTop = Math.max(0, yPx - offsetY);
     const height = SLOT_HEIGHT;
     const newTop = resolveNoOverlap({ ...placedEvents }, placedTaskId, desiredTop, height);

     // Calculate the hour from the new top position
     const newHour = Math.floor(newTop / SLOT_HEIGHT) + 6;
     const newTime = String(newHour).padStart(2, '0') + ":00";

     setPlacedEvents(prev => ({ ...prev, [placedTaskId]: { top: newTop, height } }));
     onDropTask?.(placedTaskId, newTime, height);
   } else if (taskId) {
     // Dropping a new task from sidebar
     const snapped = Math.round(yPx / (SLOT_HEIGHT / 2)) * (SLOT_HEIGHT / 2);
     const height = SLOT_HEIGHT;
     const top = resolveNoOverlap({ ...placedEvents }, taskId, snapped, height);
     setPlacedEvents(prev => ({ ...prev, [taskId]: { top, height } }));
     const hour = Math.floor(top / SLOT_HEIGHT) + 6;
     const time = String(hour).padStart(2, '0') + ":00";
     onDropTask?.(taskId, time, SLOT_HEIGHT);
   }
   setDragOver(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const yPx = getGridTop(e.clientY);
    const hour = Math.floor(yPx / SLOT_HEIGHT);
    setDragOver(HOURS[Math.min(hour, HOURS.length - 1)]);
  };

  const handleRemovePlaced = (taskId) => {
    setPlacedEvents(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  // Compute dynamic row heights so tasks don't overflow/overlap
  const rowHeights = HOURS.map((hour) => {
    const count = (tasksByHour[hour] || []).length;
    // Each task card is ~36px + 4px gap, minimum is SLOT_HEIGHT
    return Math.max(SLOT_HEIGHT, count * 40 + 12);
  });

  // Compute cumulative tops for each hour row
  const rowTops = rowHeights.reduce((acc, h, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + rowHeights[i - 1]);
    return acc;
  }, []);

  const totalGridHeight = rowTops[rowTops.length - 1] + rowHeights[rowHeights.length - 1];
  const nowTop = (() => {
    const hourIdx = nowHour - 6;
    if (hourIdx < 0 || hourIdx >= HOURS.length) return 0;
    const fraction = nowMin / 60;
    return rowTops[hourIdx] + fraction * rowHeights[hourIdx];
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
        {/* Hour rows */}
        {HOURS.map((hour, idx) => {
          const isCurrentHour = isToday && hour === nowHour;
          const tasks = tasksByHour[hour] || [];
          return (
            <div
              key={hour}
              className={`absolute left-0 right-0 border-b border-slate-50 ${dragOver === hour ? "bg-indigo-50" : ""}`}
              style={{ top: rowTops[idx], height: rowHeights[idx] }}
            >
              {/* Time label */}
              <div className="absolute left-0 w-16 pt-2 pr-3 text-right">
                <span className={`text-xs font-medium ${isCurrentHour ? "text-indigo-600" : "text-slate-400"}`}>
                  {formatHour(hour)}
                </span>
              </div>
              {/* Half-hour line */}
              <div className="absolute left-16 right-0 border-b border-dashed border-slate-100" style={{ top: rowHeights[idx] / 2 }} />
              {/* Regular tasks in this slot */}
              <div className="ml-16 pr-2 pt-1.5 space-y-1">
                {tasks.map((task) => {
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
            </div>
          );
        })}

        {/* Current time indicator */}
        {isToday && nowHour >= 6 && nowHour <= 23 && (
          <div
            className="absolute left-16 right-0 flex items-center z-20 pointer-events-none"
            style={{ top: nowTop }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 -ml-1.5 flex-shrink-0" />
            <div className="flex-1 h-px bg-indigo-500" />
          </div>
        )}

        {/* Dragged/placed events */}
        {Object.entries(placedEvents).map(([taskId, ev]) => {
          const task = tasks.find(t => t.id === taskId) || dayTasks.find(t => t.id === taskId);
          if (!task) return null;
          const done = completedIds.has(task.id);
          const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
          return (
            <div key={taskId} className="absolute" style={{ left: 64, right: 8, top: ev.top, height: ev.height, zIndex: 10 }}>
              <EventCard
                task={task}
                top={0}
                height={ev.height}
                done={done}
                onToggle={(t) => onToggle(t, date)}
                onRemove={handleRemovePlaced}
                color={color}
              />
            </div>
          );
        })}

        {/* Drop hint */}
        {dragOver !== null && (
          <div
            className="absolute left-16 right-2 h-12 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/70 flex items-center justify-center pointer-events-none z-20"
            style={{ top: (HOURS.indexOf(dragOver)) * SLOT_HEIGHT + 4 }}
          >
            <span className="text-xs text-indigo-500 font-medium">Drop here — {formatHour(dragOver)}</span>
          </div>
        )}
      </div>
    </div>
  );
}