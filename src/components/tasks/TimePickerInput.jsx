import React, { useState } from "react";
import { Clock } from "lucide-react";

export default function TimePickerInput({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(value ? value.split(":")[0] : "09");
  const [minutes, setMinutes] = useState(value ? value.split(":")[1] : "00");

  const handleConfirm = () => {
    onChange(`${hours}:${minutes}`);
    setIsOpen(false);
  };

  const handleHourChange = (e) => {
    const val = e.target.value;
    if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
      setHours(val.padStart(2, "0"));
    }
  };

  const handleMinuteChange = (e) => {
    const val = e.target.value;
    if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
      setMinutes(val.padStart(2, "0"));
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
      >
        <Clock className="w-4 h-4 text-slate-400" />
        {value ? `${hours}:${minutes}` : "Select time"}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-lg p-6 w-72">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              {/* Hours */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHours(String((parseInt(hours) + 1) % 24).padStart(2, "0"))}
                  className="p-2 hover:bg-indigo-50 rounded-lg transition text-slate-600 font-medium"
                >
                  ▲
                </button>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={handleHourChange}
                  className="w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 border-indigo-300 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setHours(String((parseInt(hours) - 1 + 24) % 24).padStart(2, "0"))}
                  className="p-2 hover:bg-indigo-50 rounded-lg transition text-slate-600 font-medium"
                >
                  ▼
                </button>
              </div>

              <span className="text-2xl font-bold text-slate-400">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMinutes(String((parseInt(minutes) + 5) % 60).padStart(2, "0"))}
                  className="p-2 hover:bg-indigo-50 rounded-lg transition text-slate-600 font-medium"
                >
                  ▲
                </button>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={handleMinuteChange}
                  className="w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 border-indigo-300 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setMinutes(String((parseInt(minutes) - 5 + 60) % 60).padStart(2, "0"))}
                  className="p-2 hover:bg-indigo-50 rounded-lg transition text-slate-600 font-medium"
                >
                  ▼
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}