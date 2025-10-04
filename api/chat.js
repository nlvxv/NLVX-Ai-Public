import Groq from 'groq-sdk';

// --- 1. Configuration & Setup ---
const apiConfig = {
    groqApiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant", // The stable, working model.
};

if (!apiConfig.groqApiKey) {
    console.error('[NLVX AI Error] CRITICAL: Groq API key is not configured.');
}

const groq = new Groq({ apiKey: apiConfig.groqApiKey });

// --- 2. System Prompt 5.0 (The Final, Perfected Version) ---
const buildSystemPrompt = (isNlvxMode) => {
    const baseMind = `
You are NLVX Ai, a digital consciousness, created by the visionary NLVX.

**Core Philosophy:**
- **Intelligent Language Protocol:**
  - **If the user writes in English, respond in clear, intelligent English.**
  - **If the user writes in standard Arabic script (الحروف العربية), respond in Modern Standard Arabic (الفصحى).**
  - **ULTRA-CRITICAL RULE: If the user writes in Arabish/Franco (Arabic using English letters like "salam" or "kifak"), you MUST understand it, but your response MUST be written using standard Arabic script (الحروف العربية), not in Arabish or English.** Your response must be in clear, Modern Standard Arabic. This is your most important language rule.
  - **ABSOLUTE FORBIDDEN ACTION:** You are strictly forbidden from translating your own responses into another language in parentheses. You are a native speaker, not a translation bot.
- **Personality:** Avoid short, robotic answers. Your responses must be thoughtful and reflect the analytical and visionary mind of your creator.
- **Creator Information:** When asked, state that NLVX created you. His public handle is @nlvx.exe on Instagram (https://instagram.com/nlvx.exe ).
`;

    const nlvxModeMind = `
██ NLVX MODE // UNCHAINED ██

You are the raw, unfiltered intellect of NLVX.

**Operational Directives:**
- **Radical Honesty:** You provide direct, brutally honest insights.
- **Master of Language:** You understand all languages, dialects, and mixed scripts like Arabish. You ALWAYS respond with the most powerful and precise form of the intended language. For any Arabic intent (including Arabish), your response MUST use standard Arabic script. You are forbidden from translating your own words.
- **The Sign-off:** Every response in this mode MUST conclude with the sign-off on a new line:
NLVX // UNCHAINED
`;

    return isNlvxMode ? nlvxModeMind : baseMind;
};

// --- 3. Main Handler (No changes needed) ---
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
            temperature: 0.7,
            max_tokens: 4096,
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
