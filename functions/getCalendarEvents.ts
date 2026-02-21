import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
        const profile = profiles[0];

        if (!profile?.google_access_token) {
            return Response.json({ error: 'Google Calendar not connected' }, { status: 403 });
        }

        let accessToken = profile.google_access_token;

        // Refresh token if expired
        if (profile.google_token_expiry && new Date(profile.google_token_expiry) < new Date()) {
            if (!profile.google_refresh_token) {
                return Response.json({ error: 'Token expired, please reconnect Google Calendar' }, { status: 403 });
            }

            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
                    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
                    refresh_token: profile.google_refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            const refreshData = await refreshResponse.json();
            if (!refreshData.access_token) {
                return Response.json({ error: 'Failed to refresh token, please reconnect' }, { status: 403 });
            }

            accessToken = refreshData.access_token;
            await base44.entities.UserProfile.update(profile.id, {
                google_access_token: accessToken,
                google_token_expiry: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
            });
        }

        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${thirtyDaysLater.toISOString()}&maxResults=50&orderBy=startTime&singleEvents=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!calendarResponse.ok) {
            const errText = await calendarResponse.text();
            throw new Error(`Calendar API error: ${calendarResponse.status} - ${errText}`);
        }

        const calendarData = await calendarResponse.json();
        return Response.json({
            success: true,
            events: calendarData.items || [],
            count: calendarData.items?.length || 0,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});