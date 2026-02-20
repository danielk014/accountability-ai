import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

export default function FloatingChatBubble({ currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);
  const buttonRef = useRef(null);

  const HIDDEN_PROMPTS = [
    "I just opened the app.",
    "Hi! I'm opening the app for the first time.",
    "SYSTEM_PROACTIVE_MORNING:",
    "SYSTEM_PROACTIVE_MIDDAY:",
    "SYSTEM_PROACTIVE_EVENING:",
    "[AI Coaching]:",
  ];

  const displayMessages = messages.filter(m => {
    if (m.role === "system") return false;
    if (m.tool_calls?.length > 0 && !m.content) return false;
    if (m.role === "user" && HIDDEN_PROMPTS.some(p => m.content?.startsWith(p))) return false;
    return true;
  });

  useEffect(() => {
    async function init() {
      const user = await base44.auth.me();
      const conversations = await base44.agents.listConversations({
        agent_name: "accountability_partner",
      });

      // Filter to only get the current user's conversation
      const userConversation = conversations.find(c => c.created_by === user.email);

      if (userConversation) {
        const conv = await base44.agents.getConversation(userConversation.id);
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } else {
        const conv = await base44.agents.createConversation({
          agent_name: "accountability_partner",
          metadata: { name: "My Accountability Chat", user_email: user.email },
        });
        setConversationId(conv.id);
        setMessages([]);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && chatWindowRef.current && buttonRef.current &&
          !chatWindowRef.current.contains(e.target) && 
          !buttonRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSend = async (content) => {
    if (!conversationId) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content }]);
    const conv = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conv, { role: "user", content });
  };

  const handleCoachingClick = async (coachingMessage) => {
    if (!conversationId) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: "[AI Coaching Analysis]" }]);
    const conv = await base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(conv, { 
      role: "user", 
      content: `[AI Coaching]: ${coachingMessage}` 
    });
  };

  if (currentPageName === "Chat") return null;

  return (
    <>
      {/* Floating button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-40 max-h-[calc(100vh-120px)]"
          >
            {/* Header */}
            <div className="px-4 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Accountable AI</p>
                  <p className="text-xs text-slate-400">Your AI coach</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {displayMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-500">
                    Start chatting to get personalized coaching and support
                  </p>
                </div>
              )}

              {displayMessages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-3 py-2">
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

            {/* Input */}
            <div className="border-t border-slate-100 flex-shrink-0 p-4">
              <ChatInput 
                onSend={handleSend} 
                isLoading={isLoading} 
                onCoachingClick={handleCoachingClick}
                compact={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}