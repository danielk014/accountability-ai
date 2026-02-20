import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "America/Adak", "Pacific/Honolulu",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Hong_Kong", "Asia/Tokyo",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Pacific/Auckland",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profile", user?.email],
    queryFn: () => user?.email ? base44.entities.UserProfile.filter({ created_by: user.email }) : [],
  });

  const profile = profiles[0];
  const [formData, setFormData] = useState({
    timezone: profile?.timezone || "America/New_York",
    language: "en",
    motivation_style: profile?.motivation_style || "direct",
    goals: profile?.goals?.join("\n") || "",
    about_me_notes: profile?.about_me_notes?.join("\n") || "",
  });

  React.useEffect(() => {
    if (profile) {
      setFormData({
        timezone: profile.timezone || "America/New_York",
        language: "en",
        motivation_style: profile.motivation_style || "direct",
        goals: profile.goals?.join("\n") || "",
        about_me_notes: profile.about_me_notes?.join("\n") || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const goalsArray = formData.goals
        .split("\n")
        .map(g => g.trim())
        .filter(g => g.length > 0);
      
      const aboutArray = formData.about_me_notes
        .split("\n")
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (profile) {
        await base44.entities.UserProfile.update(profile.id, {
          timezone: formData.timezone,
          motivation_style: formData.motivation_style,
          goals: goalsArray,
          about_me_notes: aboutArray,
          context_goals: goalsArray,
          context_about: aboutArray,
        });
      } else {
        await base44.entities.UserProfile.create({
          timezone: formData.timezone,
          motivation_style: formData.motivation_style,
          goals: goalsArray,
          about_me_notes: aboutArray,
          context_goals: goalsArray,
          context_about: aboutArray,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to={createPageUrl("Dashboard")} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 text-sm mt-1">Manage your profile and preferences</p>
          </div>
        </div>

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Localization */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Localization</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Preferences</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Coaching Style</Label>
                <Select value={formData.motivation_style} onValueChange={(v) => setFormData({ ...formData, motivation_style: v })}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gentle">Gentle & Encouraging</SelectItem>
                    <SelectItem value="direct">Direct & Straightforward</SelectItem>
                    <SelectItem value="tough_love">Tough Love & Intense</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">How the AI should coach you</p>
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Your Goals</h2>
            <div className="space-y-2 mb-4">
              <Label htmlFor="goals">Personal Goals (one per line)</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="e.g. Get fit and healthy&#10;Learn a new language&#10;Read more books"
                className="rounded-xl h-24 bg-slate-50 border-slate-200 resize-none"
              />
            </div>
          </div>

          {/* About Me */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">About Me</h2>
            <div className="space-y-2 mb-4">
              <Label htmlFor="about">Personal Notes (one per line)</Label>
              <Textarea
                id="about"
                value={formData.about_me_notes}
                onChange={(e) => setFormData({ ...formData, about_me_notes: e.target.value })}
                placeholder="e.g. I'm a morning person&#10;I work in tech&#10;I have two kids"
                className="rounded-xl h-24 bg-slate-50 border-slate-200 resize-none"
              />
              <p className="text-xs text-slate-500">Help the AI understand you better</p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex gap-3">
            <Link to={createPageUrl("Dashboard")} className="flex-1">
              <Button variant="outline" className="w-full rounded-xl h-11">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}