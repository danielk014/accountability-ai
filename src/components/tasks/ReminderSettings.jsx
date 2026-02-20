import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function ReminderSettings({ reminderEnabled, reminderTime, reminderDays, reminderType, onChange }) {
  const handleDayToggle = (day) => {
    const updated = reminderDays?.includes(day)
      ? reminderDays.filter(d => d !== day)
      : [...(reminderDays || []), day];
    onChange({ ...{reminderEnabled, reminderTime, reminderDays: updated, reminderType} });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Enable Reminders</Label>
        <Switch
          checked={reminderEnabled || false}
          onCheckedChange={(checked) => onChange({ reminderEnabled: checked, reminderTime, reminderDays, reminderType })}
        />
      </div>

      {reminderEnabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="reminder-time" className="text-sm">Reminder Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime || ""}
              onChange={(e) => onChange({ reminderEnabled, reminderTime: e.target.value, reminderDays, reminderType })}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Reminder Days</Label>
            <div className="grid grid-cols-2 gap-3">
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={reminderDays?.includes(day) || false}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <Label htmlFor={`day-${day}`} className="text-xs capitalize cursor-pointer">{day}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-type" className="text-sm">Delivery Method</Label>
            <Select value={reminderType || "in_app"} onValueChange={(v) => onChange({ reminderEnabled, reminderTime, reminderDays, reminderType: v })}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In-App Only</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}