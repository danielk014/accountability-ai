import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { LayoutDashboard, MessageCircle, BarChart3, ListChecks, CalendarDays, Shield, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import FloatingChatBubble from "@/components/chat/FloatingChatBubble";

const navItems = [
  { name: "Chat", icon: MessageCircle, page: "Chat" },
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Schedule", icon: CalendarDays, page: "Schedule" },
  { name: "To Do", icon: ListChecks, page: "Habits" },
  { name: "Progress", icon: BarChart3, page: "Progress" },
];

export default function Layout({ children, currentPageName }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await base44.auth.me();
        setMe(user);
      } catch (error) {
        // User not authenticated, redirect to login
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <FloatingChatBubble currentPageName={currentPageName} />
      
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
            {navItems.map(item => {
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
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
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