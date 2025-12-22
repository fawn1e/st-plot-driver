console.log("🩰 Fawn Plot Driver v2.1: Фикс кнопок...");

import { extension_settings, getContext } from "../../../extensions.js";
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "plot-driver-fawn-v2";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 FULL sentences as OOC direction. Ensure complete sentences.",
    twistPrompt: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist. Write 2-3 FULL sentences as OOC direction. Ensure complete sentences.",
    messageCount: 15
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

let isProcessing = false;
let processingTimeout = null;
let controls = null;

// ========== УТИЛИТЫ ==========
function saveSettings() {
    localStorage.setItem('fawn_settings_v2', JSON.stringify(extension_settings[extensionName]));
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('fawn_settings_v2');
        if (saved) {
            extension_settings[extensionName] = { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {}
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function findChatContainer() {
    return document.querySelector('#chat-container, .mes-container, .chat-container, [data-testid="message"], .messages, main, body') || document.body;
}

// ========== РАБОТА С ПРОМПТАМИ ==========
function addOOCPrompt(promptText, type) {
    if (isProcessing) return;
    
    isProcessing = true;
    const fullPrompt = `[OOC INSTRUCTION FROM PLOT DRIVER: ${type.toUpperCase()}] ${promptText} [END OOC - incorporate this COMPLETELY into your next response. Do NOT cut off mid-sentence.]`;
    
    setExtensionPrompt(
        'fawn-plot-driver-v2',
        fullPrompt,
        extension_prompt_types.IN_CHAT,
        1,
        false,
        true,
        null,
        extension_prompt_roles.SYSTEM
    );
    
    processingTimeout = setTimeout(() => {
        clearOOCPrompt();
    }, 8000);
}

function clearOOCPrompt() {
    setExtensionPrompt('fawn-plot-driver-v2', '', extension_prompt_types.IN_CHAT, 1, false, true, null, extension_prompt_roles.SYSTEM);
    isProcessing = false;
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    resetButtons();
}

// ========== КНОПКИ ==========
function createButton(icon, text, action, tooltip) {
    const btn = document.createElement('div');
    btn.className = 'fawn-btn text-xs px-2 py-1 rounded bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white cursor-pointer select-none flex items-center gap-1 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 min-w-[70px] justify-center';
    btn.innerHTML = `<span class="icon">${icon}</span> <span class="text">${text}</span>`;
    btn.title = tooltip;
    
    const debouncedAction = debounce((e) => {
        e.stopPropagation();
        if (isProcessing) return;
        
        btn.classList.add('processing');
        const iconEl = btn.querySelector('.icon');
        const textEl = btn.querySelector('.text');
        iconEl.textContent = '⏳';
        textEl.textContent = '';
        
        action();
    }, 200);
    
    btn.addEventListener('click', debouncedAction);
    return btn;
}

function resetButtons() {
    document.querySelectorAll('.fawn-btn').forEach(btn => {
        btn.classList.remove('processing');
        btn.querySelector('.icon').textContent = btn.dataset.icon || '⚙️';
        btn.querySelector('.text').textContent = btn.dataset.text || 'Settings';
        btn.style.pointerEvents = 'auto';
    });
}

function showControls() {
    // Удаляем старые
    document.querySelectorAll('.fawn-controls').forEach(el => el.remove());
    
    const container = findChatContainer();
    if (!container) return;
    
    controls = document.createElement('div');
    controls.id = 'fawn-controls';
    controls.className = 'fawn-controls fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-auto';
    
    const s = extension_settings[extensionName];
    
    controls.appendChild(createButton('⏭️', 'Timeskip', () => addOOCPrompt(s.timeskipPrompt, 'timeskip'), 'Временной скачок'));
    controls.appendChild(createButton('🔄', 'Twist', () => addOOCPrompt(s.twistPrompt, 'twist'), 'Поворот сюжета'));
    controls.appendChild(createButton('⚙️', 'Настройки', () => showSettingsPopup(), 'Настройки'));
    
    document.body.appendChild(controls);
    
    // Автоочистка по событиям
    const handler = () => setTimeout(clearOOCPrompt, 1000);
    eventSource.on(event_types.CHAT_COMPLETED, handler);
    eventSource.on(event_types.STOP_GENERATION, handler);
}

// ========== НАСТРОЙКИ ==========
function showSettingsPopup() {
    const popup = document.createElement('div');
    popup.className = 'fawn-popup fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4';
    popup.innerHTML = `
        <div class="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600 rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <h3 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">🩰 Fawn v2.1</h3>
                <button id="fawn-close" class="text-2xl hover:text-white transition-colors">&times;</button>
            </div>
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-semibold text-gray-200 mb-3">⏭️ Timeskip промпт</label>
                    <textarea id="timeskip-prompt" rows="4" class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 resize-vertical transition-all">${extension_settings[extensionName].timeskipPrompt}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-200 mb-3">🔄 Twist промпт</label>
                    <textarea id="twist-prompt" rows="4" class="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/50 resize-vertical transition-all">${extension_settings[extensionName].twistPrompt}</textarea>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="fawn-save" class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all">💾 Сохранить</button>
                    <button id="fawn-default" class="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all">🔄 По умолчанию</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    document.getElementById('fawn-close').onclick = () => popup.remove();
    document.getElementById('fawn-save').onclick = () => {
        extension_settings[extensionName].timeskipPrompt = document.getElementById('timeskip-prompt').value;
        extension_settings[extensionName].twistPrompt = document.getElementById('twist-prompt').value;
        saveSettings();
        popup.remove();
        showControls();
    };
    document.getElementById('fawn-default').onclick = () => {
        extension_settings[extensionName] = { ...defaultSettings };
        saveSettings();
        document.getElementById('timeskip-prompt').value = defaultSettings.timeskipPrompt;
        document.getElementById('twist-prompt').value = defaultSettings.twistPrompt;
    };
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
loadSettings();
showControls(); // Показываем сразу

// Observer для перерисовки
const observer = new MutationObserver(() => {
    if (!document.querySelector('#fawn-controls')) {
        setTimeout(showControls, 500);
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 't') {
            e.preventDefault();
            addOOCPrompt(extension_settings[extensionName].timeskipPrompt, 'timeskip');
        } else if (e.key === 'y') {
            e.preventDefault();
            addOOCPrompt(extension_settings[extensionName].twistPrompt, 'twist');
        }
    }
});

console.log("🩰 Fawn v2.1 готов! Кнопки в правом нижнем углу. Горячие клавиши: Ctrl+T (timeskip), Ctrl+Y (twist)");
