export const config = {
  maxDuration: 60, // Gives the AI plenty of time to think
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing code to analyze.' });

  // Look for the keys (handles both plural and singular typos!)
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;

  if (!rawKeys) {
    console.error("CRITICAL ERROR: No API keys found in Vercel Environment Variables.");
    return res.status(500).json({ error: "Missing API keys in Vercel settings." });
  }

  // Clean up the keys in case of accidental spaces
  const keys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  let lastError = null;

  for (const key of keys) {
    try {
      // ✅ FIX: Changed from non-existent 'gemini-3-flash' to valid 'gemini-2.0-flash'
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }, // Keeps the JSON strict
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        lastError = data.error?.message || "Google rejected the request.";
        console.error(`Key rejected: ${lastError}`);
        continue; // Try the next key in your list
      }

      // Success! Send the data back to the frontend
      return res.status(200).json(data);

    } catch (err) {
      lastError = err.message;
      console.error("Fetch attempt crashed:", err);
    }
  }

  // If it gets here, all keys failed
  return res.status(500).json({ error: `All AI keys failed. Google says: ${lastError}` });
}
