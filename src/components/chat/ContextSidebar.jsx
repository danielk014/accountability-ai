import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, X, Brain, ChevronDown, ChevronUp, User, Briefcase, Users, Target, StickyNote, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PersonForm from "./PersonForm";

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
    placeholder: "e.g. I work 9-5 at a startup, Tuesdays are my busiest day...",
    description: "Your work life & daily schedule",
  },
  {
    key: "people",
    label: "People in My Life",
    icon: Users,
    color: "bg-pink-100 text-pink-600",
    placeholder: null,
    description: "Friends, family, relationships",
  },
  {
    key: "goals",
    label: "Goals & Plans",
    icon: Target,
    color: "bg-emerald-100 text-emerald-600",
    placeholder: "e.g. I want to lose 20lbs by summer, get promoted by Q3...",
    description: "What you're working towards",
  },
  {
    key: "notes",
    label: "Extra Context",
    icon: StickyNote,
    color: "bg-amber-100 text-amber-600",
    placeholder: "e.g. I struggle with mornings, anxiety about presentations...",
    description: "Anything else the AI should know",
  },
];

function Section({ section, notes, onAdd, onDelete }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [showPersonForm, setShowPersonForm] = useState(false);
  const isPeople = section.key === "people";
  const Icon = section.icon;

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

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700">{section.label}</p>
            <p className="text-xs text-slate-400">
              {notes.length > 0 ? `${notes.length} saved` : section.description}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {/* Saved notes */}
          {notes.length > 0 && (
            <div className="space-y-1.5">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 group">
                  <span className="text-xs text-slate-700 flex-1 leading-relaxed whitespace-pre-wrap">{note}</span>
                  <button
                    onClick={() => onDelete(i)}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 mt-0.5 flex-shrink-0 transition-opacity"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          {isPeople ? (
            <>
              {!showPersonForm && (
                <button
                  onClick={() => setShowPersonForm(true)}
                  className="w-full py-2 rounded-lg border border-dashed border-pink-300 text-xs text-pink-500 hover:bg-pink-50 transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add person with details
                </button>
              )}
              {showPersonForm && (
                <PersonForm
                  onSave={(text) => { onAdd(text); setShowPersonForm(false); }}
                  onCancel={() => setShowPersonForm(false)}
                />
              )}
            </>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={section.placeholder}
                rows={3}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300 resize-none leading-relaxed"
              />
              <button
                onClick={handleAdd}
                disabled={!input.trim()}
                className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContextSidebar() {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profile"],
    queryFn: () => base44.entities.UserProfile.list(),
  });
  const profile = profiles[0];

  const rawNotes = profile?.about_me_notes || [];
  const structured = (() => {
    if (Array.isArray(rawNotes)) {
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
    <div className={`relative flex-shrink-0 h-full flex transition-all duration-300 ${collapsed ? "w-10" : "w-80"}`}>
      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center hover:bg-slate-50 transition"
      >
        {collapsed ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {/* Collapsed strip */}
      {collapsed && (
        <div className="w-10 h-full bg-white border-l border-slate-200 flex flex-col items-center pt-4 gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-600" />
          </div>
          {totalNotes > 0 && (
            <span className="text-xs font-bold text-violet-600">{totalNotes}</span>
          )}
        </div>
      )}

      {/* Expanded panel */}
      {!collapsed && (
        <div className="flex flex-col bg-white border-l border-slate-200 overflow-hidden w-full">
          {/* Header */}
          <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-violet-600" />
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
      )}
    </div>
  );
}