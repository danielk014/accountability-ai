import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lightbulb, TrendingUp, AlertCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

export default function AICoaching({ tasks, completions, sleep }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const generateInsights = async () => {
    setLoading(true);
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

      setInsights(response);
    } catch (error) {
      console.error("Error generating insights:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 p-6 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">AI Coaching</h3>
          <p className="text-xs text-slate-500">Get personalized insights on your habits</p>
        </div>
      </div>

      {!insights ? (
        <Button
          onClick={generateInsights}
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Get AI Insights"
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h2 className="text-lg font-bold text-slate-900 mt-3 mb-2">{children}</h2>,
                h2: ({ children }) => <h3 className="text-base font-semibold text-slate-800 mt-3 mb-2">{children}</h3>,
                h3: ({ children }) => <h4 className="font-semibold text-slate-700 mt-2 mb-1">{children}</h4>,
                p: ({ children }) => <p className="text-sm text-slate-700 mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700 mb-2">{children}</ol>,
                li: ({ children }) => <li className="text-sm text-slate-700">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              }}
            >
              {insights}
            </ReactMarkdown>
          </div>

          <Button
            onClick={() => setInsights(null)}
            variant="outline"
            className="w-full rounded-lg"
          >
            Get New Insights
          </Button>
        </div>
      )}
    </div>
  );
}