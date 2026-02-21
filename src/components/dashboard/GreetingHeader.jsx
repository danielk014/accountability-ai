import React from "react";
import { motion } from "framer-motion";


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


    </motion.div>
  );
}