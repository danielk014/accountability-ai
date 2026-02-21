import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Flag, Trash2, Pencil, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import GreetingHeader from "../components/dashboard/GreetingHeader";
import TaskCard from "../components/dashboard/TaskCard";
import TaskFormDialog from "../components/tasks/TaskFormDialog";
import RemindersPanel from "../components/chat/RemindersPanel";

// ── To-Do mini form ─────────────────────────────────────────────────────────
const PRIORITIES = ["urgent", "high", "medium", "low"];
const CATEGORIES = ["health", "work", "learning", "personal", "social", "mindfulness", "other"];

const priorityConfig = {
  urgent: { label: "Urgent", bg: "bg-red-50 border-red-200 text-red-600" },
  high:   { label: "High",   bg: "bg-orange-50 border-orange-200 text-orange-600" },
  medium: { label: "Medium", bg: "bg-yellow-50 border-yellow-200 text-yellow-600" },
  low:    { label: "Low",    bg: "bg-slate-50 border-slate-200 text-slate-500" },
};

function TodoFormDialog({ open, onOpenChange, onSubmit, item }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    priority: item?.priority || "medium",
    category: item?.category || "personal",
    due_date: item?.due_date || "",
  });

  React.useEffect(() => {
    setForm({
      name: item?.name || "",
      priority: item?.priority || "medium",
      category: item?.category || "personal",
      due_date: item?.due_date || "",
    });
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit To-Do" : "New To-Do"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Task name</label>
            <Input
              autoFocus
              placeholder="What do you need to do?"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Priority</label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{priorityConfig[p].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Due date (optional)</label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
              {item ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function isUpcomingInFiveMinutes(scheduledTime) {
  if (!scheduledTime) return false;
  const now = new Date();
  const [h, m] = scheduledTime.split(':').map(Number);
  const taskTime = new Date();
  taskTime.setHours(h, m, 0, 0);
  const diff = taskTime.getTime() - now.getTime();
  return diff >= 0 && diff <= 5 * 60 * 1000;
}

export default function Dashboard() {
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [, setTick] = useState(0);
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // Re-render every minute so the "upcoming in 5 min" highlight stays current
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // ── Habits / Tasks ──────────────────────────────────────────────────────
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => user?.email ? base44.entities.Task.filter({ created_by: user.email }) : [],
  });

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

  const { data: profiles = [] } = useQuery({
    queryKey: ["profile", user?.email],
    queryFn: () => user?.email ? base44.entities.UserProfile.filter({ created_by: user.email }) : [],
  });

  const profile = profiles[0];
  const activeTasks = tasks.filter(t => t.is_active !== false);
  const todayCompletions = completions.filter(c => c.completed_date === today);
  const completedTaskIds = new Set(todayCompletions.map(c => c.task_id));

  const dayOfWeek = format(new Date(), "EEEE").toLowerCase();
  const isWeekday = !["saturday", "sunday"].includes(dayOfWeek);
  const todaysTasks = activeTasks.filter(t => {
    // Don't show recurring tasks that haven't started yet (future scheduled_date)
    if (t.scheduled_date && t.scheduled_date > today && t.frequency !== "once") return false;
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
      setShowHabitForm(false);
      toast.success("Habit added!");
    },
  });

  const toggleCompletionMutation = useMutation({
    mutationFn: async (task) => {
      if (completedTaskIds.has(task.id)) {
        const completion = todayCompletions.find(c => c.task_id === task.id);
        if (completion) {
          await base44.entities.TaskCompletion.delete(completion.id);
          await base44.entities.Task.update(task.id, {
            streak: Math.max(0, (task.streak || 0) - 1),
            total_completions: Math.max(0, (task.total_completions || 0) - 1),
          });
        }
      } else {
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

  const sortedTasks = [...todaysTasks]
    .filter(t => !completedTaskIds.has(t.id))
    .sort((a, b) => (a.scheduled_time || "99:99").localeCompare(b.scheduled_time || "99:99"));

  // ── To-Do List ───────────────────────────────────────────────────────────
  const { data: todos = [] } = useQuery({
    queryKey: ["todos", user?.email],
    queryFn: () => user?.email ? base44.entities.TodoItem.filter({ created_by: user.email }) : [],
  });

  const pendingTodos = todos
    .filter(t => !t.is_done)
    .sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

  const createTodoMutation = useMutation({
    mutationFn: (data) => base44.entities.TodoItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["todos"] }); toast.success("To-do added!"); },
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["todos"] }); setEditingTodo(null); },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const handleTodoSubmit = (data) => {
    if (editingTodo) {
      updateTodoMutation.mutate({ id: editingTodo.id, data });
    } else {
      createTodoMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <GreetingHeader
        userName={user?.full_name}
        overallStreak={profile?.overall_streak || 0}
        tasksToday={todaysTasks.length}
        completedToday={completedToday}
      />

      {/* ── Today's Tasks ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Today's tasks</h2>
        <Button
          onClick={() => setShowHabitForm(true)}
          variant="outline"
          size="sm"
          className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2 mb-10">
        <AnimatePresence>
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isCompleted={completedTaskIds.has(task.id)}
              onToggle={(t) => toggleCompletionMutation.mutate(t)}
              isUpcoming={isUpcomingInFiveMinutes(task.scheduled_time)}
            />
          ))}
        </AnimatePresence>
        {sortedTasks.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-base font-medium">No habits yet</p>
            <p className="text-sm mt-1">Add your first habit to get started!</p>
          </div>
        )}
      </div>

      {/* ── To-Do List ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">To-Do List</h2>
        <Button
          onClick={() => { setEditingTodo(null); setShowTodoForm(true); }}
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
          {pendingTodos.map(item => {
            const pc = priorityConfig[item.priority] || priorityConfig.medium;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group"
              >
                <button
                  onClick={() => updateTodoMutation.mutate({ id: item.id, data: { is_done: true, completed_at: new Date().toISOString() } })}
                  className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-indigo-500 flex items-center justify-center transition-colors flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", pc.bg)}>
                      <Flag className="w-2.5 h-2.5 inline mr-1" />{pc.label}
                    </span>
                    {item.category && (
                      <span className="text-xs text-slate-400 capitalize">{item.category}</span>
                    )}
                    {item.due_date && (
                      <span className="text-xs text-slate-400">Due {item.due_date}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTodo(item); setShowTodoForm(true); }}>
                    <Pencil className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteTodoMutation.mutate(item.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {pendingTodos.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-base font-medium">All clear!</p>
            <p className="text-sm mt-1">Add a to-do item to get started.</p>
          </div>
        )}
      </div>

      {/* ── Reminders ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" />
          Reminders
        </h2>
      </div>
      <div className="mb-8 bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ minHeight: 180 }}>
        <RemindersPanel />
      </div>

      <TaskFormDialog
        open={showHabitForm}
        onOpenChange={setShowHabitForm}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        defaultDate={today}
      />

      <TodoFormDialog
        open={showTodoForm}
        onOpenChange={setShowTodoForm}
        onSubmit={handleTodoSubmit}
        item={editingTodo}
      />
    </div>
  );
}
