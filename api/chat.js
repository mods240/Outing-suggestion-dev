export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, stream } = req.body;

  // 複数APIキーをローテーション（Vercelの環境変数に設定）
  const apiKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'No API keys configured' });
  }

  // 順番に試して、rate limitなら次のキーへ
  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys[i]}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          max_tokens: 8000,
          stream: stream || false,
        }),
      });

      // rate limit → 次のキーへ
      if (response.status === 429) {
        console.log(`Key ${i + 1} rate limited, trying next...`);
        continue;
      }

      if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json({ error: error.error?.message || 'API error' });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        response.body.pipeTo(new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); }
        }));
      } else {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        res.status(200).json({ content: [{ type: 'text', text }] });
      }
      return;

    } catch (e) {
      if (i === apiKeys.length - 1) {
        return res.status(500).json({ error: e.message });
      }
      continue;
    }
  }

  // 全キーが上限
  return res.status(429).json({ error: '本日の利用上限に達しました。明日またお試しください。' });
}
