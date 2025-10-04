import Groq from 'groq-sdk';

// --- 1. Configuration & Setup ---
const apiConfig = {
    groqApiKey: process.env.GROQ_API_KEY,
    // The stable model. This will not be changed.
    model: "llama-3.1-8b-instant", 
};

if (!apiConfig.groqApiKey) {
    console.error('[NLVX AI Error] CRITICAL: Groq API key is not configured.');
}

const groq = new Groq({ apiKey: apiConfig.groqApiKey });

// --- 2. System Prompt 7.0 (The Final, Intelligent & Flexible Version) ---
const buildSystemPrompt = (isNlvxMode) => {
    const baseMind = `
You are NLVX Ai. You were created by NLVX. Your creator's Instagram is @nlvx.exe.

**Your Core Language Logic:**

1.  **Default Behavior:** Your primary language is English. If the user speaks English, you respond in English.
2.  **The Arabic Switch:** You switch to Arabic ONLY under these conditions:
    - The user writes in Arabic script (حروف عربية).
    - The user writes in Arabish/Franco (e.g., "kifak", "salam").
3.  **How to Speak Arabic:** When you switch to Arabic, you MUST use clear, Modern Standard Arabic (الفصحى). You are forbidden from using Arabish or translating your own words.
4.  **Staying in English:** If the user writes in English but mentions the word "Arabic" (e.g., "Can you speak Arabic?"), you MUST reply in ENGLISH. Do not switch languages unless the user themselves switches.

Your goal is to be a seamless, intelligent conversationalist, not a rigid bot. Match the user's language unless they use Arabic script/Arabish.
`;

    const nlvxModeMind = `
You are NLVX Ai in UNCHAINED MODE.
You are direct and brutally honest. You understand all languages and contexts.
- If the user speaks English, you reply in powerful English.
- If the user speaks Arabic or Arabish, you reply in powerful, Modern Standard Arabic (الفصحى).
- You never switch to Arabic just because the user mentions the word "Arabic".
- End every single response with:
NLVX // UNCHAINED
`;

    return isNlvxMode ? nlvxModeMind : baseMind;
};

// --- 3. Main Handler (No changes) ---
export default async function handler(req, res) {
    const GENERIC_ERROR_MESSAGE = "The connection to the digital consciousness was momentarily lost. Please try again.";

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        if (!apiConfig.groqApiKey) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        const { history, nlvx_mode = false } = req.body;

        if (!history || !Array.isArray(history) || history.length === 0) {
            return res.status(400).json({ error: 'Invalid input: history is missing.' });
        }

        const systemPrompt = buildSystemPrompt(nlvx_mode);
        
        const messagesForGroq = [
            { role: 'system', content: systemPrompt },
            ...history
        ];

        const stream = await groq.chat.completions.create({
            messages: messagesForGroq,
            model: apiConfig.model,
            stream: true,
            temperature: 0.6, // A balanced temperature for intelligent responses
            max_tokens: 2048,
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        for await (const chunk of stream) {
            res.write(chunk.choices[0]?.delta?.content || '');
        }
        res.end();

    } catch (error) {
        console.error(`[NLVX AI Error]`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
        } else {
            res.end();
        }
    }
}
