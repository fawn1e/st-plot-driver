console.log('Fawn Plot Driver: Initializing...');

import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
    twistPrompt: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist. Write 2-3 sentences as OOC direction.",
    messageCount: 15
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

let lastType = null;
let isGenerating = false;
let lastGeneratedOOC = null;

// ========== СОХРАНИТЬ/ЗАГРУЗИТЬ ==========
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

// ========== ЗАКРЫТЬ POPUP ==========
function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) popup.remove();
}

// ========== ДОБАВИТЬ OOC ПРОМПТ ==========
function addPlotPrompt(text) {
    const prompt = `[OOC INSTRUCTION FROM PLOT DRIVER]
${text}
[END OOC - incorporate this naturally into your next response]`;

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

    lastGeneratedOOC = null;
    updateMenuState();
}

// ========== ОЧИСТИТЬ OOC ПРОМПТ ==========
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

// ========== ОБНОВИТЬ СОСТОЯНИЕ МЕНЮ ==========
function updateMenuState() {
    const lastOocOption = document.getElementById("fawn-last-ooc-option");
    if (lastOocOption) {
        lastOocOption.style.display = lastGeneratedOOC ? "flex" : "none";
    }
}

// ========== ОКНО НАСТРОЕК ==========
function showSettingsPopup() {
    closePopup();
    const s = extension_settings[extensionName];

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" class="fawn-popup-bg"></div>
        <div class="fawn-popup-container">
            <div class="fawn-popup-header">
                <i class="fa-solid fa-gear"></i>
                <span>Fawn's Plot Driver Settings</span>
            </div>
            <div class="fawn-input-group">
                <label class="fawn-label">
                    <i class="fa-solid fa-clock"></i>
                    Time Skip Prompt:
                </label>
                <textarea id="fawn-set-timeskip" class="fawn-textarea">${s.timeskipPrompt}</textarea>
            </div>
            <div class="fawn-input-group">
                <label class="fawn-label">
                    <i class="fa-solid fa-bolt"></i>
                    Plot Twist Prompt:
                </label>
                <textarea id="fawn-set-twist" class="fawn-textarea">${s.twistPrompt}</textarea>
            </div>
            <div class="fawn-input-group">
                <label class="fawn-label">
                    <i class="fa-solid fa-message"></i>
                    Message Count: <span id="fawn-msg-count-label" class="fawn-count-label">${s.messageCount}</span>
                </label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" class="fawn-slider">
            </div>
            <div class="fawn-button-group">
                <button id="fawn-set-save" class="fawn-button fawn-button-primary">
                    <i class="fa-solid fa-floppy-disk"></i>
                    Save
                </button>
                <button id="fawn-set-reset" class="fawn-button fawn-button-secondary">
                    <i class="fa-solid fa-rotate-left"></i>
                    Reset
                </button>
                <button id="fawn-set-close" class="fawn-button fawn-button-secondary">
                    <i class="fa-solid fa-xmark"></i>
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-set-msgcount").addEventListener("input", function(e) {
        document.getElementById("fawn-msg-count-label").textContent = e.target.value;
    });

    document.getElementById("fawn-set-save").addEventListener("click", function() {
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        saveSettings();
        toastr.success("Settings saved successfully!");
        closePopup();
    });

    document.getElementById("fawn-set-reset").addEventListener("click", function() {
        document.getElementById("fawn-set-timeskip").value = defaultSettings.timeskipPrompt;
        document.getElementById("fawn-set-twist").value = defaultSettings.twistPrompt;
        document.getElementById("fawn-set-msgcount").value = defaultSettings.messageCount;
        document.getElementById("fawn-msg-count-label").textContent = defaultSettings.messageCount;
        toastr.info("Settings reset to defaults!");
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ПРЕВЬЮ OOC ==========
function showOOCPreview(text, type) {
    closePopup();

    const title = type === 'timeskip' ? 
        '<i class="fa-solid fa-clock"></i> Time Skip OOC' : 
        '<i class="fa-solid fa-bolt"></i> Plot Twist OOC';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" class="fawn-popup-bg"></div>
        <div class="fawn-popup-container fawn-ooc-preview">
            <div class="fawn-popup-header">
                ${title}
            </div>
            <div class="fawn-preview-subtitle">
                AI-generated OOC direction. Edit if needed:
            </div>
            <div class="fawn-ooc-textarea-container">
                <textarea id="fawn-ooc-text" class="fawn-ooc-textarea">${text}</textarea>
            </div>
            <div class="fawn-button-group">
                <button id="fawn-apply-ooc" class="fawn-button fawn-button-primary">
                    <i class="fa-solid fa-check"></i>
                    Apply OOC
                </button>
                <button id="fawn-regen-ooc" class="fawn-button fawn-button-secondary">
                    <i class="fa-solid fa-arrows-rotate"></i>
                    Regenerate
                </button>
                <button id="fawn-cancel" class="fawn-button fawn-button-secondary">
                    <i class="fa-solid fa-xmark"></i>
                    Cancel
                </button>
            </div>
            <div class="fawn-preview-note">
                Will be applied as a system instruction to the bot
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-ooc").addEventListener("click", function() {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            addPlotPrompt(finalOOC);
            closePopup();
            toastr.success(`${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} OOC applied! Send a message to the bot.`);
        }
    });

    document.getElementById("fawn-regen-ooc").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 150);
    });

    document.getElementById("fawn-cancel").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ OOC ==========
