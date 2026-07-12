export const extensionName = "plot-driver-fawn";

export const twistChanceThresholds = {
    low: 90,
    medium: 76,
    often: 60,
    chaos: 35,
};

export const categoryWeightValues = {
    low: 1,
    medium: 2,
    high: 4,
};

// ====== НОВАЯ КОНСТАНТА ======
export const DEFAULT_TIMESKIP_INTERVAL = 5;

export function getDefaultEventCategories(lang = 'en') {
    if (lang === 'ru') {
        return [
            { id: 'npc_interaction', name: 'Взаимодействие с NPC', weight: 'high', default: true },
            { id: 'personal_moment', name: 'Личное событие', weight: 'medium', default: true },
            { id: 'unexpected_visit', name: 'Неожиданный визит', weight: 'medium', default: true },
            { id: 'rumor_or_secret', name: 'Слух или секрет', weight: 'medium', default: true },
            { id: 'ambient_pressure', name: 'Давление окружения', weight: 'low', default: true },
        ];
    }

    return [
        { id: 'npc_interaction', name: 'NPC interaction', weight: 'high', default: true },
        { id: 'personal_moment', name: 'Personal moment', weight: 'medium', default: true },
        { id: 'unexpected_visit', name: 'Unexpected visit', weight: 'medium', default: true },
        { id: 'rumor_or_secret', name: 'Rumor or secret', weight: 'medium', default: true },
        { id: 'ambient_pressure', name: 'Ambient pressure', weight: 'low', default: true },
    ];
}

export const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
    twistPrompt: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist. Write 2-3 sentences as OOC direction.",
    messageCount: 15,
    connectionProfile: null, // null = использовать дефолтный ST API
    mode: "manual",
    autoEventEnabled: true,
    autoTimeskipEnabled: false,
    autoApplyManualTriggers: true,
    autoTwistChance: "medium",
    autoEventRollThreshold: 76,
    autoEventCooldownMessages: 3,
    manualEventCountPerCategory: 3,
    toastEnabled: true,
    timeskipInterval: DEFAULT_TIMESKIP_INTERVAL, 
};
