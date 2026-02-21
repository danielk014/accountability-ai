import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, SkipForward, Settings2, Check } from "lucide-react";

const MODES = [
  { key: "focus", label: "Focus", color: "from-rose-500 to-orange-500", bg: "bg-rose-50", ring: "ring-rose-400", text: "text-rose-600", defaultMin: 25 },
  { key: "short", label: "Short Break", color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", ring: "ring-emerald-400", text: "text-emerald-600", defaultMin: 5 },
  { key: "long", label: "Long Break", color: "from-blue-500 to-indigo-500", bg: "bg-blue-50", ring: "ring-blue-400", text: "text-blue-600", defaultMin: 15 },
];

function pad(n) { return String(n).padStart(2, "0"); }

export default function Pomodoro() {
  const [modeKey, setModeKey] = useState("focus");
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 });
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingDraft, setSettingDraft] = useState({ focus: 25, short: 5, long: 15 });
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  const mode = MODES.find(m => m.key === modeKey);
  const totalSeconds = durations[modeKey] * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            playDone();
            if (modeKey === "focus") setSessions(n => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, modeKey]);

  function playDone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      [0, 0.3, 0.6].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.4);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
      });
    } catch {}
  }

  function switchMode(key) {
    setModeKey(key);
    setRunning(false);
    setSecondsLeft(durations[key] * 60);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(durations[modeKey] * 60);
  }

  function skip() {
    setRunning(false);
    if (modeKey === "focus") {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      switchMode(newSessions % 4 === 0 ? "long" : "short");
    } else {
      switchMode("focus");
    }
  }

  function saveSettings() {
    setDurations(settingDraft);
    setSecondsLeft(settingDraft[modeKey] * 60);
    setRunning(false);
    setShowSettings(false);
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  // SVG circle
  const R = 110;
  const circ = 2 * Math.PI * R;
  const dash = circ * (1 - progress);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pomodoro Timer</h1>
            <p className="text-slate-500 text-sm mt-0.5">{sessions} session{sessions !== 1 ? "s" : ""} completed today</p>
          </div>
          <button onClick={() => { setShowSettings(s => !s); setSettingDraft({ ...durations }); }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
            <p className="text-sm font-bold text-slate-800 mb-4">Timer Settings (minutes)</p>
            {[
              { key: "focus", label: "Focus" },
              { key: "short", label: "Short Break" },
              { key: "long", label: "Long Break" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSettingDraft(d => ({ ...d, [key]: Math.max(1, d[key] - 1) }))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center transition">−</button>
                  <span className="w-8 text-center text-sm font-bold text-slate-800">{settingDraft[key]}</span>
                  <button onClick={() => setSettingDraft(d => ({ ...d, [key]: Math.min(90, d[key] + 1) }))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center transition">+</button>
                </div>
              </div>
            ))}
            <button onClick={saveSettings}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 mt-2">
              <Check className="w-4 h-4" /> Save Settings
            </button>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex gap-2 mb-8 bg-white border border-slate-200 rounded-2xl p-1.5">
          {MODES.map(m => (
            <button key={m.key} onClick={() => switchMode(m.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                modeKey === m.key
                  ? `bg-gradient-to-r ${m.color} text-white shadow-md`
                  : "text-slate-500 hover:text-slate-700"
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer circle */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <svg width="260" height="260" className="-rotate-90">
              <circle cx="130" cy="130" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle cx="130" cy="130" r={R} fill="none" strokeWidth="10"
                stroke="url(#grad)"
                strokeDasharray={circ}
                strokeDashoffset={dash}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={modeKey === "focus" ? "#f43f5e" : modeKey === "short" ? "#10b981" : "#6366f1"} />
                  <stop offset="100%" stopColor={modeKey === "focus" ? "#f97316" : modeKey === "short" ? "#14b8a6" : "#3b82f6"} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold text-slate-800 tabular-nums tracking-tight">
                {pad(mins)}:{pad(secs)}
              </span>
              <span className={`text-sm font-semibold mt-1 ${mode.text}`}>{mode.label}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={reset}
            className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition shadow-sm">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${mode.color} text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center`}>
            {running ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          <button onClick={skip}
            className="w-12 h-12 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition shadow-sm">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Session dots */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${
              i < sessions % 4 ? `bg-gradient-to-br ${mode.color}` : "bg-slate-200"
            }`} />
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          {4 - (sessions % 4)} more until long break
        </p>
      </div>
    </div>
  );
}