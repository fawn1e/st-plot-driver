import { extension_settings, getContext } from "../../../../extensions.js";
import { extensionName, defaultSettings } from "./constants.js";

// ========== ПОЛУЧИТЬ ID ТЕКУЩЕГО ЧАТА ==========
export function getCurrentChatId() {
    try {
        const context = getContext();
        if (context?.chatId) return context.chatId.toString();
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('chat') || 'global';
    } catch (e) {
        console.warn('Fawn: Could not get chat ID:', e);
        return 'global';
    }
}

// ========== НАСТРОЙКИ ==========
export function saveSettings() {
    const chatId = getCurrentChatId();
    localStorage.setItem(`fawn_settings_${chatId}`, JSON.stringify(extension_settings[extensionName]));
}

export function loadSettings() {
    try {
        const chatId = getCurrentChatId();
        const saved = localStorage.getItem(`fawn_settings_${chatId}`);
        if (saved) {
            extension_settings[extensionName] = { ...defaultSettings, ...JSON.parse(saved) };
        } else {
            const global = localStorage.getItem('fawn_settings_global');
            if (global) {
                extension_settings[extensionName] = { ...defaultSettings, ...JSON.parse(global) };
            }
        }
    } catch (e) {
        console.warn('Fawn: Could not load settings:', e);
    }
}

// ========== ПОСЛЕДНИЙ OOC (PER CHAT) ==========
export function saveLastOOCForChat(oocData) {
    try {
        const chatId = getCurrentChatId();
        localStorage.setItem(`fawn_last_ooc_${chatId}`, JSON.stringify(oocData));
    } catch (e) {
        console.warn('Fawn: Could not save OOC for chat:', e);
    }
}

export function loadLastOOCForChat() {
    try {
        const chatId = getCurrentChatId();
        const saved = localStorage.getItem(`fawn_last_ooc_${chatId}`);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.warn('Fawn: Could not load OOC for chat:', e);
        return null;
    }
}

// ========== АКТИВНЫЙ OOC (PER CHAT) ==========
export function saveActiveOOCForChat(text) {
    try {
        const chatId = getCurrentChatId();
        localStorage.setItem(`fawn_active_ooc_${chatId}`, text);
    } catch (e) {
        console.warn('Fawn: Could not save active OOC for chat:', e);
    }
}

export function loadActiveOOCForChat() {
    try {
        const chatId = getCurrentChatId();
        return localStorage.getItem(`fawn_active_ooc_${chatId}`) || '';
    } catch (e) {
        console.warn('Fawn: Could not load active OOC for chat:', e);
        return '';
    }
}

export function clearActiveOOCForChat() {
    try {
        const chatId = getCurrentChatId();
        localStorage.removeItem(`fawn_active_ooc_${chatId}`);
    } catch (e) {
        console.warn('Fawn: Could not clear active OOC for chat:', e);
    }
}

// ========== EVENT DIRECTOR PLAN (PER CHAT) ==========
export function saveEventDirectorPlanForChat(plan) {
    try {
        const chatId = getCurrentChatId();
        localStorage.setItem(`fawn_event_director_${chatId}`, JSON.stringify(plan));
    } catch (e) {
        console.warn('Fawn: Could not save Event Director plan:', e);
    }
}

export function loadEventDirectorPlanForChat() {
    try {
        const chatId = getCurrentChatId();
        const saved = localStorage.getItem(`fawn_event_director_${chatId}`);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.warn('Fawn: Could not load Event Director plan:', e);
        return null;
    }
}

export function clearEventDirectorPlanForChat() {
    try {
        const chatId = getCurrentChatId();
        localStorage.removeItem(`fawn_event_director_${chatId}`);
    } catch (e) {
        console.warn('Fawn: Could not clear Event Director plan:', e);
    }
}
