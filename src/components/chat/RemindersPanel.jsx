import React, { useState, useEffect } from 'react';
import { Bell, Plus, X, Clock, Repeat, Check } from 'lucide-react';
import { getReminders, addReminder, deleteReminder, formatReminderTime, minutesFromNow } from '@/lib/reminderEngine';

const QUICK = [
  { label: '30 min',  minutes: 30 },
  { label: '1 hr',    minutes: 60 },
  { label: '2 hrs',   minutes: 120 },
];

export default function RemindersPanel() {
  const [reminders, setReminders] = useState(getReminders);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [mode, setMode] = useState('once'); // 'once' | 'daily'
  const [datetime, setDatetime] = useState('');
  const [dailyTime, setDailyTime] = useState('09:00');

  // Sync from localStorage on mount and when reminder fires or is updated by AI
  useEffect(() => {
    const refresh = () => setReminders(getReminders());
    window.addEventListener('reminder-fired', refresh);
    window.addEventListener('reminders-updated', refresh);
    return () => {
      window.removeEventListener('reminder-fired', refresh);
      window.removeEventListener('reminders-updated', refresh);
    };
  }, []);

  const handleAdd = () => {
    if (!text.trim()) return;
    if (mode === 'once' && !datetime) return;

    addReminder({
      text: text.trim(),
      type: mode,
      time:     mode === 'daily' ? dailyTime : null,
      datetime: mode === 'once'  ? datetime  : null,
    });

    setText('');
    setDatetime('');
    setDailyTime('09:00');
    setShowForm(false);
    setReminders(getReminders());
  };

  const handleDelete = (id) => {
    deleteReminder(id);
    setReminders(getReminders());
  };

  const handleQuick = (minutes) => {
    setMode('once');
    setDatetime(minutesFromNow(minutes));
    if (!showForm) setShowForm(true);
  };

  const upcoming = reminders.filter(r => !r.fired);
  const past     = reminders.filter(r => r.fired);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Quick buttons */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <p className="text-xs text-slate-400 mb-2">Quick reminder</p>
        <div className="flex gap-1.5 flex-wrap">
          {QUICK.map(q => (
            <button
              key={q.label}
              onClick={() => handleQuick(q.minutes)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition"
            >
              {q.label}
            </button>
          ))}
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-3 py-3 border-b border-slate-100 bg-indigo-50/40 space-y-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What to remind you about..."
            className="w-full text-xs rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />

          {/* Mode toggle */}
          <div className="flex gap-1">
            {[['once', 'One-time', Clock], ['daily', 'Daily', Repeat]].map(([val, label, Icon]) => (
              <button
                key={val}
                onClick={() => setMode(val)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  mode === val
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>

          {/* Time input */}
          {mode === 'once' ? (
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="w-full text-xs rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Time:</span>
              <input
                type="time"
                value={dailyTime}
                onChange={e => setDailyTime(e.target.value)}
                className="flex-1 text-xs rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!text.trim() || (mode === 'once' && !datetime)}
              className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-30 transition flex items-center justify-center gap-1"
            >
              <Bell className="w-3 h-3" /> Set Reminder
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {upcoming.length === 0 && !showForm && (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No reminders yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Tell the AI "remind me to…" or use the buttons above
            </p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="px-3 py-2 space-y-1.5">
            {upcoming.map(r => (
              <div
                key={r.id}
                className="flex items-start justify-between bg-white border border-slate-100 rounded-xl px-3 py-2.5 gap-2 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{r.text}</p>
                  <p className="text-xs text-indigo-500 mt-0.5 flex items-center gap-1">
                    {r.type === 'daily' ? <Repeat className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    {formatReminderTime(r)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition flex-shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fired / completed — max 3 */}
        {past.length > 0 && (
          <div className="px-3 pb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 mt-2">Sent</p>
            {past.slice(-3).reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 group">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-slate-500 truncate">{r.text}</p>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-0.5 text-slate-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
