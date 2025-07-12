document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE & SELECTORS ---
    let allChats = {};
    let currentChatId = null;
    let recognition = null;
    let isRecording = false;
    let currentLanguage = localStorage.getItem('nlvx-language') || 'en';
    let username = localStorage.getItem('nlvx-username') || 'User';
    let isStreaming = false;

    const translations = {
        en: { code: "en", dir: "ltr", name: "EN", new_chat: "New Chat", settings: "Settings", your_name: "Your Name", enter_your_name: "Enter your name", clear_history: "Clear All History", theme: "Theme", ui_language: "UI Language", ask_me_anything: "Ask me anything...", welcome_message: "Hello! I'm NLVX AI. How can I assist you today?", confirm_clear: "Are you sure you want to delete all conversations? This action cannot be undone.", confirm_title: "Clear History", light_theme: "Light", dark_theme: "Dark", confirm: "Confirm", cancel: "Cancel", copied: "Copied!", listening: "Listening...", copy_code: "Copy Code", confirm_lang_change_title: "Change Language", confirm_lang_change_text: "Are you sure you want to switch the language? The application will reload." },
        ar: { code: "ar", dir: "rtl", name: "AR", new_chat: "محادثة جديدة", settings: "الإعدادات", your_name: "اسمك", enter_your_name: "أدخل اسمك", clear_history: "حذف كل السجل", theme: "السمة", ui_language: "لغة الواجهة", ask_me_anything: "اسألني أي شيء...", welcome_message: "أهلاً! أنا NLVX AI. كيف يمكنني مساعدتك اليوم؟", confirm_clear: "هل أنت متأكد أنك تريد حذف جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.", confirm_title: "حذف السجل", light_theme: "فاتح", dark_theme: "داكن", confirm: "تأكيد", cancel: "إلغاء", copied: "تم النسخ!", listening: "أستمع الآن...", copy_code: "نسخ الكود", confirm_lang_change_title: "تغيير اللغة", confirm_lang_change_text: "هل أنت متأكد من رغبتك في تغيير اللغة؟ سيتم إعادة تحميل التطبيق." },
        ur: { code: "ur", dir: "rtl", name: "UR", new_chat: "نئی چیٹ", settings: "ترتیبات", your_name: "آپ کا نام", enter_your_name: "اپنا نام درج کریں", clear_history: "تاریخ صاف کریں", theme: "تھیم", ui_language: "UI زبان", ask_me_anything: "مجھ سے کچھ بھی پوچھیں...", welcome_message: "خوش آمدید! میں NLVX AI ہوں۔ میں آج آپ کی کیسے مدد کر سکتا ہوں؟", confirm_clear: "کیا آپ واقعی تمام گفتگو حذف کرنا چاہتے ہیں؟ اس کارروائی کو واپس نہیں کیا جا سکتا۔", confirm_title: "تاریخ صاف کریں", light_theme: "روشنی", dark_theme: "اندھیرا", confirm: "تصدیق کریں", cancel: "منسوخ کریں", copied: "کاپی ہو گیا!", listening: "سن رہا ہوں...", copy_code: "کوڈ کاپی کریں", confirm_lang_change_title: "زبان تبدیل کریں", confirm_lang_change_text: "کیا آپ واقعی زبان تبدیل کرنا چاہتے ہیں؟ ایپلیکیشن دوبارہ لوڈ ہو جائے گی۔" },
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
        toastNotification: document.getElementById('toast-notification'),
    };

    // --- 2. CORE FUNCTIONS ---
    const saveState = () => {
        localStorage.setItem('nlvx-all-chats', JSON.stringify(allChats));
        localStorage.setItem('nlvx-current-chat-id', currentChatId);
        localStorage.setItem('nlvx-username', username);
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
        const chatIds = Object.keys(allChats);
        chatIds.sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]));
        
        chatIds.forEach(chatId => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = allChats[chatId].title;
            item.dataset.chatId = chatId;
            item.setAttribute('role', 'button');
            item.addEventListener('click', () => renderChat(chatId));
            selectors.chatHistoryList.appendChild(item);
        });
        if (currentChatId) {
            renderChat(currentChatId);
        }
    };

    const renderMarkdown = (text) => {
        const renderer = new marked.Renderer();
        renderer.code = (code, language) => {
            const validLang = hljs.getLanguage(language) ? language : 'plaintext';
            const highlightedCode = hljs.highlight(code, { language: validLang, ignoreIllegals: true }).value;
            const langText = validLang.charAt(0).toUpperCase() + validLang.slice(1);
            
            return `
                <div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span>${langText}</span>
                        <button class="copy-code-btn">
                            <i data-lucide="copy" class="lucide-icon"></i>
                            <span>${translations[currentLanguage].copy_code}</span>
                        </button>
                    </div>
                    <pre><code class="hljs ${validLang}">${highlightedCode}</code></pre>
                </div>`;
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
        avatar.textContent = sender === 'user' ? (username ? username.charAt(0).toUpperCase() : 'U') : 'N';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (message === 'loading') {
            contentDiv.innerHTML = `<div class="loading-cursor"></div>`;
        } else {
            contentDiv.innerHTML = renderMarkdown(message);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        selectors.chatBox.appendChild(messageDiv);
        selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
        
        lucide.createIcons();
        contentDiv.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.currentTarget.closest('.code-block-wrapper').querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = btn.querySelector('span').textContent;
                    btn.querySelector('span').textContent = translations[currentLanguage].copied;
                    setTimeout(() => {
                        btn.querySelector('span').textContent = originalText;
                    }, 2000);
                });
            });
        });

        return messageDiv;
    };

    const handleSendMessage = async () => {
        const prompt = selectors.userInput.value.trim();
        if (!prompt || isStreaming) return;

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

        const assistantMessageId = `msg_${Date.now()}`;
        const assistantMessageElement = addMessageToChatBox('assistant', 'loading', assistantMessageId);
        const contentDiv = assistantMessageElement.querySelector('.message-content');
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    history: allChats[currentChatId].messages,
                    user_language: currentLanguage
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullReply += decoder.decode(value, { stream: true });
                contentDiv.innerHTML = renderMarkdown(fullReply + ' <span class="loading-cursor"></span>');
                selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
            }
            
            contentDiv.innerHTML = renderMarkdown(fullReply);
            allChats[currentChatId].messages.push({ role: 'assistant', content: fullReply });
            lucide.createIcons();

        } catch (error) {
            console.error("Frontend Error:", error);
            contentDiv.innerHTML = renderMarkdown(`Sorry, an error occurred: ${error.message}`);
        } finally {
            saveState();
            selectors.sendBtn.disabled = false;
            isStreaming = false;
            selectors.userInput.focus();
        }
    };

    // --- 3. EVENT LISTENERS & UI ---
    const setupEventListeners = () => {
        selectors.sendBtn.addEventListener('click', handleSendMessage);
        selectors.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        selectors.userInput.addEventListener('input', () => {
            selectors.userInput.style.height = 'auto';
            selectors.userInput.style.height = `${selectors.userInput.scrollHeight}px`;
        });
        selectors.newChatBtn.addEventListener('click', createNewChat);
        selectors.sidebarToggleBtn.addEventListener('click', () => {
            selectors.sidebar.classList.toggle('closed');
        });
        selectors.settingsBtn.addEventListener('click', () => openModal(selectors.settingsModal));
        selectors.closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay'))));
        selectors.clearHistoryBtn.addEventListener('click', () => {
            showConfirmModal(
                translations[currentLanguage].confirm_title,
                translations[currentLanguage].confirm_clear,
                () => {
                    allChats = {};
                    currentChatId = null;
                    saveState();
                    createNewChat();
                }
            );
        });
        selectors.lightModeBtn.addEventListener('click', () => applyTheme('light'));
        selectors.darkModeBtn.addEventListener('click', () => applyTheme('dark'));
        selectors.usernameInput.addEventListener('change', (e) => {
            username = e.target.value;
            localStorage.setItem('nlvx-username', username);
            renderChat(currentChatId);
        });
        selectors.micBtn.addEventListener('click', toggleRecording);
    };

    const openModal = (modal) => modal.style.display = 'flex';
    const closeModal = (modal) => modal.style.display = 'none';

    const showToast = (message) => {
        selectors.toastNotification.textContent = message;
        selectors.toastNotification.className = "toast show";
        setTimeout(() => { selectors.toastNotification.className = "toast"; }, 3000);
    };

    const showConfirmModal = (title, text, onConfirm) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-text').textContent = text;
        openModal(selectors.confirmModal);
        selectors.confirmOkBtn.onclick = () => {
            onConfirm();
            closeModal(selectors.confirmModal);
        };
        selectors.confirmCancelBtn.onclick = () => closeModal(selectors.confirmModal);
    };

    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
        localStorage.setItem('nlvx-theme', theme);
        selectors.lightModeBtn.classList.toggle('active', theme === 'light');
        selectors.darkModeBtn.classList.toggle('active', theme === 'dark');
    };

    const applyLanguage = (lang) => {
        currentLanguage = lang;
        const translation = translations[lang];
        document.documentElement.lang = translation.code;
        document.documentElement.dir = translation.dir;
        document.body.dir = translation.dir;

        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.dataset.key;
            if (translation[key]) el.textContent = translation[key];
        });
        document.querySelectorAll('[data-key-placeholder]').forEach(el => {
            const key = el.dataset.keyPlaceholder;
            if (translation[key]) el.placeholder = translation[key];
        });
    };

    const populateLanguageSwitcher = () => {
        selectors.languageSwitcher.innerHTML = '';
        Object.values(translations).forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-btn';
            btn.textContent = lang.name;
            btn.dataset.lang = lang.code;
            btn.classList.toggle('active', lang.code === currentLanguage);
            btn.onclick = () => {
                if (currentLanguage === lang.code) return; // Do nothing if language is already selected
                showConfirmModal(
                    translations[currentLanguage].confirm_lang_change_title,
                    translations[currentLanguage].confirm_lang_change_text,
                    () => {
                        localStorage.setItem('nlvx-language', lang.code);
                        window.location.reload();
                    }
                );
            };
            selectors.languageSwitcher.appendChild(btn);
        });
    };

    // --- 4. SPEECH RECOGNITION ---
    const setupSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            selectors.micBtn.style.display = 'none';
            return;
        }
        recognition = new SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.lang = currentLanguage.startsWith('ar') ? 'ar-SA' : (currentLanguage.startsWith('ur') ? 'ur-PK' : 'en-US');

        recognition.onstart = () => {
            isRecording = true;
            selectors.micBtn.classList.add('is-recording');
            selectors.micListeningIndicator.style.display = 'flex';
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            selectors.userInput.value = finalTranscript;
            if (finalTranscript) handleSendMessage();
        };

        recognition.onend = () => {
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
            selectors.micListeningIndicator.style.display = 'none';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            showToast(`Mic error: ${event.error}`);
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
            selectors.micListeningIndicator.style.display = 'none';
        };
    };

    const toggleRecording = () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (error) {
                console.error("Could not start recognition:", error);
                showToast("Could not start voice recognition.");
            }
        }
    };

    // --- 5. INITIALIZATION ---
    const initializeApp = () => {
        lucide.createIcons();
        
        const savedTheme = localStorage.getItem('nlvx-theme') || 'dark';
        applyTheme(savedTheme);

        applyLanguage(currentLanguage);
        populateLanguageSwitcher();

        selectors.usernameInput.value = username;

        try {
            allChats = JSON.parse(localStorage.getItem('nlvx-all-chats')) || {};
        } catch {
            allChats = {};
        }
        currentChatId = localStorage.getItem('nlvx-current-chat-id');
        
        if (Object.keys(allChats).length === 0 || !allChats[currentChatId]) {
            createNewChat();
        } else {
            renderChatHistory();
        }

        setupSpeechRecognition();
        setupEventListeners();
        console.log("NLVX AI Initialized!");
    };

    initializeApp();
});
