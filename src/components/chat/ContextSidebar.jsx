import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, X, Brain, ChevronDown, ChevronUp, User, Briefcase, Users, Target, StickyNote } from "lucide-react";
import { toast } from "sonner";

const SECTIONS = [
  {
    key: "about",
    label: "About Me",
    icon: User,
    color: "bg-violet-100 text-violet-600",
    placeholder: "e.g. I'm 28, live in NYC, introvert who loves hiking...",
    description: "Who you are as a person",
  },
  {
    key: "work",
    label: "Work & Schedule",
    icon: Briefcase,
    color: "bg-blue-100 text-blue-600",
    placeholder: "e.g. I work 9-5 at a startup, Tuesdays are my busiest day, I hate Monday mornings...",
    description: "Your work life & daily schedule",
  },
  {
    key: "people",
    label: "People in My Life",
    icon: Users,
    color: "bg-pink-100 text-pink-600",
    placeholder: "e.g. My girlfriend Sarah is super supportive, my friend Jake keeps me accountable...",
    description: "Friends, family, relationships",
  },
  {
    key: "goals",
    label: "Goals & Plans",
    icon: Target,
    color: "bg-emerald-100 text-emerald-600",
    placeholder: "e.g. I want to lose 20lbs by summer, get promoted by Q3, run a 5K...",
    description: "What you're working towards",
  },
  {
    key: "notes",
    label: "Extra Context",
    icon: StickyNote,
    color: "bg-amber-100 text-amber-600",
    placeholder: "e.g. I struggle with mornings, anxiety about presentations, love music...",
    description: "Anything else the AI should know",
  },
];

function Section({ section, notes, onAdd, onDelete }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const Icon = section.icon;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${section.color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-700">{section.label}</p>
            <p className="text-xs text-slate-400">{notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : section.description}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-1.5">
          {notes.map((note, i) => (
            <div key={i} className="flex items-start gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 group">
              <span className="text-xs text-slate-600 flex-1 leading-relaxed">{note}</span>
              <button
                onClick={() => onDelete(i)}
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100 mt-0.5 flex-shrink-0 transition-opacity"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5 mt-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={section.placeholder}
              className="flex-1 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300"
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="px-2 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContextSidebar() {
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];

  // about_me_notes is now an object keyed by section
  // We store as: { about: [...], work: [...], people: [...], goals: [...], notes: [...] }
  // But we also support the old flat array format for backwards compat
  const rawNotes = profile?.about_me_notes || [];
  const structured = (() => {
    if (Array.isArray(rawNotes)) {
      // Legacy flat array — put everything under "notes"
      return { about: [], work: [], people: [], goals: [], notes: rawNotes };
    }
    return rawNotes;
  })();

  const saveMutation = useMutation({
    mutationFn: async (updatedStructured) => {
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, { about_me_notes: updatedStructured });
      } else {
        await base44.entities.UserProfile.create({ about_me_notes: updatedStructured });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const handleAdd = (sectionKey, text) => {
    const updated = {
      ...structured,
      [sectionKey]: [...(structured[sectionKey] || []), text],
    };
    saveMutation.mutate(updated);
    toast.success("Saved! Your AI will remember this.");
  };

  const handleDelete = (sectionKey, idx) => {
    const updated = {
      ...structured,
      [sectionKey]: (structured[sectionKey] || []).filter((_, i) => i !== idx),
    };
    saveMutation.mutate(updated);
  };

  const totalNotes = SECTIONS.reduce((sum, s) => sum + (structured[s.key]?.length || 0), 0);

  return (
    <div className="w-72 flex-shrink-0 h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
          <Brain className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">My Context</p>
          <p className="text-xs text-slate-400">
            {totalNotes > 0 ? `${totalNotes} note${totalNotes !== 1 ? "s" : ""} · AI uses all of this` : "Help your AI truly know you"}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {SECTIONS.map((section) => (
          <Section
            key={section.key}
            section={section}
            notes={structured[section.key] || []}
            onAdd={(text) => handleAdd(section.key, text)}
            onDelete={(idx) => handleDelete(section.key, idx)}
          />
        ))}
      </div>
    </div>
  );
}