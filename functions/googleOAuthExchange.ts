import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { code, redirect_uri } = await req.json();

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
                client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
                redirect_uri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            return Response.json({ error: 'Failed to get access token', details: tokens }, { status: 400 });
        }

        const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
        const profile = profiles[0];

        const tokenData = {
            google_access_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token || null,
            google_token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        };

        if (profile) {
            await base44.entities.UserProfile.update(profile.id, tokenData);
        } else {
            await base44.entities.UserProfile.create(tokenData);
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});