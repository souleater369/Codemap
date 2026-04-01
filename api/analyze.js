export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing code payload.' });

  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (!rawKeys) return res.status(500).json({ error: "Missing API keys in Vercel settings." });

  // Cleans the keys of any accidental spaces or quotes
  const keys = rawKeys.split(',').map(k => k.replace(/['"\s]+/g, '')).filter(k => k.length > 20);
  if (keys.length === 0) return res.status(500).json({ error: "API keys are malformed." });

  let lastError = "Unknown error";

  for (const [index, key] of keys.entries()) {
    try {
      // ---> THE GOLDEN TICKET: 2.5-flash-lite on v1beta <---
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }, 
          }),
        }
      );

      // ---> CRASH PREVENTION: Check if Google sent an HTML error page before parsing <---
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        lastError = `API returned invalid format (Likely Vercel Timeout).`;
        console.error(`Key ${index + 1} failed:`, text.substring(0, 100));
        continue; 
      }

      const data = await response.json();

      if (!response.ok) {
        lastError = data.error?.message || `HTTP ${response.status}`;
        console.warn(`Key ${index + 1} rejected: ${lastError}`);
        continue; 
      }

      // Success!
      return res.status(200).json(data);

    } catch (err) {
      lastError = err.message;
      console.error(`Network crash on Key ${index + 1}:`, err);
      continue; 
    }
  }

  // If we reach here, all keys failed. 
  return res.status(500).json({ error: `All AI keys blocked. Google says: ${lastError}` });
}
