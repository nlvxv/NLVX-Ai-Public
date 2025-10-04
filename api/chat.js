import Groq from 'groq-sdk';

// --- Main Handler with Detailed Logging ---
export default async function handler(req, res) {
    console.log('[DIAGNOSTIC] Function execution started.');

    if (req.method !== 'POST') {
        console.error('[DIAGNOSTIC] Error: Method not allowed. Received:', req.method);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // --- 1. Log API Key Presence ---
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            console.error('[DIAGNOSTIC] CRITICAL: GROQ_API_KEY is missing or undefined in environment variables.');
            return res.status(500).json({ error: 'Server configuration error: API key is missing.' });
        }
        console.log('[DIAGNOSTIC] GROQ_API_KEY is present.');
        
        const groq = new Groq({ apiKey: groqApiKey });

        // --- 2. Log Request Body ---
        const body = req.body;
        console.log('[DIAGNOSTIC] Received request body:', JSON.stringify(body, null, 2));

        const { history, user_language, nlvx_mode = false } = body;

        if (!history || !Array.isArray(history) || history.length === 0 || !user_language) {
            console.error('[DIAGNOSTIC] Error: Invalid input. History or language missing.');
            return res.status(400).json({ error: 'Invalid input: history or user_language missing.' });
        }
        console.log(`[DIAGNOSTIC] Inputs validated. Language: ${user_language}, NLVX Mode: ${nlvx_mode}, History items: ${history.length}`);

        // --- 3. Build and Log System Prompt ---
        // (Keeping the prompt logic simple for now to isolate the error)
        const systemPrompt = `You are a helpful assistant. Respond in ${user_language}.`;
        console.log('[DIAGNOSTIC] System prompt built successfully.');

        const messagesForGroq = [
            { role: 'system', content: systemPrompt },
            ...history
        ];
        console.log('[DIAGNOSTIC] Final message array for Groq:', JSON.stringify(messagesForGroq, null, 2));

        // --- 4. Attempt Groq API Call ---
        console.log('[DIAGNOSTIC] Attempting to create Groq stream...');
        const stream = await groq.chat.completions.create({
            messages: messagesForGroq,
            model: "llama3-8b-8192", // Using the basic model to rule out model-specific issues
            stream: true,
        });
        console.log('[DIAGNOSTIC] Groq stream created successfully. Streaming response...');

        // --- 5. Stream Response ---
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        for await (const chunk of stream) {
            res.write(chunk.choices[0]?.delta?.content || '');
        }
        res.end();
        console.log('[DIAGNOSTIC] Response stream finished successfully.');

    } catch (error) {
        console.error('[DIAGNOSTIC] --- CATCH BLOCK ERROR ---');
        console.error('[DIAGNOSTIC] Error Name:', error.name);
        console.error('[DIAGNOSTIC] Error Message:', error.message);
        console.error('[DIAGNOSTIC] Full Error Object:', JSON.stringify(error, null, 2));
        
        if (!res.headersSent) {
            res.status(500).json({ error: "An internal error was caught. Check server logs for details." });
        } else {
            res.end();
        }
    }
}
