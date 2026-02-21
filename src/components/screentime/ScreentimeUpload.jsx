import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, Smartphone, FileImage, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function ScreentimeUpload({ profile, saveMutation, compact = false }) {
  const [open, setOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = React.useRef(null);

  const screentimeFiles = profile?.screentime_files || [];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ name: file.name, url: file_url, uploaded_at: new Date().toISOString() });
      }
      const newFiles = [...screentimeFiles, ...uploaded];
      if (profile?.id) {
        await saveMutation.mutateAsync({ screentime_files: newFiles });
        toast.success(`${uploaded.length} screentime file${uploaded.length > 1 ? "s" : ""} uploaded!`);
      }
      // Auto-analyze the last uploaded image
      if (uploaded.length > 0) {
        await runAnalysis(uploaded[uploaded.length - 1].url);
      }
    } catch {
      toast.error("Failed to upload");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runAnalysis = async (fileUrl) => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this phone screentime screenshot. Extract:
1. Total daily/weekly screen time
2. Top apps and their usage time
3. Most problematic categories (social media, entertainment, etc.)
4. Any concerning patterns

Be concise and give 2-3 actionable accountability insights. Format with short bullet points.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            total_time: { type: "string" },
            top_apps: { type: "array", items: { type: "string" } },
            insights: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
          }
        }
      });
      setAnalysis(result);
    } catch {
      // silently fail analysis
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = (idx) => {
    const newFiles = screentimeFiles.filter((_, i) => i !== idx);
    if (profile?.id) {
      saveMutation.mutate({ screentime_files: newFiles });
      toast.success("Removed");
    }
  };

  if (compact) {
    // Compact version for chat sidebar
    return (
      <div className="border-b border-slate-100">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-100 text-orange-600">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">Screen Time</p>
              <p className="text-xs text-slate-400">{screentimeFiles.length > 0 ? `${screentimeFiles.length} uploaded` : "Upload for accountability"}</p>
            </div>
          </div>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-300" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />}
        </button>
        {open && (
          <div className="px-4 pb-4 space-y-2">
            {screentimeFiles.slice(-3).map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 group">
                <FileImage className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-xs text-slate-600 flex-1 truncate">{file.name}</span>
                <button onClick={() => handleDelete(screentimeFiles.length - (Math.min(3, screentimeFiles.length)) + i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
              className="w-full py-2 rounded-lg border border-dashed border-orange-300 text-xs text-orange-500 hover:bg-orange-50 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
              {isUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading...</> : <><Upload className="w-3.5 h-3.5" />Upload screenshot</>}
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*,.pdf" multiple />
            {analyzing && <p className="text-xs text-orange-400 text-center animate-pulse">Analyzing your screen time...</p>}
            {analysis && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1.5">
                {analysis.total_time && <p className="text-xs font-semibold text-orange-700">📱 {analysis.total_time}</p>}
                {analysis.insights?.map((ins, i) => (
                  <p key={i} className="text-xs text-slate-600">• {ins}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full version for Settings
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-100 text-orange-600">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">Screen Time</p>
            <p className="text-xs text-slate-400">{screentimeFiles.length > 0 ? `${screentimeFiles.length} file${screentimeFiles.length > 1 ? "s" : ""} uploaded` : "Upload screenshots for accountability"}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
      </button>

      {open && (
        <div className="px-6 pb-5 space-y-3">
          <p className="text-xs text-slate-500">Upload your iPhone/Android screen time screenshots so your AI coach can hold you accountable.</p>

          {screentimeFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-orange-100 rounded-xl px-4 py-3 group">
              <FileImage className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{new Date(file.uploaded_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => runAnalysis(file.url)} disabled={analyzing}
                  className="text-xs text-orange-500 hover:text-orange-700 font-medium">
                  {analyzing ? "Analyzing..." : "Analyze"}
                </button>
                <button onClick={() => handleDelete(i)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
            className="w-full py-2.5 rounded-xl border border-dashed border-orange-300 text-sm text-orange-500 hover:bg-orange-50 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
            {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload screen time (image or PDF)</>}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*,.pdf" multiple />
          <p className="text-xs text-slate-400 text-center">iPhone: Settings → Screen Time → screenshot it. Android: Digital Wellbeing.</p>

          {analyzing && (
            <div className="flex items-center gap-2 py-2 px-3 bg-orange-50 rounded-xl">
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              <p className="text-sm text-orange-600">Analyzing your screen time habits...</p>
            </div>
          )}

          {analysis && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-orange-800">📊 Screen Time Analysis</p>
              {analysis.total_time && <p className="text-sm text-slate-700">📱 Total: <strong>{analysis.total_time}</strong></p>}
              {analysis.top_apps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Top apps:</p>
                  {analysis.top_apps.map((app, i) => <p key={i} className="text-xs text-slate-600">• {app}</p>)}
                </div>
              )}
              {analysis.insights?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Insights:</p>
                  {analysis.insights.map((ins, i) => <p key={i} className="text-xs text-slate-600">• {ins}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}