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
        <div id="fawn-popup-bg" class="fawn-overlay"></div>
        <div class="fawn-panel fawn-settings-panel">
            <div class="fawn-header">
                <div class="fawn-title">⚙️ Настройки Fawn's Plot Driver</div>
                <button class="fawn-close-btn" title="Закрыть">×</button>
            </div>
            
            <div class="fawn-section">
                <label class="fawn-label">🩰 Промпт для Time Skip:</label>
                <textarea id="fawn-set-timeskip" class="fawn-textarea">${s.timeskipPrompt}</textarea>
            </div>
            
            <div class="fawn-section">
                <label class="fawn-label">🥀 Промпт для Plot Twist:</label>
                <textarea id="fawn-set-twist" class="fawn-textarea">${s.twistPrompt}</textarea>
            </div>
            
            <div class="fawn-section">
                <label class="fawn-label">
                    📜 Сколько сообщений: 
                    <span id="fawn-msg-count-label" class="fawn-slider-value">${s.messageCount}</span>
                </label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" class="fawn-slider">
            </div>
            
            <div class="fawn-buttons">
                <button id="fawn-set-save" class="fawn-btn fawn-btn-primary">💾 Сохранить</button>
                <button id="fawn-set-reset" class="fawn-btn fawn-btn-secondary">🔄 Сбросить</button>
                <button id="fawn-set-close" class="fawn-btn fawn-btn-secondary">✖ Закрыть</button>
            </div>
        </div>

        <style>
        .fawn-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.75) !important;
            z-index: 99998 !important;
            backdrop-filter: blur(4px);
            animation: fawn-fade-in 0.2s ease-out;
        }
        
        .fawn-panel {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 540px !important;
            max-width: 92vw !important;
            max-height: 85vh !important;
            background: var(--SmartThemeBlurTintColor) !important;
            backdrop-filter: blur(20px) !important;
            border: 2px solid var(--SmartThemeBorderColor) !important;
            border-radius: 20px !important;
            padding: 28px !important;
            z-index: 99999 !important;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5) !important;
            animation: fawn-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            overflow-y: auto;
        }
        
        .fawn-settings-panel { min-height: 520px; }
        
        .fawn-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            margin-bottom: 28px !important;
            padding-bottom: 16px !important;
            border-bottom: 1px solid rgba(var(--SmartThemeBorderColor-rgb), 0.3);
        }
        
        .fawn-title {
            font-size: 22px !important;
            font-weight: 700 !important;
            background: linear-gradient(135deg, var(--SmartThemeQuoteColor), var(--SmartThemeAccentColor));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-align: center;
            flex: 1;
        }
        
        .fawn-close-btn {
            width: 36px !important;
            height: 36px !important;
            border-radius: 10px !important;
            background: rgba(var(--SmartThemeBorderColor-rgb), 0.2) !important;
            border: 1px solid rgba(var(--SmartThemeBorderColor-rgb), 0.3) !important;
            color: var(--SmartThemeBodyColor) !important;
            font-size: 20px !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        .fawn-close-btn:hover {
            background: var(--SmartThemeQuoteColor) !important;
            color: white !important;
            transform: scale(1.05);
        }
        
        .fawn-section {
            margin-bottom: 24px !important;
        }
        
        .fawn-section:last-child { margin-bottom: 0; }
        
        .fawn-label {
            display: block !important;
            margin-bottom: 10px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            color: var(--SmartThemeQuoteColor) !important;
        }
        
        .fawn-textarea {
            width: 100% !important;
            height: 90px !important;
            background: rgba(var(--SmartThemeBlurTintColor-rgb), 0.7) !important;
            backdrop-filter: blur(10px) !important;
            border: 2px solid rgba(var(--SmartThemeBorderColor-rgb), 0.4) !important;
            border-radius: 14px !important;
            padding: 16px !important;
            color: var(--SmartThemeBodyColor) !important;
            font-size: 14px !important;
            font-family: inherit !important;
            resize: vertical !important;
            transition: all 0.2s ease !important;
            line-height: 1.5 !important;
        }
        
        .fawn-textarea:focus {
            outline: none !important;
            border-color: var(--SmartThemeQuoteColor) !important;
            box-shadow: 0 0 0 3px rgba(var(--SmartThemeQuoteColor-rgb), 0.1) !important;
            transform: translateY(-1px);
        }
        
        .fawn-slider {
            width: 100% !important;
            height: 6px !important;
            background: rgba(var(--SmartThemeBorderColor-rgb), 0.3) !important;
            border-radius: 3px !important;
            outline: none !important;
            -webkit-appearance: none !important;
            accent-color: var(--SmartThemeQuoteColor) !important;
        }
        
        .fawn-slider::-webkit-slider-thumb {
            -webkit-appearance: none !important;
            width: 24px !important;
            height: 24px !important;
            background: var(--SmartThemeQuoteColor) !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        }
        
        .fawn-slider-value {
            background: var(--SmartThemeQuoteColor) !important;
            color: white !important;
            padding: 4px 10px !important;
            border-radius: 12px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            display: inline-block !important;
            min-width: 32px !important;
            text-align: center !important;
        }
        
        .fawn-buttons {
            display: flex !important;
            gap: 12px !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
            margin-top: 20px !important;
        }
        
        .fawn-btn {
            padding: 14px 24px !important;
            border: none !important;
            border-radius: 12px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            backdrop-filter: blur(10px) !important;
            position: relative !important;
            overflow: hidden !important;
        }
        
        .fawn-btn::before {
            content: '' !important;
            position: absolute !important;
            top: 0 !important;
            left: -100% !important;
            width: 100% !important;
            height: 100% !important;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent) !important;
            transition: left 0.5s !important;
        }
        
        .fawn-btn:hover::before { left: 100%; }
        
        .fawn-btn-primary {
            background: linear-gradient(135deg, var(--SmartThemeQuoteColor), var(--SmartThemeAccentColor)) !important;
            color: white !important;
            box-shadow: 0 8px 25px rgba(var(--SmartThemeQuoteColor-rgb), 0.3) !important;
        }
        
        .fawn-btn-primary:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 12px 35px rgba(var(--SmartThemeQuoteColor-rgb), 0.4) !important;
        }
        
        .fawn-btn-secondary {
            background: rgba(var(--SmartThemeBorderColor-rgb), 0.2) !important;
            color: var(--SmartThemeBodyColor) !important;
            border: 2px solid rgba(var(--SmartThemeBorderColor-rgb), 0.4) !important;
        }
        
        .fawn-btn-secondary:hover {
            background: var(--SmartThemeQuoteColor) !important;
            color: white !important;
            border-color: var(--SmartThemeQuoteColor) !important;
            transform: translateY(-1px) !important;
        }
        
        @keyframes fawn-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fawn-slide-in {
            from {
                opacity: 0;
                transform: translate(-50%, -60%) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        </style>
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
        toastr.success("Настройки сохранены! ✨");
        closePopup();
    });

    document.getElementById("fawn-set-reset").addEventListener("click", function() {
        document.getElementById("fawn-set-timeskip").value = defaultSettings.timeskipPrompt;
        document.getElementById("fawn-set-twist").value = defaultSettings.twistPrompt;
        document.getElementById("fawn-set-msgcount").value = defaultSettings.messageCount;
        document.getElementById("fawn-msg-count-label").textContent = defaultSettings.messageCount;
        toastr.info("Сброшено! ✨");
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
    document.querySelector(".fawn-close-btn").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ПЕРЕПИСАННОЕ ПРЕВЬЮ - ТОЛЬКО OOC ==========
function showOOCPreview(text, type) {
    closePopup();

    const title = type === 'timeskip' ? '🩰 Time Skip OOC' : '🥀 Plot Twist OOC';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" class="fawn-overlay"></div>
        <div class="fawn-panel fawn-preview-panel">
            <div class="fawn-header">
                <div class="fawn-title">${title}</div>
                <button class="fawn-close-btn" title="Закрыть">×</button>
            </div>
            <div class="fawn-subtitle">Сгенерировано нейронкой. Отредактируй если нужно:</div>
            <div class="fawn-ooc-container">
                <textarea id="fawn-ooc-text" class="fawn-ooc-textarea">${text}</textarea>
            </div>
            <div class="fawn-buttons">
                <button id="fawn-apply-ooc" class="fawn-btn fawn-btn-primary fawn-btn-large">✅ ПРИМЕНИТЬ OOC</button>
                <button id="fawn-regen-ooc" class="fawn-btn fawn-btn-secondary">🔄 Новая генерация</button>
                <button id="fawn-cancel" class="fawn-btn fawn-btn-secondary">❌ Отмена</button>
            </div>
            <div class="fawn-footer">Применит как системную инструкцию боту</div>
        </div>

        <style>
        .fawn-preview-panel { width: 560px !important; min-height: 420px; }
        .fawn-subtitle {
            text-align: center !important;
            margin-bottom: 20px !important;
            color: var(--SmartThemeBodyColor) !important;
            opacity: 0.9 !important;
            font-size: 15px !important;
        }
        .fawn-ooc-container {
            background: rgba(var(--SmartThemeBlurTintColor-rgb), 0.6) !important;
            border: 2px solid var(--SmartThemeQuoteColor) !important;
            border-radius: 16px !important;
            padding: 20px !important;
            margin-bottom: 24px !important;
            min-height: 140px !important;
            backdrop-filter: blur(12px) !important;
        }
        .fawn-ooc-textarea {
            width: 100% !important;
            height: 120px !important;
            background: transparent !important;
            border: none !important;
            color: var(--SmartThemeQuoteColor) !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
            font-size: 15px !important;
            resize: vertical !important;
            outline: none !important;
            line-height: 1.6 !important;
        }
        .fawn-btn-large { padding: 16px 28px !important; font-size: 16px !important; }
        .fawn-footer {
            font-size: 13px !important;
            color: var(--SmartThemeBodyColor) !important;
            opacity: 0.7 !important;
            text-align: center !important;
            padding-top: 16px !important;
            border-top: 1px solid rgba(var(--SmartThemeBorderColor-rgb), 0.3);
        }
        </style>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-ooc").addEventListener("click", function() {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            addPlotPrompt(finalOOC);
            closePopup();
            toastr.success(`OOC ${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} применен! Отправь сообщение боту 🩰✨`);
        }
    });

    document.getElementById("fawn-regen-ooc").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 150);
    });

    document.getElementById("fawn-cancel").addEventListener("click", closePopup);
    document.querySelector(".fawn-close-btn").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ OOC ==========
