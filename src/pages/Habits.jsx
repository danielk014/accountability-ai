import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Flame, Loader2, Check } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import TaskFormDialog from "../components/tasks/TaskFormDialog";

const categoryColors = {
  health: "bg-rose-50 text-rose-600 border-rose-200",
  work: "bg-blue-50 text-blue-600 border-blue-200",
  learning: "bg-violet-50 text-violet-600 border-violet-200",
  personal: "bg-emerald-50 text-emerald-600 border-emerald-200",
  social: "bg-orange-50 text-orange-600 border-orange-200",
  mindfulness: "bg-teal-50 text-teal-600 border-teal-200",
  other: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function Habits() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.email],
    queryFn: () => user?.email ? base44.entities.Task.filter({ created_by: user.email }) : [],
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["completions", user?.email],
    queryFn: () => user?.email ? base44.entities.TaskCompletion.filter({ created_by: user.email }) : [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      toast.success("Task added!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
      setShowForm(false);
      toast.success("Task updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteId(null);
      toast.success("Task removed.");
    },
  });

  const completionMutation = useMutation({
    mutationFn: async (task) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const existingCompletion = completions.find(c => c.task_id === task.id && c.completed_date === today);
      
      if (existingCompletion) {
        await base44.entities.TaskCompletion.delete(existingCompletion.id);
      } else {
        await base44.entities.TaskCompletion.create({
          task_id: task.id,
          task_name: task.name,
          completed_date: today,
          completed_at: format(new Date(), "HH:mm"),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completions"] });
      toast.success("Task completed!");
    },
  });

  const handleSubmit = (data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const todayCompletions = completions.filter(c => c.completed_date === today);
  const completedTaskIds = new Set(todayCompletions.map(c => c.task_id));

  const activeTasks = tasks.filter(t => t.is_active !== false && t.frequency === "once" && !completedTaskIds.has(t.id));
  const archivedTasks = tasks.filter(t => t.is_active === false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">To Do List</h1>
          <p className="text-slate-500 mt-1">Your personal to-do items.</p>
        </div>
        <Button
          onClick={() => { setEditingTask(null); setShowForm(true); }}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          New task
        </Button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {activeTasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">{task.name}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className={cn("text-xs", categoryColors[task.category])}>
                    {task.category}
                  </Badge>
                  <span className="text-xs text-slate-400 capitalize">{task.frequency}</span>
                  {task.scheduled_time && (
                    <span className="text-xs text-slate-400">{task.scheduled_time}</span>
                  )}
                  {task.streak > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                      <Flame className="w-3 h-3" />{task.streak}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-8 w-8 text-green-600 hover:bg-green-50"
                 onClick={() => completionMutation.mutate(task)}
               >
                 <Check className="w-4 h-4" />
               </Button>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={() => { setEditingTask(task); setShowForm(true); }}
               >
                 <Pencil className="w-4 h-4 text-slate-400" />
               </Button>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={() => setDeleteId(task.id)}
               >
                 <Trash2 className="w-4 h-4 text-red-400" />
               </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeTasks.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm mt-1">Add your first to-do item to get started!</p>
          </div>
        )}
      </div>

      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleSubmit}
        task={editingTask}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this task and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}