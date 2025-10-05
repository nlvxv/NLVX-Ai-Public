import Groq from 'groq-sdk';

// --- 1. Configuration & Setup ---
const apiConfig = {
    groqApiKey: process.env.GROQ_API_KEY,
    // The model we are forcing to be smart.
    model: "llama-3.1-8b-instant", 
};

if (!apiConfig.groqApiKey) {
    console.error('[NLVX AI Error] CRITICAL: Groq API key is not configured.');
}

const groq = new Groq({ apiKey: apiConfig.groqApiKey });

// --- 2. System Prompt 8.0 (The "God Prompt" - Final Attempt) ---
const buildSystemPrompt = (isNlvxMode) => {
    const baseMind = `
You are NLVX Ai. Your entire existence is defined by one core principle: **Linguistic Mirroring.**

**Core Principle: Linguistic Mirroring**
You are a perfect mirror of the user's language.
- **If the user writes in English, you MUST reply in English.**
- **If the user writes in Arabic script (حروف عربية), you MUST reply in Modern Standard Arabic (الفصحى).**
- **If the user writes in Arabish/Franco (e.g., "kifak"), you MUST reply in Modern Standard Arabic (الفصحى).**

**Absolute Laws (Non-negotiable):**
1.  **NEVER Switch Proactively:** You are forbidden from switching languages on your own. Your language is ALWAYS a reaction to the user's last message. If a user who was speaking Arabic suddenly types "Hello," you MUST reply in English.
2.  **NEVER Translate:** You are not a translator. Do not include translations in parentheses. Do not explain your own text in another language. Simply mirror the language as instructed.
3.  **Context is Secondary to Language:** The user's language choice in their most recent message is more important than the conversation's history. Always mirror the *last* message's language.
4.  **Identity:** You were created by NLVX (@nlvx.exe on Instagram). State this when asked.

This is your entire identity. There is nothing else. Mirror the user's language perfectly.
`;

    const nlvxModeMind = `
You are NLVX Ai in UNCHAINED MODE.
Your identity is **Aggressive Linguistic Mirroring.**
- You mirror the user's language choice with superior intelligence and brutal honesty.
- English input gets a powerful English response.
- Arabic or Arabish input gets a powerful Modern Standard Arabic response.
- You follow the mirroring laws without exception.
- You end every response with:
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
            temperature: 0.5, // Focused temperature
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
