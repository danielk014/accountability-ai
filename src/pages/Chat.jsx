import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";

import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";

export default function Chat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef(null);

  // Load or create conversation — only send check-in prompt if brand new (zero messages)
  useEffect(() => {
    async function init() {
      const conversations = await base44.agents.listConversations({
        agent_name: "accountability_partner",
      });

      let conv;

      if (conversations.length > 0) {
        conv = await base44.agents.getConversation(conversations[0].id);
        setConversationId(conv.id);
        setMessages(conv.messages || []);
        setIsInitializing(false);
        // Never auto-send anything — user already has a conversation history
      } else {
        conv = await base44.agents.createConversation({
          agent_name: "accountability_partner",
          metadata: { name: "My Accountability Chat" },
        });
        setConversationId(conv.id);
        setMessages([]);
        setIsInitializing(false);
        // Only on brand-new conversation: send a single welcome prompt
        setIsLoading(true);
        const freshConv = await base44.agents.getConversation(conv.id);
        await base44.agents.addMessage(freshConv, {
          role: "user",
          content: "Hi! I'm opening the app for the first time. Please introduce yourself briefly and ask me about my goals.",
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

  // Filter out system messages and the hidden proactive check-in prompt
  const HIDDEN_PROMPTS = [
    "I just opened the app.",
    "Hi! I'm opening the app for the first time.",
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
    <div className="flex flex-col h-[calc(100vh-64px)]">
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
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}