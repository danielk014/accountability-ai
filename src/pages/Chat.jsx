import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";

import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import ContextSidebar from "../components/chat/ContextSidebar";

export default function Chat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef(null);
  const checkinSentRef = useRef(false);

  // Determine which proactive check-in slot (0=morning, 1=midday, 2=evening)
  function getCheckinSlot(hour) {
    if (hour >= 5 && hour < 12) return 0;
    if (hour >= 12 && hour < 17) return 1;
    return 2;
  }

  function getProactivePrompt(slot) {
    if (slot === 0) {
      return "SYSTEM_PROACTIVE_MORNING: Good morning check-in. Look at all my tasks scheduled for today. Figure out from my schedule what I'll likely be doing this morning (gym? work? errands?). Then send me a fun, upbeat, friendly morning message like a best friend would — reference what's on my agenda specifically, hype me up, and ask if I need help with anything today. Keep it short, playful, and warm. No bullet points, just talk to me like a friend.";
    } else if (slot === 1) {
      return "SYSTEM_PROACTIVE_MIDDAY: Midday check-in. Look at my tasks for today and check which ones are done vs still pending. Based on my schedule, figure out what I'm probably doing right now (at work? lunch? gym?). Send me a friendly midday message — acknowledge what I might be up to, celebrate anything I've already knocked out, and give me a little nudge on what's still ahead. Playful, encouraging, like a friend texting me. Ask if I need any help or if anything feels overwhelming. Keep it conversational and short.";
    } else {
      return "SYSTEM_PROACTIVE_EVENING: Evening check-in. Read all my tasks for today and my completions. Give me a warm, friendly end-of-day message — like a friend asking how my day went. Celebrate what I crushed, gently mention anything I missed without making me feel bad, and ask how I'm genuinely feeling. Ask if there's anything I want to talk through or need help with tonight. Maybe mention something to look forward to tomorrow if I have tasks. Short, warm, like a real person who cares.";
    }
  }

  // Load or create conversation — send proactive check-in up to 3x per day (morning/midday/evening)
  useEffect(() => {
    async function init() {
      // Guard: never send more than one check-in per page load
      if (checkinSentRef.current) return;

      const today = new Date().toISOString().split("T")[0];
      const hour = new Date().getHours();
      const slot = getCheckinSlot(hour);
      const storageKey = `last_checkin_${today}_slot${slot}`;

      // Determine up-front whether we should send a check-in
      const shouldCheckin = !localStorage.getItem(storageKey);

      // Mark guard immediately so re-mounts never double-fire
      if (shouldCheckin) {
        checkinSentRef.current = true;
        localStorage.setItem(storageKey, "1");
      }

      const conversations = await base44.agents.listConversations({
        agent_name: "accountability_partner",
      });

      let conv;

      if (conversations.length > 0) {
        conv = await base44.agents.getConversation(conversations[0].id);
        setConversationId(conv.id);
        setMessages(conv.messages || []);
        setIsInitializing(false);

        if (shouldCheckin) {
          setIsLoading(true);
          await base44.agents.addMessage(conv, {
            role: "user",
            content: getProactivePrompt(slot),
          });
        }
      } else {
        conv = await base44.agents.createConversation({
          agent_name: "accountability_partner",
          metadata: { name: "My Accountability Chat" },
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

  // Filter out system messages and the hidden proactive check-in prompt
  const HIDDEN_PROMPTS = [
    "I just opened the app.",
    "Hi! I'm opening the app for the first time.",
    "SYSTEM_PROACTIVE_MORNING:",
    "SYSTEM_PROACTIVE_MIDDAY:",
    "SYSTEM_PROACTIVE_EVENING:",
    "[AI Coaching]:",
  ];
  const displayMessages = messages.filter(m =>
    m.role !== "system" &&
    !(m.role === "user" && HIDDEN_PROMPTS.some(p => m.content?.startsWith(p)))
  );

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
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">

          {displayMessages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Your Accountability Partner</h2>
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
            </div>
          )}

          {displayMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
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