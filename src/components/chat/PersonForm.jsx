import React, { useState } from "react";
import { X, Plus, Tag } from "lucide-react";

export default function PersonForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  const [interests, setInterests] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    const parts = [];
    parts.push(name.trim());
    if (relationship.trim()) parts.push(`(${relationship.trim()})`);
    if (birthday.trim()) parts.push(`· Birthday: ${birthday.trim()}`);
    if (interests.trim()) parts.push(`· Interests: ${interests.trim()}`);
    if (notes.trim()) parts.push(`· ${notes.trim()}`);
    onSave(parts.join(" "));
  };

  return (
    <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 space-y-2 mt-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-pink-700">Add Person</p>
        <button onClick={onCancel} className="text-pink-400 hover:text-pink-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name *"
        className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
      />
      <input
        value={relationship}
        onChange={e => setRelationship(e.target.value)}
        placeholder="Relationship (e.g. best friend, partner, mom)"
        className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
      />
      <input
        value={birthday}
        onChange={e => setBirthday(e.target.value)}
        placeholder="Birthday (e.g. March 15, 1995)"
        className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
      />
      <input
        value={interests}
        onChange={e => setInterests(e.target.value)}
        placeholder="Interests (e.g. music, hiking, cooking)"
        className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
      />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Anything else to know about them..."
        rows={2}
        className="w-full text-xs rounded-lg border border-pink-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white resize-none"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="w-full py-1.5 rounded-lg bg-pink-500 text-white text-xs font-semibold hover:bg-pink-600 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" /> Save Person
      </button>
    </div>
  );
}