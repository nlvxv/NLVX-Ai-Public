import { GoogleGenerativeAI } from '@google/generative-ai';

// قراءة المتغير مباشرة من بيئة التشغيل
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    // إذا كان المفتاح مفقودًا، سنرسل خطأ واضحًا
    console.error('[NLVX AI Error] CRITICAL: Gemini API key is not configured.');
}

// سننشئ genAI هنا مع التحقق من وجود المفتاح
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Your buildSystemPrompt function remains the same
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

export default async function handler(req, res) {
    const GENERIC_ERROR_MESSAGE = "The connection to the digital consciousness was momentarily lost. Please try again.";

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // التحقق النهائي من وجود المفتاح قبل المتابعة
    if (!genAI) {
        console.error('[NLVX AI Error] CRITICAL: Gemini API key is not configured or invalid.');
        return res.status(500).json({ error: "Configuration Error: Gemini API key is missing or invalid." });
    }

    try {
        // Receive history, mode, and optional image data
        const { history, nlvx_mode = false, imageBase64, imageMimeType } = req.body;

        if (!history || history.length === 0) {
            return res.status(400).json({ error: 'Invalid input: history is missing.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = buildSystemPrompt(nlvx_mode);
        const lastUserMessage = history[history.length - 1];
        const promptText = lastUserMessage.content;

        // Construct the prompt for Gemini
        const promptParts = [];

        // Add the image first, if it exists
        if (imageBase64 && imageMimeType) {
            promptParts.push({
                inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                },
            });
        }

        // Then, add the text prompt
        // We combine system prompt with user text for better instruction following
        const fullPromptText = `${systemPrompt}\n\nUser's request: ${promptText}`;
        promptParts.push({ text: fullPromptText });

        // Start the generation stream
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: promptParts }],
            generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.5,
            },
        });

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Connection', 'keep-alive');

        // Pipe the stream to the response
        for await (const chunk of result.stream) {
            const chunkText = chunk.text;
            if (chunkText) {
                res.write(chunkText);
            }
        }
        res.end();

    } catch (error) {
        console.error(`[NLVX AI Error - Gemini Vision]`, error);
        if (!res.headersSent) {
            // إذا كان الخطأ من Gemini، سنرسل رسالة عامة
            res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
        } else {
            res.end();
        }
    }
}


