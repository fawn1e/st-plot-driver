console.log("🩰 Fawn: Загрузка...");
import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
    twistPrompt: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist. Write 2-3 sentences as OOC direction.",
    messageCount: 15  // ✅ Для getContext(), НЕ автоактивация
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

let lastType = null;
let isGenerating = false; // 🔒 Блокировка повторных нажатий
let debounceTimer = null;

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

// ========== ГЕНЕРАЦИЯ OOC (только по кнопкам!) ==========
function generateOOC(type) {
    if (isGenerating) return; // Предотвращаем дубли
    
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (lastType !== type) {
            const prompt = extension_settings[extensionName][`${type}Prompt`];
            addPlotPrompt(prompt);
            lastType = type;
            isGenerating = true;
            updateButtonState(true);
            console.log(`🩰 Fawn: ${type.toUpperCase()} активирован`);
        }
    }, 300); // 300мс debounce
}

// ========== СБРОС СОСТОЯНИЯ ==========
function resetState() {
    clearTimeout(debounceTimer);
    if (isGenerating) {
        clearPlotPrompt();
    }
    lastType = null;
    isGenerating = false;
    updateButtonState(false);
}

// ========== ОБНОВИТЬ СОСТОЯНИЕ КНОПОК ==========
function updateButtonState(generating) {
    const timeskipBtn = document.getElementById('fawn-timeskip-btn');
    const twistBtn = document.getElementById('fawn-twist-btn');
    
    if (timeskipBtn) {
        timeskipBtn.disabled = generating;
        timeskipBtn.style.opacity = generating ? '0.5' : '1';
        timeskipBtn.textContent = generating ? '⏳ OOC...' : (timeskipBtn.dataset.originalText || '⏭️ Timeskip');
    }
    if (twistBtn) {
        twistBtn.disabled = generating;
        twistBtn.style.opacity = generating ? '0.5' : '1';
        twistBtn.textContent = generating ? '⏳ OOC...' : (twistBtn.dataset.originalText || '🔀 Twist');
    }
}

