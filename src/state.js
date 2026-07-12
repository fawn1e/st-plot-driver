/**
 * Мутабельное глобальное состояние расширения.
 * Используется как объект чтобы мутации были видны во всех модулях.
 */
export const state = {
    /** @type {'timeskip' | 'twist' | null} */
    lastType: null,

    /** @type {boolean} */
    isGenerating: false,

    /** @type {{ text: string, type: string, preferences: string } | null} */
    lastGeneratedOOC: null,

    /** @type {string} */
    currentPreferences: "",

    /** @type {string | null} */
    lastAutoMessageKey: null,

    /** @type {number} */
    messagesSinceAutoEvent: 0,

    /** @type {number} */
    messagesSinceTimeskip: 0, // <---- ДОБАВИТЬ ЭТУ СТРОКУ

    /** @type {boolean} */
    isAutoProcessing: false,

    /** @type {{ categories: Array<{ id: string, name: string, weight: 'low' | 'medium' | 'high', guidance?: string, default?: boolean }>, usedCategories: string[], extraInstructions?: string, manualEvents?: Array<{ id: string, categoryId: string, categoryName: string, text: string, used?: boolean }>, manualEventsPerCategory?: number } | null} */
    eventDirectorPlan: null,
};