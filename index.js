console.log('Fawn Plot Driver: Initializing...');

import { extension_settings } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";
import { extensionName, defaultSettings } from "./src/constants.js";
import { state } from "./src/state.js";
import { loadEventDirectorPlanForChat, loadSettings, loadLastOOCForChat } from "./src/storage.js";
import { clearPlotPrompt } from "./src/prompt.js";
import { addFawnMenu, updateMenuState } from "./src/ui/menu.js";
import { runAutomaticDirectorCycle } from "./src/generator.js";

// ========== ИНИЦИАЛИЗАЦИЯ НАСТРОЕК ==========
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();

    state.lastGeneratedOOC = loadLastOOCForChat() || null;
    state.currentPreferences = "";
    state.eventDirectorPlan = loadEventDirectorPlanForChat() || null;

    const tryAddMenu = () => {
        if (!document.getElementById("fawn-plot-btn")) {
            return addFawnMenu();
        }
        return true;
    };

    setTimeout(() => {
        tryAddMenu();
        setTimeout(updateMenuState, 200);
    }, 800);

    // Запасной таймер
    setTimeout(() => {
        tryAddMenu();
        updateMenuState();
    }, 2500);

    window.addEventListener('resize', () => setTimeout(updateMenuState, 100));

    // ========== СОБЫТИЯ ==========
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        clearPlotPrompt();
        updateMenuState();
        state.eventDirectorPlan = loadEventDirectorPlanForChat() || null;
        runAutomaticDirectorCycle();
    });

    eventSource.on(event_types.MESSAGE_SWIPED, () => {
        clearPlotPrompt();
        updateMenuState();
    });

    eventSource.on(event_types.CHAT_CHANGED, () => {
        console.log('Fawn: Chat changed, reloading...');
        loadSettings();
        state.lastGeneratedOOC = loadLastOOCForChat() || null;
        state.eventDirectorPlan = loadEventDirectorPlanForChat() || null;
        state.lastAutoMessageKey = null;
        state.messagesSinceAutoEvent = 0;
        setTimeout(updateMenuState, 300);
    });

    eventSource.on(event_types.CHAT_LOADED, () => {
        setTimeout(() => {
            loadSettings();
            state.lastGeneratedOOC = loadLastOOCForChat() || null;
            state.eventDirectorPlan = loadEventDirectorPlanForChat() || null;
            updateMenuState();
        }, 500);
    });

    console.log('Fawn Plot Driver: Initialized');
});
