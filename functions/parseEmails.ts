import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token for Gmail
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Fetch recent emails from Gmail API
    const gmailResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=5',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const messagesData = await gmailResponse.json();
    const messageIds = messagesData.messages?.map(m => m.id) || [];

    // Fetch full message details
    const emailMessages = await Promise.all(
      messageIds.map(id =>
        fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }).then(r => r.json())
      )
    );

    // Parse emails to extract tasks and context
    const parsedEmails = emailMessages.map(msg => {
      const headers = msg.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender';
      
      let body = '';
      if (msg.payload?.parts) {
        const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = atob(textPart.body.data);
        }
      } else if (msg.payload?.body?.data) {
        body = atob(msg.payload.body.data);
      }

      return {
        id: msg.id,
        subject,
        from,
        snippet: msg.snippet,
        body: body.substring(0, 500), // First 500 chars
      };
    });

    // Use LLM to extract tasks and context
    const extractionPrompt = `Analyze these emails and extract:
1. Important tasks mentioned (be specific)
2. Key context/information the user should know
3. Action items needed

Emails:
${parsedEmails.map(e => `Subject: ${e.subject}\nFrom: ${e.from}\nContent: ${e.snippet}`).join('\n---\n')}

Return as JSON with structure:
{
  "tasks": [{"title": "...", "description": "...", "priority": "high|medium|low"}],
  "context": ["key point 1", "key point 2"],
  "actionItems": ["action 1", "action 2"]
}`;

    const extraction = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string' }
              }
            }
          },
          context: { type: 'array', items: { type: 'string' } },
          actionItems: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      emails: parsedEmails,
      extracted: extraction,
      count: parsedEmails.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});