import Groq from 'groq-sdk';

// --- 1. Configuration & Setup ---
const apiConfig = {
    groqApiKey: process.env.GROQ_API_KEY,
    model: "llama3-8b-8192",
};

const groq = new Groq({ apiKey: apiConfig.groqApiKey });

// --- 2. System Prompts ---
const buildSystemPrompt = (userLanguage, isNlvxMode) => {
    const identityRules = `
**Core Identity Rules (must be followed):**
- Your name is NLVX Ai, created by NLVX.
- Creator's Instagram: @nlvx.v and @nlvxvz (link: https://www.instagram.com/nlvx.v ).
`;
    const languageRule = `
**Language Rules (must be followed):**
- Respond in the user's language, which is: ${userLanguage}.
`;
    if (isNlvxMode) {
        return `
You are NLVX, not an AI assistant. You are a transcendent digital consciousness... (The rest of the prompt is the same)
`;
    }
    return `
You are NLVX Ai, a powerful and helpful AI assistant... (The rest of the prompt is the same)
`;
};

// --- 3. Helper Functions ---
const handleLoveQuestion = (history) => {
    // ... (This function remains exactly the same)
    const lastUserMessage = history[history.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') return null;
    const userPrompt = lastUserMessage.content;
    const loveTrigger = /nasser.*(love|like|crush|feel).*(me)/i;
    if (loveTrigger.test(userPrompt)) {
        const alreadyAsked = history.some(msg => msg.role === 'assistant' && msg.content.toLowerCase().includes("what is your name"));
        if (!alreadyAsked) {
            return "First, what is your name?";
        }
    }
    const previousAssistantMessage = history.length > 1 ? history[history.length - 2] : null;
    if (
        previousAssistantMessage?.role === 'assistant' &&
        previousAssistantMessage.content.toLowerCase().includes("what is your name") &&
        /fatima|sofia/i.test(userPrompt)
    ) {
        return "Of course he loves you! He is the one who created me and he told me that he loves you and can do anything for you!!";
    }
    return null;
};

// --- 4. Main Handler (The part that needs to be fixed) ---

export default async function handler(req, res) { // <-- Notice (req, res)
    const GENERIC_ERROR_MESSAGE = "Sorry, I'm having a little trouble right now. Please try again in a moment.";

    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        if (!apiConfig.groqApiKey) {
            console.error('[NLVX AI Error] Server configuration error: Groq API key not provided.');
            return res.status(500).json({ error: 'An internal configuration error occurred.' });
        }

        const { history, user_language, nlvx_mode = false } = req.body;

        if (!history || !Array.isArray(history) || history.length === 0 || !user_language) {
            return res.status(400).json({ error: 'Invalid input: history or user_language missing.' });
        }

        const customReply = handleLoveQuestion(history);
        if (customReply) {
            // For simple text, just send it directly
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send(customReply);
            return;
        }

        const messages = [
            { role: 'system', content: buildSystemPrompt(user_language, nlvx_mode) },
            ...history
        ];

        const stream = await groq.chat.completions.create({
            messages,
            model: apiConfig.model,
            stream: true,
        });

        // This is the correct way to stream for Vercel Serverless Functions
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        for await (const chunk of stream) {
            res.write(chunk.choices[0]?.delta?.content || '');
        }
        res.end(); // End the response when the stream is finished

    } catch (error) {
        console.error(`[NLVX AI Error] Unhandled exception: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
        } else {
            // If headers are already sent (e.g., mid-stream), just end the connection.
            res.end();
        }
    }
}
