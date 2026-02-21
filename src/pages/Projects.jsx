import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Pencil, Check, Send, Loader2,
  Sparkles, FolderKanban,
  MessageCircle, ChevronDown, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sendMessageToClaudeWithContext } from "@/api/claudeClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Config ──────────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#64748b",
];

const TYPE_CONFIG = {
  business: { label: "Business",  bg: "bg-blue-50 text-blue-600 border-blue-200" },
  school:   { label: "School",    bg: "bg-violet-50 text-violet-600 border-violet-200" },
  personal: { label: "Personal",  bg: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  goal:     { label: "Goal",      bg: "bg-amber-50 text-amber-600 border-amber-200" },
};

const STATUS_CONFIG = {
  idea:      { label: "Idea",      bg: "bg-slate-100 text-slate-500" },
  active:    { label: "Active",    bg: "bg-green-100 text-green-700" },
  paused:    { label: "Paused",    bg: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", bg: "bg-indigo-100 text-indigo-700" },
};

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "text-rose-500" },
  medium: { label: "Medium", color: "text-amber-500" },
  low:    { label: "Low",    color: "text-slate-400" },
};

const CHAT_STORAGE_PREFIX = "accountable_project_chat_";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeProgress(tasks) {
  if (!tasks.length) return { done: 0, total: 0, pct: 0 };
  const done = tasks.filter(t => t.is_done).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

function deadlineLabel(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, cls: "text-red-500" };
  if (diff === 0) return { text: "Due today",                  cls: "text-red-500" };
  if (diff <= 7)  return { text: `${diff}d left`,              cls: "text-amber-500" };
  if (diff <= 30) return { text: `${diff}d left`,              cls: "text-slate-500" };
  return { text: `${diff}d left`, cls: "text-slate-400" };
}

function buildProjectContext(project, tasks) {
  const prog = computeProgress(tasks);
  const pending   = tasks.filter(t => !t.is_done);
  const completed = tasks.filter(t =>  t.is_done);
  return `## Project: ${project.name}
Type: ${project.type} | Status: ${project.status}
Progress: ${prog.pct}% (${prog.done}/${prog.total} tasks done)
${project.deadline ? `Deadline: ${project.deadline}` : "No deadline set"}
${project.description ? `Description: ${project.description}` : ""}

Pending tasks (${pending.length}):
${pending.map(t => `- ${t.name}${t.due_date ? ` (due ${t.due_date})` : ""}${t.priority !== "medium" ? ` [${t.priority}]` : ""}`).join("\n") || "None"}

Completed tasks (${completed.length}):
${completed.map(t => `- ${t.name}`).join("\n") || "None"}

You are an expert project advisor. Help the user make progress on this specific project — break down tasks, prioritize work, and keep them accountable. Be specific and action-oriented.`;
}

// ─── ProjectModal ─────────────────────────────────────────────────────────────

