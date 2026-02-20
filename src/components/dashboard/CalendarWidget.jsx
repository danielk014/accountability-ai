import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Loader2, Plus, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import AddEventDialog from "./AddEventDialog";

export default function CalendarWidget() {
  const [showAddEvent, setShowAddEvent] = useState(false);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ["calendarEvents"],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke("getCalendarEvents");
        return response.data.events || [];
      } catch (error) {
        toast.error("Failed to load calendar events");
        return [];
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const handleAddEvent = async (eventData) => {
    try {
      await base44.functions.invoke("addCalendarEvent", eventData);
      toast.success("Event added to calendar!");
      refetch();
      setShowAddEvent(false);
    } catch (error) {
      toast.error("Failed to add event");
    }
  };

  // Sort and limit to next 5 events
  const upcomingEvents = events
    .sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date))
    .slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Calendar</h3>
        </div>
        <Button
          onClick={() => setShowAddEvent(true)}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 rounded-lg"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Event
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : upcomingEvents.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>No upcoming events</p>
          <p className="text-xs mt-1">Add your first event to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingEvents.map((event) => {
            const startDate = new Date(event.start.dateTime || event.start.date);
            const isAllDay = !event.start.dateTime;

            return (
              <div key={event.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{event.summary}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                      {!isAllDay && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format(startDate, "MMM d, h:mm a")}</span>
                        </div>
                      )}
                      {isAllDay && (
                        <span>{format(startDate, "MMM d")}</span>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddEventDialog
        open={showAddEvent}
        onOpenChange={setShowAddEvent}
        onSubmit={handleAddEvent}
      />
    </div>
  );
}