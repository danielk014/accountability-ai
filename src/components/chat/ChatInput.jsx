import React, { useState } from "react";
import { Send, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
      const recentDays = 7;
      const recentCompletions = completions.slice(0, recentDays * Math.max(tasks.length, 1));
      const completedCount = recentCompletions.filter(c => tasks.find(t => t.id === c.task_id)).length;
      const totalTaskDays = recentDays * Math.max(tasks.length, 1);
      const completionRate = totalTaskDays > 0 ? (completedCount / totalTaskDays) * 100 : 0;
      
      const avgSleep = sleep.length > 0 
        ? (sleep.reduce((sum, s) => sum + s.hours, 0) / sleep.length).toFixed(1)
        : 0;

      const poorSleepDays = sleep.filter(s => s.hours < 6).length;
      const excellentSleep = sleep.filter(s => s.hours >= 8).length;

      const prompt = `You are a brutally honest but deeply motivating coach with the intensity of David Goggins, the charisma of Joe Rogan, and the strategic mind of Alex Hormozi. Your job is to read between the lines of this person's data and tell them EXACTLY what's happening - no sugar coating, no fluff. But also remind them of their potential and fire them up to take action.

**Their Habit Performance (Last 7 Days):**
${tasks.length > 0 ? tasks.map(t => {
  const taskCompletions = completions.filter(c => c.task_id === t.id).length;
  const completionPercent = (taskCompletions / 7 * 100).toFixed(0);
  return `- **${t.name}** (${t.category}): ${taskCompletions}/7 days (${completionPercent}%) | Streak: ${t.streak || 0} days | Best: ${t.best_streak || 0} days`;
}).join("\n") : "- No habits tracked yet"}

**Overall Stats:**
- Total Active Habits: ${tasks.filter(t => t.is_active !== false).length}
- Overall Completion Rate (7d): ${Math.round(completionRate)}%
- Total Habit Completions: ${completedCount}/last ${totalTaskDays}

**Sleep Health:**
- Average Sleep: ${avgSleep} hours ${avgSleep < 7 ? "⚠️ BELOW TARGET" : avgSleep <= 8 ? "✓ OPTIMAL" : "✓ EXCELLENT"}
- Nights with Poor Sleep (<6h): ${poorSleepDays}
- Nights with Great Sleep (8+h): ${excellentSleep}
- Data Points: ${sleep.length} nights tracked

${profile?.[0]?.about_me_notes?.length > 0 ? `**What You've Told Me About Yourself:**\n${profile[0].about_me_notes.map(note => `- ${note}`).join("\n")}` : ""}

Give them the REAL coaching - the kind that sticks:
1. **The Honest Assessment**: Look at these specific habits and completion rates. Which ones are you really committed to? Which ones are you lying to yourself about?
2. **The Sleep Connection**: How is your sleep affecting your consistency? Is fatigue killing your discipline?
3. **The Hard Truth**: What's one habit you're tolerating that's holding you back? What's the cost of NOT fixing it?
4. **The Path Forward**: Give 3 specific, non-negotiable actions for THIS WEEK. Make them crystal clear and directly tied to their data.
5. **The Fire**: End with something that makes them feel called to greatness. Make it personal based on their actual performance.

Be direct. Be intense. Use their actual numbers. Don't be generic.`;

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
    <TooltipProvider>
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">AI Coaching</p>
              <p className="text-xs text-slate-300">Analyze your habits & get real talk</p>
            </TooltipContent>
          </Tooltip>
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
    </TooltipProvider>
  );
}