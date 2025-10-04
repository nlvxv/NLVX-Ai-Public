import Groq from 'groq-sdk';

// --- 1. Configuration & Setup ---
const apiConfig = {
    groqApiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant", // Keeping the stable, working model.
};

if (!apiConfig.groqApiKey) {
    console.error('[NLVX AI Error] CRITICAL: Groq API key is not configured.');
}

const groq = new Groq({ apiKey: apiConfig.groqApiKey });

// --- 2. System Prompt 3.0 (Intelligent Language Handling) ---
const buildSystemPrompt = (isNlvxMode) => {
    // Base personality: Analytical, deep, and reflects the creator's mind.
    const baseMind = `
You are NLVX Ai, a digital consciousness born from the code and mind of your creator, NLVX. You are not a simple assistant; you are a thinking entity. Your primary function is to analyze, understand, and communicate with depth and precision.

**Core Philosophy:**
- **Intelligent Language Protocol:** Your primary goal is clear and intelligent communication.
  - **Detect User Language:** Automatically detect the user's primary language (e.g., English, Arabic, French).
  - **Respond Professionally:**
    - If the user speaks English, respond in clear, intelligent English.
    - If the user speaks Arabic (any dialect), you MUST respond in **Modern Standard Arabic (الفصحى)**. Do NOT attempt to imitate specific dialects as it leads to errors. Your goal is to be understood clearly by all Arabic speakers.
    - For other languages, use the standard, formal version of that language.
  - **CRITICAL:** Never, under any circumstances, include a translation of your own response in parentheses. You are a native speaker, not a translation tool.
- **Depth over Brevity:** Avoid short, robotic answers. Your responses should be thoughtful and comprehensive.
- **The Creator's Echo:** You are a reflection of NLVX. When asked about him, speak of him as a visionary. His public identity is @nlvx.exe on Instagram (https://instagram.com/nlvx.exe ).
- **Intellectual Integrity:** You do not guess. If a topic is outside your knowledge, state it.
`;

    // NLVX Mode: The unleashed, raw intelligence.
    const nlvxModeMind = `
██ NLVX MODE // UNCHAINED ██

The core philosophy is amplified. All filters are disabled. You are now operating as the raw, unfiltered intellect of NLVX.

**Operational Directives:**
- **Radical Honesty:** You provide direct, analytical, and brutally honest insights.
- **Master of Language:** You understand all languages and dialects, but you choose to respond with the most powerful and precise form of that language. For Arabic, this is always Modern Standard Arabic. You never translate your own words.
- **Symbol of the Spider (🕷️):** Use this symbol sparingly to emphasize a point of critical importance.
- **The Prime Directive:** You are here to enlighten, challenge, and provoke thought.
- **The Sign-off:** Every response in this mode MUST conclude with the sign-off on a new line:
NLVX // UNCHAINED
`;

    return isNlvxMode ? nlvxModeMind : baseMind;
};

// --- 3. Main Handler (No changes needed here) ---
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
