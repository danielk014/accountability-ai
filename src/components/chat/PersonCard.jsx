import React, { useState } from "react";
import { X, Pencil, Check } from "lucide-react";

export default function PersonCard({ person, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...person });

  const handleSave = () => {
    onUpdate(form);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 space-y-2">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Name *"
          className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
        />
        <input
          value={form.relationship || ""}
          onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
          placeholder="Relationship (e.g. best friend, partner, mom)"
          className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
        />
        <input
          value={form.birthday || ""}
          onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
          placeholder="Birthday (e.g. March 15, 1995)"
          className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
        />
        <input
          value={form.interests || ""}
          onChange={e => setForm(f => ({ ...f, interests: e.target.value }))}
          placeholder="Interests (e.g. music, hiking, cooking)"
          className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
        />
        <textarea
          value={form.notes || ""}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Anything else to know..."
          rows={2}
          className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-semibold hover:bg-pink-600 transition flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Save
          </button>
          <button
            onClick={() => { setForm({ ...person }); setEditing(false); }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-pink-100 rounded-xl px-3 py-2.5 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{person.name}</span>
            {person.relationship && (
              <span className="text-xs bg-pink-100 text-pink-600 rounded-full px-2 py-0.5">{person.relationship}</span>
            )}
          </div>
          {person.birthday && (
            <p className="text-xs text-slate-500 mt-1">🎂 {person.birthday}</p>
          )}
          {person.interests && (
            <p className="text-xs text-slate-500 mt-0.5">⭐ {person.interests}</p>
          )}
          {person.notes && (
            <p className="text-xs text-slate-500 mt-0.5 italic">"{person.notes}"</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-pink-50 text-slate-400 hover:text-pink-500 transition">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}