import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function AboutMePanel({ profile }) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  const notes = profile?.about_me_notes || [];

  const saveMutation = useMutation({
    mutationFn: async (updatedNotes) => {
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, { about_me_notes: updatedNotes });
      } else {
        await base44.entities.UserProfile.create({ about_me_notes: updatedNotes });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const updated = [...notes, trimmed];
    saveMutation.mutate(updated);
    setInput("");
    toast.success("Note saved — your AI partner will use this!");
  };

  const handleDelete = (idx) => {
    const updated = notes.filter((_, i) => i !== idx);
    saveMutation.mutate(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">About Me</p>
            <p className="text-xs text-slate-400">
              {notes.length > 0 ? `${notes.length} note${notes.length > 1 ? "s" : ""} · AI uses these to personalize` : "Help your AI know you better"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <p className="text-xs text-slate-400 mt-3 mb-3">
            Anything you add here — your motivations, life context, preferences — will be remembered by your AI partner and referenced in check-ins.
          </p>

          {/* Existing notes */}
          {notes.length > 0 && (
            <div className="space-y-2 mb-3">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2 group">
                  <span className="text-xs text-slate-600 flex-1 leading-relaxed">{note}</span>
                  <button
                    onClick={() => handleDelete(i)}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 mt-0.5 flex-shrink-0 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new note */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. I'm trying to lose 20lbs, I work 9-5, mornings are tough for me..."
              className="flex-1 text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}