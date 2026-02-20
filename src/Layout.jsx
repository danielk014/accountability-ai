import React from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { LayoutDashboard, MessageCircle, BarChart3, ListChecks, CalendarDays, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import FloatingChatBubble from "@/components/chat/FloatingChatBubble";

const navItems = [
  { name: "Chat", icon: MessageCircle, page: "Chat" },
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Schedule", icon: CalendarDays, page: "Schedule" },
  { name: "To Do", icon: ListChecks, page: "Habits" },
  { name: "Progress", icon: BarChart3, page: "Progress" },
  { name: "Admin", icon: Shield, page: "Admin", adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [me, setMe] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
  }, []);

  const visibleItems = navItems.filter(item => !item.adminOnly || me?.role === "admin");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight hidden sm:block">Accountable</span>
          </div>

          <nav className="flex items-center gap-1">
            {visibleItems.map(item => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}