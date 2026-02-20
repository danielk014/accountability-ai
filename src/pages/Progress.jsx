import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import TimeActivityChart from "../components/progress/TimeActivityChart";
import SleepChart from "../components/progress/SleepChart";

export default function Progress() {
  const [tab, setTab] = useState("activity");

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: sleep = [], isLoading: loadingSleep } = useQuery({
    queryKey: ["sleep"],
    queryFn: () => base44.entities.Sleep.list("-date", 100),
  });

  if (loadingTasks || loadingSleep) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Progress</h1>
      <p className="text-slate-500 mb-8">Track your time and sleep patterns.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <button
          onClick={() => setTab("activity")}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === "activity"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-600 hover:text-slate-700"
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab("sleep")}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === "sleep"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-600 hover:text-slate-700"
          }`}
        >
          Sleep
        </button>
      </div>

      {tab === "activity" && <TimeActivityChart tasks={tasks} completions={[]} />}
      {tab === "sleep" && <SleepChart sleepData={sleep} />}
    </div>
  );
}