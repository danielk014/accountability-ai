import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ChatInput({ onSend, isLoading }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Tell me about your goals, tasks, or ask for a check-in..."
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300",
            "placeholder:text-slate-400 transition-all"
          )}
          style={{ maxHeight: "120px", minHeight: "44px" }}
          onInput={(e) => {
            e.target.style.height = "44px";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 w-11 p-0 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}