import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, X, Brain, ChevronDown, ChevronUp, User, Briefcase, Users, Target, StickyNote, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PersonForm from "./PersonForm";
import PersonCard from "./PersonCard";

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

function TextSection({ section, notes, onAdd, onDelete, onUpdate }) {
  const [open, setOpen] = useState(notes.length > 0 ? true : false);
  const [input, setInput] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  const Icon = section.icon;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700">{section.label}</p>
            <p className="text-xs text-slate-400">{notes.length > 0 ? `${notes.length} saved` : section.description}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {notes.map((note, i) => (
            <div key={i}>
              {editingIdx === i ? (
                <div className="space-y-1.5">
                  <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3}
                    className="w-full text-xs rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none leading-relaxed" />
                  <div className="flex gap-2">
                    <button onClick={() => { onUpdate(i, editValue); setEditingIdx(null); }}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition">Save</button>
                    <button onClick={() => setEditingIdx(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 group">
                  <span className="text-xs text-slate-700 flex-1 leading-relaxed whitespace-pre-wrap">{note}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                    <button onClick={() => { setEditingIdx(i); setEditValue(note); }}
                      className="p-0.5 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => onDelete(i)} className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="space-y-1.5">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) { onAdd(input.trim()); setInput(""); } } }}
              placeholder={section.placeholder} rows={3}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300 resize-none leading-relaxed" />
            <button onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(""); } }} disabled={!input.trim()}
              className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeopleSection({ section, people, onAdd, onDelete, onUpdate }) {
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const Icon = section.icon;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700">{section.label}</p>
            <p className="text-xs text-slate-400">{people.length > 0 ? `${people.length} ${people.length === 1 ? "person" : "people"}` : section.description}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {people.map((person, i) => (
            <PersonCard
              key={i}
              person={person}
              onDelete={() => onDelete(i)}
              onUpdate={(updated) => onUpdate(i, updated)}
            />
          ))}
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="w-full py-2 rounded-lg border border-dashed border-pink-300 text-xs text-pink-500 hover:bg-pink-50 transition flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add person
            </button>
          )}
          {showForm && (
            <PersonForm
              onSave={(person) => { onAdd(person); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
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

  // Ensure people is always an array of objects
  const structuredWithPeople = {
    ...structured,
    people: (structured.people || []).map(p =>
      typeof p === "string" ? { name: p, relationship: "", birthday: "", interests: "", notes: "" } : p
    ),
  };

  const saveMutation = useMutation({
    mutationFn: async (updatedStructured) => {
      if (profile?.id) {
        await base44.entities.UserProfile.update(profile.id, { about_me_notes: updatedStructured });
      } else {
        await base44.entities.UserProfile.create({ about_me_notes: updatedStructured });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const handleAddText = (sectionKey, text) => {
    const updated = { ...structuredWithPeople, [sectionKey]: [...(structuredWithPeople[sectionKey] || []), text] };
    saveMutation.mutate(updated);
    toast.success("Saved!");
  };

  const handleUpdateText = (sectionKey, idx, text) => {
    const arr = [...(structuredWithPeople[sectionKey] || [])];
    arr[idx] = text;
    saveMutation.mutate({ ...structuredWithPeople, [sectionKey]: arr });
  };

  const handleDeleteText = (sectionKey, idx) => {
    const updated = { ...structuredWithPeople, [sectionKey]: (structuredWithPeople[sectionKey] || []).filter((_, i) => i !== idx) };
    saveMutation.mutate(updated);
  };

  const handleAddPerson = (person) => {
    const updated = { ...structuredWithPeople, people: [...structuredWithPeople.people, person] };
    saveMutation.mutate(updated);
    toast.success("Person saved!");
  };

  const handleUpdatePerson = (idx, person) => {
    const arr = [...structuredWithPeople.people];
    arr[idx] = person;
    saveMutation.mutate({ ...structuredWithPeople, people: arr });
    toast.success("Updated!");
  };

  const handleDeletePerson = (idx) => {
    const updated = { ...structuredWithPeople, people: structuredWithPeople.people.filter((_, i) => i !== idx) };
    saveMutation.mutate(updated);
  };

  const totalNotes = SECTIONS.reduce((sum, s) => {
    const arr = structuredWithPeople[s.key] || [];
    return sum + arr.length;
  }, 0);

  return (
    <div className={`relative flex-shrink-0 h-full flex transition-all duration-300 ${collapsed ? "w-10" : "w-80"}`}>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center hover:bg-slate-50 transition"
      >
        {collapsed
          ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {/* Collapsed strip */}
      {collapsed && (
        <div className="w-10 h-full bg-white border-l border-slate-200 flex flex-col items-center pt-4 gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <Brain className="w-4 h-4 text-violet-600" />
          </div>
          {totalNotes > 0 && <span className="text-xs font-bold text-violet-600">{totalNotes}</span>}
        </div>
      )}

      {/* Expanded panel */}
      {!collapsed && (
        <div className="flex flex-col bg-white border-l border-slate-200 overflow-hidden w-full">
          <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">My Context</p>
              <p className="text-xs text-slate-400">
                {totalNotes > 0 ? `${totalNotes} saved · AI uses all of this` : "Help your AI truly know you"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {SECTIONS.map((section) =>
              section.key === "people" ? (
                <PeopleSection
                  key="people"
                  section={section}
                  people={structuredWithPeople.people}
                  onAdd={handleAddPerson}
                  onDelete={handleDeletePerson}
                  onUpdate={handleUpdatePerson}
                />
              ) : (
                <TextSection
                  key={section.key}
                  section={section}
                  notes={structuredWithPeople[section.key] || []}
                  onAdd={(text) => handleAddText(section.key, text)}
                  onDelete={(idx) => handleDeleteText(section.key, idx)}
                  onUpdate={(idx, text) => handleUpdateText(section.key, idx, text)}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}