function showManualOOC(type) {
    const defaultOOC = type === 'timeskip'
        ? '(OOC: Time passes naturally. Describe what happens next.)'
        : '(OOC: Introduce an unexpected plot twist. Make it logical.)';

    closePopup();

    const title = type === 'timeskip' ? 
        '<i class="fa-solid fa-clock"></i> Manual Time Skip' : 
        '<i class="fa-solid fa-bolt"></i> Manual Plot Twist';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" class="fawn-popup-bg"></div>
        <div class="fawn-popup-container">
            <div class="fawn-popup-header">
                ${title}
            </div>
            <textarea id="fawn-manual-ooc" class="fawn-textarea fawn-manual-textarea">${defaultOOC}</textarea>
            <div class="fawn-button-group">
                <button id="fawn-apply-manual" class="fawn-button fawn-button-primary">
                    <i class="fa-solid fa-check"></i>
                    Apply OOC
                </button>
                <button id="fawn-regen" class="fawn-button fawn-button-secondary">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    Try AI Generation
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-manual").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            toastr.success("Manual OOC applied successfully!");
        }
    });

    document.getElementById("fawn-regen").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 100);
    });

    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    if (isGenerating) {
        toastr.info("Please wait, generating...");
        return;
    }

    console.log('Fawn Plot Driver: Generating OOC...');
    isGenerating = true;
    lastType = type;

    const icon = document.querySelector("#fawn-plot-btn i");
    if (icon) {
        icon.className = "fa-solid fa-pen-nib fa-spin";
    }

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        if (!context?.chat?.length) {
            toastr.warning("Start a chat first!");
            return;
        }

        const chatHistory = context.chat.slice(-msgCount).map(m => {
            const name = m.is_user ? 'User' : (m.name || 'Character');
            const cleanMes = m.mes.replace(/<[^>]*>/g, '').trim();
            return `${name}: ${cleanMes}`;
        }).join('\n');

        const instruction = type === 'timeskip'
            ? extension_settings[extensionName].timeskipPrompt
            : extension_settings[extensionName].twistPrompt;

        const oocPrompt = `TASK: ${instruction}

CONTEXT (last ${msgCount} messages):
${chatHistory}

RULES:
- Write ONLY OOC direction (2-3 sentences max)
- Format: (OOC: your direction here)
- NO roleplay, NO character speech, NO descriptions
- Example: (OOC: Time passes as they walk through the forest. Night falls and they find a campsite.)

OOC:`;

        const response = await generateQuietPrompt(oocPrompt, false, false);
        let oocText = extractOOC(response);

        if (oocText && !oocText.includes('OOC:')) {
            oocText = `(OOC: ${oocText.trim()})`;
        }

        if (oocText?.length > 5) {
            lastGeneratedOOC = { text: oocText, type: type };
            updateMenuState();
            showOOCPreview(oocText, type);
        } else {
            toastr.warning("Failed to generate OOC content");
            showManualOOC(type);
        }

    } catch (error) {
        console.error('Fawn Plot Driver Error:', error);
        toastr.error("Error generating OOC");
        showManualOOC(type);
    } finally {
        isGenerating = false;
        const icon = document.querySelector("#fawn-plot-btn i");
        if (icon) {
            icon.className = "fa-solid fa-star";
        }
    }
}

// ========== ПОКАЗАТЬ ПОСЛЕДНИЙ OOC ==========
function showLastOOC() {
    if (lastGeneratedOOC) {
        showOOCPreview(lastGeneratedOOC.text, lastGeneratedOOC.type);
    } else {
        toastr.info("No saved OOC found. Generate a new one first!");
    }
}