// ========== ОКНО НАСТРОЕК ==========
function showSettingsPopup() {
    closePopup();
    const s = extension_settings[extensionName];
    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div style="position:fixed;top:20%;left:20%;width:450px;background:#2a2a2a;color:white;padding:20px;border:1px solid #555;border-radius:8px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.8);font-family:Arial,sans-serif;max-height:70vh;overflow-y:auto;">
            <h3 style="margin:0 0 15px 0;border-bottom:1px solid #444;padding-bottom:10px;">🩰 Fawn Plot Driver</h3>
            
            <div style="margin-bottom:15px;">
                <label style="display:block;margin-bottom:5px;font-weight:bold;">⏭️ Timeskip промпт:</label>
                <textarea id="timeskip-prompt" style="width:100%;height:80px;background:#1a1a1a;color:white;border:1px solid #444;border-radius:4px;padding:8px;font-size:12px;font-family:monospace;">${s.timeskipPrompt}</textarea>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block;margin-bottom:5px;font-weight:bold;">🔀 Twist промпт:</label>
                <textarea id="twist-prompt" style="width:100%;height:80px;background:#1a1a1a;color:white;border:1px solid #444;border-radius:4px;padding:8px;font-size:12px;font-family:monospace;">${s.twistPrompt}</textarea>
            </div>
            
            <div style="margin-bottom:20px;">
                <label style="display:block;margin-bottom:5px;font-weight:bold;">📊 Сообщений в контексте (getContext):</label>
                <input id="msg-count" type="number" min="5" max="50" value="${s.messageCount}" style="width:80px;background:#1a1a1a;color:white;border:1px solid #444;border-radius:4px;padding:6px;font-size:14px;">
            </div>
            
            <div style="text-align:right;">
                <button onclick="fawnSaveSettings()" style="margin-right:10px;background:#4a90e2;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">💾 Сохранить</button>
                <button onclick="fawnClosePopup()" style="background:#666;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;">❌ Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

// Глобальные функции для кнопок popup
window.fawnSaveSettings = function() {
    extension_settings[extensionName].timeskipPrompt = document.getElementById('timeskip-prompt').value;
    extension_settings[extensionName].twistPrompt = document.getElementById('twist-prompt').value;
    extension_settings[extensionName].messageCount = parseInt(document.getElementById('msg-count').value) || 15;
    saveSettings();
    closePopup();
    console.log("🩰 Fawn: Настройки сохранены");
};

window.fawnClosePopup = closePopup;

// ========== ОСНОВНОЙ ХУК ==========
eventSource.on(event_types.CHAT_CHANGED, () => {
    resetState(); // ✅ Только сброс состояния при смене чата
});

eventSource.on(event_types.MESSAGE_RECEIVED, (message) => {
    // ✅ АВТОСБРОС OOC после получения ответа (фикс обрывов)
    setTimeout(() => {
        if (isGenerating) {
            resetState();
        }
    }, 2000); // 2 сек после ответа
});

// ========== КНОПКИ ==========
document.addEventListener('DOMContentLoaded', () => {
    // Timeskip кнопка
    const timeskipBtn = document.createElement('div');
    timeskipBtn.id = 'fawn-timeskip-btn';
    timeskipBtn.dataset.originalText = '⏭️ Timeskip';
    timeskipBtn.innerHTML = '⏭️ Timeskip';
    timeskipBtn.style.cssText = `
        position:fixed;bottom:100px;right:20px;
        background:linear-gradient(135deg,#ff6b6b,#ff8e8e);
        color:white;font-weight:bold;padding:12px 16px;border-radius:50px;
        cursor:pointer;font-size:14px;z-index:10000;
        box-shadow:0 4px 15px rgba(255,107,107,0.4);
        border:none;transition:all 0.3s ease;
        user-select:none;
    `;
    timeskipBtn.title = "Временной скачок (OOC)";
    timeskipBtn.onclick = () => generateOOC('timeskip');
    document.body.appendChild(timeskipBtn);

    // Twist кнопка
    const twistBtn = document.createElement('div');
    twistBtn.id = 'fawn-twist-btn';
    twistBtn.dataset.originalText = '🔀 Twist';
    twistBtn.innerHTML = '🔀 Twist';
    twistBtn.style.cssText = `
        position:fixed;bottom:100px;right:140px;
        background:linear-gradient(135deg,#4ecdc4,#44a08d);
        color:white;font-weight:bold;padding:12px 16px;border-radius:50px;
        cursor:pointer;font-size:14px;z-index:10000;
        box-shadow:0 4px 15px rgba(78,205,196,0.4);
        border:none;transition:all 0.3s ease;
        user-select:none;
    `;
    twistBtn.title = "Сюжетный твист (OOC)";
    twistBtn.onclick = () => generateOOC('twist');
    document.body.appendChild(twistBtn);

    // Settings кнопка
    const settingsBtn = document.createElement('div');
    settingsBtn.innerHTML = '🩰';
    settingsBtn.style.cssText = `
        position:fixed;bottom:20px;right:20px;
        background:#9b59b6;color:white;font-size:24px;width:50px;height:50px;
        border-radius:50%;cursor:pointer;z-index:10000;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 15px rgba(155,89,182,0.4);border:none;
        transition:all 0.3s ease;
    `;
    settingsBtn.title = "Fawn настройки";
    settingsBtn.onclick = showSettingsPopup;
    document.body.appendChild(settingsBtn);

    loadSettings();
    console.log("🩰 Fawn: Готов к работе! (только ручные кнопки)");
});

// Hover эффекты для кнопок
document.addEventListener('mouseover', (e) => {
    if (e.target.id === 'fawn-timeskip-btn' || e.target.id === 'fawn-twist-btn') {
        e.target.style.transform = 'scale(1.05)';
    }
});
document.addEventListener('mouseout', (e) => {
    if (e.target.id === 'fawn-timeskip-btn' || e.target.id === 'fawn-twist-btn') {
        e.target.style.transform = 'scale(1)';
    }
});