function showManualOOC(type) {
    const defaultOOC = type === 'timeskip'
        ? '(OOC: Time passes naturally. Describe what happens next.)'
        : '(OOC: Introduce an unexpected plot twist. Make it logical.)';

    closePopup();

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" class="fawn-overlay"></div>
        <div class="fawn-panel">
            <div class="fawn-header">
                <div class="fawn-title">${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}</div>
                <button class="fawn-close-btn">×</button>
            </div>
            <textarea id="fawn-manual-ooc" class="fawn-textarea fawn-manual-textarea">${defaultOOC}</textarea>
            <div class="fawn-buttons">
                <button id="fawn-apply-manual" class="fawn-btn fawn-btn-primary">✅ Применить OOC</button>
                <button id="fawn-regen" class="fawn-btn fawn-btn-secondary">🔄 Попробовать снова</button>
            </div>
        </div>

        <style>
        .fawn-manual-textarea { height: 120px !important; margin: 0 !important; }
        </style>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-manual").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            toastr.success("OOC применен вручную! 🩰");
        }
    });

    document.getElementById("fawn-regen").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 100);
    });

    document.querySelector(".fawn-close-btn").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    if (isGenerating) {
        toastr.info("Подожди, генерируется! 💕");
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
            toastr.warning("Начни чат сначала! 💕");
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
            toastr.warning("OOC не сгенерировался 😅");
            showManualOOC(type);
        }

    } catch (error) {
        console.error(' Fawn: Error:', error);
        toastr.error("Ошибка генерации OOC");
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
        toastr.info("Нет сохранённого OOC! Сгенерируй новый 💕");
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

// ========== КРАСИВАЯ КНОПКА И МЕНЮ ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-container")) return true;

    const container = document.getElementById("leftSendForm") ||
                     document.getElementById("form_sheld") ||
                     document.querySelector("#send_form");

    if (!container) return false;

    const plotContainer = document.createElement("div");
    plotContainer.id = "fawn-plot-container";
    plotContainer.className = "fawn-plot-container";

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.className = "fawn-plot-btn";

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.className = "fawn-menu";

    menu.innerHTML = `
        <div class="fawn-menu-item" data-action="timeskip">
            <span class="fawn-icon">🩰</span>
            <span class="fawn-label">Time Skip</span>
        </div>
        <div class="fawn-menu-item" data-action="twist">
            <span class="fawn-icon">🥀</span>
            <span class="fawn-label">Plot Twist</span>
        </div>
        <div id="fawn-last-ooc-option" class="fawn-menu-item fawn-last-ooc" data-action="lastooc">
            <span class="fawn-icon">✨</span>
            <span class="fawn-label">Последний OOC</span>
        </div>
        <div class="fawn-menu-divider"></div>
        <div class="fawn-menu-item" data-action="settings">
            <span class="fawn-icon">⚙️</span>
            <span class="fawn-label">Настройки</span>
        </div>
    `;

    plotContainer.appendChild(btn);
    plotContainer.appendChild(menu);
    container.insertBefore(plotContainer, container.firstChild);

    // Глобальные стили для кнопки и меню
    if (!document.getElementById('fawn-styles')) {
        const style = document.createElement('style');
        style.id = 'fawn-styles';
        style.textContent = `
            .fawn-plot-container {
                position: relative !important;
                display: inline-block !important;
            }
            
            .fawn-plot-btn {
                cursor: pointer !important;
                padding: 12px !important;
                color: var(--SmartThemeQuoteColor) !important;
                font-size: 20px !important;
                border-radius: 16px !important;
                background: rgba(var(--SmartThemeBlurTintColor-rgb), 0.6) !important;
                backdrop-filter: blur(12px) !important;
                border: 2px solid rgba(var(--SmartThemeQuoteColor-rgb), 0.2) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .fawn-plot-btn::before {
                content: '' !important;
                position: absolute !important;
                top: 0 !important;
                left: -100% !important;
                width: 100% !important;
                height: 100% !important;
                background: linear-gradient(90deg, transparent, rgba(var(--SmartThemeQuoteColor-rgb), 0.2), transparent) !important;
                transition: left 0.6s !important;
            }
            
            .fawn-plot-btn:hover::before { left: 100% !important; }
            .fawn-plot-btn:hover {
                transform: translateY(-2px) scale(1.05) !important;
                background: rgba(var(--SmartThemeQuoteColor-rgb), 0.15) !important;
                border-color: var(--SmartThemeQuoteColor) !important;
                box-shadow: 0 8px 25px rgba(var(--SmartThemeQuoteColor-rgb), 0.3) !important;
            }
            
            .fawn-menu {
                display: none !important;
                position: absolute !important;
                bottom: 55px !important;
                left: 0 !important;
                background: var(--SmartThemeBlurTintColor) !important;
                backdrop-filter: blur(25px) !important;
                border: 2px solid rgba(var(--SmartThemeBorderColor-rgb), 0.6) !important;
                border-radius: 20px !important;
                padding: 8px !important;
                z-index: 1001 !important;
                min-width: 160px !important;
                box-shadow: 0 20px 40px rgba(0,0,0,0.4) !important;
                animation: fawn-menu-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            .fawn-menu-item {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                padding: 14px 16px !important;
                cursor: pointer !important;
                border-radius: 14px !important;
                color: var(--SmartThemeBodyColor) !important;
                font-size: 15px !important;
                font-weight: 500 !important;
                transition: all 0.2s ease !important;
                margin: 2px 0 !important;
            }
            
            .fawn-menu-item:hover {
                background: rgba(var(--SmartThemeQuoteColor-rgb), 0.15) !important;
                color: var(--SmartThemeQuoteColor) !important;
                transform: translateX(4px) !important;
            }
            
            .fawn-last-ooc {
                color: var(--SmartThemeQuoteColor) !important;
                background: rgba(var(--SmartThemeQuoteColor-rgb), 0.1) !important;
            }
            
            .fawn-menu-divider {
                height: 1px !important;
                background: rgba(var(--SmartThemeBorderColor-rgb), 0.4) !important;
                margin: 6px 0 !important;
                border-radius: 1px !important;
            }
            
            .fawn-icon { font-size: 18px !important; }
            .fawn-label { flex: 1; }
            
            @keyframes fawn-menu-slide {
                from {
                    opacity: 0;
                    transform: translateY(10px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }

    btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        updateMenuState();
        
        const isMenuVisible = menu.style.display === "block";
        menu.style.display = isMenuVisible ? "none" : "block";
    });

    menu.querySelectorAll(".fawn-menu-item").forEach(opt => {
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

    document.addEventListener("click", function(e) {
        if (!plotContainer.contains(e.target)) {
            menu.style.display = "none";
        }
    });

    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, clearPlotPrompt);
eventSource.on(event_types.MESSAGE_SWIPED, clearPlotPrompt);

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    addFawnMenu();
    
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-container")) {
            addFawnMenu();
        }
    }, 1000);
});
