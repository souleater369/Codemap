export default async function handler(req, res) {
 // 1. Only allow POST requests from your website
 if (req.method !== 'POST') {
   return res.status(405).json({ error: 'Method not allowed' });
 }

 try {
   // 2. Get the prompt sent from your React frontend
   const { prompt } = req.body;

   // 3. Securely grab your API keys from Vercel's secret vault
   // We split them by comma in case you put multiple keys for rotation!
   const keysStr = process.env.GEMINI_API_KEYS || "";
   const keys = keysStr.split(',').filter(k => k.trim() !== "");
   
   if (keys.length === 0) {
     return res.status(500).json({ error: 'API keys are missing in the server.' });
   }

   // 4. Try the keys one by one (Automatic Rotation)
   let aiResponse = null;
   let lastError = null;

   for (let i = 0; i < keys.length; i++) {
     const currentKey = keys[i].trim();
     const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentKey}`;
;
     
     const response = await fetch(aiUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         contents: [{ parts: [{ text: prompt }] }],
         generationConfig: { responseMimeType: "application/json" }
       })
     });

     if (response.ok) {
       aiResponse = await response.json();
       break; // It worked! Stop trying keys.
     } else {
       lastError = await response.text();
       console.warn(`Key ${i + 1} failed. Rotating to next...`);
     }
   }

   // 5. If all keys failed, tell the frontend
   if (!aiResponse) {
     throw new Error("All AI keys exhausted or failed.");
   }

   // 6. Send the successful map data back to your website
   return res.status(200).json(aiResponse);

 } catch (error) {
   console.error("Server Error:", error);
   return res.status(500).json({ error: 'Failed to generate map.' });
 }
}