function ProjectModal({ open, onOpenChange, onSubmit, project }) {
  const [form, setForm] = useState({
    name: "", description: "", type: "personal",
    status: "active", color: PROJECT_COLORS[0], deadline: "",
  });

  useEffect(() => {
    setForm({
      name:        project?.name        ?? "",
      description: project?.description ?? "",
      type:        project?.type        ?? "personal",
      status:      project?.status      ?? "active",
      color:       project?.color       ?? PROJECT_COLORS[0],
      deadline:    project?.deadline    ?? "",
    });
  }, [project, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({ ...form, deadline: form.deadline || null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Name</label>
            <Input
              autoFocus
              placeholder="What are you working on?"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              placeholder="What's the goal? What does success look like?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Deadline <span className="text-slate-400 font-normal">(optional)</span></label>
            <Input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    form.color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ProjectTaskItem ──────────────────────────────────────────────────────────

function ProjectTaskItem({ task, onToggle, onDelete }) {
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dl = task.due_date ? deadlineLabel(task.due_date) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group",
        task.is_done ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200 hover:border-indigo-200"
      )}
    >
      <button
        onClick={() => onToggle(task)}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
          task.is_done ? "border-indigo-500 bg-indigo-500" : "border-slate-300 hover:border-indigo-400"
        )}
      >
        {task.is_done && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", task.is_done ? "line-through text-slate-400" : "text-slate-800")}>
          {task.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn("text-xs font-medium", pc.color)}>{pc.label}</span>
          {dl && <span className={cn("text-xs", dl.cls)}>{dl.text}</span>}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── ProjectDetailPanel ───────────────────────────────────────────────────────

function ProjectDetailPanel({ project, tasks, open, onOpenChange, queryClient }) {
  const [newTaskName, setNewTaskName]         = useState("");
  const [newTaskDue, setNewTaskDue]           = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [activeSection, setActiveSection]     = useState("tasks");

  const chatKey = `${CHAT_STORAGE_PREFIX}${project?.id}`;
  const [chatMessages, setChatMessages] = useState(() => {
    if (!project?.id) return [];
    try { return JSON.parse(localStorage.getItem(chatKey) || "[]"); } catch { return []; }
  });
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef    = useRef(null);
  const taskInputRef = useRef(null);

  useEffect(() => {
    if (!project?.id) return;
    try { setChatMessages(JSON.parse(localStorage.getItem(chatKey) || "[]")); } catch {}
  }, [project?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const addTask = async () => {
    if (!newTaskName.trim()) return;
    await base44.entities.ProjectTask.create({
      project_id: project.id,
      name: newTaskName.trim(),
      is_done: false,
      due_date: newTaskDue || null,
      priority: newTaskPriority,
    });
    queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
    setNewTaskName("");
    setNewTaskDue("");
    setNewTaskPriority("medium");
    taskInputRef.current?.focus();
  };

  const toggleTask = async (task) => {
    await base44.entities.ProjectTask.update(task.id, { is_done: !task.is_done });
    queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
  };

  const deleteTask = async (id) => {
    await base44.entities.ProjectTask.delete(id);
    queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
  };

  const sendChat = async (text) => {
    if (!text.trim() || chatLoading) return;
    setChatInput("");
    const userMsg = { role: "user", content: text.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    localStorage.setItem(chatKey, JSON.stringify(updated.slice(-60)));
    setChatLoading(true);
    try {
      const context = buildProjectContext(project, tasks);
      const reply = await sendMessageToClaudeWithContext(updated, context);
      const withReply = [...updated, { role: "assistant", content: reply }];
      setChatMessages(withReply);
      localStorage.setItem(chatKey, JSON.stringify(withReply.slice(-60)));
    } catch (err) {
      const withErr = [...updated, { role: "assistant", content: `Something went wrong: ${err.message}` }];
      setChatMessages(withErr);
      localStorage.setItem(chatKey, JSON.stringify(withErr.slice(-60)));
    } finally {
      setChatLoading(false);
    }
  };

  if (!project) return null;

  const prog          = computeProgress(tasks);
  const dl            = deadlineLabel(project.deadline);
  const tc            = TYPE_CONFIG[project.type]    || TYPE_CONFIG.personal;
  const sc            = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const pendingTasks  = tasks.filter(t => !t.is_done);
  const doneTasks     = tasks.filter(t =>  t.is_done);

  const quickPrompts = [
    "What should I work on first?",
    "Help me break this into smaller steps",
    "Am I on track to hit my deadline?",
    "What are the biggest risks I should watch for?",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex-shrink-0 mt-0.5" style={{ backgroundColor: project.color || PROJECT_COLORS[0] }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800 truncate">{project.name}</h2>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", tc.bg)}>{tc.label}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.bg)}>{sc.label}</span>
            </div>
            {project.description && (
              <p className="text-sm text-slate-500 mt-0.5 truncate">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${prog.pct}%`, backgroundColor: project.color || "#6366f1" }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{prog.done}/{prog.total} tasks</span>
              </div>
              {dl && <span className={cn("text-xs font-medium", dl.cls)}>{dl.text}</span>}
            </div>
          </div>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex md:hidden border-b border-slate-100 flex-shrink-0">
          {[["tasks", "Tasks"], ["chat", "AI Advisor"]].map(([s, label]) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-all",
                activeSection === s ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Task list */}
          <div className={cn("flex flex-col border-r border-slate-100 w-full md:w-1/2", activeSection !== "tasks" && "hidden md:flex")}>
            {/* Add task */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex-shrink-0 space-y-2">
              <input
                ref={taskInputRef}
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
                placeholder="Add a task or milestone… (Enter to add)"
                className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={e => setNewTaskDue(e.target.value)}
                  className="flex-1 text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-600"
                />
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="w-28 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addTask}
                  disabled={!newTaskName.trim()}
                  size="sm"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              <AnimatePresence>
                {pendingTasks.map(task => (
                  <ProjectTaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </AnimatePresence>

              {doneTasks.length > 0 && (
                <details className="group mt-2">
                  <summary className="text-xs text-slate-400 font-medium cursor-pointer py-2 hover:text-slate-600 list-none flex items-center gap-1 select-none">
                    <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                    Completed ({doneTasks.length})
                  </summary>
                  <div className="space-y-2 mt-1">
                    <AnimatePresence>
                      {doneTasks.map(task => (
                        <ProjectTaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                      ))}
                    </AnimatePresence>
                  </div>
                </details>
              )}

              {tasks.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No tasks yet</p>
                  <p className="text-xs mt-1">Add your first task above</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — AI Advisor */}
          <div className={cn("flex flex-col w-full md:w-1/2", activeSection !== "chat" && "hidden md:flex")}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Project Advisor</p>
                <p className="text-xs text-slate-400">Knows your tasks and deadline</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="space-y-3">
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Your Project Advisor</p>
                    <p className="text-xs text-slate-400 mt-1">Ask anything about this project</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {quickPrompts.map(q => (
                      <button
                        key={q}
                        onClick={() => sendChat(q)}
                        className="text-left text-xs px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-3">
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                placeholder="Ask your project advisor…"
                rows={1}
                disabled={chatLoading}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                style={{ minHeight: "40px", maxHeight: "100px" }}
              />
              <Button
                onClick={() => sendChat(chatInput)}
                disabled={!chatInput.trim() || chatLoading}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3"
              >
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

function ProjectCard({ project, tasks, onEdit, onDelete, onOpenDetail }) {
  const prog = computeProgress(tasks);
  const dl   = deadlineLabel(project.deadline);
  const tc   = TYPE_CONFIG[project.type]    || TYPE_CONFIG.personal;
  const sc   = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => onOpenDetail(project)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", tc.bg)}>{tc.label}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.bg)}>{sc.label}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(project)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-800 text-base leading-snug">{project.name}</h3>
        {project.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{project.description}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">{prog.done}/{prog.total} tasks</span>
          <span className="text-xs font-semibold text-slate-600">{prog.pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${prog.pct}%`, backgroundColor: project.color || "#6366f1" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {dl
          ? <span className={cn("text-xs font-medium", dl.cls)}>{dl.text}</span>
          : <span className="text-xs text-slate-300">No deadline</span>
        }
        <button
          onClick={e => { e.stopPropagation(); onOpenDetail(project); }}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          AI Advisor
        </button>
      </div>
    </motion.div>
  );
}

// ─── ProjectRow ───────────────────────────────────────────────────────────────

function ProjectRow({ project, tasks, onEdit, onDelete, onOpenDetail }) {
  const prog = computeProgress(tasks);
  const dl   = deadlineLabel(project.deadline);
  const tc   = TYPE_CONFIG[project.type]    || TYPE_CONFIG.personal;
  const sc   = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => onOpenDetail(project)}
    >
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-800 truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-slate-400 truncate">{project.description}</p>
        )}
      </div>

      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium hidden sm:inline", tc.bg)}>
        {tc.label}
      </span>

      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline", sc.bg)}>
        {sc.label}
      </span>

      <div className="w-28 hidden md:flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, backgroundColor: project.color || "#6366f1" }} />
        </div>
        <span className="text-xs text-slate-400 w-8 text-right">{prog.pct}%</span>
      </div>

      <div className="w-20 text-right hidden lg:block">
        {dl
          ? <span className={cn("text-xs font-medium", dl.cls)}>{dl.text}</span>
          : <span className="text-xs text-slate-300">—</span>
        }
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(project)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Projects() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.email],
    queryFn: () => base44.entities.Project.filter({ created_by: user.email }, "-created_at"),
    enabled: !!user?.email,
  });

  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ["projectTasks", user?.email],
    queryFn: () => base44.entities.ProjectTask.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    const unsubProj = base44.entities.Project.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    );
    const unsubTask = base44.entities.ProjectTask.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] })
    );
    return () => { unsubProj(); unsubTask(); };
  }, []);

  const [statusFilter, setStatusFilter]         = useState("all");
  const [sortBy, setSortBy]                     = useState("created");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject]     = useState(null);
  const [detailProject, setDetailProject]       = useState(null);

  const tasksByProject = useMemo(() => {
    const map = {};
    for (const t of allProjectTasks) {
      if (!map[t.project_id]) map[t.project_id] = [];
      map[t.project_id].push(t);
    }
    return map;
  }, [allProjectTasks]);

  const detailTasks = detailProject ? (tasksByProject[detailProject.id] || []) : [];

  const visibleProjects = useMemo(() => {
    let result = projects;
    if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "deadline") {
      result = [...result].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    } else if (sortBy === "progress") {
      result = [...result].sort((a, b) => {
        const pa = computeProgress(tasksByProject[a.id] || []).pct;
        const pb = computeProgress(tasksByProject[b.id] || []).pct;
        return pb - pa;
      });
    }
    return result;
  }, [projects, statusFilter, sortBy, tasksByProject]);

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created!");
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated!");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id) => {
      const tasks = tasksByProject[id] || [];
      await Promise.all(tasks.map(t => base44.entities.ProjectTask.delete(t.id)));
      await base44.entities.Project.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectTasks"] });
      toast.success("Project deleted");
    },
  });

  const handleModalSubmit = (formData) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createProjectMutation.mutate(formData);
    }
    setEditingProject(null);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this project and all its tasks?")) {
      deleteProjectMutation.mutate(id);
    }
  };

  const SORT_OPTIONS = [
    { value: "created",  label: "Newest" },
    { value: "deadline", label: "Deadline" },
    { value: "progress", label: "Progress" },
    { value: "name",     label: "Name A–Z" },
  ];
  const STATUS_FILTERS = ["all", ...Object.keys(STATUS_CONFIG)];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-slate-400 text-sm mt-1">Track your ventures, goals, and long-term work</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-xl text-xs w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map(s => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : STATUS_CONFIG[s]?.label ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="rounded-xl text-xs w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-slate-400 ml-auto">
          {visibleProjects.length} project{visibleProjects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {visibleProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-lg font-semibold text-slate-700">No projects yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            {statusFilter !== "all"
              ? "No projects match your current filters."
              : "Create your first project to start tracking your work."}
          </p>
          {statusFilter === "all" && (
            <Button
              onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create your first project
            </Button>
          )}
        </motion.div>
      )}

      {/* Grid */}
      {visibleProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {visibleProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                tasks={tasksByProject[project.id] || []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenDetail={setDetailProject}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        open={showProjectModal}
        onOpenChange={(open) => { setShowProjectModal(open); if (!open) setEditingProject(null); }}
        onSubmit={handleModalSubmit}
        project={editingProject}
      />

      {detailProject && (
        <ProjectDetailPanel
          project={detailProject}
          tasks={detailTasks}
          open={!!detailProject}
          onOpenChange={(open) => { if (!open) setDetailProject(null); }}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}
