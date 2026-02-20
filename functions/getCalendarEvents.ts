import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let accessToken;
    try {
      accessToken = await base44.connectors.getAccessToken('googlecalendar');
    } catch (error) {
      return Response.json({ 
        error: 'Google Calendar not connected. Please authorize in Settings.' 
      }, { status: 403 });
    }
    
    // Fetch events from Google Calendar
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=50&singleEvents=true&orderBy=startTime`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return Response.json({
      success: true,
      events: data.items || [],
      count: data.items?.length || 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});