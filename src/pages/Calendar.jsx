import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState as useStateLocal } from "react";
import DayView from "../components/schedule/DayView.jsx";
import WeekView from "../components/schedule/WeekView.jsx";
import TaskSidebar from "../components/schedule/TaskSidebar.jsx";
import TaskFormDialog from "../components/tasks/TaskFormDialog.jsx";
import CalendarPicker from "../components/schedule/CalendarPicker.jsx";

export default function Calendar() {
  const [view, setView] = useState("day");
  const [currentDate, setCurrentDate] = useState(new Date());

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => user?.email ? base44.entities.Task.filter({ created_by: user.email }) : [],
  });

  // Real-time: refresh tasks when AI or other views create/update/delete them
  React.useEffect(() => {
    const unsub = base44.entities.Task.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    });
    return unsub;
  }, []);

  const { data: completions = [] } = useQuery({
    queryKey: ["completions", user?.email],
    queryFn: () => user?.email ? base44.entities.TaskCompletion.filter({ created_by: user.email }, "-completed_date", 500) : [],
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const [showForm, setShowForm] = useState(false);

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

  // X button: just unschedule (clear time) so it goes back to the sidebar
  const unscheduleTaskMutation = useMutation({
    mutationFn: async (task) => {
      await base44.entities.Task.update(task.id, { scheduled_time: null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      toast.success("Task added!");
    },
  });

  const activeTasks = tasks.filter((t) => t.is_active !== false);

  // Tasks applicable to the current day view (for sidebar: untimed only)
  const taskAppliesOnDate = (t, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dow = format(date, "EEEE").toLowerCase();
    const isWeekday = !["saturday", "sunday"].includes(dow);
    if (t.frequency === "once") return t.scheduled_date === dateStr;
    if (t.frequency === "daily") return true;
    if (t.frequency === "weekdays") return isWeekday;
    if (t.frequency === "weekends") return !isWeekday;
    if (t.frequency === dow) return true;
    return false;
  };

  // Sidebar shows only untimed tasks that apply today (so they can be dragged to a time slot)
  const sidebarTasks = activeTasks.filter(
    (t) => !t.scheduled_time?.trim() && taskAppliesOnDate(t, currentDate)
  );

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const onDropTask = async (taskId, time, height) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await base44.entities.Task.update(taskId, { scheduled_time: time });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
          {!isToday && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 transition"
            >
              Today
            </button>
          )}
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add task
          </Button>
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl h-9 w-9">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CalendarPicker selectedDate={currentDate} onSelectDate={setCurrentDate} />
            <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="rounded-xl h-9 w-9">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar + sidebar */}
      <div className="flex gap-4 items-start">
        {/* Calendar view */}
        <div className="flex-1 min-w-0">
          {view === "day" ? (
            <DayView
              date={currentDate}
              tasks={activeTasks.filter(t => taskAppliesOnDate(t, currentDate))}
              completions={completions}
              onToggle={(task, date) => toggleCompletionMutation.mutate({ task, date })}
              onRemoveTask={(task) => removeTaskMutation.mutate(task)}
              onDropTask={onDropTask}
            />
          ) : (
            <WeekView
              date={currentDate}
              tasks={activeTasks}
              completions={completions}
              onToggle={(task, date) => toggleCompletionMutation.mutate({ task, date })}
              onDropTask={(taskId, time, dayStr) => {
                base44.entities.Task.update(taskId, { scheduled_time: time, scheduled_date: dayStr });
                queryClient.invalidateQueries({ queryKey: ["tasks"] });
              }}
              onAddTask={(dateStr) => {
                setCurrentDate(new Date(dateStr + "T12:00:00"));
                setShowForm(true);
              }}
            />
          )}
        </div>

        {/* Task sidebar */}
        <TaskSidebar tasks={sidebarTasks} />
      </div>

      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        defaultDate={format(currentDate, "yyyy-MM-dd")}
      />
    </div>
  );
}