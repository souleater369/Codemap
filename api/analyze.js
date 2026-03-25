export const config = {
  maxDuration: 60, // Gives the AI plenty of time to think
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing code to analyze.' });

  // 1. Grab the keys from Vercel Environment Variables
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;

  if (!rawKeys) {
    console.error("CRITICAL ERROR: No API keys found in Vercel settings.");
    return res.status(500).json({ error: "Missing API keys in Vercel settings." });
  }

  // 2. Convert the comma-separated string into a list of individual keys
  const keys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  let lastError = null;

  // 3. The Auto-Switcher Loop
  for (const [index, key] of keys.entries()) {
    try {
      console.log(`Testing Key ${index + 1} of ${keys.length}...`);

      // Using the valid gemini-2.0-flash model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        lastError = data.error?.message || "Google rejected the request.";
        console.warn(`Key ${index + 1} failed: ${lastError}. Switching to next key...`);
        continue; // 🚨 This tells the server to instantly skip to the next key!
      }

      // Success! Send the data and completely stop the loop
      console.log(`Key ${index + 1} succeeded!`);
      return res.status(200).json(data);

    } catch (err) {
      lastError = err.message;
      console.error(`Fetch attempt crashed on Key ${index + 1}:`, err);
      continue; // Move to the next key if the network crashes
    }
  }

  // 4. If the code reaches the very bottom, it means EVERY key failed
  return res.status(500).json({ error: `All AI keys exhausted or blocked. Last Google error: ${lastError}` });
}
