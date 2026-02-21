import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap, Trash2, CheckSquare, Square } from "lucide-react";

import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import ContextSidebar from "../components/chat/ContextSidebar";

export default function Chat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const checkinSentRef = useRef(false);

  function shouldSendBriefing(hour) {
    return hour === 9;
  }

  function shouldSendEveningCheckin(hour) {
    return hour >= 21; // 9pm
  }

  async function generateBriefingPrompt() {
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
    const profile = profiles[0];
    
    const tasks = await base44.entities.Task.filter({ created_by: user.email });
    const today = new Date().toISOString().split("T")[0];
    
    // Get tasks for today
    const todaysTasks = tasks.filter(task => {
      if (!task.is_active) return false;
      const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "lowercase" });
      
      if (task.frequency === "once" && task.scheduled_date === today) return true;
      if (task.frequency === "daily") return true;
      if (task.frequency === "weekdays" && !["saturday", "sunday"].includes(dayOfWeek)) return true;
      if (task.frequency === "weekends" && ["saturday", "sunday"].includes(dayOfWeek)) return true;
      if (task.frequency === dayOfWeek) return true;
      return false;
    }).sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""));

    const filesList = profile?.context_files?.map(f => `- ${f.name}`).join("\n") || "No context files";
    const goalsList = profile?.goals?.join("\n") || "No goals set yet";
    
    return `SYSTEM_DAILY_BRIEFING: You are presenting the user's Daily Briefing for today. Start with an upbeat, energizing greeting. Then:

1. **Today's Focus**: Summarize their top 1-3 priorities for the day based on their:
   - Main Goals: ${goalsList}
   - Context Files uploaded: ${filesList}
   - Scheduled Tasks: ${todaysTasks.map(t => `${t.name} (${t.category})`).join(", ") || "No tasks scheduled"}

2. **Your AI Personality**: Keep this in mind when responding: "${profile?.ai_personality || "Be a supportive, encouraging accountability partner"}"

3. **Suggested Focus Tasks**: Pick 1-3 tasks from today's schedule that would have the most impact. Explain why each one matters.

4. **Quick Tip**: Give one actionable piece of advice for tackling today successfully.

Keep it concise, friendly, and motivating. Make them feel ready to crush the day. No bullet points in the main message—just natural, conversational language like a friend who knows them well.`;
  }

  async function generateEveningCheckinPrompt() {
    const user = await base44.auth.me();
    const today = new Date().toISOString().split("T")[0];
    
    const completions = await base44.entities.TaskCompletion.filter({ 
      created_by: user.email,
      completed_date: today
    });
    
    const tasks = await base44.entities.Task.filter({ created_by: user.email });
    
    const todaysTasks = tasks.filter(task => {
      if (!task.is_active) return false;
      const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "lowercase" });
      
      if (task.frequency === "once" && task.scheduled_date === today) return true;
      if (task.frequency === "daily") return true;
      if (task.frequency === "weekdays" && !["saturday", "sunday"].includes(dayOfWeek)) return true;
      if (task.frequency === "weekends" && ["saturday", "sunday"].includes(dayOfWeek)) return true;
      if (task.frequency === dayOfWeek) return true;
      return false;
    });

    const completedCount = completions.length;
    const totalCount = todaysTasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return `SYSTEM_EVENING_CHECKIN: Evening check-in time! Review their day and provide genuine, warm support:

Today's Summary:
- Completed: ${completedCount}/${totalCount} tasks (${completionRate}%)
- Tasks done: ${completions.map(c => c.task_name).join(", ") || "None yet"}
- Incomplete: ${todaysTasks.filter(t => !completions.find(c => c.task_id === t.id)).map(t => t.name).join(", ") || "All done!"}

Please:
1. **Celebrate their wins**: Acknowledge what they DID accomplish, no matter how small
2. **Be honest but kind**: If they didn't hit all their goals, validate that and ask what got in the way
3. **Reflect together**: Ask how they're feeling about today. Are they energized? Tired? Proud?
4. **Look ahead**: Ask if there's anything on their mind for tomorrow
5. **Closing thought**: End with encouragement or a motivational thought

Be like a supportive friend wrapping up the day with them. Warm, genuine, no judgment. Ask follow-up questions and really listen.`;
  }

  // Load or create conversation — send briefing in morning and check-in at 9pm
  useEffect(() => {
    async function init() {
      // Guard: never send more than one message per page load
      if (checkinSentRef.current) return;

      const user = await base44.auth.me();
      const today = new Date().toISOString().split("T")[0];
      const hour = new Date().getHours();
      const isMorning = shouldSendBriefing(hour);
      const isEvening = shouldSendEveningCheckin(hour);
      
      const briefingKey = `last_briefing_${today}`;
      const eveningKey = `last_evening_checkin_${today}`;

      // Determine which message to send
      let shouldSendMessage = false;
      let messageContent = "";
      let storageKey = "";

      if (isMorning && !localStorage.getItem(briefingKey)) {
        shouldSendMessage = true;
        messageContent = await generateBriefingPrompt();
        storageKey = briefingKey;
      } else if (isEvening && !localStorage.getItem(eveningKey)) {
        shouldSendMessage = true;
        messageContent = await generateEveningCheckinPrompt();
        storageKey = eveningKey;
      }

      // Mark guard immediately so re-mounts never double-fire
      if (shouldSendMessage) {
        checkinSentRef.current = true;
        localStorage.setItem(storageKey, "1");
      }

      const conversations = await base44.agents.listConversations({
        agent_name: "accountability_partner",
      });

      // Filter to only get the current user's conversation
      const userConversation = conversations.find(c => c.created_by === user.email);

      let conv;

      if (userConversation) {
        conv = await base44.agents.getConversation(userConversation.id);
        setConversationId(conv.id);
        setMessages(conv.messages || []);
        setIsInitializing(false);

        if (shouldSendMessage) {
          setIsLoading(true);
          await base44.agents.addMessage(conv, {
            role: "user",
            content: messageContent,
          });
        }
      } else {
        conv = await base44.agents.createConversation({
          agent_name: "accountability_partner",
          metadata: { name: "My Accountability Chat", user_email: user.email },
        });
        setConversationId(conv.id);
        setMessages([]);
        setIsInitializing(false);
        setIsLoading(true);
        await base44.agents.addMessage(conv, {
          role: "user",
          content: "Hi! I'm opening the app for the first time. Please introduce yourself and then ask me about my life goals, what I want to achieve, and what my weekly schedule looks like. Help me figure out what habits and tasks I should add to my days. Ask me questions one at a time to understand my life and goals deeply, then give me personalized advice and help me schedule my week.",
        });
      }
    }
    init();
  }, []);

  // Subscribe to updates
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content) => {
    if (!conversationId) return;
    setIsLoading(true);

    // Optimistic update
    setMessages(prev => [...prev, { role: "user", content }]);

    const conv = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conv, { role: "user", content });
  };

  const handleCoachingClick = async (coachingMessage) => {
    if (!conversationId) return;
    setIsLoading(true);

    // Send coaching as a user request
    setMessages(prev => [...prev, { role: "user", content: "[AI Coaching Analysis]" }]);

    const conv = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conv, { 
      role: "user", 
      content: `[AI Coaching]: ${coachingMessage}` 
    });
  };

  // Filter out system messages and hidden prompts
  const HIDDEN_PROMPTS = [
    "I just opened the app.",
    "Hi! I'm opening the app for the first time.",
    "SYSTEM_DAILY_BRIEFING:",
    "SYSTEM_EVENING_CHECKIN:",
    "[AI Coaching]:",
  ];
  const displayMessages = messages.filter(m => {
    // Hide system messages
    if (m.role === "system") return false;
    // Hide tool call messages
    if (m.tool_calls?.length > 0 && !m.content) return false;
    // Hide hidden prompts
    if (m.role === "user" && HIDDEN_PROMPTS.some(p => m.content?.startsWith(p))) return false;
    return true;
  });

  const handleToggleSelect = (messageId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayMessages.map(msg => msg.id || JSON.stringify(msg))));
    }
  };

  const handleDeleteSelected = () => {
    const newMessages = messages.filter(msg => !selectedIds.has(msg.id || JSON.stringify(msg)));
    setMessages(newMessages);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleClearAll = () => {
    setMessages([]);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  if (isInitializing) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Toolbar */}
        {isSelectionMode && (
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-800 font-medium"
            >
              {selectedIds.size === displayMessages.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size === displayMessages.length ? "Deselect All" : "Select All"}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-600">{selectedIds.size} selected</span>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setIsSelectionMode(false)}
                className="px-3 py-1.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">

          {displayMessages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-[#1e2228] flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699863bb9965c7b81ed00428/8af80c917_c05151408_logo.png" alt="AI" className="w-14 h-14 object-contain" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Accountable AI</h2>
              <p className="text-slate-500 max-w-md mx-auto text-sm">
                Tell me about your goals, habits, and schedule. I'll help you stay on track, 
                celebrate wins, and build consistency.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                 {[
                   "What should I focus on today?",
                   "Help me build a morning routine",
                   "How am I doing this week?",
                 ].map(suggestion => (
                   <button
                     key={suggestion}
                     onClick={() => handleSend(suggestion)}
                     className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                   >
                     {suggestion}
                   </button>
                 ))}
               </div>
               {/* Empty state options */}
               <div className="flex gap-2 justify-center mt-8 pt-4 border-t border-slate-200">
                 <button
                   onClick={() => setIsSelectionMode(true)}
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 border border-slate-300 hover:bg-slate-50 transition"
                 >
                   <Square className="w-3.5 h-3.5" />
                   Select Messages
                 </button>
                 {messages.length > 0 && (
                   <button
                     onClick={handleClearAll}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 border border-red-300 hover:bg-red-50 transition"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     Clear Chat
                   </button>
                 )}
               </div>
            </div>
          )}

          {displayMessages.map((msg) => {
            const msgId = msg.id || JSON.stringify(msg);
            return (
            <div
              key={msgId}
              className="flex gap-3 items-start group"
              onContextMenu={(e) => { e.preventDefault(); setIsSelectionMode(true); handleToggleSelect(msgId); }}
            >
              {isSelectionMode && (
                <button
                  onClick={() => handleToggleSelect(msgId)}
                  className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-600 transition"
                >
                  {selectedIds.has(msgId) ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}
                <div className="flex-1">
                <MessageBubble message={msg} />
              </div>
            </div>
          );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm ml-11">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} onCoachingClick={handleCoachingClick} />
      </div>

      {/* Context sidebar */}
      <ContextSidebar />
    </div>
  );
}