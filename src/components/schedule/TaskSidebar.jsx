import React from "react";
import { GripVertical, Clock, Zap } from "lucide-react";

const CATEGORY_COLORS = {
  health: "bg-emerald-100 border-emerald-300 text-emerald-800",
  work: "bg-blue-100 border-blue-300 text-blue-800",
  learning: "bg-violet-100 border-violet-300 text-violet-800",
  personal: "bg-slate-100 border-slate-300 text-slate-800",
  social: "bg-pink-100 border-pink-300 text-pink-800",
  mindfulness: "bg-amber-100 border-amber-300 text-amber-800",
  other: "bg-gray-100 border-gray-300 text-gray-800",
};

export default function TaskSidebar({ tasks, onDragStart }) {
  return (
    <div className="w-56 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-24">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700">Tasks</span>
          <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{tasks.length}</span>
        </div>
        <p className="text-xs text-slate-400 px-4 pt-3 pb-1">Drag onto the schedule</p>
        <div className="p-2 space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {tasks.length === 0 && (
            <div className="text-xs text-slate-400 text-center py-6">No tasks yet</div>
          )}
          {tasks.map(task => {
            const color = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other;
            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("taskId", task.id);
                  e.dataTransfer.effectAllowed = "move";
                  onDragStart?.(task);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-grab active:cursor-grabbing transition-all hover:shadow-sm select-none ${color}`}
              >
                <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
                <span className="flex-1 truncate">{task.name}</span>
                {task.scheduled_time && (
                  <span className="flex items-center gap-0.5 opacity-60 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {task.scheduled_time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}