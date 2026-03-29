export const config = {
  maxDuration: 60, // Maximum execution window to prevent premature timeouts
};

export default async function handler(req, res) {
  // Contingency 1: Restrict unauthorized access methods
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed. Protocol breach detected.' });

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Payload missing or corrupted. Aborting extraction.' });
  }

  // Contingency 2: Secure environment variable retrieval
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (!rawKeys) {
    console.error("[CRITICAL] Arsenal empty. No API keys found in Vercel environment.");
    return res.status(500).json({ error: "Server misconfiguration: API keys missing." });
  }

  // Sanitization: Strip hidden spaces, quotes, and invalid characters from the keys
  const keys = rawKeys.split(',')
    .map(k => k.replace(/['"\s]+/g, ''))
    .filter(k => k.length > 20); // Ensures only valid-looking keys are loaded

  if (keys.length === 0) {
    return res.status(500).json({ error: "Server misconfiguration: API keys are malformed." });
  }

  let lastError = "Unknown protocol failure.";

  // Operation: Key Rotation Engine
  for (const [index, key] of keys.entries()) {
    try {
      console.log(`[Recon] Initiating extraction with Key ${index + 1} of ${keys.length}...`);

      // ---> THE GOLDEN TICKET FIX: Using the free-tier workhorse <---
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }, // Strict logic enforcement
          }),
        }
      );

      const data = await response.json();

      // Contingency 3: Tactical Retreat & Swap
      if (!response.ok) {
        lastError = data.error?.message || `HTTP ${response.status}`;
        console.warn(`[Blocked] Key ${index + 1} compromised. Reason: ${lastError}. Pivoting to backup...`);
        continue; 
      }

      console.log(`[Success] Key ${index + 1} secured the intel.`);
      return res.status(200).json(data);

    } catch (err) {
      // Network collapse handler
      lastError = err.message;
      console.error(`[Crash] Key ${index + 1} encountered a fatal network error:`, err);
      continue; 
    }
  }

  // If the loop concludes without returning, the entire arsenal is exhausted.
  console.error("[Mission Failure] All assets exhausted.");
  return res.status(500).json({ error: `Extraction failed. Target defenses active. Final Error: ${lastError}` });
}
