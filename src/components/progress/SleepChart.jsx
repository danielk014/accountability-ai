import React, { useState, useMemo } from "react";
import { format, subWeeks, startOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SleepChart({ sleepData }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ date: "", hours: "", sleep_time: "", quality: "good" });
  const queryClient = useQueryClient();
  const weekStart = startOfWeek(subWeeks(new Date(), -weekOffset));

  // Calculate sleep quality score (0-10) based on hours and target of 7-9 hours for adult males
  const calculateSleepScore = (hours) => {
    if (hours < 4) return 2;
    if (hours < 6) return 4;
    if (hours < 7) return 6;
    if (hours <= 9) return 10;
    if (hours <= 10) return 8;
    return 6;
  };

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, dayIdx) => {
      const dayDate = addDays(weekStart, dayIdx);
      const dayStr = format(dayDate, "yyyy-MM-dd");
      const dayName = format(dayDate, "EEE");
      const sleep = sleepData.find(s => s.date === dayStr);
      const hours = sleep?.hours || 0;

      return {
        day: dayName,
        date: dayStr,
        hours: hours,
        quality: sleep?.quality || "none",
        sleep_time: sleep?.sleep_time || "",
        score: hours > 0 ? calculateSleepScore(hours) : 0,
        id: sleep?.id,
      };
    });
  }, [sleepData, weekStart]);

  const avgHours = (chartData.reduce((sum, d) => sum + d.hours, 0) / 7).toFixed(1);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Sleep.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep"] });
      setDialogOpen(false);
      setFormData({ date: "", hours: "", quality: "good" });
      toast.success("Sleep recorded!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sleep.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep"] });
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ date: "", hours: "", quality: "good" });
      toast.success("Sleep updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Sleep.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep"] });
      toast.success("Sleep entry deleted!");
    },
  });

  const handleOpenDialog = (item) => {
    if (item?.id) {
      setEditingId(item.id);
      setFormData({ date: item.date, hours: item.hours, sleep_time: item.sleep_time, quality: item.quality });
    } else {
      const today = format(new Date(), "yyyy-MM-dd");
      setFormData({ date: today, hours: "", sleep_time: "", quality: "good" });
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.date || !formData.hours) {
      toast.error("Fill in all fields");
      return;
    }
    const data = {
      date: formData.date,
      hours: parseFloat(formData.hours),
      quality: formData.quality,
      ...(formData.sleep_time && { sleep_time: formData.sleep_time })
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Sleep Health</h2>
          <p className="text-xs text-slate-500 mt-1">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="rounded-lg h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(0)}
            className="rounded-lg h-8 w-8"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
            className="rounded-lg h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: "12px" }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => `${value}h`}
          />
          <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
          <p className="text-xs text-violet-600 font-medium">Average</p>
          <p className="text-lg font-bold text-violet-800 mt-1">{avgHours}h</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-emerald-600 font-medium">Best Night</p>
          <p className="text-lg font-bold text-emerald-800 mt-1">
            {Math.max(...chartData.map(d => d.hours || 0)).toFixed(1)}h
          </p>
        </div>
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
          <p className="text-xs text-indigo-600 font-medium">Avg Score</p>
          <p className="text-lg font-bold text-indigo-800 mt-1">
            {chartData.filter(d => d.hours > 0).length > 0 
              ? (chartData.reduce((s, d) => s + d.score, 0) / chartData.filter(d => d.hours > 0).length).toFixed(1) 
              : "—"}/10
          </p>
        </div>
        <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
          <p className="text-xs text-sky-600 font-medium">Nights Logged</p>
          <p className="text-lg font-bold text-sky-800 mt-1">{chartData.filter(d => d.hours > 0).length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {chartData.map((item) => {
          const scoreColor = item.score >= 8 ? "text-emerald-600 bg-emerald-50" : item.score >= 6 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
          return (
            <div
              key={item.date}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 group hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-semibold text-slate-800 w-12">{item.day}</span>
                {item.hours > 0 ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min(item.hours / 10 * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{item.hours}h</span>
                    {item.sleep_time && <span className="text-xs text-slate-500 px-2 py-1 rounded bg-white">{item.sleep_time}</span>}
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${scoreColor}`}>{item.score}/10</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No data</span>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDialog(item)}
                  className="h-7 w-7 rounded"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                {item.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="h-7 w-7 rounded text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Sleep" : "Log Sleep"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="8.5"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={formData.quality} onValueChange={(v) => setFormData({ ...formData, quality: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="rounded-xl bg-violet-600 hover:bg-violet-700">
              {editingId ? "Update" : "Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}