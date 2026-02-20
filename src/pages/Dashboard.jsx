import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import GreetingHeader from "../components/dashboard/GreetingHeader";
import StatsRow from "../components/dashboard/StatsRow";
import TaskCard from "../components/dashboard/TaskCard";
import DailySchedule from "../components/dashboard/DailySchedule";
import TaskFormDialog from "../components/tasks/TaskFormDialog";
import WeeklyChart from "../components/progress/WeeklyChart";

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
    if (t.frequency === "daily") return true;
    if (t.frequency === "weekdays") return isWeekday;
    if (t.frequency === "weekends") return !isWeekday;
    if (t.frequency === dayOfWeek) return true;
    if (t.frequency === "once") return !completedTaskIds.has(t.id);
    return true;
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
        <h2 className="text-lg font-bold text-slate-800">Today's habits</h2>
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

      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createTaskMutation.mutate(data)}
      />
    </div>
  );
}