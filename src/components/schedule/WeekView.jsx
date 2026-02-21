import React, { useRef, useState, useCallback } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { CheckCircle2, Circle, X } from "lucide-react";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm
const SLOT_HEIGHT = 44; // smaller than DayView's 64px
const MIN_HEIGHT = SLOT_HEIGHT / 2; // 22px minimum
const SNAP = SLOT_HEIGHT / 4; // snap to 15 min

const CATEGORY_BLOCK = {
  health: "bg-emerald-100 border-l-emerald-400 text-emerald-800",
  work: "bg-blue-100 border-l-blue-400 text-blue-800",
  learning: "bg-violet-100 border-l-violet-400 text-violet-800",
  personal: "bg-slate-100 border-l-slate-400 text-slate-700",
  social: "bg-pink-100 border-l-pink-400 text-pink-800",
  mindfulness: "bg-amber-100 border-l-amber-400 text-amber-800",
  other: "bg-gray-100 border-l-gray-400 text-gray-800",
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

function formatHour(h) {
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function topToTime(top) {
  const totalMinutes = Math.round((top / SLOT_HEIGHT) * 60 / 15) * 15;
  const hour = Math.floor(totalMinutes / 60) + 6;
  const min = totalMinutes % 60;
  return `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function timeToTop(timeStr) {
   const [h, m] = timeStr.split(":").map(Number);
   return ((h - 6) + m / 60) * SLOT_HEIGHT;
 }

function topToMinutes(top) {
   return Math.round((top / SLOT_HEIGHT) * 60);
 }

function minutesToTop(min) {
   return (min / 60) * SLOT_HEIGHT;
 }

function snap(val) {
   return Math.round(val / SNAP) * SNAP;
 }

function TimedTaskBlock({ task, dayStr, localData, completed, color, onToggle, onRemove, onMoveEnd, allTasks, days }) {
   const timeStr = localData?.time || task.scheduled_time;
   const displayTop = timeToTop(timeStr);
   const dragStateRef = useRef(null);
   const [liveTop, setLiveTop] = useState(null);
   const [liveDayIdx, setLiveDayIdx] = useState(null);
   const currentTop = liveTop !== null ? liveTop : displayTop;

   const onPointerDown = useCallback((e) => {
     if (e.button !== 0) return; // only left click
     e.preventDefault();
     e.stopPropagation();
     const dayIdx = days.findIndex(d => format(d, "yyyy-MM-dd") === dayStr);
     dragStateRef.current = { startY: e.clientY, startX: e.clientX, startTop: displayTop, dayIdx, startDayIdx: dayIdx };
     e.currentTarget.setPointerCapture(e.pointerId);
   }, [displayTop, dayStr, days]);

   const onPointerMove = useCallback((e) => {
     if (!dragStateRef.current) return;
     const { startY, startX, startTop, dayIdx } = dragStateRef.current;
     const dy = e.clientY - startY;
     const dx = e.clientX - startX;
     const newTop = Math.max(0, startTop + dy);
     // rough: if dragged >100px left/right, move to adjacent day
     let newDayIdx = dayIdx;
     if (dx < -100 && dayIdx > 0) newDayIdx--;
     if (dx > 100 && dayIdx < days.length - 1) newDayIdx++;
     setLiveTop(snap(newTop));
     setLiveDayIdx(newDayIdx);
   }, [days]);

   const onPointerUp = useCallback((e) => {
     if (!dragStateRef.current) return;
     const finalTop = liveTop !== null ? liveTop : displayTop;
     const finalDayIdx = liveDayIdx !== null ? liveDayIdx : dragStateRef.current.dayIdx;
     dragStateRef.current = null;
     setLiveTop(null);
     setLiveDayIdx(null);
     const finalDayStr = format(days[finalDayIdx], "yyyy-MM-dd");
     onMoveEnd(task.id, finalDayStr, Math.max(0, finalTop));
   }, [liveTop, liveDayIdx, displayTop, task.id, days, onMoveEnd]);

   return (
     <div
       style={{ top: currentTop + 1, height: SLOT_HEIGHT - 3, zIndex: 5, position: "absolute", left: 2, right: 2 }}
       className={`rounded border-l-2 shadow-sm select-none overflow-visible ${completed ? "opacity-40 bg-slate-50 border-l-slate-200" : color}`}
       onPointerMove={onPointerMove}
       onPointerUp={onPointerUp}
       onPointerCancel={onPointerUp}
     >
       <div
         className="flex items-center gap-1 px-1.5 py-0.5 h-full cursor-grab active:cursor-grabbing group"
         onPointerDown={onPointerDown}
       >
         <button type="button" className="flex-shrink-0 z-20 pointer-events-auto" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}>
           {completed
             ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
             : <Circle className="w-2.5 h-2.5 flex-shrink-0 opacity-50" />}
         </button>
         <span className={`text-xs font-semibold truncate flex-1 pointer-events-none ${completed ? "line-through" : ""}`}>{task.name}</span>
         <button
           type="button"
           className="flex-shrink-0 p-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity z-20 pointer-events-auto"
           onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
         >
           <X className="w-2.5 h-2.5" />
         </button>
       </div>
     </div>
   );
 }

export default function WeekView({ date, tasks, completions, onToggle, onDropTask, onRemoveTask }) {
   const weekStart = startOfWeek(date, { weekStartsOn: 1 });
   const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
   const gridRefs = useRef({});
   const [dragOver, setDragOver] = useState(null); // { dayStr, hour }
   const [localData, setLocalData] = useState({});
   const dragState = useRef(null);

  const nowHour = new Date().getHours();
  const nowMin = new Date().getMinutes();

  const getTop = (dayStr, clientY) => {
    const el = gridRefs.current[dayStr];
    if (!el) return 0;
    return Math.max(0, clientY - el.getBoundingClientRect().top);
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    dragState.current = null;
    const dayStr = format(day, "yyyy-MM-dd");
    const sidebarId = e.dataTransfer.getData("taskId");
    if (sidebarId) {
      const top = getTop(dayStr, e.clientY);
      const newTime = topToTime(Math.max(0, top));
      setLocalData(prev => ({ ...prev, [sidebarId]: { time: newTime } }));
      onDropTask?.(sidebarId, newTime, dayStr);
    }
    setDragOver(null);
  };

  const handleMoveEnd = useCallback((taskId, dayStr, finalTop) => {
    const newTime = topToTime(finalTop);
    setLocalData(prev => ({ ...prev, [taskId]: { ...prev[taskId], time: newTime } }));
    onDropTask?.(taskId, newTime, dayStr);
  }, [onDropTask]);

  const handleRemoveTask = useCallback((task) => {
    setLocalData(prev => {
      const updated = { ...prev };
      delete updated[task.id];
      return updated;
    });
    onRemoveTask?.(task);
  }, [onRemoveTask]);

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const dayStr = format(day, "yyyy-MM-dd");
    const top = getTop(dayStr, e.clientY);
    const hourIdx = Math.min(Math.floor(top / SLOT_HEIGHT), HOURS.length - 1);
    setDragOver({ dayStr, hour: HOURS[hourIdx] });
  };

  const totalGridHeight = HOURS.length * SLOT_HEIGHT;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1">
      {/* Day headers */}
      <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10">
        {/* Time gutter header */}
        <div className="w-12 flex-shrink-0 border-r border-slate-100" />
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <div
              key={dateStr}
              className={`flex-1 p-2 text-center border-r border-slate-100 last:border-0 ${isToday ? "bg-indigo-50" : ""}`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-indigo-500" : "text-slate-400"}`}>
                {format(day, "EEE")}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <p className={`text-base font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-indigo-600 text-white" : "text-slate-800"
                  }`}>
                    {format(day, "d")}
                  </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timetable grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {/* Time gutter */}
        <div className="w-12 flex-shrink-0 border-r border-slate-100 relative" style={{ height: totalGridHeight }}>
          {HOURS.map((hour, idx) => (
            <div key={hour} className="absolute left-0 right-0 flex items-start justify-end pr-1.5 pt-1" style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}>
              <span className="text-xs text-slate-400 font-medium leading-none">{formatHour(hour)}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isToday = isSameDay(day, new Date());
          const dayTasks = tasks.filter((t) => taskAppliesOnDate(t, day));
          const completedIds = new Set(
            completions.filter((c) => c.completed_date === dateStr).map((c) => c.task_id)
          );
          const isValidTime = (t) => t && typeof t === "string" && t.trim().length >= 4 && t.includes(":");
          const timedTasks = dayTasks.filter((t) => {
            const time = localData[t.id]?.time !== undefined ? localData[t.id].time : t.scheduled_time;
            return isValidTime(time);
          });
          const untimedTasks = dayTasks.filter((t) => {
            const time = localData[t.id]?.time !== undefined ? localData[t.id].time : t.scheduled_time;
            return !isValidTime(time);
          });

          const isDragTarget = dragOver?.dayStr === dateStr;
          const nowTop = isToday && nowHour >= 6 && nowHour < 24
            ? ((nowHour - 6) + nowMin / 60) * SLOT_HEIGHT
            : -1;

          return (
            <div
              key={dateStr}
              ref={(el) => { gridRefs.current[dateStr] = el; }}
              className={`flex-1 border-r border-slate-100 last:border-0 relative ${isToday ? "bg-indigo-50/20" : ""}`}
              style={{ height: totalGridHeight }}
              onDrop={(e) => handleDrop(e, day)}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Hour lines */}
              {HOURS.map((hour, idx) => (
                <div
                  key={hour}
                  className={`absolute left-0 right-0 border-b border-slate-50 ${isDragTarget && dragOver?.hour === hour ? "bg-indigo-50/60" : ""}`}
                  style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                >
                  <div className="absolute left-0 right-0 border-b border-dashed border-slate-50" style={{ top: SLOT_HEIGHT / 2 }} />
                </div>
              ))}

              {/* Untimed tasks — small chips at very top */}
              {untimedTasks.length > 0 && (
                <div className="absolute left-0.5 right-0.5 top-0.5 z-10 space-y-0.5">
                  {untimedTasks.map((task) => {
                    const done = completedIds.has(task.id);
                    const color = CATEGORY_BLOCK[task.category] || CATEGORY_BLOCK.other;
                    return (
                      <button
                        key={task.id}
                        onClick={() => onToggle(task, day)}
                        className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded border-l-2 text-left text-xs font-medium transition-all ${
                          done ? "opacity-40 bg-slate-50 border-l-slate-200 text-slate-400" : color
                        }`}
                      >
                        {done
                          ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                          : <Circle className="w-2.5 h-2.5 flex-shrink-0 opacity-50" />}
                        <span className={`truncate ${done ? "line-through" : ""}`}>{task.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Timed tasks — draggable & resizable */}
              {timedTasks.map((task) => (
                <TimedTaskBlock
                  key={task.id}
                  task={task}
                  dayStr={dateStr}
                  localData={localData[task.id]}
                  completed={completedIds.has(task.id)}
                  color={CATEGORY_BLOCK[task.category] || CATEGORY_BLOCK.other}
                  onToggle={() => onToggle(task, day)}
                  onRemove={() => handleRemoveTask(task)}
                  onMoveEnd={handleMoveEnd}
                  allTasks={timedTasks}
                />
              ))}

              {/* Current time line */}
              {nowTop >= 0 && (
                <div className="absolute left-0 right-0 flex items-center z-20 pointer-events-none" style={{ top: nowTop }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="flex-1 h-px bg-indigo-500" />
                </div>
              )}

              {/* Drop hint */}
              {isDragTarget && dragOver?.hour != null && (
                <div
                  className="absolute left-0.5 right-0.5 rounded border border-dashed border-indigo-400 bg-indigo-50/70 pointer-events-none z-20"
                  style={{ top: (HOURS.indexOf(dragOver.hour)) * SLOT_HEIGHT + 1, height: SLOT_HEIGHT - 2 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}