export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        system: 'You are a JSON-only assistant. ALWAYS return raw JSON only. NEVER use markdown, NEVER use ```json, NEVER use ``` code blocks. Return only the raw JSON array or object, nothing else.',
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.error?.message || 'API error' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
