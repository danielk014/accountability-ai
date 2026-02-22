import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Send, Loader2, Sparkles,
  Check, ChevronRight, ChevronLeft, FileText, CreditCard, Target,
  BookOpen, Pencil, RotateCcw, X, GraduationCap, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Top-level navigation controller ─────────────────────────────────────────

export default function HomeworkProjectDetail({ project, onBack, onEdit, onDelete }) {
  const [view, setView] = useState("chapters");
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const openChapter = (chapter) => {
    setSelectedChapter(chapter);
    setView("chapter");
  };

  const openSection = (section) => {
    setSelectedSection(section);
    setView("section");
  };

  const goBack = () => {
    if (view === "section") {
      setSelectedSection(null);
      setView("chapter");
    } else if (view === "chapter") {
      setSelectedChapter(null);
      setView("chapters");
    } else {
      onBack();
    }
  };

  if (view === "section" && selectedChapter) {
    if (selectedSection === "summary")    return <SummaryView    chapter={selectedChapter} onBack={goBack} />;
    if (selectedSection === "flashcards") return <FlashcardsView chapter={selectedChapter} onBack={goBack} />;
    if (selectedSection === "objectives") return <LearningObjectivesView chapter={selectedChapter} onBack={goBack} />;
  }

  if (view === "chapter" && selectedChapter) {
    return (
      <ChapterSectionsView
        chapter={selectedChapter}
        onBack={goBack}
        onOpenSection={openSection}
      />
    );
  }

  return (
    <ChaptersView
      project={project}
      onBack={onBack}
      onOpenChapter={openChapter}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

// ─── ChaptersView ─────────────────────────────────────────────────────────────

function ChaptersView({ project, onBack, onOpenChapter, onEdit, onDelete }) {
  const queryClient = useQueryClient();

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", project.id],
    queryFn: () => base44.entities.HomeworkChapter.filter({ project_id: project.id }, "created_at"),
    enabled: !!project.id,
  });

  useEffect(() => {
    const unsub = base44.entities.HomeworkChapter.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["chapters", project.id] })
    );
    return unsub;
  }, [project.id]);

  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (showNewChapter) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showNewChapter]);

  const createChapter = async () => {
    if (!newChapterName.trim()) return;
    await base44.entities.HomeworkChapter.create({
      project_id: project.id,
      name: newChapterName.trim(),
      order: chapters.length,
    });
    queryClient.invalidateQueries({ queryKey: ["chapters", project.id] });
    setNewChapterName("");
    setShowNewChapter(false);
    toast.success("Chapter created!");
  };

  const deleteChapter = async (chapterId) => {
    if (!window.confirm("Delete this chapter and all its contents?")) return;
    const [summaries, flashcards, objectives] = await Promise.all([
      base44.entities.ChapterSummaryEntry.filter({ chapter_id: chapterId }),
      base44.entities.Flashcard.filter({ chapter_id: chapterId }),
      base44.entities.LearningObjective.filter({ chapter_id: chapterId }),
    ]);
    await Promise.all([
      ...summaries.map(s => base44.entities.ChapterSummaryEntry.delete(s.id)),
      ...flashcards.map(f => base44.entities.Flashcard.delete(f.id)),
      ...objectives.map(o => base44.entities.LearningObjective.delete(o.id)),
      base44.entities.HomeworkChapter.delete(chapterId),
    ]);
    queryClient.invalidateQueries({ queryKey: ["chapters", project.id] });
    toast.success("Chapter deleted");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || "#8b5cf6" }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-800 truncate">{project.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <GraduationCap className="w-3 h-3 text-violet-400" />
            <p className="text-xs text-slate-400">Homework</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => onEdit(project)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => { onDelete(project.id); onBack(); }} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-400 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Create chapter */}
          <div className="mb-6">
            {showNewChapter ? (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newChapterName}
                  onChange={e => setNewChapterName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") createChapter();
                    if (e.key === "Escape") setShowNewChapter(false);
                  }}
                  placeholder="e.g. Chapter 1, Unit 3, Lecture 5…"
                  className="rounded-xl flex-1"
                />
                <Button onClick={createChapter} disabled={!newChapterName.trim()} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                  Create
                </Button>
                <Button variant="outline" onClick={() => { setShowNewChapter(false); setNewChapterName(""); }} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowNewChapter(true)} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-1.5" />
                Create new chapter
              </Button>
            )}
          </div>

          {/* Chapter list */}
          {chapters.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-violet-300" />
              </div>
              <p className="text-lg font-semibold text-slate-700">No chapters yet</p>
              <p className="text-sm text-slate-400 mt-1">Create your first chapter to start organizing your study material</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {chapters.map(chapter => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    onOpen={onOpenChapter}
                    onDelete={deleteChapter}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ChapterCard ──────────────────────────────────────────────────────────────

function ChapterCard({ chapter, onOpen, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      onClick={() => onOpen(chapter)}
      className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-violet-300 hover:shadow-md transition-all group flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-6 h-6 text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 text-base truncate">{chapter.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5">Summary · Flashcards · Learning Objectives</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onDelete(chapter.id); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition" />
      </div>
    </motion.div>
  );
}

// ─── ChapterSectionsView ──────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "summary",
    icon: FileText,
    label: "Summary",
    description: "Write and build your chapter summary in your own words",
    bg: "bg-blue-50",
    iconColor: "text-blue-500",
    borderHover: "hover:border-blue-300",
    accent: "text-blue-600",
  },
  {
    id: "flashcards",
    icon: CreditCard,
    label: "Flashcards",
    description: "Create flashcard decks and study terms and definitions",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    borderHover: "hover:border-emerald-300",
    accent: "text-emerald-600",
  },
  {
    id: "objectives",
    icon: Target,
    label: "Learning Objectives",
    description: "AI-assisted goals — what you should be able to do after studying",
    bg: "bg-violet-50",
    iconColor: "text-violet-500",
    borderHover: "hover:border-violet-300",
    accent: "text-violet-600",
  },
];

function ChapterSectionsView({ chapter, onBack, onOpenSection }) {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">{chapter.name}</h2>
          <p className="text-xs text-slate-400">Choose a section to study</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {SECTIONS.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onOpenSection(section.id)}
                className={cn(
                  "bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer transition-all hover:shadow-md flex items-center gap-5",
                  section.borderHover
                )}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0", section.bg)}>
                  <Icon className={cn("w-7 h-7", section.iconColor)} />
                </div>
                <div className="flex-1">
                  <h3 className={cn("font-semibold text-slate-800 text-lg")}>{section.label}</h3>
                  <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{section.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SummaryView ──────────────────────────────────────────────────────────────

const SUMMARY_AI_STORAGE = "accountable_summary_ai_";

async function callSummaryAI(messages, systemPrompt) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  return data.content?.find(b => b.type === "text")?.text ?? "";
}

function SummaryView({ chapter, onBack }) {
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ["summaryEntries", chapter.id],
    queryFn: () => base44.entities.ChapterSummaryEntry.filter({ chapter_id: chapter.id }, "created_at"),
    enabled: !!chapter.id,
  });

  useEffect(() => {
    const unsub = base44.entities.ChapterSummaryEntry.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["summaryEntries", chapter.id] })
    );
    return unsub;
  }, [chapter.id]);

  // Panel mode: "write" | "ai"
  const [panel, setPanel] = useState("write");

  // Write mode state
  const [writeText, setWriteText] = useState("");
  const [saving, setSaving]       = useState(false);
  const textRef    = useRef(null);
  const entriesRef = useRef(null);

  // AI chat state
  const aiChatKey = `${SUMMARY_AI_STORAGE}${chapter.id}`;
  const [aiMessages, setAiMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(aiChatKey) || "[]"); } catch { return []; }
  });
  const [aiInput, setAiInput]     = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (panel === "ai") setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [aiMessages, panel]);

  useEffect(() => {
    if (panel === "write") setTimeout(() => entriesRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [entries, panel]);

  // ── Write mode ──────────────────────────────────────────────────────────────

  const saveEntry = async (content) => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await base44.entities.ChapterSummaryEntry.create({
        chapter_id: chapter.id,
        content: content.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["summaryEntries", chapter.id] });
    } catch {
      toast.error("Failed to save summary");
    } finally {
      setSaving(false);
    }
  };

  const handleWriteSubmit = async () => {
    if (!writeText.trim() || saving) return;
    await saveEntry(writeText);
    setWriteText("");
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const deleteEntry = async (id) => {
    await base44.entities.ChapterSummaryEntry.delete(id);
    queryClient.invalidateQueries({ queryKey: ["summaryEntries", chapter.id] });
  };

  // ── AI chat ─────────────────────────────────────────────────────────────────

  const buildSystemPrompt = () => {
    const savedText = entries.map(e => e.content).join("\n\n");
    return `You are an AI study assistant helping a student write and improve a chapter summary for "${chapter.name}".

${savedText ? `The student has already written the following summary:\n\n${savedText}\n\n` : "No summary has been written yet.\n\n"}Help them:
- Expand, clarify, or improve their summary
- Generate a new summary from notes or content they paste or upload
- Answer questions about the chapter material
- Suggest key points to include

When you generate a paragraph of summary text that the student should save, wrap it in <SAVE>...</SAVE> tags so they can save it with one click. Keep responses concise and educational.`;
  };

  const sendAiMessage = async (content) => {
    if (!content.trim() || aiLoading) return;
    const userMsg = { role: "user", content: content.trim() };
    const updated = [...aiMessages, userMsg];
    setAiMessages(updated);
    setAiInput("");
    localStorage.setItem(aiChatKey, JSON.stringify(updated.slice(-60)));
    setAiLoading(true);
    try {
      const reply = await callSummaryAI(updated, buildSystemPrompt());
      const withReply = [...updated, { role: "assistant", content: reply }];
      setAiMessages(withReply);
      localStorage.setItem(aiChatKey, JSON.stringify(withReply.slice(-60)));
    } catch {
      toast.error("AI failed to respond. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const deleteAiMessage = (index) => {
    const updated = aiMessages.filter((_, i) => i !== index);
    setAiMessages(updated);
    localStorage.setItem(aiChatKey, JSON.stringify(updated));
  };

  // ── File upload ──────────────────────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const maxSize = 500 * 1024; // 500 KB
    if (file.size > maxSize) {
      toast.error("File too large — please upload files under 500 KB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result;
      if (!content || typeof content !== "string") {
        toast.error("Could not read file. Make sure it's a plain text file.");
        return;
      }
      // Switch to AI panel and send file content as message
      setPanel("ai");
      const truncated = content.length > 8000 ? content.slice(0, 8000) + "\n\n[File truncated at 8000 chars]" : content;
      const prompt = `I've uploaded a file called "${file.name}". Please read its contents and generate a concise, well-structured summary I can save for my notes:\n\n---\n${truncated}\n---`;
      await sendAiMessage(prompt);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  };

  // Extract <SAVE>...</SAVE> blocks from AI message
  const parseSaveBlocks = (text) => {
    const parts = [];
    const re = /<SAVE>([\s\S]*?)<\/SAVE>/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
      parts.push({ type: "save", content: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
    return parts;
  };

  const quickPrompts = [
    "Summarize what I've written so far in bullet points",
    "What are the key concepts I should include?",
    "Help me expand my summary with more detail",
    "Generate a concise summary I can save",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-800">Summary</h2>
          <p className="text-xs text-slate-400">{chapter.name}</p>
        </div>
        {/* File upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload a file to generate a summary with AI"
          className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.xml,.html,.htm,.rtf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Panel toggle */}
      <div className="flex bg-white border-b border-slate-100 flex-shrink-0">
        {[["write", "✏️  Write"], ["ai", "✨  AI Assistant"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPanel(id)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-all",
              panel === id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Write panel ── */}
      {panel === "write" && (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {entries.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-7 h-7 text-blue-200" />
                  </div>
                  <p className="text-slate-500 font-medium">No summary yet</p>
                  <p className="text-sm text-slate-400 mt-1">Write below, or use AI Assistant to generate one</p>
                </motion.div>
              ) : (
                entries.map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group"
                  >
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                      <span className="text-xs text-slate-300">
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={entriesRef} />
            </div>
          </div>

          <div className="bg-white border-t border-slate-100 px-6 py-4 flex-shrink-0">
            <div className="max-w-2xl mx-auto flex gap-3 items-end">
              <textarea
                ref={textRef}
                value={writeText}
                onChange={e => setWriteText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleWriteSubmit(); }}
                placeholder="Write your summary here… (Cmd+Enter to save)"
                rows={3}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                style={{ minHeight: "80px", maxHeight: "220px" }}
              />
              <Button
                onClick={handleWriteSubmit}
                disabled={!writeText.trim() || saving}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 self-end h-10"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── AI Assistant panel ── */}
      {panel === "ai" && (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {aiMessages.length === 0 ? (
              <div className="space-y-3 pt-4">
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">AI Summary Assistant</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Ask me to generate a summary, expand your notes, or upload a file with the 📎 button
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                  {quickPrompts.map(q => (
                    <button key={q} onClick={() => sendAiMessage(q)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition bg-white">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              aiMessages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[85%] rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm px-3 py-2.5 whitespace-pre-wrap"
                      : "bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-100 overflow-hidden"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="p-3 space-y-2">
                        {parseSaveBlocks(msg.content).map((part, pi) =>
                          part.type === "text" ? (
                            <p key={pi} className="whitespace-pre-wrap text-slate-800 leading-relaxed">{part.content}</p>
                          ) : (
                            <div key={pi} className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Suggested summary</p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{part.content}</p>
                              <button
                                onClick={async () => {
                                  await saveEntry(part.content);
                                  toast.success("Saved to summary!");
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                              >
                                <Check className="w-3.5 h-3.5" /> Save to summary
                              </button>
                            </div>
                          )
                        )}
                        <button
                          onClick={() => deleteAiMessage(i)}
                          className="text-xs text-slate-300 hover:text-red-400 transition mt-1"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <button
                      onClick={() => deleteAiMessage(i)}
                      className="self-end mb-1 text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                    />
                  )}
                </div>
              ))
            )}

            {aiLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-3 shadow-sm border border-slate-100">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>

          <div className="bg-white border-t border-slate-100 px-5 py-4 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload a file"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition self-end flex-shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(aiInput); } }}
                placeholder="Ask the AI to help with your summary… (Enter to send)"
                rows={1}
                disabled={aiLoading}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
                style={{ minHeight: "40px", maxHeight: "120px" }}
              />
              <Button
                onClick={() => sendAiMessage(aiInput)}
                disabled={!aiInput.trim() || aiLoading}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 self-end h-10"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── FlashcardsView ───────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;

function FlashcardsView({ chapter, onBack }) {
  const queryClient = useQueryClient();

  const { data: flashcards = [] } = useQuery({
    queryKey: ["flashcards", chapter.id],
    queryFn: () => base44.entities.Flashcard.filter({ chapter_id: chapter.id }, "created_at"),
    enabled: !!chapter.id,
  });

  useEffect(() => {
    const unsub = base44.entities.Flashcard.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["flashcards", chapter.id] })
    );
    return unsub;
  }, [chapter.id]);

  const decks = [...new Set(flashcards.map(f => f.deck_name))];

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [showNewDeck, setShowNewDeck]   = useState(false);
  const [newDeckName, setNewDeckName]   = useState("");
  const [showAddCard, setShowAddCard]   = useState(false);
  const [newFront, setNewFront]         = useState("");
  const [newBack, setNewBack]           = useState("");

  // Swipe / flip state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped]       = useState(false);
  const [swipeDir, setSwipeDir]         = useState(1);
  const wasDragging = useRef(false); // prevent flip-on-drag-release

  // Auto-select first deck
  useEffect(() => {
    if (decks.length > 0 && !selectedDeck) setSelectedDeck(decks[0]);
  }, [flashcards]);

  const deckCards = selectedDeck ? flashcards.filter(f => f.deck_name === selectedDeck) : [];

  // Reset position when deck changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedDeck]);

  // Clamp index after deletion
  useEffect(() => {
    if (deckCards.length > 0 && currentIndex >= deckCards.length) {
      setCurrentIndex(deckCards.length - 1);
      setIsFlipped(false);
    }
  }, [deckCards.length]);

  const goNext = () => {
    if (deckCards.length < 2) return;
    setSwipeDir(1);
    setIsFlipped(false);
    setCurrentIndex(i => (i + 1) % deckCards.length);
  };

  const goPrev = () => {
    if (deckCards.length < 2) return;
    setSwipeDir(-1);
    setIsFlipped(false);
    setCurrentIndex(i => (i - 1 + deckCards.length) % deckCards.length);
  };

  const jumpTo = (i) => {
    setSwipeDir(i > currentIndex ? 1 : -1);
    setCurrentIndex(i);
    setIsFlipped(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (showAddCard) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === " ") { e.preventDefault(); setIsFlipped(f => !f); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, deckCards.length, showAddCard]);

  const createDeck = () => {
    if (!newDeckName.trim()) return;
    const name = newDeckName.trim();
    setSelectedDeck(name);
    setNewDeckName("");
    setShowNewDeck(false);
    toast.success(`Deck "${name}" ready — add flashcards below`);
  };

  const addFlashcard = async () => {
    if (!newFront.trim() || !newBack.trim() || !selectedDeck) return;
    await base44.entities.Flashcard.create({
      chapter_id: chapter.id,
      deck_name: selectedDeck,
      front: newFront.trim(),
      back: newBack.trim(),
    });
    queryClient.invalidateQueries({ queryKey: ["flashcards", chapter.id] });
    setNewFront("");
    setNewBack("");
    setShowAddCard(false);
    toast.success("Flashcard added!");
  };

  const deleteCard = async (id) => {
    await base44.entities.Flashcard.delete(id);
    queryClient.invalidateQueries({ queryKey: ["flashcards", chapter.id] });
  };

  // Safe current card — never null when rendering swipe area
  const currentCard = deckCards[currentIndex] ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-800">Flashcards</h2>
          <p className="text-xs text-slate-400">{chapter.name}</p>
        </div>
        {!showAddCard && selectedDeck && (
          <Button onClick={() => setShowAddCard(true)} size="sm" variant="outline"
            className="rounded-xl border-emerald-300 text-emerald-600 hover:bg-emerald-50 flex-shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Card
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Deck tabs */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {decks.map(deck => (
              <button key={deck} onClick={() => setSelectedDeck(deck)}
                className={cn("px-4 py-1.5 rounded-xl text-sm font-medium transition",
                  selectedDeck === deck
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                )}>
                {deck}
              </button>
            ))}

            {showNewDeck ? (
              <div className="flex gap-2 items-center">
                <Input autoFocus value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createDeck(); if (e.key === "Escape") setShowNewDeck(false); }}
                  placeholder="Deck name" className="rounded-xl h-8 w-36 text-sm" />
                <Button size="sm" onClick={createDeck} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 h-8 text-xs px-3">Create</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowNewDeck(false); setNewDeckName(""); }} className="rounded-xl h-8 text-xs px-3">✕</Button>
              </div>
            ) : (
              <button onClick={() => setShowNewDeck(true)}
                className="px-3 py-1.5 rounded-xl text-sm border border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />New Deck
              </button>
            )}
          </div>
        </div>

        {/* Add card form */}
        {showAddCard && (
          <div className="mx-6 mt-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex-shrink-0">
            <h3 className="text-sm font-semibold text-slate-700">Add flashcard to "{selectedDeck}"</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Front (Term / Question)</label>
                <textarea autoFocus value={newFront} onChange={e => setNewFront(e.target.value)}
                  placeholder="e.g. Mitosis" rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 placeholder:text-slate-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Back (Definition / Answer)</label>
                <textarea value={newBack} onChange={e => setNewBack(e.target.value)}
                  placeholder="e.g. Cell division producing two identical daughter cells" rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 placeholder:text-slate-300" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowAddCard(false); setNewFront(""); setNewBack(""); }} className="rounded-xl">Cancel</Button>
              <Button onClick={addFlashcard} disabled={!newFront.trim() || !newBack.trim()} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Add Flashcard</Button>
            </div>
          </div>
        )}

        {/* ── Card area ── */}
        {!selectedDeck ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-emerald-200" />
              </div>
              <p className="text-slate-500 font-medium">No decks yet</p>
              <p className="text-sm text-slate-400 mt-1">Create a deck to start adding flashcards</p>
            </div>
          </div>
        ) : deckCards.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-emerald-200" />
              </div>
              <p className="text-slate-500 font-medium">No cards in this deck</p>
              <p className="text-sm text-slate-400 mt-1">Press "Add Card" above to get started</p>
            </div>
          </div>
        ) : !currentCard ? null : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 select-none">
            {/* Counter */}
            <p className="text-xs text-slate-400 font-medium mb-4 tracking-wide">
              {currentIndex + 1} / {deckCards.length}
            </p>

            {/* Swipe area */}
            <div className="relative w-full max-w-sm flex items-center justify-center">
              {/* Prev */}
              <button onClick={goPrev} disabled={deckCards.length <= 1}
                className="absolute left-0 z-10 p-2.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 shadow-sm transition disabled:opacity-30">
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Card slide wrapper */}
              <div className="w-full px-14 overflow-hidden">
                <AnimatePresence custom={swipeDir} mode="wait">
                  <motion.div
                    key={currentCard.id}
                    custom={swipeDir}
                    initial={{ x: swipeDir > 0 ? 280 : -280, opacity: 0, scale: 0.94 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: swipeDir > 0 ? -280 : 280, opacity: 0, scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.12}
                    onDragStart={() => { wasDragging.current = false; }}
                    onDragEnd={(_, info) => {
                      if (Math.abs(info.offset.x) > 8) wasDragging.current = true;
                      if (info.offset.x < -SWIPE_THRESHOLD) goNext();
                      else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
                    }}
                    style={{ touchAction: "none" }}
                  >
                    {/*
                      Pure-CSS 3-D flip.
                      The outer div sets perspective.
                      The inner div rotates on Y axis using a CSS transition — no nested motion.div,
                      which avoids Framer Motion overwriting the transform and breaking preserve-3d.
                    */}
                    <div style={{ perspective: "1000px" }}>
                      <div
                        onClick={() => { if (!wasDragging.current) setIsFlipped(f => !f); }}
                        style={{
                          transformStyle: "preserve-3d",
                          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                          transition: "transform 0.52s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          height: "260px",
                          cursor: "pointer",
                        }}
                      >
                        {/* ── Front face ── */}
                        <div
                          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                          className="absolute inset-0 bg-white rounded-3xl border-2 border-slate-200 shadow-xl flex flex-col items-center justify-center p-8 text-center"
                        >
                          <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">Term</span>
                          <p className="text-xl font-bold text-slate-800 leading-snug">{currentCard.front}</p>
                          <span className="absolute bottom-5 text-xs text-slate-300 flex items-center gap-1.5">
                            <RotateCcw className="w-3 h-3" /> Tap to flip
                          </span>
                        </div>

                        {/* ── Back face ── */}
                        <div
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                          className="absolute inset-0 bg-emerald-600 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center"
                        >
                          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-4">Answer</span>
                          <p className="text-lg font-semibold text-white leading-relaxed">{currentCard.back}</p>
                          <span className="absolute bottom-5 text-xs text-emerald-300 flex items-center gap-1.5">
                            <RotateCcw className="w-3 h-3" /> Tap to flip back
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next */}
              <button onClick={goNext} disabled={deckCards.length <= 1}
                className="absolute right-0 z-10 p-2.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 shadow-sm transition disabled:opacity-30">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dot indicators */}
            {deckCards.length <= 12 && (
              <div className="flex gap-1.5 mt-6">
                {deckCards.map((_, i) => (
                  <button key={i} onClick={() => jumpTo(i)}
                    className={cn("rounded-full transition-all duration-200",
                      i === currentIndex ? "w-5 h-2 bg-emerald-500" : "w-2 h-2 bg-slate-300 hover:bg-slate-400"
                    )} />
                ))}
              </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center gap-4 mt-5">
              <button onClick={() => deleteCard(currentCard.id)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition px-3 py-1.5 rounded-xl hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
                Delete card
              </button>
              <span className="text-xs text-slate-300">← → to navigate · Space to flip</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LearningObjectivesView ───────────────────────────────────────────────────

function LearningObjectivesView({ chapter, onBack }) {
  const queryClient = useQueryClient();

  const { data: objectives = [] } = useQuery({
    queryKey: ["objectives", chapter.id],
    queryFn: () => base44.entities.LearningObjective.filter({ chapter_id: chapter.id }, "created_at"),
    enabled: !!chapter.id,
  });

  const { data: summaryEntries = [] } = useQuery({
    queryKey: ["summaryEntries", chapter.id],
    queryFn: () => base44.entities.ChapterSummaryEntry.filter({ chapter_id: chapter.id }, "created_at"),
    enabled: !!chapter.id,
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ["flashcards", chapter.id],
    queryFn: () => base44.entities.Flashcard.filter({ chapter_id: chapter.id }, "created_at"),
    enabled: !!chapter.id,
  });

  useEffect(() => {
    const unsub = base44.entities.LearningObjective.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["objectives", chapter.id] })
    );
    return unsub;
  }, [chapter.id]);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualText, setManualText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [pastedContent, setPastedContent] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);

  const addObjective = async (content, aiGenerated = false) => {
    if (!content.trim()) return;
    await base44.entities.LearningObjective.create({
      chapter_id: chapter.id,
      content: content.trim(),
      ai_generated: aiGenerated,
    });
    queryClient.invalidateQueries({ queryKey: ["objectives", chapter.id] });
  };

  const deleteObjective = async (id) => {
    await base44.entities.LearningObjective.delete(id);
    queryClient.invalidateQueries({ queryKey: ["objectives", chapter.id] });
  };

  const generateObjectives = async (extraContext = "") => {
    if (generating) return;
    setGenerating(true);
    setAiSuggestions([]);
    try {
      const summaryText = summaryEntries.map(e => e.content).join("\n\n");
      const flashcardText = flashcards.map(f => `- ${f.front}: ${f.back}`).join("\n");
      const existingObjectives = objectives.map(o => `- ${o.content}`).join("\n");

      const parts = [];
      if (summaryText) parts.push(`SUMMARY:\n${summaryText}`);
      if (flashcardText) parts.push(`FLASHCARDS:\n${flashcardText}`);
      if (extraContext) parts.push(`ADDITIONAL CONTENT:\n${extraContext}`);
      if (existingObjectives) parts.push(`ALREADY ADDED OBJECTIVES (do not repeat):\n${existingObjectives}`);

      const context = parts.length > 0
        ? parts.join("\n\n")
        : "No study material has been added yet for this chapter.";

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: `You are a study assistant helping a student identify what they should learn from a chapter. Based on the provided summary and flashcards, generate 4-7 clear, specific, measurable learning objectives. Each objective must start with an action verb (e.g., "Explain...", "Identify...", "Differentiate...", "Describe...", "Compare...", "Define..."). Return ONLY the objectives, one per line, with no numbering, no bullets, no extra text.`,
          messages: [
            {
              role: "user",
              content: `Here is the study material for "${chapter.name}":\n\n${context}\n\nGenerate learning objectives.`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text ?? "";
      const lines = text
        .split("\n")
        .map(l => l.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(l => l.length > 10);
      setAiSuggestions(lines);
      if (lines.length === 0) toast("AI couldn't generate objectives — try adding more summary or flashcards first.");
    } catch {
      toast.error("Failed to generate objectives. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const hasStudyMaterial = summaryEntries.length > 0 || flashcards.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-800">Learning Objectives</h2>
          <p className="text-xs text-slate-400">{chapter.name}</p>
        </div>
        <Button
          onClick={() => generateObjectives()}
          disabled={generating}
          className="rounded-xl bg-violet-600 hover:bg-violet-700 text-sm flex-shrink-0"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating…</>
            : <><Sparkles className="w-4 h-4 mr-1.5" />Generate with AI</>
          }
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Context hint */}
          {!hasStudyMaterial && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Add a <strong>Summary</strong> or <strong>Flashcards</strong> first for better AI-generated objectives — or paste content below.
              </p>
            </div>
          )}

          {/* Saved objectives */}
          {objectives.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Objectives</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {objectives.map((obj, i) => (
                    <motion.div
                      key={obj.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start gap-3 group"
                    >
                      <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="flex-1 text-sm text-slate-700 leading-relaxed">{obj.content}</p>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                        {obj.ai_generated && (
                          <span className="text-xs text-violet-400 font-medium">AI</span>
                        )}
                        <button
                          onClick={() => deleteObjective(obj.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* AI suggestions */}
          {aiSuggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Suggestions — tap to add
              </p>
              <div className="space-y-2">
                {aiSuggestions.map((obj, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={async () => {
                      await addObjective(obj, true);
                      setAiSuggestions(prev => prev.filter((_, idx) => idx !== i));
                      toast.success("Objective added!");
                    }}
                    className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-violet-100 hover:border-violet-300 transition group"
                  >
                    <Plus className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0 group-hover:text-violet-600" />
                    <p className="flex-1 text-sm text-violet-800 leading-relaxed">{obj}</p>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={async () => {
                    for (const obj of aiSuggestions) await addObjective(obj, true);
                    setAiSuggestions([]);
                    toast.success("All objectives added!");
                  }}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-xs"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Add All
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAiSuggestions([])} className="rounded-xl text-xs">
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {objectives.length === 0 && aiSuggestions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
                <Target className="w-7 h-7 text-violet-200" />
              </div>
              <p className="text-slate-500 font-medium">No learning objectives yet</p>
              <p className="text-sm text-slate-400 mt-1">Generate with AI or add your own below</p>
            </div>
          )}

          {/* Paste content for AI */}
          {showPasteArea ? (
            <div className="bg-white rounded-2xl border border-violet-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-semibold text-slate-700">Paste content for AI</p>
              </div>
              <p className="text-xs text-slate-400">Paste flashcard lists, lecture notes, or any text — the AI will extract learning objectives from it.</p>
              <textarea
                autoFocus
                value={pastedContent}
                onChange={e => setPastedContent(e.target.value)}
                placeholder="Paste your notes, flashcard list, or text here…"
                rows={6}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 placeholder:text-slate-300"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowPasteArea(false); setPastedContent(""); }} className="rounded-xl text-sm">Cancel</Button>
                <Button
                  onClick={() => { generateObjectives(pastedContent); setShowPasteArea(false); setPastedContent(""); }}
                  disabled={!pastedContent.trim() || generating}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-sm"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Generate from this content
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowPasteArea(true)}
                className="rounded-xl border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 text-sm"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Paste content for AI
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualAdd(true)}
                className="rounded-xl border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 text-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add manually
              </Button>
            </div>
          )}

          {/* Manual add form */}
          {showManualAdd && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Add learning objective</p>
              <textarea
                autoFocus
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    addObjective(manualText);
                    setManualText("");
                    setShowManualAdd(false);
                  }
                }}
                placeholder='e.g. "Explain the difference between mitosis and meiosis"'
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 placeholder:text-slate-300"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowManualAdd(false); setManualText(""); }} className="rounded-xl text-sm">Cancel</Button>
                <Button
                  onClick={() => { addObjective(manualText); setManualText(""); setShowManualAdd(false); }}
                  disabled={!manualText.trim()}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-sm"
                >
                  Add Objective
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
