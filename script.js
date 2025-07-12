document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE, SELECTORS & TRANSLATIONS ---
    let allChats = {};
    let currentChatId = null;
    let recognition = null;
    let isRecording = false;
    let currentLanguage = localStorage.getItem('nlvx-language') || 'en';

    const translations = {
        en: { code: "en", dir: "ltr", name: "EN", new_chat: "New Chat", settings: "Settings", your_name: "Your Name", enter_your_name: "Enter your name", clear_history: "Clear All History", theme: "Theme", light_theme: "Light", dark_theme: "Dark", ui_language: "UI Language", ask_me_anything: "Ask me anything...", welcome_message: "Hello! I'm NLVX AI. How can I assist you today?", confirm_clear: "Are you sure you want to delete all conversations? This action cannot be undone.", confirm_title: "Clear History", confirm: "Confirm", cancel: "Cancel", copied: "Copied!", listening: "Listening...", copy_code: "Copy Code", copy_success: "Copied!", copy_fail: "Failed to copy" },
        ar: { code: "ar", dir: "rtl", name: "AR", new_chat: "محادثة جديدة", settings: "الإعدادات", your_name: "اسمك", enter_your_name: "أدخل اسمك", clear_history: "حذف كل السجل", theme: "السمة", light_theme: "فاتح", dark_theme: "داكن", ui_language: "لغة الواجهة", ask_me_anything: "اسألني أي شيء...", welcome_message: "أهلاً! أنا NLVX AI. كيف يمكنني مساعدتك اليوم؟", confirm_clear: "هل أنت متأكد أنك تريد حذف جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.", confirm_title: "حذف السجل", confirm: "تأكيد", cancel: "إلغاء", copied: "تم النسخ!", listening: "يستمع...", copy_code: "نسخ الكود", copy_success: "تم النسخ!", copy_fail: "فشل النسخ" },
        ur: { code: "ur", dir: "rtl", name: "UR", new_chat: "نئی چیٹ", settings: "ترتیبات", your_name: "آپ کا نام", enter_your_name: "اپنا نام درج کریں", clear_history: "تمام تاریخ صاف کریں", theme: "تھیم", light_theme: "روشنی", dark_theme: "اندھیرا", ui_language: "UI زبان", ask_me_anything: "مجھ سے کچھ بھی پوچھیں...", welcome_message: "خوش آمدید! میں NLVX AI ہوں۔ میں آج آپ کی کیسے مدد کر سکتا ہوں؟", confirm_clear: "کیا آپ واقعی تمام گفتگو حذف کرنا چاہتے ہیں؟ اس کارروائی کو واپس نہیں کیا جا سکتا۔", confirm_title: "تاریخ صاف کریں", confirm: "تصدیق کریں", cancel: "منسوخ کریں", copied: "کاپی ہو گیا!", listening: "سن رہا ہے...", copy_code: "کوڈ کاپی کریں", copy_success: "کاپی ہو گیا!", copy_fail: "کاپی ناکام" },
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
        try {
            localStorage.setItem('nlvx-all-chats', JSON.stringify(allChats));
            localStorage.setItem('nlvx-current-chat-id', currentChatId);
            localStorage.setItem('nlvx-username', selectors.usernameInput.value);
        } catch (e) {
            console.error("Failed to save state:", e);
            showToast("Could not save session. Storage might be full.", 'error');
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

    const showToast = (message, type = 'info') => {
        const toast = selectors.toastNotification;
        let icon = '';
        if (type === 'error') {
            icon = '<i data-lucide="alert-triangle" class="lucide-icon"></i>';
        } else if (type === 'success') {
            icon = '<i data-lucide="check-circle" class="lucide-icon"></i>';
        }
        toast.innerHTML = `${icon}<span>${message}</span>`;
        lucide.createIcons({ nodes: [toast.querySelector('.lucide-icon')] });
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = `toast ${type}`;
        }, 3000);
    };

    const renderMarkdown = (text) => {
        return marked.parse(text, {
            highlight: (code, lang) => {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            },
            gfm: true,
            breaks: true,
        });
    };

    const addCopyCodeFunctionality = (element) => {
        element.querySelectorAll('.code-block-container').forEach(container => {
            const header = container.querySelector('.code-block-header');
            if (!header || header.querySelector('.code-action-btn')) return;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-action-btn';
            copyBtn.setAttribute('aria-label', 'Copy code');
            
            copyBtn.innerHTML = `
                <i data-lucide="copy" class="lucide-icon icon-copy"></i>
                <i data-lucide="check" class="lucide-icon icon-check"></i>
            `;
            
            copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_code);

            header.appendChild(copyBtn);
            lucide.createIcons({ nodes: [copyBtn] });

            copyBtn.addEventListener('click', () => {
                const code = container.querySelector('pre code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.classList.add('copied');
                    copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_success);
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_code);
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy code: ', err);
                    copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_fail);
                    setTimeout(() => {
                        copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_code);
                    }, 2000);
                });
            });
        });
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
            contentDiv.innerHTML = `<p><span class="loading-cursor"></span></p>`;
        } else {
            contentDiv.innerHTML = renderMarkdown(message);
            addCopyCodeFunctionality(contentDiv);
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

        addMessageToChatBox('user', prompt);
        allChats[currentChatId].messages.push({ role: 'user', content: prompt });
        
        if (allChats[currentChatId].messages.length === 1) {
            allChats[currentChatId].title = prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '');
            renderChatHistory();
        }
        
        selectors.userInput.value = '';
        autoResizeTextarea(selectors.userInput);
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';
            let updateScheduled = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullReply += decoder.decode(value, { stream: true });
                if (!updateScheduled) {
                    updateScheduled = true;
                    requestAnimationFrame(() => {
                        contentDiv.innerHTML = renderMarkdown(fullReply + ' <span class="loading-cursor"></span>');
                        selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
                        updateScheduled = false;
                    });
                }
            }
            
            contentDiv.innerHTML = renderMarkdown(fullReply);
            addCopyCodeFunctionality(contentDiv);
            allChats[currentChatId].messages.push({ role: 'assistant', content: fullReply });

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

    // --- 3. UI & EVENT LISTENERS ---
    const autoResizeTextarea = (el) => {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    const openModal = (modal) => {
        if (modal) modal.style.display = 'flex';
    };

    const closeModal = (modal) => {
        if (modal) modal.style.display = 'none';
    };

    const showConfirmModal = (titleKey, textKey, onConfirm) => {
        document.getElementById('confirm-title').dataset.key = titleKey;
        document.getElementById('confirm-text').dataset.key = textKey;
        applyLanguage(currentLanguage, false); // Apply text without reloading
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

    const applyLanguage = (lang, reload = true) => {
        currentLanguage = lang;
        localStorage.setItem('nlvx-language', lang);
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

        if (reload) {
            showToast("Language updated. Reloading...", 'success');
            setTimeout(() => window.location.reload(), 1000);
        }
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
                showConfirmModal('confirm_title', 'confirm_clear', () => applyLanguage(lang.code));
            };
            selectors.languageSwitcher.appendChild(btn);
        });
    };

    const setupEventListeners = () => {
        selectors.sendBtn.addEventListener('click', handleSendMessage);
        selectors.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        selectors.userInput.addEventListener('input', () => autoResizeTextarea(selectors.userInput));
        selectors.newChatBtn.addEventListener('click', createNewChat);
        selectors.sidebarToggleBtn.addEventListener('click', () => selectors.sidebar.classList.toggle('closed'));
        selectors.settingsBtn.addEventListener('click', () => openModal(selectors.settingsModal));
        selectors.closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay'))));
        selectors.clearHistoryBtn.addEventListener('click', () => {
            showConfirmModal('confirm_title', 'confirm_clear', () => {
                allChats = {};
                currentChatId = null;
                saveState();
                createNewChat();
            });
        });
        selectors.lightModeBtn.addEventListener('click', () => applyTheme('light'));
        selectors.darkModeBtn.addEventListener('click', () => applyTheme('dark'));
        selectors.usernameInput.addEventListener('change', saveState);
        selectors.micBtn.addEventListener('click', toggleRecording);
    };

    // --- 4. SPEECH RECOGNITION ---
    const setupSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            selectors.micBtn.style.display = 'none';
            return;
        }

        if (window.isSecureContext === false) {
            selectors.micBtn.addEventListener('click', () => {
                showToast("Mic access requires a secure (HTTPS) connection.", 'error');
            });
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
            autoResizeTextarea(selectors.userInput);
        };

        recognition.onend = () => {
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
            selectors.micListeningIndicator.style.display = 'none';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            let errorMessage = "An unknown microphone error occurred.";
            if (event.error === 'not-allowed' || event.error === 'security') {
                errorMessage = "Microphone access was denied. Please allow it in your browser settings.";
            } else if (event.error === 'network') {
                errorMessage = "A network error occurred. Please check your connection.";
            } else if (event.error === 'no-speech') {
                errorMessage = "No speech was detected. Please try again.";
            }
            showToast(errorMessage, 'error');
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
            } catch (e) {
                console.error("Could not start recognition:", e);
                showToast("Could not start voice recognition.", 'error');
            }
        }
    };

    // --- 5. INITIALIZATION ---
    const initializeApp = () => {
        lucide.createIcons();
        
        const savedTheme = localStorage.getItem('nlvx-theme') || 'dark';
        applyTheme(savedTheme);

        applyLanguage(currentLanguage, false);
        populateLanguageSwitcher();

        selectors.usernameInput.value = localStorage.getItem('nlvx-username') || '';

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
            renderChat(currentChatId);
        }

        setupSpeechRecognition();
        setupEventListeners();
        console.log("NLVX AI Initialized!");
    };

    initializeApp();
});
