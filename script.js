document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE, SELECTORS & TRANSLATIONS ---
    let allChats = {};
    let currentChatId = null;
    let recognition = null;
    let isRecording = false;
    let currentLanguage = localStorage.getItem('nlvx-language') || 'en';
    let isNlvxMode = false; // <<<--- NLVX MODE STATE
    
    // *** NEW: State for attached image ***
    let attachedFile = null;

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
        nlvxModeBtn: document.getElementById('nlvx-mode-btn'), // <<<--- NLVX MODE SELECTOR
        
        // *** NEW SELECTORS ***
        attachBtn: document.getElementById('attach-btn'),
        fileInput: document.getElementById('file-input'),
        imagePreviewContainer: document.getElementById('image-preview-container'),
        imagePreview: document.getElementById('image-preview'),
        removeImageBtn: document.getElementById('remove-image-btn'),
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
            chat.messages.forEach(msg => addMessageToChatBox(msg.role, msg.content, msg.image)); // Pass image URL
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

    const addMessageToChatBox = (sender, message, imageURL = null, messageId = null) => {
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
        
        // *** NEW: Add uploaded image to user message ***
        if (imageURL) {
            const imgElement = document.createElement('img');
            imgElement.src = imageURL;
            imgElement.className = 'message-image';
            contentDiv.appendChild(imgElement);
        }

        if (message === 'loading') {
            contentDiv.innerHTML += `<p><span class="loading-cursor"></span></p>`;
        } else if (message) {
            const textElement = document.createElement('div');
            textElement.innerHTML = renderMarkdown(message);
            contentDiv.appendChild(textElement);
            addCopyCodeFunctionality(contentDiv);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        selectors.chatBox.appendChild(messageDiv);
        selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
        return messageDiv;
    };

    // Function to convert file to Base64
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get only the Base64 part
        reader.onerror = error => reject(error);
    });

    let isStreaming = false;
    const handleSendMessage = async () => {
        const prompt = selectors.userInput.value.trim();
        // *** Allow sending if there is a prompt OR an image ***
        if ((!prompt && !attachedFile) || selectors.sendBtn.disabled || isStreaming) return;

        if (!currentChatId) {
            createNewChat();
        }

        let imageBase64 = null;
        let imageMimeType = null;
        let imageURL = null;

        if (attachedFile) {
            // Check if the prompt is empty and force a default message if only an image is sent
            if (!prompt) {
                selectors.userInput.value = "Analyze this image and describe it in detail.";
            }
            
            imageBase64 = await fileToBase64(attachedFile);
            imageMimeType = attachedFile.type;
            imageURL = URL.createObjectURL(attachedFile);
        }

        addMessageToChatBox('user', selectors.userInput.value.trim(), imageURL);
        
        // Store message with image info
        const userMessage = { role: 'user', content: selectors.userInput.value.trim() };
        if (imageURL) {
            userMessage.image = imageURL; // Store for re-rendering
        }
        allChats[currentChatId].messages.push(userMessage);
        
        if (allChats[currentChatId].messages.length === 1) {
            allChats[currentChatId].title = selectors.userInput.value.trim().substring(0, 30) + (selectors.userInput.value.trim().length > 30 ? '...' : '');
            renderChatHistory();
        }
        
        // Clear inputs after processing
        selectors.userInput.value = '';
        selectors.userInput.style.height = 'auto';
        selectors.removeImageBtn.click(); // Simulate click to clear image preview
        
        selectors.sendBtn.disabled = true;
        isStreaming = true;

        const assistantMessageId = `msg_${Date.now()}`;
        const assistantMessageElement = addMessageToChatBox('assistant', 'loading', null, assistantMessageId);
        const contentDiv = assistantMessageElement.querySelector('.message-content');
        
        try {
            // *** UPDATED FETCH BODY ***
            const requestBody = {
                history: allChats[currentChatId].messages,
                nlvx_mode: isNlvxMode,
                // Add image data if it exists
                ...(imageBase64 && { imageBase64, imageMimeType })
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
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
    
    // *** NEW: Voice Recognition Logic ***
    const startVoiceRecognition = () => {
        // Check for cross-browser compatibility
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showInputError("Voice input is not supported in this browser.");
            return;
        }

        if (recognition) {
            recognition.stop();
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Set language based on current UI language for better accuracy
        // Using a more comprehensive language mapping for better multi-language support
        const langMap = {
            'en': 'en-US',
            'ar': 'ar-SA', // Standard Arabic
            'ur': 'ur-PK'  // Urdu
        };
        recognition.lang = langMap[currentLanguage] || 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            selectors.micBtn.classList.add('active');
            selectors.micListeningIndicator.style.display = 'flex';
            selectors.userInput.setAttribute('placeholder', translations[currentLanguage].listening);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            selectors.userInput.value = transcript;
            selectors.userInput.style.height = 'auto';
            selectors.userInput.style.height = selectors.userInput.scrollHeight + 'px';
            handleSendMessage(); // Automatically send message after recognition
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            // Only show error if it's not a "no-speech" error (which is common when user stops talking)
            if (event.error !== 'no-speech') {
                showInputError(`Voice error: ${event.error}`);
            }
            stopVoiceRecognition();
        };

        recognition.onend = () => {
            stopVoiceRecognition();
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Recognition start failed:", e);
            showInputError("Could not start voice recognition. Check microphone permissions.");
            stopVoiceRecognition();
        }
    };

    const stopVoiceRecognition = () => {
        if (recognition) {
            recognition.stop();
        }
        isRecording = false;
        selectors.micBtn.classList.remove('active');
        selectors.micListeningIndicator.style.display = 'none';
        selectors.userInput.setAttribute('placeholder', translations[currentLanguage].ask_me_anything);
    };

    const setupEventListeners = () => {
        // ... (all your existing event listeners)
        selectors.sidebarToggleBtn.addEventListener('click', () => {
            selectors.sidebar.classList.toggle('closed');
        });

        selectors.newChatBtn.addEventListener('click', createNewChat);
        selectors.sendBtn.addEventListener('click', handleSendMessage);
        selectors.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        selectors.userInput.addEventListener('input', () => {
            selectors.userInput.style.height = 'auto';
            selectors.userInput.style.height = selectors.userInput.scrollHeight + 'px';
        });

        selectors.settingsBtn.addEventListener('click', () => openModal(selectors.settingsModal));
        selectors.closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay'))));
        selectors.settingsModal.addEventListener('click', (e) => {
            if (e.target === selectors.settingsModal) closeModal(selectors.settingsModal);
        });

        selectors.lightModeBtn.addEventListener('click', () => applyTheme('light'));
        selectors.darkModeBtn.addEventListener('click', () => applyTheme('dark'));

        selectors.clearHistoryBtn.addEventListener('click', () => {
            confirmAction(
                translations[currentLanguage].confirm_title,
                translations[currentLanguage].confirm_clear,
                () => {
                    localStorage.removeItem('nlvx-all-chats');
                    localStorage.removeItem('nlvx-current-chat-id');
                    allChats = {};
                    currentChatId = null;
                    renderChatHistory();
                    renderChat(null);
                    closeModal(selectors.confirmModal);
                    showToast(translations[currentLanguage].clear_history + ' ' + translations[currentLanguage].copy_success);
                }
            );
        });

        selectors.nlvxModeBtn.addEventListener('click', () => {
            isNlvxMode = !isNlvxMode;
            selectors.nlvxModeBtn.classList.toggle('active', isNlvxMode);
            showToast(isNlvxMode ? 'NLVX MODE ACTIVATED' : 'NLVX MODE DEACTIVATED');
        });

        // *** NEW EVENT LISTENERS FOR FILE ATTACHMENT ***
        selectors.attachBtn?.addEventListener('click', () => {
            selectors.fileInput.click();
        });

        selectors.fileInput?.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                attachedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectors.imagePreview.src = e.target.result;
                    selectors.imagePreviewContainer.style.display = 'flex';
                };
                reader.readAsDataURL(file);
            }
            // Clear the input value to allow re-selecting the same file
            event.target.value = '';
        });

        selectors.removeImageBtn?.addEventListener('click', () => {
            attachedFile = null;
            selectors.imagePreviewContainer.style.display = 'none';
            selectors.imagePreview.src = '#';
        });

        // *** NEW: Mic Button Listener ***
        selectors.micBtn.addEventListener('click', () => {
            if (isRecording) {
                stopVoiceRecognition();
            } else {
                startVoiceRecognition();
            }
        });
    };
    
    // ... (rest of your existing functions: openModal, closeModal, applyTheme, etc.)
    const openModal = (modalElement) => {
        modalElement.style.display = 'flex';
        modalElement.querySelector('.modal-content').focus();
    };

    const closeModal = (modalElement) => {
        modalElement.style.display = 'none';
    };

    const applyTheme = (theme) => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('nlvx-theme', theme);
    };

    const confirmAction = (title, text, onConfirm) => {
        selectors.confirmModal.querySelector('#confirm-title').textContent = title;
        selectors.confirmModal.querySelector('#confirm-text').textContent = text;
        selectors.confirmOkBtn.onclick = onConfirm;
        openModal(selectors.confirmModal);
    };

    const showToast = (message) => {
        selectors.toastNotification.textContent = message;
        selectors.toastNotification.classList.add('show');
        setTimeout(() => {
            selectors.toastNotification.classList.remove('show');
        }, 3000);
    };

    const loadState = () => {
        const savedChats = localStorage.getItem('nlvx-all-chats');
        const savedChatId = localStorage.getItem('nlvx-current-chat-id');
        const savedUsername = localStorage.getItem('nlvx-username');
        const savedTheme = localStorage.getItem('nlvx-theme') || 'dark';

        if (savedChats) {
            allChats = JSON.parse(savedChats);
            currentChatId = savedChatId in allChats ? savedChatId : null;
        }

        if (savedUsername) {
            selectors.usernameInput.value = savedUsername;
        }

        applyTheme(savedTheme);
        renderChatHistory();
        if (currentChatId) {
            renderChat(currentChatId);
        } else {
            createNewChat();
        }
    };

    const updateUIForLanguage = (lang) => {
        currentLanguage = lang;
        document.body.setAttribute('dir', translations[lang].dir);
        document.body.lang = lang;
        
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });
        
        document.querySelectorAll('[data-key-placeholder]').forEach(el => {
            const key = el.getAttribute('data-key-placeholder');
            if (translations[lang][key]) {
                el.setAttribute('placeholder', translations[lang][key]);
            }
        });
        
        // Re-render chat history titles
        renderChatHistory();
        
        // Update NLVX mode button text
        selectors.nlvxModeBtn.querySelector('span').textContent = 'NLVX MODE';
        
        // Update copy code tooltips
        document.querySelectorAll('.code-action-btn').forEach(btn => {
            btn.setAttribute('data-tooltip', translations[lang].copy_code);
        });
    };

    const renderLanguageSwitcher = () => {
        selectors.languageSwitcher.innerHTML = '';
        Object.keys(translations).forEach(langCode => {
            const btn = document.createElement('button');
            btn.textContent = translations[langCode].name;
            btn.classList.toggle('active', langCode === currentLanguage);
            btn.addEventListener('click', () => {
                if (langCode !== currentLanguage) {
                    confirmAction(
                        translations[currentLanguage].confirm_lang_change_title,
                        translations[currentLanguage].confirm_lang_change_text,
                        () => {
                            localStorage.setItem('nlvx-language', langCode);
                            window.location.reload();
                        }
                    );
                }
            });
            selectors.languageSwitcher.appendChild(btn);
        });
    };

    // --- 5. INITIALIZATION ---
    const initializeApp = () => {
        loadState();
        setupEventListeners();
        renderLanguageSwitcher();
        updateUIForLanguage(currentLanguage);
        lucide.createIcons();
    };

    initializeApp();
});
