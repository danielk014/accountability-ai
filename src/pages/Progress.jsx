import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import WeeklyChart from "../components/progress/WeeklyChart";
import HabitGrid from "../components/progress/HabitGrid";
import StatsRow from "../components/dashboard/StatsRow";

export default function Progress() {
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: completions = [], isLoading: loadingCompletions } = useQuery({
    queryKey: ["completions"],
    queryFn: () => base44.entities.TaskCompletion.list("-completed_date", 1000),
  });

  if (loadingTasks || loadingCompletions) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Progress</h1>
      <p className="text-slate-500 mb-8">Your habit-building journey at a glance.</p>

      <StatsRow tasks={tasks} completions={completions} />

      <div className="space-y-6">
        <WeeklyChart completions={completions} tasks={tasks} />
        <HabitGrid tasks={tasks} completions={completions} />
      </div>
    </div>
  );
}