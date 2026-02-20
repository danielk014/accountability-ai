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
  if (task.frequency === "daily") return true;
  if (task.frequency === "weekdays") return isWeekday;
  if (task.frequency === "weekends") return !isWeekday;
  if (task.frequency === dow) return true;
  if (task.frequency === "once") return true;
  return false;
}

function formatHour(hour) {
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// Placed event card with resize handles
function EventCard({ task, top, height, done, onToggle, onResize, onRemove, color }) {
  const resizingRef = useRef(null);

  const handleResizeStart = (e, edge) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const startT = top;

    const onMove = (me) => {
      const dy = me.clientY - startY;
      if (edge === "bottom") {
        const newH = Math.max(SLOT_HEIGHT / 2, startH + dy);
        onResize(task.id, startT, newH);
      } else {
        const newT = startT + dy;
        const newH = Math.max(SLOT_HEIGHT / 2, startH - dy);
        onResize(task.id, newT, newH);
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const color2 = color || CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;

  return (
    <div
      className={`absolute left-1 right-1 rounded-xl border-l-4 shadow-sm select-none overflow-hidden ${color2} ${done ? "opacity-50" : ""}`}
      style={{ top, height: Math.max(height, 28), zIndex: 5 }}
    >
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 rounded-t-xl"
        onMouseDown={(e) => handleResizeStart(e, "top")}
      />

      {/* Content */}
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

      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 rounded-b-xl"
        onMouseDown={(e) => handleResizeStart(e, "bottom")}
      />
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

  const timedTasks = dayTasks.filter((t) => t.scheduled_time && !placedEvents[t.id]);
  const untimedTasks = dayTasks.filter((t) => !t.scheduled_time && !placedEvents[t.id]);

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

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    const yPx = getGridTop(e.clientY);
    // snap to half-hour
    const snapped = Math.round(yPx / (SLOT_HEIGHT / 2)) * (SLOT_HEIGHT / 2);
    setPlacedEvents(prev => ({
      ...prev,
      [taskId]: { top: snapped, height: SLOT_HEIGHT },
    }));
    onDropTask?.(taskId, snapped, SLOT_HEIGHT);
    setDragOver(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const yPx = getGridTop(e.clientY);
    const hour = Math.floor(yPx / SLOT_HEIGHT);
    setDragOver(HOURS[Math.min(hour, HOURS.length - 1)]);
  };

  const handleResize = (taskId, newTop, newHeight) => {
    setPlacedEvents(prev => ({
      ...prev,
      [taskId]: { top: Math.max(0, newTop), height: Math.max(SLOT_HEIGHT / 2, newHeight) },
    }));
  };

  const handleRemovePlaced = (taskId) => {
    setPlacedEvents(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const totalGridHeight = HOURS.length * SLOT_HEIGHT;
  const nowTop = ((nowHour - 6) + nowMin / 60) * SLOT_HEIGHT;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1">
      {/* Anytime tasks */}
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
              style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            >
              {/* Time label */}
              <div className="absolute left-0 w-16 pt-2 pr-3 text-right">
                <span className={`text-xs font-medium ${isCurrentHour ? "text-indigo-600" : "text-slate-400"}`}>
                  {formatHour(hour)}
                </span>
              </div>
              {/* Half-hour line */}
              <div className="absolute left-16 right-0 border-b border-dashed border-slate-100" style={{ top: SLOT_HEIGHT / 2 }} />
              {/* Regular tasks in this slot */}
              <div className="ml-16 pr-2 pt-1.5 space-y-1">
                {tasks.map((task) => {
                  const done = completedIds.has(task.id);
                  const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
                  return (
                    <button
                      key={task.id}
                      onClick={() => onToggle(task, date)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left text-xs font-medium transition-all hover:shadow-sm ${
                        done ? "opacity-50 bg-slate-50 border-slate-100 text-slate-400" : color
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className={done ? "line-through" : ""}>{task.name}</span>
                    </button>
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
                onResize={(id, newTop, newH) => handleResize(id, ev.top + newTop, newH)}
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