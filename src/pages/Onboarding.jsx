import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
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
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (EU)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    timezone: "America/New_York",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    goals: "",
    motivation_style: "direct",
  });

  const handleNext = async () => {
    if (step === 3) {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        const goals = formData.goals
          .split("\n")
          .map(g => g.trim())
          .filter(g => g.length > 0);

        // Create or update UserProfile
        const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
        
        if (profiles.length > 0) {
          await base44.entities.UserProfile.update(profiles[0].id, {
            timezone: formData.timezone,
            goals,
            motivation_style: formData.motivation_style,
            context_goals: goals.length > 0 ? goals : undefined,
          });
        } else {
          await base44.entities.UserProfile.create({
            timezone: formData.timezone,
            goals,
            motivation_style: formData.motivation_style,
            context_goals: goals.length > 0 ? goals : undefined,
          });
        }

        // Redirect to dashboard
        window.location.href = createPageUrl("Dashboard");
      } catch (error) {
        console.error("Error saving profile:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const isStepComplete = () => {
    if (step === 1) return formData.timezone && formData.language;
    if (step === 2) return formData.dateFormat;
    if (step === 3) return formData.goals.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to Accountable</h1>
          <p className="text-slate-600">Let's set up your profile to personalize your experience</p>
        </motion.div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-6"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Localization</h2>
              </div>

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
                  <p className="text-xs text-slate-500">Used for scheduling and reminders</p>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={formData.dateFormat} onValueChange={(v) => setFormData({ ...formData, dateFormat: v })}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map(fmt => (
                        <SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Goals</h2>
                <p className="text-slate-600">What are your main goals? Add one per line.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Personal Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  placeholder="e.g. Get fit and healthy&#10;Learn a new language&#10;Read more books&#10;Improve sleep schedule"
                  className="rounded-xl h-32 bg-slate-50 border-slate-200 resize-none"
                />
                <p className="text-xs text-slate-500">These will help Accountable AI provide better coaching</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              onClick={() => setStep(step - 1)}
              variant="outline"
              className="flex-1 rounded-xl h-11"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isStepComplete() || loading}
            className="flex-1 rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? (
              "Saving..."
            ) : step === 3 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}