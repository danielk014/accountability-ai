import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DayView from "../components/schedule/DayView";
import WeekView from "../components/schedule/WeekView";

export default function Schedule() {
  const [view, setView] = useState("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["completions"],
    queryFn: () => base44.entities.TaskCompletion.list("-completed_date", 500),
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ task, date }) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const existing = completions.find(
        (c) => c.task_id === task.id && c.completed_date === dateStr
      );
      if (existing) {
        await base44.entities.TaskCompletion.delete(existing.id);
        await base44.entities.Task.update(task.id, {
          streak: Math.max(0, (task.streak || 0) - 1),
          total_completions: Math.max(0, (task.total_completions || 0) - 1),
        });
      } else {
        await base44.entities.TaskCompletion.create({
          task_id: task.id,
          task_name: task.name,
          completed_date: dateStr,
          completed_at: format(new Date(), "HH:mm"),
        });
        const newStreak = (task.streak || 0) + 1;
        await base44.entities.Task.update(task.id, {
          streak: newStreak,
          best_streak: Math.max(newStreak, task.best_streak || 0),
          total_completions: (task.total_completions || 0) + 1,
        });
        toast.success(`✓ ${task.name}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["completions"] });
    },
  });

  const activeTasks = tasks.filter((t) => t.is_active !== false);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const headerLabel =
    view === "day"
      ? format(currentDate, "EEEE, MMMM d")
      : (() => {
          const start = startOfWeek(currentDate, { weekStartsOn: 1 });
          const end = addDays(start, 6);
          return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
        })();

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
          {!isToday && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 transition"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            {["day", "week"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  view === v
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl h-9 w-9">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">{headerLabel}</span>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="rounded-xl h-9 w-9">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar view */}
      {view === "day" ? (
        <DayView
          date={currentDate}
          tasks={activeTasks}
          completions={completions}
          onToggle={(task, date) => toggleCompletionMutation.mutate({ task, date })}
        />
      ) : (
        <WeekView
          date={currentDate}
          tasks={activeTasks}
          completions={completions}
          onToggle={(task, date) => toggleCompletionMutation.mutate({ task, date })}
        />
      )}
    </div>
  );
}