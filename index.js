console.log("🩰 Fawn Plot Driver v2.0: Перезагрузка с фиксами...");

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
let lastPromptType = null;

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

// ========== РАБОТА С ПРОМПТАМИ ==========
function addOOCPrompt(promptText, type) {
    if (isProcessing) return;
    
    isProcessing = true;
    lastPromptType = type;
    
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
    
    // Ждем завершения генерации
    processingTimeout = setTimeout(() => {
        clearOOCPrompt();
        resetButtons();
    }, 5000); // Максимум 5 сек ожидания
}

function clearOOCPrompt() {
    setExtensionPrompt(
        'fawn-plot-driver-v2',
        '',
        extension_prompt_types.IN_CHAT,
        1,
        false,
        true,
        null,
        extension_prompt_roles.SYSTEM
    );
    isProcessing = false;
    lastPromptType = null;
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
}

// Сброс состояния кнопок
function resetButtons() {
    document.querySelectorAll('.fawn-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('processing');
        btn.textContent = btn.dataset.originalText || btn.textContent;
    });
}

// ========== UI ==========
function createButton(icon, text, action, tooltip) {
    const btn = document.createElement('div');
    btn.className = 'fawn-btn text-sm px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white cursor-pointer select-none flex items-center gap-1 whitespace-nowrap';
    btn.innerHTML = `${icon} ${text}`;
    btn.title = tooltip;
    btn.dataset.originalText = text;
    
    const debouncedAction = debounce((e) => {
        e.stopPropagation();
        if (isProcessing) return;
        
        btn.disabled = true;
        btn.classList.add('processing');
        btn.innerHTML = '⏳';
        
        action();
    }, 300);
    
    btn.addEventListener('click', debouncedAction);
    return btn;
}

function showControls() {
    // Удаляем старые контролы
    document.querySelectorAll('.fawn-controls, .fawn-popup').forEach(el => el.remove());
    
    const container = document.querySelector('#chat-container, .mes-container, [data-testid="message"]')?.parentElement;
    if (!container) return;
    
    const controls = document.createElement('div');
    controls.className = 'fawn-controls flex gap-1 p-2 bg-gray-800/50 rounded-lg border border-gray-600 mb-2';
    
    const s = extension_settings[extensionName];
    
    controls.appendChild(createButton(
        '⏭️',
        'Timeskip',
        () => addOOCPrompt(s.timeskipPrompt, 'timeskip'),
        'Создать плавный временной скачок (OOC)'
    ));
    
    controls.appendChild(createButton(
        '🔄',
        'Twist',
        () => addOOCPrompt(s.twistPrompt, 'twist'),
        'Добавить неожиданный поворот сюжета (OOC)'
    ));
    
    controls.appendChild(createButton(
        '⚙️',
        'Настройки',
        () => showSettingsPopup(),
        'Настройки Fawn'
    ));
    
    container.insertBefore(controls, container.firstChild);
    
    // Подписка на события чата для автоочистки
    const handler = (event) => {
        if (event.detail?.type === event_types.CHAT_COMPLETED || event.detail?.type === event_types.STOP_GENERATION) {
            setTimeout(clearOOCPrompt, 500);
        }
    };
    
    eventSource.on(event_types.CHAT_COMPLETED, handler);
    eventSource.on(event_types.STOP_GENERATION, handler);
    
    // Очистка при смене чата
    const chatObserver = new MutationObserver(() => {
        if (!document.querySelector('.mes')) {
            clearOOCPrompt();
        }
    });
    chatObserver.observe(document.body, { childList: true, subtree: true });
}

// ========== НАСТРОЙКИ ==========
function showSettingsPopup() {
    const popup = document.createElement('div');
    popup.className = 'fawn-popup fixed top-4 right-4 bg-black/90 backdrop-blur-lg border border-gray-700 rounded-xl p-6 w-96 max-h-96 overflow-auto shadow-2xl z-50';
    popup.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-white">🩰 Fawn Plot Driver v2.0</h3>
            <button id="fawn-close" class="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Timeskip промпт</label>
                <textarea id="timeskip-prompt" rows="3" class="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">${extension_settings[extensionName].timeskipPrompt}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Twist промпт</label>
                <textarea id="twist-prompt" rows="3" class="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">${extension_settings[extensionName].twistPrompt}</textarea>
            </div>
            <div class="flex gap-2 pt-2">
                <button id="fawn-save" class="flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white font-medium transition-all">💾 Сохранить</button>
                <button id="fawn-default" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium transition-all">По умолчанию</button>
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
        showControls(); // Перерисовка кнопок
    };
    document.getElementById('fawn-default').onclick = () => {
        extension_settings[extensionName] = { ...defaultSettings };
        saveSettings();
        document.getElementById('timeskip-prompt').value = defaultSettings.timeskipPrompt;
        document.getElementById('twist-prompt').value = defaultSettings.twistPrompt;
    };
    
    // Закрытие по клику вне
    popup.onclick = (e) => {
        if (e.target === popup) popup.remove();
    };
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
loadSettings();

const observer = new MutationObserver(() => {
    if (document.querySelector('#chat-container, .mes-container')) {
        showControls();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Глобальная очистка при смене чата
window.addEventListener('focus', resetButtons);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resetButtons();
});

console.log("🩰 Fawn v2.0 готов! Кнопки: ⏭️ Timeskip, 🔄 Twist, ⚙️ Настройки");
