import React from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Sparkles } from "lucide-react";

export default function GreetingHeader({ userName, overallStreak, tasksToday, completedToday }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getMotivation = () => {
    if (completedToday === tasksToday && tasksToday > 0) return "You crushed it today! 🎉";
    if (completedToday > tasksToday / 2) return "You're on fire — keep going!";
    if (completedToday > 0) return "Great start — let's keep the momentum!";
    return "Let's make today count.";
  };

  const firstName = userName?.split(" ")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
        {getGreeting()}, {firstName}
      </h1>
      <p className="text-slate-500 mt-1 text-lg">{getMotivation()}</p>

      <div className="flex items-center gap-6 mt-5">
        {overallStreak > 0 && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2"
          >
            <Flame className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{overallStreak}-day streak</span>
          </motion.div>
        )}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2">
          <Trophy className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">
            {completedToday}/{tasksToday} today
          </span>
        </div>
        {completedToday === tasksToday && tasksToday > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2"
          >
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">Perfect day!</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}