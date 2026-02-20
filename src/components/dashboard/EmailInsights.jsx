import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Loader2, AlertCircle, Plus, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export default function EmailInsights() {
  const [emails, setEmails] = useState([]);
  const [extracted, setExtracted] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        // Check if Gmail is connected by trying to parse emails
        const response = await base44.functions.invoke('parseEmails');
        if (response.data?.emails) {
          setIsGmailConnected(true);
        }
      } catch (error) {
        setIsGmailConnected(false);
      }
    };
    checkConnections();
  }, []);

  const handleLoadEmails = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('parseEmails');
      setEmails(response.data.emails);
      setExtracted(response.data.extracted);
      setExpanded(true);
    } catch (error) {
      toast.error("Failed to load emails");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (taskTitle) => {
    try {
      await base44.entities.Task.create({
        name: taskTitle,
        frequency: "once",
        scheduled_date: new Date().toISOString().split("T")[0],
        category: "work",
        is_active: true,
      });
      toast.success("Task created!");
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800">Email Insights</h3>
        </div>
        {isGmailConnected || isOutlookConnected ? (
          <button
            onClick={handleLoadEmails}
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Check Emails
              </>
            )}
          </button>
        ) : (
          <div className="text-xs text-slate-500">Connect email to continue</div>
        )}
      </div>

      {/* Connection status */}
      {!isGmailConnected && !isOutlookConnected && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-slate-700 mb-3">Connect your email to get insights:</p>
          <div className="flex gap-2">
            <a
              href={base44.agents.getWhatsAppConnectURL('accountability_partner')}
              onClick={(e) => {
                e.preventDefault();
                toast.info("Gmail is already connected!");
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Gmail
            </a>
            <button
              onClick={() => toast.info("Outlook integration coming soon")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-not-allowed opacity-50"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Outlook
            </button>
          </div>
        </div>
      )}

      {(isGmailConnected || isOutlookConnected) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700">
            {isGmailConnected ? "Gmail" : ""}{isGmailConnected && isOutlookConnected ? " & Outlook" : isOutlookConnected ? "Outlook" : ""} connected
          </p>
        </div>
      )}

      {expanded && extracted && (
        <div className="space-y-4">
          {/* Extracted Tasks */}
          {extracted.tasks?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">SUGGESTED TASKS</p>
              <div className="space-y-2">
                {extracted.tasks.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCreateTask(task.title)}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-blue-200 text-blue-600 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {extracted.actionItems?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">ACTION ITEMS</p>
              <div className="space-y-1.5">
                {extracted.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context */}
          {extracted.context?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">KEY CONTEXT</p>
              <div className="space-y-1.5">
                {extracted.context.map((ctx, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1" />
                    <span>{ctx}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Count */}
          <p className="text-xs text-slate-400">
            Analyzed {emails.length} unread email{emails.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}