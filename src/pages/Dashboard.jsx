import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import GreetingHeader from "../components/dashboard/GreetingHeader";
import TaskCard from "../components/dashboard/TaskCard";
import TaskFormDialog from "../components/tasks/TaskFormDialog";

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["completions"],
    queryFn: () => base44.entities.TaskCompletion.list("-completed_date", 500),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const profile = profiles[0];
  const activeTasks = tasks.filter(t => t.is_active !== false);

  // Check which tasks are completed today
  const todayCompletions = completions.filter(c => c.completed_date === today);
  const completedTaskIds = new Set(todayCompletions.map(c => c.task_id));

  // Filter tasks relevant for today based on frequency
  const dayOfWeek = format(new Date(), "EEEE").toLowerCase();
  const isWeekday = !["saturday", "sunday"].includes(dayOfWeek);
  const todaysTasks = activeTasks.filter(t => {
    if (t.frequency === "once") return t.scheduled_date === today;
    if (t.frequency === "daily") return true;
    if (t.frequency === "weekdays") return isWeekday;
    if (t.frequency === "weekends") return !isWeekday;
    if (t.frequency === dayOfWeek) return true;
    return false;
  });

  const completedToday = todaysTasks.filter(t => completedTaskIds.has(t.id)).length;

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      toast.success("Habit added!");
    },
  });

  const toggleCompletionMutation = useMutation({
    mutationFn: async (task) => {
      if (completedTaskIds.has(task.id)) {
        // Un-complete: find today's completion and delete it
        const completion = todayCompletions.find(c => c.task_id === task.id);
        if (completion) {
          await base44.entities.TaskCompletion.delete(completion.id);
          const newStreak = Math.max(0, (task.streak || 0) - 1);
          await base44.entities.Task.update(task.id, {
            streak: newStreak,
            total_completions: Math.max(0, (task.total_completions || 0) - 1),
          });
        }
      } else {
        // Complete
        await base44.entities.TaskCompletion.create({
          task_id: task.id,
          task_name: task.name,
          completed_date: today,
          completed_at: format(new Date(), "HH:mm"),
        });
        const newStreak = (task.streak || 0) + 1;
        await base44.entities.Task.update(task.id, {
          streak: newStreak,
          best_streak: Math.max(newStreak, task.best_streak || 0),
          total_completions: (task.total_completions || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["completions"] });
    },
  });

  // Sort: incomplete first, then by time
  const sortedTasks = [...todaysTasks].sort((a, b) => {
    const aComplete = completedTaskIds.has(a.id);
    const bComplete = completedTaskIds.has(b.id);
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    return (a.scheduled_time || "99:99").localeCompare(b.scheduled_time || "99:99");
  });

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = [];
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    const futureDateStr = format(futureDate, "yyyy-MM-dd");
    const futureDay = format(futureDate, "EEEE").toLowerCase();
    const isFutureWeekday = !["saturday", "sunday"].includes(futureDay);

    activeTasks.forEach(t => {
      if (t.is_active === false) return;
      let applies = false;
      if (t.frequency === "once") applies = t.scheduled_date === futureDateStr;
      else if (t.frequency === "daily") applies = true;
      else if (t.frequency === "weekdays") applies = isFutureWeekday;
      else if (t.frequency === "weekends") applies = !isFutureWeekday;
      else if (t.frequency === futureDay) applies = true;

      if (applies && !upcomingTasks.find(ut => ut.task.id === t.id && ut.date === futureDateStr)) {
        upcomingTasks.push({ task: t, date: futureDateStr, dateObj: futureDate });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <GreetingHeader
        userName={user?.full_name}
        overallStreak={profile?.overall_streak || 0}
        tasksToday={todaysTasks.length}
        completedToday={completedToday}
      />

      <StatsRow tasks={tasks} completions={completions} />

      {/* Today's tasks */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Today's tasks</h2>
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          size="sm"
          className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2 mb-8">
        <AnimatePresence>
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isCompleted={completedTaskIds.has(task.id)}
              onToggle={(t) => toggleCompletionMutation.mutate(t)}
            />
          ))}
        </AnimatePresence>
        {sortedTasks.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No habits yet</p>
            <p className="text-sm mt-1">Add your first habit to get started!</p>
          </div>
        )}
      </div>

      <WeeklyChart completions={completions} tasks={tasks} />

      {/* Upcoming tasks (next 7 days) */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Upcoming (Next 7 Days)</h2>
        {upcomingTasks.length > 0 ? (
          <div className="space-y-2 mb-8">
            {upcomingTasks.map((item, idx) => (
              <div
                key={`${item.task.id}-${item.date}-${idx}`}
                className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.task.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{format(item.dateObj, "EEEE, MMMM d")}</p>
                </div>
                {item.task.scheduled_time && (
                  <span className="text-xs font-medium text-slate-400 flex-shrink-0">{item.task.scheduled_time}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No upcoming tasks in the next 7 days</p>
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
        title="Add new habit"
      >
        <Plus className="w-6 h-6" />
      </button>

      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        defaultDate={today}
      />
    </div>
  );
}