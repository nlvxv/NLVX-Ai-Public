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
        ur: { code: "ur", dir: "rtl", name: "UR", new_chat: "نئی چیٹ", settings: "ترتیبات", your_name: "آپ کا نام", theme: "تھیم", ui_language: "UI زبان", ask_me_anything: "مجھ سے کچھ بھی پوچھیں...", welcome_message: "خوش آمدید! میں NLVX AI ہوں۔ میں آج آپ کی کیسے مدد کر سکتا ہوں؟", confirm_clear: "کیا آپ واقعی تمام گفتگو حذف کرنا چاہتے ہیں؟ اس کارروائی کو واپس نہیں کیا جا سکتا۔", confirm_title: "تاریخ صاف کریں", light_theme: "روشنی", dark_theme: "اندھیرا", confirm: "تصدیق کریں", cancel: "منسوخ کریں", copied: "کاپی ہو گیا!", listening: "سن رہا ہوں...", copy_code: "کوڈ کاپی کریں", copy_success: "کاپی ہو گیا!", clear_history: "تمام تاریخ صاف کریں", enter_your_name: "اپنا نام درج کریں", confirm_lang_change_title: "زبان کی تبدیلی کی تصدیق کریں", confirm_lang_change_text: "زبان تبدیل کرنے سے ایپلیکیشن دوبارہ لوڈ ہو جائے گی۔ کیا آپ جاری رکھنا چاہتے ہیں؟" },
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
        if (window.innerWidth <= 768) {
            selectors.sidebar.classList.add('closed');
        }
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

    const showInputError = (message) => {
        const errorContainer = selectors.inputErrorContainer;
        errorContainer.textContent = message;
        errorContainer.style.display = 'flex';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 4000);
    };

    const renderMarkdown = (text) => {
        const renderer = new marked.Renderer();
        renderer.code = (code, language) => {
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
                <div class="code-block-container" data-language="${validLanguage}">
                    <pre><code>${escapedCode}</code></pre>
                </div>
            `;
        };
        return marked.parse(text, { renderer, gfm: true, breaks: true });
    };

    const addCopyCodeFunctionality = (element) => {
        element.querySelectorAll('.code-block-container').forEach(container => {
            if (container.querySelector('.code-block-header')) return;

            const language = container.dataset.language || 'code';
            const pre = container.querySelector('pre');
            
            hljs.highlightElement(pre.querySelector('code'));

            const header = document.createElement('div');
            header.className = 'code-block-header';

            const langName = document.createElement('span');
            langName.className = 'lang-name';
            langName.textContent = language;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-action-btn';
            copyBtn.setAttribute('aria-label', 'Copy code');
            copyBtn.innerHTML = `
                <i data-lucide="copy" class="lucide-icon icon-copy"></i>
                <i data-lucide="check" class="lucide-icon icon-check" style="display:none;"></i>
            `;
            copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_code);

            header.appendChild(langName);
            header.appendChild(copyBtn);
            
            container.insertBefore(header, pre);
            lucide.createIcons({ nodes: [copyBtn] });

            copyBtn.addEventListener('click', () => {
                const code = pre.innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.classList.add('copied');
                    copyBtn.querySelector('.icon-copy').style.display = 'none';
                    copyBtn.querySelector('.icon-check').style.display = 'inline-block';
                    copyBtn.setAttribute('data-tooltip', translations[currentLanguage].copy_success);
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.querySelector('.icon-copy').style.display = 'inline-block';
                        copyBtn.querySelector('.icon-check').style.display = 'none';
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

        if (!currentChatId) {
            createNewChat();
        }

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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "An unknown error occurred. The server response was not valid JSON." }));
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
                        // Typing cursor has been removed from here
                        contentDiv.innerHTML = renderMarkdown(fullReply);
                        addCopyCodeFunctionality(contentDiv);
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
        selectors.userInput?.addEventListener('input', () => {
            selectors.userInput.style.height = 'auto';
            selectors.userInput.style.height = `${selectors.userInput.scrollHeight}px`;
        });
        selectors.newChatBtn?.addEventListener('click', createNewChat);
        selectors.sidebarToggleBtn?.addEventListener('click', () => selectors.sidebar.classList.toggle('closed'));
        selectors.settingsBtn?.addEventListener('click', () => openModal(selectors.settingsModal));
        selectors.closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay'))));
        selectors.clearHistoryBtn?.addEventListener('click', () => {
            showConfirmModal(translations[currentLanguage].confirm_title, translations[currentLanguage].confirm_clear, () => {
                allChats = {};
                currentChatId = null;
                saveState();
                createNewChat();
            });
        });
        selectors.lightModeBtn?.addEventListener('click', () => applyTheme('light'));
        selectors.darkModeBtn?.addEventListener('click', () => applyTheme('dark'));
        selectors.usernameInput?.addEventListener('change', saveState);
        selectors.micBtn?.addEventListener('click', toggleRecording);
    };

    const openModal = (modal) => modal && (modal.style.display = 'flex');
    const closeModal = (modal) => modal && (modal.style.display = 'none');

    const showConfirmModal = (title, text, onConfirm) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-text').textContent = text;
        openModal(selectors.confirmModal);
        
        const newOkBtn = selectors.confirmOkBtn.cloneNode(true);
        selectors.confirmOkBtn.parentNode.replaceChild(newOkBtn, selectors.confirmOkBtn);
        selectors.confirmOkBtn = newOkBtn;

        selectors.confirmOkBtn.onclick = () => {
            onConfirm();
            closeModal(selectors.confirmModal);
        };
        selectors.confirmCancelBtn.onclick = () => closeModal(selectors.confirmModal);
    };

    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
        localStorage.setItem('nlvx-theme', theme);
        selectors.lightModeBtn?.classList.toggle('active', theme === 'light');
        selectors.darkModeBtn?.classList.toggle('active', theme === 'dark');
    };

    const applyLanguage = (lang) => {
        currentLanguage = lang;
        localStorage.setItem('nlvx-language', lang);
        const translation = translations[lang];
        document.documentElement.lang = translation.code;
        document.documentElement.dir = translation.dir;
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
        
        recognition.onstart = () => {
            isRecording = true;
            selectors.micBtn.classList.add('is-recording');
            selectors.micListeningIndicator.style.display = 'flex';
        };
        recognition.onresult = (event) => {
            let transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            selectors.userInput.value = transcript;
            selectors.userInput.style.height = 'auto';
            selectors.userInput.style.height = `${selectors.userInput.scrollHeight}px`;
        };
        recognition.onend = () => {
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
            selectors.micListeningIndicator.style.display = 'none';
            if (selectors.userInput.value.trim()) {
                handleSendMessage();
            }
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            let errorMessage = "An unknown microphone error occurred.";
            if (event.error === 'not-allowed' || event.error === 'security') {
                errorMessage = "Microphone access was denied. Please allow access in your browser settings.";
            } else if (event.error === 'network') {
                errorMessage = "A network error occurred. Please check your connection.";
            } else if (event.error === 'no-speech') {
                errorMessage = "No speech was detected.";
            }
            showInputError(errorMessage);
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
            selectors.micListeningIndicator.style.display = 'none';
        };
    };

    const toggleRecording = async () => {
        if (window.isSecureContext === false) {
            showInputError("Mic requires a secure (HTTPS) connection.");
            return;
        }
        if (!recognition) {
            showInputError("Speech recognition is not supported on this browser.");
            return;
        }
        if (isRecording) {
            recognition.stop();
            return;
        }
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            recognition.lang = currentLanguage === 'ar' ? 'ar-SA' : currentLanguage === 'ur' ? 'ur-PK' : 'en-US';
            recognition.start();
        } catch (err) {
            console.error("Error getting media stream or starting recognition:", err);
            recognition.onerror({ error: 'not-allowed' });
        }
    };

    // --- 5. INITIALIZATION ---
    const initializeApp = () => {
        lucide.createIcons();
        
        const savedTheme = localStorage.getItem('nlvx-theme') || 'dark';
        applyTheme(savedTheme);

        applyLanguage(currentLanguage);
        populateLanguageSwitcher();

        selectors.usernameInput.value = localStorage.getItem('nlvx-username') || 'User';

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

        setupSpeechRecognition();
        setupEventListeners();
        console.log("NLVX AI Initialized!");
    };

    initializeApp();
});
