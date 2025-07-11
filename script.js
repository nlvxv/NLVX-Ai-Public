document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GLOBAL STATE & SELECTORS ---
    let allChats = {};
    let currentChatId = null;
    let recognition = null;
    let isRecording = false;
    let currentLanguage = 'en';
    let userAvatar = localStorage.getItem('nlvx-avatar') || '';

    const translations = {
        en: { code: "en", dir: "ltr", name: "EN", new_chat: "New Chat", settings: "Settings", your_name: "Your Name", avatar: "Avatar", enter_your_name: "Enter your name", clear_history: "Clear History", theme: "Theme", ui_language: "UI Language", voice_language: "Voice Language", ask_me_anything: "Ask me anything...", welcome_message: "Hello! I'm NLVX AI. How can I assist you today?", confirm_clear: "Are you sure you want to delete all conversations? This action cannot be undone.", confirm_title: "Clear History", light_theme: "Light", dark_theme: "Dark", confirm: "Confirm", cancel: "Cancel", copied: "Copied!", feature_soon: "This feature is under development and will be available soon!" },
        ar: { code: "ar", dir: "rtl", name: "AR", new_chat: "محادثة جديدة", settings: "الإعدادات", your_name: "اسمك", avatar: "الأفاتار", enter_your_name: "أدخل اسمك", clear_history: "حذف السجل", theme: "السمة", ui_language: "لغة الواجهة", voice_language: "لغة الصوت", ask_me_anything: "اسألني أي شيء...", welcome_message: "أهلاً! أنا NLVX AI. كيف يمكنني مساعدتك اليوم؟", confirm_clear: "هل أنت متأكد أنك تريد حذف جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.", confirm_title: "حذف السجل", light_theme: "فاتح", dark_theme: "داكن", confirm: "تأكيد", cancel: "إلغاء", copied: "تم النسخ!", feature_soon: "هذه الميزة قيد التطوير وستكون متاحة قريباً!" },
        ur: { code: "ur", dir: "rtl", name: "UR", new_chat: "نئی چیٹ", settings: "ترتیبات", your_name: "آپ کا نام", avatar: "اوتار", enter_your_name: "اپنا نام درج کریں", clear_history: "تاریخ صاف کریں", theme: "تھیم", ui_language: "UI زبان", voice_language: "آواز کی زبان", ask_me_anything: "مجھ سے کچھ بھی پوچھیں...", welcome_message: "خوش آمدید! میں NLVX AI ہوں۔ میں آج آپ کی کیسے مدد کر سکتا ہوں؟", confirm_clear: "کیا آپ واقعی تمام گفتگو حذف کرنا چاہتے ہیں؟ اس کارروائی کو واپس نہیں کیا جا سکتا۔", confirm_title: "تاریخ صاف کریں", light_theme: "روشنی", dark_theme: "اندھیرا", confirm: "تصدیق کریں", cancel: "منسوخ کریں", copied: "کاپی ہو گیا!", feature_soon: "یہ فیچر زیر تعمیر ہے اور جلد ہی دستیاب ہوگا۔" },
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
        voiceLangSelect: document.getElementById('voice-language-select'),
        usernameInput: document.getElementById('username-input'),
        avatarUpload: document.getElementById('avatar-upload'),
        avatarPreview: document.getElementById('avatar-preview'),
        micBtn: document.getElementById('mic-btn'),
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
            localStorage.setItem('nlvx-avatar', userAvatar);
        } catch (e) {
            console.error("Failed to save state:", e);
            showToast(translations[currentLanguage].feature_soon);
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
            item.setAttribute('role', 'listitem');
            item.addEventListener('click', () => renderChat(chatId));
            selectors.chatHistoryList.prepend(item);
        });
    };

    const renderMarkdown = (text) => {
        if (!window.marked || !window.hljs) {
            console.error("Required libraries (marked or highlight.js) are not loaded.");
            return text;
        }
        return marked.parse(text, {
            highlight: function (code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext_CODE_BLOCK_';
                return hljs.highlight(code, { language }).value;
            },
            gfm: true,
            breaks: true,
        });
    };

    const addCopyCodeFunctionality = (element) => {
        element.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector('.copy-code-btn')) return;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.setAttribute('aria-label', 'Copy code');
            pre.appendChild(copyBtn);
            copyBtn.addEventListener('click', () => {
                const code = pre.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.textContent = translations[currentLanguage].copied;
                    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                });
            });
        });
    };

    const addMessageToChatBox = (sender, message, messageId = null) => {
        selectors.welcomeScreen.style.display = 'none';
        const message OdaMessageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        if (messageId) messageDiv.id = messageId;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        if (sender === 'user') {
            if (userAvatar) {
                const img = document.createElement('img');
                img.src = userAvatar;
                img.alt = 'User avatar';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                avatar.appendChild(img);
            } else {
                const username = selectors.usernameInput.value.trim();
                avatar.textContent = username ? username.charAt(0).toUpperCase() : 'U';
            }
        } else {
            avatar.textContent = 'N';
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (message === 'loading') {
            contentDiv.innerHTML = `<div class="loading-cursor"></div>`;
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
                if (response.status === 429) {
                    contentDiv.innerHTML = renderMarkdown(translations[currentLanguage].feature_soon);
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('No response body');
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
            contentDiv.innerHTML = renderMarkdown(`Sorry, an error occurred: ${error.message}`);
        } finally {
            saveState();
            selectors.sendBtn.disabled = false;
            isStreaming = false;
            selectors.userInput.focus();
        }
    };

    // --- 3. EVENT LISTENERS SETUP ---
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
        selectors.sidebarToggleBtn?.addEventListener('click', () => selectors.sidebar.classList.toggle('open'));
        selectors.chatBox?.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && selectors.sidebar.classList.contains('open') && !e.target.closest('.sidebar')) {
                selectors.sidebar.classList.remove('open');
            }
        });
        selectors.settingsBtn?.addEventListener('click', () => openModal(selectors.settingsModal));
        selectors.closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal'))));
        selectors.clearHistoryBtn?.addEventListener('click', () => {
            showConfirmModal('confirm_title', 'confirm_clear', () => {
                allChats = {};
                currentChatId = null;
                saveState();
                createNewChat();
            });
        });
        selectors.lightModeBtn?.addEventListener('click', () => applyTheme('light'));
        selectors.darkModeBtn?.addEventListener('click', () => applyTheme('dark'));
        selectors.usernameInput?.addEventListener('change', () => {
            localStorage.setItem('nlvx-username', selectors.usernameInput.value);
            if (!userAvatar) renderChat(currentChatId);
        });
        selectors.avatarUpload?.addEventListener('change', handleAvatarUpload);
        selectors.micBtn?.addEventListener('click', toggleRecording);
        selectors.voiceLangSelect?.addEventListener('change', () => {
            localStorage.setItem('nlvx-voice-lang', selectors.voiceLangSelect.value);
        });
    };

    // --- 4. AVATAR HANDLING ---
    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                userAvatar = event.target.result;
                selectors.avatarPreview.src = userAvatar;
                saveState();
                renderChat(currentChatId);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- 5. MODALS & SETTINGS ---
    const openModal = (modal) => {
        if (modal) {
            modal.style.display = 'flex';
            modal.querySelector('.modal-content')?.focus();
        }
    };

    const closeModal = (modal) => {
        if (modal) modal.style.display = 'none';
    };

    const showToast = (message) => {
        selectors.toastNotification.textContent = message;
        selectors.toastNotification.className = "toast show";
        setTimeout(() => { selectors.toastNotification.className = "toast"; }, 3000);
    };

    const showConfirmModal = (titleKey, textKey, onConfirm) => {
        document.getElementById('confirm-title').dataset.key = titleKey;
        document.getElementById('confirm-text').dataset.key = textKey;
        applyLanguage(currentLanguage);
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
        selectors.lightModeBtn?.classList.toggle('active', theme === 'light');
        selectors.darkModeBtn?.classList.toggle('active', theme === 'dark');
    };

    const applyLanguage = (lang) => {
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
    };

    const populateLanguageSwitcher = () => {
        selectors.languageSwitcher.innerHTML = '';
        Object.values(translations).forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-btn';
            btn.textContent = lang.name;
            btn.dataset.lang = lang.code;
            btn.classList.toggle('active', lang.code === currentLanguage);
            btn.setAttribute('aria-label', `Switch to ${lang.name}`);
            btn.onclick = () => {
                applyLanguage(lang.code);
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            selectors.languageSwitcher.appendChild(btn);
        });
    };

    // --- 6. SPEECH RECOGNITION ---
    const setupSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            selectors.micBtn.style.display = 'none';
            return;
        }
        navigator.permissions.query({ name: 'microphone' }).then(permission => {
            if (permission.state === 'denied') {
                selectors.micBtn.style.display = 'none';
            }
        });
        recognition = new SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = false;
        
        recognition.onstart = () => {
            isRecording = true;
            selectors.micBtn.classList.add('is-recording');
        };
        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            selectors.userInput.value = finalTranscript + interimTranscript;
            selectors.userInput.style.height = 'auto';
            selectors.userInput.style.height = `${selectors.userInput.scrollHeight}px`;
        };
        recognition.onend = () => {
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isRecording = false;
            selectors.micBtn.classList.remove('is-recording');
            showToast('Microphone access denied or error occurred.');
        };
    };

    const toggleRecording = () => {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.lang = selectors.voiceLangSelect.value || 'en-US';
            recognition.start();
        }
    };

    const populateVoiceLanguages = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = populateVoiceLanguages;
            return;
        }
        
        selectors.voiceLangSelect.innerHTML = '';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.lang;
            selectors.voiceLangSelect.appendChild(option);
        });
        const savedVoice = localStorage.getItem('nlvx-voice-lang');
        if (savedVoice) selectors.voiceLangSelect.value = savedVoice;
    };

    // --- 7. INITIALIZATION ---
    const initializeApp = () => {
        if (!window.marked || !window.hljs) {
            console.error("Required libraries (marked or highlight.js) are not loaded.");
            showToast(translations[currentLanguage].feature_soon);
            return;
        }
        lucide.createIcons();
        
        const savedTheme = localStorage.getItem('nlvx-theme') || 'dark';
        applyTheme(savedTheme);

        const savedLang = localStorage.getItem('nlvx-language') || 'en';
        populateLanguageSwitcher();
        applyLanguage(savedLang);

        selectors.usernameInput.value = localStorage.getItem('nlvx-username') || 'User';
        selectors.avatarPreview.src = userAvatar || '';

        allChats = JSON.parse(localStorage.getItem('nlvx-all-chats')) || {};
        currentChatId = localStorage.getItem('nlvx-current-chat-id');
        if (Object.keys(allChats).length === 0 || !allChats[currentChatId]) {
            createNewChat();
        } else {
            renderChatHistory();
            renderChat(currentChatId);
        }

        setupSpeechRecognition();
        populateVoiceLanguages();
        
        setupEventListeners();
        console.log("NLVX AI Initialized!");
    };

    initializeApp();
});