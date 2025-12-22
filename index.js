(function() {
    'use strict';
    
    console.log("🩰 Fawn: Загрузка...");
    
    let lastType = null;
    let isGenerating = false;
    let debounceTimer = null;
    
    const extensionName = "plot-driver-fawn";
    const defaultSettings = {
        timeskipPrompt: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
        twistPrompt: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist. Write 2-3 sentences as OOC direction.",
        messageCount: 15
    };
    
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = { ...defaultSettings };
    }
    
    // ========== ФУНКЦИИ (БЕЗ ИЗМЕНЕНИЙ) ==========
    function saveSettings() {
        localStorage.setItem('fawn_settings', JSON.stringify(extension_settings[extensionName]));
    }
    
    function loadSettings() {
        try {
            const saved = localStorage.getItem('fawn_settings');
            if (saved) {
                extension_settings[extensionName] = { ...defaultSettings, ...JSON.parse(saved) };
            }
        } catch (e) {}
    }
    
    function closePopup() {
        const popup = document.getElementById("fawn-popup");
        if (popup) popup.remove();
    }
    
    function addPlotPrompt(text) {
        const prompt = `[OOC INSTRUCTION FROM PLOT DRIVER] ${text} [END OOC - incorporate this naturally into your next response]`;
        setExtensionPrompt(
            'fawn-plot-driver',
            prompt,
            extension_prompt_types.IN_CHAT,
            1,
            false,
            true,
            null,
            extension_prompt_roles.SYSTEM
        );
    }
    
    function clearPlotPrompt() {
        setExtensionPrompt(
            'fawn-plot-driver',
            '',
            extension_prompt_types.IN_CHAT,
            1,
            false,
            true,
            null,
            extension_prompt_roles.SYSTEM
        );
    }
    
    // ✅ ФИКСЫ: Генерация + блокировка
    function generateOOC(type) {
        if (isGenerating) return;
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (lastType !== type) {
                const prompt = extension_settings[extensionName][`${type}Prompt`];
                addPlotPrompt(prompt);
                lastType = type;
                isGenerating = true;
                updateButtonState(true); // ✅ Блокировка кнопок
                console.log(`🩰 Fawn: ${type.toUpperCase()} активирован`);
            }
        }, 300);
    }
    
    function resetState() {
        clearTimeout(debounceTimer);
        if (isGenerating) {
            clearPlotPrompt();
        }
        lastType = null;
        isGenerating = false;
        updateButtonState(false); // ✅ Разблокировка
    }
    
    function updateButtonState(generating) {
        const timeskipBtn = document.getElementById('fawn-timeskip-btn');
        const twistBtn = document.getElementById('fawn-twist-btn');
        
        if (timeskipBtn) {
            timeskipBtn.disabled = generating;
            timeskipBtn.style.opacity = generating ? '0.5' : '1';
            timeskipBtn.innerHTML = generating ? '⏳ OOC...' : '⏭️ Timeskip';
        }
        if (twistBtn) {
            twistBtn.disabled = generating;
            twistBtn.style.opacity = generating ? '0.5' : '1';
            twistBtn.innerHTML = generating ? '⏳ OOC...' : '🔀 Twist';
        }
    }
    
    // ✅ ОРИГИНАЛЬНОЕ МЕНЮ НАСТРОЕК
    function showSettingsPopup() {
        closePopup();
        const s = extension_settings[extensionName];
        const popup = document.createElement("div");
        popup.id = "fawn-popup";
        popup.innerHTML = `
            <div style="position:fixed;top:20%;left:20%;width:400px;background:#2a2a2a;color:white;padding:20px;border:1px solid #555;border-radius:8px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.8);font-family:Arial,sans-serif;">
                <h3 style="margin:0 0 15px 0;">🩰 Fawn Plot Driver</h3>
                <div style="margin-bottom:15px;">
                    <label>Timeskip промпт:</label><br>
                    <textarea id="timeskip-prompt" style="width:100%;height:80px;background:#1a1a1a;color:white;border:1px solid #444;border-radius:4px;padding:8px;font-size:12px;">${s.timeskipPrompt}</textarea>
                </div>
                <div style="margin-bottom:15px;">
                    <label>Twist промпт:</label><br>
                    <textarea id="twist-prompt" style="width:100%;height:80px;background:#1a1a1a;color:white;border:1px solid #444;border-radius:4px;padding:8px;font-size:12px;">${s.twistPrompt}</textarea>
                </div>
                <div style="margin-bottom:15px;">
                    <label>Сообщений до активации:</label><br>
                    <input id="msg-count" type="number" min="5" max="50" value="${s.messageCount}" style="width:100px;background:#1a1a1a;color:white;border:1px solid #444;border-radius:4px;padding:4px;">
                </div>
                <div style="text-align:right;">
                    <button onclick="fawnSaveSettings()" style="margin-right:10px;background:#4a90e2;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Сохранить</button>
                    <button onclick="fawnClosePopup()" style="background:#666;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
    }
    
    window.fawnSaveSettings = function() {
        extension_settings[extensionName].timeskipPrompt = document.getElementById('timeskip-prompt').value;
        extension_settings[extensionName].twistPrompt = document.getElementById('twist-prompt').value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById('msg-count').value);
        saveSettings();
        closePopup();
    };
    
    window.fawnClosePopup = closePopup;
    
    // ✅ ОРИГИНАЛЬНОЕ РАСПОЛОЖЕНИЕ: МЕНЮ РАСШИРЕНИЙ
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
        });
    }
    
    async function addFawnToExtensionsPanel() {
        const oldFawn = document.getElementById('fawn-extension-panel');
        if (oldFawn) oldFawn.remove();
        
        const extensionsDrawer = await waitForElement('#extensionsMenu');
        if (!extensionsDrawer) return;
        
        const fawnPanel = document.createElement('div');
        fawnPanel.id = 'fawn-extension-panel';
        fawnPanel.className = 'wide100p';
        fawnPanel.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 12px; margin: 5px 0;
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
            border: 1px solid var(--SmartThemeBorderColor);
            border-radius: 8px; color: white; cursor: pointer;
            transition: all 0.25s ease; font-weight: 600;
        `;
        fawnPanel.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-ballet-positions" style="font-size: 1.1em;"></i>
                <span>Fawn Plot Driver</span>
            </div>
            <div>⚙️</div>
        `;
        fawnPanel.title = 'Fawn настройки';
        fawnPanel.onclick = showSettingsPopup;
        
        extensionsDrawer.insertBefore(fawnPanel, extensionsDrawer.firstChild);
        console.log("🩰 Fawn: Панель в меню расширений добавлена!");
    }
    
    // ✅ ФИКСИРОВАННЫЕ КНОПКИ (fixed position)
    function addFloatingButtons() {
        // Удаляем старые
        const oldTimeskip = document.getElementById('fawn-timeskip-btn');
        const oldTwist = document.getElementById('fawn-twist-btn');
        if (oldTimeskip) oldTimeskip.remove();
        if (oldTwist) oldTwist.remove();
        
        // Timeskip
        const timeskipBtn = document.createElement('div');
        timeskipBtn.id = 'fawn-timeskip-btn';
        timeskipBtn.style.cssText = `
            position: fixed; bottom: 100px; right: 20px; z-index: 10000;
            width: 50px; height: 50px; background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
            border-radius: 50%; color: white; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: 0 4px 15px rgba(255,107,107,0.4);
            transition: all 0.3s ease; user-select: none;
        `;
        timeskipBtn.innerHTML = '⏭️';
        timeskipBtn.title = "Timeskip OOC";
        timeskipBtn.onclick = () => generateOOC('timeskip');
        document.body.appendChild(timeskipBtn);
        
        // Twist
        const twistBtn = document.createElement('div');
        twistBtn.id = 'fawn-twist-btn';
        twistBtn.style.cssText = `
            position: fixed; bottom: 100px; right: 90px; z-index: 10000;
            width: 50px; height: 50px; background: linear-gradient(135deg, #4ecdc4, #44a08d);
            border-radius: 50%; color: white; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; box-shadow: 0 4px 15px rgba(78,205,196,0.4);
            transition: all 0.3s ease; user-select: none;
        `;
        twistBtn.innerHTML = '🔀';
        twistBtn.title = "Twist OOC";
        twistBtn.onclick = () => generateOOC('twist');
        document.body.appendChild(twistBtn);
        
        console.log("🩰 Fawn: Плавающие кнопки добавлены!");
    }
    
    // ========== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ ==========
    jQuery(async () => {
        console.log('[🩰 Fawn] Extension loading...');
        
        try {
            loadSettings();
            await addFawnToExtensionsPanel(); // ✅ В МЕНЮ РАСШИРЕНИЙ
            addFloatingButtons(); // ✅ Плавающие кнопки
            
            const context = SillyTavern.getContext();
            const eventSource = context.eventSource;
            const eventTypes = context.eventTypes;
            
            eventSource.on(eventTypes.CHAT_CHANGED, () => {
                resetState();
                setTimeout(() => {
                    addFawnToExtensionsPanel();
                    addFloatingButtons();
                }, 300);
            });
            
            eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
                setTimeout(() => {
                    if (isGenerating) resetState(); // ✅ Фикс обрывов OOC
                }, 2000);
            });
            
            console.log('[🩰 Fawn] Loaded successfully!');
        } catch (e) {
            console.error('[🩰 Fawn] Failed:', e);
        }
    })();
})();
