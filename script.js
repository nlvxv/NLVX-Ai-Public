document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE, SELECTORS & TRANSLATIONS ---
    let allChats = {};
    let currentChatId = null;
    let recognition = null;
    let isRecording = false;
    let currentLanguage = localStorage.getItem('nlvx-language') || 'en';

    const translations = {
        en: { code: "en", dir: "ltr", name: "EN", new_chat: "New Chat", settings: "Settings", your_name: "Your Name", theme: "Theme", ui_language: "UI Language", ask_me_anything: "Ask me anything...", welcome_message: "Hello! I'm NLVX AI. How can I assist you today?", confirm_clear: "Are you sure you want to delete all conversations? This action cannot be undone.", confirm_title: "Clear History", light_theme: "Light", dark_theme: "Dark", confirm: "Confirm", cancel: "Cancel", copied: "Copied!", listening: "Listening...", copy_code: "Copy Code", copy_success: "Copied!", clear_history: "Clear All History", enter_your_name: "Enter your name", confirm_lang_change_title: "Confirm Language Change", confirm_lang_change_text: "Changing the language will reload the application. Continue?" },
        ar: { code: "ar", dir: "rtl", name: "AR", new_chat: "محادثة جديدة", settings: "الإعدادات", your_name: "اسمك", theme: "السمة", ui_language: "لغة الواجهة", ask_me_anything: "اسألني أي شيء...", welcome_message: "أهلاً! أنا NLVX AI. كيف يمكنني مساعدتك اليوم؟", confirm_clear: "هل أنت متأكد أنك تريد حذف جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.", confirm_title: "حذف السجل", light_theme: "فاتح", dark_theme: "داكن", confirm: "تأكيد", cancel: "إلغاء", copied: "تم النسخ!", listening: "يتم الاستماع...", copy_code: "نسخ الكود", copy_success: "تم النسخ!", clear_history: "حذف كل السجل", enter_your_name: "أدخل اسمك", confirm_lang_change_title: "تأكيد تغيير اللغة", confirm_lang_change_text: "تغيير اللغة سيعيد تحميل التطبيق. هل تريد المتابعة؟" },
    };

    const selectors = {
        sidebar: document.querySelector('.sidebar'),
        sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
        chatHistoryList: document.getElementById('chat-history-list'),
        welcomeScreen: document.getElementById('welcome-screen'),
        chatBox: document.getElementById('chat-box'),
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        newChatBtn: document.getElementById('new-chat-btn'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeModalBtns: document.querySelectorAll('.close-btn'),
        lightModeBtn: document.getElementById('light-mode-btn'),
        darkModeBtn: document.getElementById('dark-mode-btn'),
        languageSwitcher: document.getElementById('language-switcher'),
        usernameInput: document.getElementById('username-input'),
        micBtn: document.getElementById('mic-btn'),
        micListeningIndicator: document.getElementById('mic-listening-indicator'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
        inputErrorContainer: document.getElementById('input-error-container'),
    };

    // --- 2. CORE FUNCTIONS ---
    const saveState = () => {
        try {
            localStorage.setItem('nlvx-all-chats', JSON.stringify(allChats));
            localStorage.setItem('nlvx-current-chat-id', currentChatId);
            localStorage.setItem('nlvx-username', selectors.usernameInput.value);
        } catch (e) {
            console.error("Failed to save state:", e);
        }
    };

    const createNewChat = () => {
        const newId = `chat_${Date.now()}`;
        allChats[newId] = { title: translations[currentLanguage].new_chat, messages: [] };
        currentChatId = newId;
        saveState();
        renderChat(newId);
        renderChatHistory();
        selectors.userInput.focus();
    };

    const renderChat = (chatId) => {
        currentChatId = chatId;
        localStorage.setItem('nlvx-current-chat-id', currentChatId);
        selectors.chatBox.innerHTML = '';
        const chat = allChats[chatId];
        if (chat && chat.messages.length > 0) {
            selectors.welcomeScreen.style.display = 'none';
            chat.messages.forEach(msg => addMessageToChatBox(msg.role, msg.content));
        } else {
            selectors.welcomeScreen.style.display = 'flex';
        }
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === chatId);
        });
    };

    const renderChatHistory = () => {
        selectors.chatHistoryList.innerHTML = '';
        Object.keys(allChats).forEach(chatId => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = allChats[chatId].title;
            item.dataset.chatId = chatId;
            item.classList.toggle('active', chatId === currentChatId);
            item.setAttribute('role', 'button');
            item.addEventListener('click', () => renderChat(chatId));
            selectors.chatHistoryList.prepend(item);
        });
    };

    const renderMarkdown = (text) => {
        const renderer = new marked.Renderer();
        renderer.code = (code, language) => {
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code class="hljs ${validLanguage}">${escapedCode}</code></pre>`;
        };
        return marked.parse(text, { renderer, gfm: true, breaks: true });
    };

    const addMessageToChatBox = (sender, message, messageId = null) => {
        selectors.welcomeScreen.style.display = 'none';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        if (messageId) messageDiv.id = messageId;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        const username = selectors.usernameInput.value.trim();
        avatar.textContent = sender === 'user' ? (username ? username.charAt(0).toUpperCase() : 'U') : 'N';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (message === 'loading') {
            contentDiv.innerHTML = `<p></p>`;
        } else {
            contentDiv.innerHTML = renderMarkdown(message);
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        selectors.chatBox.appendChild(messageDiv);
        selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
        return messageDiv;
    };

    let isStreaming = false;
    const handleSendMessage = async () => {
        const prompt = selectors.userInput.value.trim();
        if (!prompt || selectors.sendBtn.disabled || isStreaming) return;

        if (!currentChatId) createNewChat();

        addMessageToChatBox('user', prompt);
        allChats[currentChatId].messages.push({ role: 'user', content: prompt });
        
        if (allChats[currentChatId].messages.length === 1) {
            allChats[currentChatId].title = prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '');
            renderChatHistory();
        }
        
        selectors.userInput.value = '';
        selectors.userInput.style.height = 'auto';
        selectors.sendBtn.disabled = true;
        isStreaming = true;

        const assistantMessageElement = addMessageToChatBox('assistant', 'loading');
        const contentDiv = assistantMessageElement.querySelector('.message-content');
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: allChats[currentChatId].messages }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: 'An unknown server error occurred.' } }));
                throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullReply += decoder.decode(value, { stream: true });
                contentDiv.innerHTML = renderMarkdown(fullReply);
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
                selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
            }
            
            if (fullReply.trim()) {
                allChats[currentChatId].messages.push({ role: 'assistant', content: fullReply });
            } else {
                assistantMessageElement.remove();
            }

        } catch (error) {
            console.error("Frontend Error:", error);
            contentDiv.innerHTML = renderMarkdown(`**Error:** ${error.message}`);
        } finally {
            saveState();
            selectors.sendBtn.disabled = false;
            isStreaming = false;
            selectors.userInput.focus();
        }
    };

    // --- 3. EVENT LISTENERS & UI ---
    const setupEventListeners = () => {
        selectors.sendBtn?.addEventListener('click', handleSendMessage);
        selectors.userInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        selectors.newChatBtn?.addEventListener('click', createNewChat);
    };

    // --- 5. INITIALIZATION ---
    const initializeApp = () => {
        try {
            allChats = JSON.parse(localStorage.getItem('nlvx-all-chats')) || {};
        } catch (e) {
            allChats = {};
        }
        currentChatId = localStorage.getItem('nlvx-current-chat-id');
        
        if (Object.keys(allChats).length === 0 || !allChats[currentChatId]) {
            createNewChat();
        } else {
            renderChatHistory();
            renderChat(currentChatId);
        }
        setupEventListeners();
    };

    initializeApp();
});
