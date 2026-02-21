import React from "react";
import { motion } from "framer-motion";
import { Flame, Target, TrendingUp, Award } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color, bg, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
    </div>
  </motion.div>
);

export default function StatsRow({ tasks, completions }) {
  const totalCompletions = completions.length;

  const longestStreak = tasks.reduce((max, t) => Math.max(max, t.best_streak || 0), 0);

  const activeTaskCount = tasks.filter(t => t.is_active !== false).length;

  // This week's completions
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekCompletions = completions.filter(c => new Date(c.completed_date) >= weekStart).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <StatCard icon={Target} label="Active habits" value={activeTaskCount} color="text-indigo-500" bg="bg-indigo-50" delay={0} />
      <StatCard icon={TrendingUp} label="This week" value={thisWeekCompletions} color="text-emerald-500" bg="bg-emerald-50" delay={0.05} />
      <StatCard icon={Flame} label="Best streak" value={longestStreak} color="text-amber-500" bg="bg-amber-50" delay={0.1} />
      <StatCard icon={Award} label="All time" value={totalCompletions} color="text-violet-500" bg="bg-violet-50" delay={0.15} />
    </div>
  );
}