// ========== ИЗВЛЕЧЕНИЕ OOC ==========
function extractOOC(response) {
    let text = '';

    if (typeof response === 'string') {
        text = response;
    } else if (response?.choices?.[0]?.message?.content) {
        text = response.choices[0].message.content;
    } else if (response?.choices?.[0]?.text) {
        text = response.choices[0].text;
    } else if (response?.content) {
        text = response.content;
    } else if (response?.text) {
        text = response.text;
    }

    text = text
        ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?think[^>]*>/gi, '')
        .replace(/^\s*\n/gm, '')
        .trim();

    if (text && text.length > 500) {
        const cut = text.substring(0, 500);
        const lastEnd = Math.max(
            cut.lastIndexOf(')'),
            cut.lastIndexOf('.'),
            cut.lastIndexOf('!')
        );
        if (lastEnd > 100) {
            text = cut.substring(0, lastEnd + 1);
        } else {
            text = cut;
        }
    }

    return text;
}

// ========== ДОБАВИТЬ СТИЛИ ==========
function addFawnStyles() {
    if (document.getElementById('fawn-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'fawn-styles';
    styles.textContent = `
        /* Основные стили */
        #fawn-plot-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            cursor: pointer;
            color: var(--SmartThemeQuoteColor);
            background: var(--SmartThemeBlurTintColor);
            border: 1px solid var(--SmartThemeBorderColor);
            transition: all 0.2s ease;
            font-size: 16px;
            margin: 0 4px;
            flex-shrink: 0;
        }
        
        #fawn-plot-btn:hover {
            background: var(--SmartThemeBorderColor);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        #fawn-plot-btn i {
            transition: transform 0.2s ease;
        }
        
        /* Меню */
        #fawn-menu {
            position: fixed;
            background: var(--SmartThemeBlurTintColor);
            backdrop-filter: blur(10px);
            border: 1px solid var(--SmartThemeBorderColor);
            border-radius: 8px;
            padding: 6px;
            z-index: 10000;
            min-width: 200px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .fawn-option {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            cursor: pointer;
            color: var(--SmartThemeBodyColor);
            border-radius: 6px;
            margin: 2px 0;
            transition: all 0.15s ease;
            font-size: 14px;
        }
        
        .fawn-option:hover {
            background: var(--SmartThemeQuoteColor);
            color: white;
            padding-left: 16px;
        }
        
        .fawn-option i {
            width: 16px;
            text-align: center;
        }
        
        /* Popup */
        .fawn-popup-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(2px);
            z-index: 9998;
        }
        
        .fawn-popup-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--SmartThemeBlurTintColor);
            backdrop-filter: blur(20px);
            border: 1px solid var(--SmartThemeBorderColor);
            border-radius: 12px;
            padding: 24px;
            z-index: 9999;
            width: 500px;
            max-width: 90vw;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        
        .fawn-popup-header {
            color: var(--SmartThemeQuoteColor);
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .fawn-input-group {
            margin-bottom: 20px;
        }
        
        .fawn-label {
            color: var(--SmartThemeBodyColor);
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .fawn-textarea {
            width: 100%;
            background: var(--SmartThemeBlurTintColor);
            border: 1px solid var(--SmartThemeBorderColor);
            border-radius: 8px;
            padding: 12px;
            color: var(--SmartThemeBodyColor);
            resize: vertical;
            min-height: 80px;
            font-size: 14px;
            font-family: inherit;
        }
        
        .fawn-textarea:focus {
            outline: none;
            border-color: var(--SmartThemeQuoteColor);
            box-shadow: 0 0 0 2px rgba(var(--SmartThemeQuoteColor-rgb, 100, 100, 100), 0.1);
        }
        
        .fawn-slider {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: var(--SmartThemeBorderColor);
            outline: none;
            -webkit-appearance: none;
        }
        
        .fawn-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--SmartThemeQuoteColor);
            cursor: pointer;
            border: 2px solid var(--SmartThemeBlurTintColor);
        }
        
        .fawn-count-label {
            color: var(--SmartThemeQuoteColor);
            font-weight: 600;
            margin-left: 4px;
        }
        
        /* Кнопки */
        .fawn-button-group {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        
        .fawn-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 100px;
        }
        
        .fawn-button-primary {
            background: var(--SmartThemeQuoteColor);
            color: white;
        }
        
        .fawn-button-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .fawn-button-secondary {
            background: var(--SmartThemeBorderColor);
            color: var(--SmartThemeBodyColor);
        }
        
        .fawn-button-secondary:hover {
            background: var(--SmartThemeBodyColor);
            color: var(--SmartThemeBlurTintColor);
        }
        
        /* OOC Preview */
        .fawn-ooc-preview {
            width: 550px;
        }
        
        .fawn-preview-subtitle {
            color: var(--SmartThemeBodyColor);
            text-align: center;
            margin-bottom: 16px;
            opacity: 0.8;
            font-size: 13px;
        }
        
        .fawn-ooc-textarea-container {
            background: var(--SmartThemeBlurTintColor);
            border: 1px solid var(--SmartThemeQuoteColor);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
        }
        
        .fawn-ooc-textarea {
            width: 100%;
            background: transparent;
            border: none;
            color: var(--SmartThemeQuoteColor);
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            resize: vertical;
            min-height: 100px;
            line-height: 1.5;
            outline: none;
        }
        
        .fawn-preview-note {
            font-size: 11px;
            color: var(--SmartThemeBodyColor);
            opacity: 0.6;
            text-align: center;
            margin-top: 10px;
        }
        
        .fawn-manual-textarea {
            margin: 20px 0;
            min-height: 100px;
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            .fawn-popup-container {
                padding: 16px;
                width: 95vw;
            }
            
            .fawn-button {
                min-width: 80px;
                padding: 8px 16px;
                font-size: 13px;
            }
            
            #fawn-menu {
                min-width: 180px;
            }
        }
        
        /* Анимации */
        @keyframes fawn-fadeIn {
            from { opacity: 0; transform: translate(-50%, -48%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        
        .fawn-popup-container {
            animation: fawn-fadeIn 0.2s ease-out;
        }
    `;
    
    document.head.appendChild(styles);
}

// ========== ИСПРАВЛЕННАЯ КНОПКА И МЕНЮ ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm") ||
                     document.getElementById("form_sheld") ||
                     document.querySelector("#send_form");

    if (!container) return false;

    // Добавляем стили
    addFawnStyles();

    // Кнопка (основная иконка)
    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver - Manage story progression";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    
    // Меню
    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.innerHTML = `
        <div class="fawn-option" data-action="timeskip">
            <i class="fa-solid fa-clock"></i>
            <span>Time Skip</span>
        </div>
        <div class="fawn-option" data-action="twist">
            <i class="fa-solid fa-bolt"></i>
            <span>Plot Twist</span>
        </div>
        <div id="fawn-last-ooc-option" class="fawn-option" data-action="lastooc" style="display:none;">
            <i class="fa-solid fa-sparkles"></i>
            <span>Last Generated OOC</span>
        </div>
        <hr style="border:none; height:1px; background:var(--SmartThemeBorderColor); margin:6px 0;">
        <div class="fawn-option" data-action="settings">
            <i class="fa-solid fa-gear"></i>
            <span>Settings</span>
        </div>
    `;

    // Вставляем кнопку в контейнер формы
    container.insertBefore(btn, container.firstChild);
    document.body.appendChild(menu);

    // Обработчик клика по кнопке
    btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        updateMenuState();
        
        // Позиционируем меню
        const btnRect = btn.getBoundingClientRect();
        menu.style.left = btnRect.left + "px";
        menu.style.top = (btnRect.top + btnRect.height + 5) + "px";
        
        // Показываем/скрываем меню
        const isMenuVisible = menu.style.display === "block";
        menu.style.display = isMenuVisible ? "none" : "block";
    });

    // Обработчики для пунктов меню
    menu.querySelectorAll(".fawn-option").forEach(opt => {
        opt.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            menu.style.display = "none";
            const action = this.dataset.action;
            
            if (action === "settings") {
                showSettingsPopup();
            } else if (action === "lastooc") {
                showLastOOC();
            } else {
                drivePlot(action);
            }
        });
    });

    // Закрытие меню при клике вне
    document.addEventListener("click", function(e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

    // Закрытие меню при скролле или изменении размера окна
    window.addEventListener("scroll", function() {
        menu.style.display = "none";
    });
    
    window.addEventListener("resize", function() {
        menu.style.display = "none";
    });

    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, clearPlotPrompt);
eventSource.on(event_types.MESSAGE_SWIPED, clearPlotPrompt);

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    
    // Создаем кнопку при загрузке
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
    }, 500);
    
    // Запасной таймер
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
    }, 2000);
});
