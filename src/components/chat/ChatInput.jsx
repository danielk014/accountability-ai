import React, { useState } from "react";
import { Send, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatInput({ onSend, isLoading, onCoachingClick }) {
  const [message, setMessage] = useState("");
  const [loadingCoaching, setLoadingCoaching] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["completions"],
    queryFn: () => base44.entities.TaskCompletion.list("-completed_date", 500),
  });

  const { data: sleep = [] } = useQuery({
    queryKey: ["sleep"],
    queryFn: () => base44.entities.Sleep.list("-date", 100),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const handleCoaching = async () => {
    setLoadingCoaching(true);
    try {
      const last7Days = completions.slice(0, 100);
      const completionRate = tasks.length > 0 
        ? (last7Days.filter(c => tasks.find(t => t.id === c.task_id)).length / (tasks.length * 7)) * 100
        : 0;
      
      const avgSleep = sleep.length > 0 
        ? (sleep.reduce((sum, s) => sum + s.hours, 0) / sleep.length).toFixed(1)
        : 0;

      const poorSleepDays = sleep.filter(s => s.hours < 6).length;
      const excellentSleep = sleep.filter(s => s.hours >= 8).length;

      const prompt = `You are a brutally honest but deeply motivating coach with the intensity of David Goggins, the charisma of Joe Rogan, and the strategic mind of Alex Hormozi. Your job is to read between the lines of this person's data and tell them EXACTLY what's happening - no sugar coating, no fluff. But also remind them of their potential and fire them up to take action.

**Their Data:**
- Active Habits: ${tasks.filter(t => t.is_active !== false).length}
- Completion Rate: ${Math.round(completionRate)}% (out of 100%)
- Streaks: ${tasks.map(t => `"${t.name}" (${t.streak || 0} days)`).join(", ") || "None established yet"}
- Habit Breakdown: ${JSON.stringify(tasks.reduce((acc, t) => {
  acc[t.category] = (acc[t.category] || 0) + 1;
  return acc;
}, {}))}

**Sleep Reality:**
- Average: ${avgSleep} hours (${avgSleep < 7 ? "INSUFFICIENT" : avgSleep < 8 ? "Below optimal" : "Solid"})
- Poor nights (<6h): ${poorSleepDays} 
- Great nights (8+h): ${excellentSleep}
- Total tracked: ${sleep.length}

${profile?.[0]?.about_me_notes?.length > 0 ? `**Context:** ${profile[0].about_me_notes.join(", ")}` : ""}

Now give them the REAL talk:
1. **The Honest Assessment**: What's actually happening here? Are they coasting? Crushing it? Lying to themselves?
2. **The Hard Truth**: What's the gap between where they are and where they want to be? What are they actually tolerating?
3. **Why It Matters**: Remind them what this REALLY costs them - in their health, potential, relationships, legacy. Don't be soft.
4. **The Path Forward**: 3 specific moves THIS WEEK that will shift everything. Make it crystal clear.
5. **The Fire**: Send them off with a message that makes them want to GET UP and DO THE WORK.

Be direct. Be intense. Be honest about the struggle. But make them FEEL their potential. Use their data to personalize it - make it real, not generic.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      onCoachingClick(response);
    } catch (error) {
      console.error("Error generating coaching:", error);
    } finally {
      setLoadingCoaching(false);
    }
  };

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <Button
          onClick={handleCoaching}
          disabled={loadingCoaching || isLoading}
          variant="outline"
          className="rounded-xl h-11 w-11 p-0 flex-shrink-0 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
        >
          {loadingCoaching ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          ) : (
            <Lightbulb className="w-4 h-4 text-amber-600" />
          )}
        </Button>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Tell me about your goals, tasks, or ask for a check-in..."
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300",
            "placeholder:text-slate-400 transition-all"
          )}
          style={{ maxHeight: "120px", minHeight: "44px" }}
          onInput={(e) => {
            e.target.style.height = "44px";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <Button
           onClick={handleSend}
           disabled={!message.trim() || isLoading}
           className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 w-11 p-0 flex-shrink-0"
         >
           {isLoading ? (
             <Loader2 className="w-4 h-4 animate-spin" />
           ) : (
             <Send className="w-4 h-4" />
           )}
         </Button>
        </div>
        </div>
        );
        }