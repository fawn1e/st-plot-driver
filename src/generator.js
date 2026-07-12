import { extension_settings, getContext } from "../../../../extensions.js";
import { generateQuietPrompt } from "../../../../../script.js";
import { sendOpenAIRequest } from "../../../../openai.js";
import { ConnectionManagerRequestService } from "../../../shared.js";
import { categoryWeightValues, extensionName, getDefaultEventCategories, twistChanceThresholds } from "./constants.js";
import { state } from "./state.js";
import { t } from "./i18n.js";
import { getUiLanguage } from "./i18n.js";
import { notify } from "./notify.js";
import { addPlotPrompt } from "./prompt.js";
import { loadEventDirectorPlanForChat, saveEventDirectorPlanForChat, saveLastOOCForChat } from "./storage.js";
import { extractOOC } from "./prompt.js";
import { showOOCPreview } from "./ui/preview-popup.js";
import { showManualOOC } from "./ui/manual-popup.js";
import { updateMenuState } from "./ui/menu.js";
import { DEFAULT_TIMESKIP_INTERVAL } from "./constants.js";

// ========== КОНСТАНТЫ ==========
const DEFAULT_CONFIG = {
    messageCount: 15,
    maxTokens: 500,
    temperature: 0.7,
    topP: 0.9,
    minOocLength: 5,
    manualEventsPerCategory: 3,
    cooldownMessages: 0,
};

const TWIST_THRESHOLDS = {
    low: 75,
    medium: 50,
    high: 25
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function normalizeMessageText(text) {
    return String(text || '').replace(/<[^>]*>/g, '').trim();
}

function normalizeCategory(category) {
    return String(category || '').trim();
}

function normalizeWeightedCategory(category, index = 0) {
    if (typeof category === 'string') {
        return {
            id: `legacy_${index}_${normalizeCategory(category).toLowerCase().replace(/\s+/g, '_')}`,
            name: normalizeCategory(category),
            weight: 'medium',
            guidance: '',
            default: false,
        };
    }

    return {
        id: String(category?.id || `cat_${index}_${Date.now()}`),
        name: normalizeCategory(category?.name || ''),
        weight: ['low', 'medium', 'high'].includes(category?.weight) ? category.weight : 'medium',
        guidance: normalizeCategory(category?.guidance || ''),
        default: category?.default === true,
    };
}

function splitMultilineItems(text) {
    const normalized = String(text || '').replace(/\r/g, '');
    const lines = normalized.split('\n');
    const items = [];
    let current = '';

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (/^(?:[-*]|\d+[.)])\s+/.test(line)) {
            if (current) items.push(current.trim());
            current = line.replace(/^(?:[-*]|\d+[.)])\s+/, '').trim();
            continue;
        }

        if (current) {
            current += ` ${line}`;
        } else {
            current = line;
        }
    }

    if (current) items.push(current.trim());
    return items.filter(Boolean);
}

function decodeJsLikeStringFragment(fragment) {
    return String(fragment || '')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\`/g, '`')
        .replace(/\\'/g, "'")
        .replace(/\\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

function normalizeJsonResponseText(raw) {
    const text = String(raw || '').trim();
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }

    const fragments = [];
    const fragmentRegex = /(['`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
    let match;
    while ((match = fragmentRegex.exec(text)) !== null) {
        fragments.push(decodeJsLikeStringFragment(match[2]));
    }

    if (fragments.length > 1) {
        const joined = fragments.join('').trim();
        if (joined.includes('{') && joined.includes('}')) {
            return joined;
        }
    }

    return text;
}

function rollD100() {
    return Math.floor(Math.random() * 100) + 1;
}

function getMessageKey(message) {
    if (!message) return null;
    return [message.name || '', message.mes || '', message.send_date || '', message.swipe_id || ''].join('|');
}

function getLastCharacterMessage(context) {
    if (!context?.chat?.length) return null;

    for (let i = context.chat.length - 1; i >= 0; i--) {
        const message = context.chat[i];
        if (!message?.is_user) return message;
    }

    return null;
}

function createDefaultPlan() {
    return {
        summary: '',
        desiredThemes: '',
        bannedThemes: '',
        pace: 'either',
        categoryGuidance: '',
        autoConfigured: false,
        categories: getDefaultEventCategories(getUiLanguage()),
        usedCategories: [],
        extraInstructions: '',
        manualEvents: [],
        manualEventsPerCategory: DEFAULT_CONFIG.manualEventsPerCategory,
    };
}

function getEventDirectorPlan() {
    state.eventDirectorPlan = loadEventDirectorPlanForChat();
    return state.eventDirectorPlan;
}

function saveEventDirectorPlan(plan) {
    state.eventDirectorPlan = plan;
    saveEventDirectorPlanForChat(plan);
}

function normalizePlan(plan) {
    if (!plan) return createDefaultPlan();

    const fallback = createDefaultPlan();
    return {
        ...fallback,
        ...plan,
        categories: Array.isArray(plan.categories)
            ? plan.categories.map(normalizeWeightedCategory).filter(item => item.name)
            : fallback.categories,
        usedCategories: Array.isArray(plan.usedCategories) ? plan.usedCategories.map(normalizeCategory).filter(Boolean) : [],
        desiredThemes: String(plan.desiredThemes || '').trim(),
        bannedThemes: String(plan.bannedThemes || '').trim(),
        pace: ['slow', 'fast', 'either'].includes(plan.pace) ? plan.pace : fallback.pace,
        categoryGuidance: String(plan.categoryGuidance || '').trim(),
        autoConfigured: plan.autoConfigured === true,
        extraInstructions: String(plan.extraInstructions || '').trim(),
        manualEvents: Array.isArray(plan.manualEvents)
            ? plan.manualEvents.map((item, index) => ({
                id: String(item?.id || `event_${index}_${Date.now()}`),
                categoryId: String(item?.categoryId || ''),
                categoryName: normalizeCategory(item?.categoryName || ''),
                text: normalizeCategory(item?.text || ''),
                used: item?.used === true,
            })).filter(item => item.text)
            : [],
        manualEventsPerCategory: Number(plan.manualEventsPerCategory) > 0 ? Number(plan.manualEventsPerCategory) : fallback.manualEventsPerCategory,
    };
}

// ========== НОВАЯ ФУНКЦИЯ ДЛЯ ПАРСИНГА ==========
function extractEventsFromText(text) {
    if (!text) return null;
    const raw = typeof text === 'string' ? text : String(text);
    
    // Убираем markdown
    let cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    
    try {
        // Пробуем спарсить как JSON
        const parsed = JSON.parse(cleaned);
        if (parsed && Array.isArray(parsed.events)) {
            return parsed;
        }
    } catch (e) {
        // Если JSON не парсится - пробуем регекс
        console.warn('JSON parse failed, trying regex...');
    }
    
    // Регекс для поиска категорий и итемов
    const result = { events: [] };
    
    // Ищем блоки категорий
    const categoryRegex = /"category"\s*:\s*"([^"]+)"\s*,\s*"items"\s*:\s*\[([\s\S]*?)\]\s*\}/g;
    let match;
    
    while ((match = categoryRegex.exec(cleaned)) !== null) {
        const category = match[1];
        const itemsBlock = match[2];
        
        // Вытаскиваем все итемы из массива
        const items = [];
        const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
            items.push(itemMatch[1]);
        }
        
        result.events.push({ category, items });
    }
    
    return result.events.length ? result : null;
}

// ========== ИСПРАВЛЕННЫЙ ПАРСИНГ JSON ==========
function extractJsonBlock(text) {
    if (!text) return null;
    
    // Сначала пробуем через регекс
    const regResult = extractEventsFromText(text);
    if (regResult) return regResult;
    
    // Если не вышло - пробуем JSON
    const raw = typeof text === 'string' ? text : String(text);
    let cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('JSON parse failed:', e);
        return null;
    }
}

// ========== ОСНОВНЫЕ ФУНКЦИИ РАБОТЫ С ПЛАНОМ ==========
export function getCurrentEventDirectorPlan() {
    return getEventDirectorPlan();
}

export function clearCurrentEventDirectorPlan() {
    saveEventDirectorPlan(createDefaultPlan());
}

export function updateCurrentEventDirectorPlan(categories = [], extraInstructions = '', options = {}) {
    const current = normalizePlan(getEventDirectorPlan());
    const normalizedCategories = categories.map(normalizeWeightedCategory).filter(item => item.name);
    const validCategoryIds = new Set(normalizedCategories.map(item => item.id));
    const nextUsed = (current.usedCategories || []).filter(item => validCategoryIds.has(String(item)));
    const nextManualEvents = (current.manualEvents || []).filter(item => validCategoryIds.has(item.categoryId));

    saveEventDirectorPlan({
        ...current,
        categories: normalizedCategories,
        usedCategories: nextUsed,
        desiredThemes: String(options.desiredThemes ?? current.desiredThemes ?? '').trim(),
        bannedThemes: String(options.bannedThemes ?? current.bannedThemes ?? '').trim(),
        pace: ['slow', 'fast', 'either'].includes(options.pace) ? options.pace : current.pace,
        categoryGuidance: String(options.categoryGuidance ?? current.categoryGuidance ?? '').trim(),
        autoConfigured: true,
        extraInstructions: String(extraInstructions || '').trim(),
        manualEvents: nextManualEvents,
        manualEventsPerCategory: Number(options.manualEventsPerCategory) > 0
            ? Number(options.manualEventsPerCategory)
            : current.manualEventsPerCategory,
        
    });
}

function getUnusedManualEvents(plan) {
    return (plan?.manualEvents || []).filter(item => item.used !== true);
}

function shouldUseManualEventPool(settings) {
    return settings.mode === 'manual' || (settings.mode === 'hybrid' && settings.autoEventEnabled !== true);
}

function markManualEventUsed(eventId) {
    const plan = normalizePlan(getEventDirectorPlan());
    const nextManualEvents = (plan.manualEvents || []).map(item => item.id === eventId ? { ...item, used: true } : item);
    saveEventDirectorPlan({ ...plan, manualEvents: nextManualEvents });
}

function getModeBehavior(settings) {
    if (settings.mode === 'automatic') {
        return {
            autoEvents: true,
            autoTimeskip: true,
            autoApplyManualTriggers: true,
            hideLastAndClear: true,
        };
    }

    if (settings.mode === 'hybrid') {
        return {
            autoEvents: settings.autoEventEnabled !== false,
            autoTimeskip: settings.autoTimeskipEnabled === true,
            autoApplyManualTriggers: settings.autoApplyManualTriggers === true,
            hideLastAndClear: false,
        };
    }

    return {
        autoEvents: false,
        autoTimeskip: false,
        autoApplyManualTriggers: false,
        hideLastAndClear: false,
    };
}

export function getModeState() {
    return getModeBehavior(extension_settings[extensionName]);
}

function getTwistThreshold(settings) {
    const preset = settings.autoTwistChance;
    return TWIST_THRESHOLDS[preset] ?? Math.max(1, Math.min(100, Number(settings.autoEventRollThreshold) || 50));
}

function consumeCategoryFromPlan(category) {
    const plan = getEventDirectorPlan();
    if (!plan || !category) return;

    const normalized = normalizeCategory(category);
    const categories = Array.isArray(plan.categories) ? plan.categories : [];
    const usedCategories = Array.isArray(plan.usedCategories) ? plan.usedCategories : [];

    const matched = categories.find(item => normalizeCategory(item.name) === normalized || item.id === category);
    const categoryId = matched?.id || category;
    const nextUsed = usedCategories.includes(categoryId) ? usedCategories : [...usedCategories, categoryId];

    saveEventDirectorPlan({ ...plan, usedCategories: nextUsed });
}

function buildAutoApplyToast(type, category) {
    if (type === 'timeskip') return t('autoTimeskipToast');
    if (category) return t('autoEventToast', { category });
    return t('appliedType', { type: type === 'timeskip' ? t('timeSkip') : t('plotTwist') });
}

function applyGeneratedOOC(text, type, preferences = '', category = '') {
    state.lastGeneratedOOC = { text, type, preferences };
    saveLastOOCForChat(state.lastGeneratedOOC);
    addPlotPrompt(text);

    if (category) {
        consumeCategoryFromPlan(category);
    }

    notify('success', buildAutoApplyToast(type, category));
}

function pickWeightedCategory(categories) {
    const expanded = categories.flatMap(category => {
        const weight = categoryWeightValues[category.weight] ?? categoryWeightValues.medium;
        return Array.from({ length: weight }, () => category);
    });

    if (!expanded.length) return null;
    const index = Math.floor(Math.random() * expanded.length);
    return expanded[index];
}

function pickCategoryForEvent() {
    const plan = normalizePlan(getEventDirectorPlan());
    if (!plan.categories.length) return null;

    return pickWeightedCategory(plan.categories);
}

function pickManualEvent(category) {
    const plan = normalizePlan(getEventDirectorPlan());
    const events = getUnusedManualEvents(plan).filter(item => item.categoryId === category.id);
    if (!events.length) return null;
    const index = Math.floor(Math.random() * events.length);
    return events[index];
}

function buildEventGenerationPreferences(category, formSummary = '') {
    const parts = [t('eventCategoriesInstruction'), `Category: ${category}`];
    if (formSummary) parts.push(formSummary);
    return parts.join('\n');
}

function getPlanSummary(plan) {
    if (!plan) return '';
    const parts = [];
    if (plan.desiredThemes) parts.push(`Allowed themes: ${plan.desiredThemes}`);
    if (plan.bannedThemes) parts.push(`Avoid themes: ${plan.bannedThemes}`);
    if (plan.pace) parts.push(`Pace: ${plan.pace}`);
    if (plan.categoryGuidance) parts.push(`Category direction: ${plan.categoryGuidance}`);
    if (plan.extraInstructions) parts.push(`Extra user instructions: ${plan.extraInstructions}`);
    return parts.join('\n');
}

// ========== РАБОТА С ЧАТОМ ==========
function buildCharacterProfile(context) {
    const character = context?.characters?.[context.characterId] || null;
    const fields = [
        character?.description,
        character?.personality,
        character?.scenario,
        character?.mes_example,
    ].map(normalizeMessageText).filter(Boolean);

    if (!fields.length) return '';
    return `Character profile for ${context.name2}:\n${fields.join('\n\n')}`;
}

function buildUserProfile(context) {
    const persona = normalizeMessageText(context?.powerUserSettings?.persona_description || '');
    if (!persona) return '';
    return `User profile for ${context.name1}:\n${persona}`;
}

function getChatHistory(context, msgCount) {
    return context.chat.slice(-msgCount).map(m => {
        const name = m.is_user ? 'User' : (m.name || 'Character');
        const cleanMes = (m.mes || '').replace(/<[^>]*>/g, '').trim();
        return `${name}: ${cleanMes}`;
    }).join('\n');
}

function buildCleanChatCompletionMessages(context, prompt, msgCount) {
    const messages = [];
    const characterProfile = buildCharacterProfile(context);
    const userProfile = buildUserProfile(context);

    if (characterProfile) {
        messages.push({ role: 'system', content: characterProfile });
    }

    if (userProfile) {
        messages.push({ role: 'system', content: userProfile });
    }

    const chatMessages = Array.isArray(context?.chat) ? context.chat.slice(-msgCount) : [];
    for (const message of chatMessages) {
        const content = normalizeMessageText(message?.mes);
        if (!content) continue;

        messages.push({
            role: message?.is_user ? 'user' : 'assistant',
            content: content,
            name: message?.is_user ? context.name1 : context.name2,
        });
    }

    messages.push({ 
        role: 'user', 
        content: prompt, 
        name: context?.name1 || 'User' 
    });
    
    return messages;
}

// ========== ГЕНЕРАЦИЯ ЧЕРЕЗ МОДЕЛЬ ==========
async function generateWithProfile(profileId, prompt) {
    const result = await ConnectionManagerRequestService.sendRequest(
        profileId,
        prompt,
        DEFAULT_CONFIG.maxTokens,
        { stream: false, extractData: true, includePreset: false, includeInstruct: false }
    );
    return result?.content ?? result ?? '';
}

async function requestModel(prompt) {
    const s = extension_settings[extensionName];
    const context = getContext();

    let response;

    if (context?.mainApi === 'openai') {
        const messages = buildCleanChatCompletionMessages(context, prompt, s.messageCount || DEFAULT_CONFIG.messageCount);
        response = await sendOpenAIRequest('quiet', messages, null, {
            temperature: s.temperature || DEFAULT_CONFIG.temperature,
            max_tokens: s.maxTokens || DEFAULT_CONFIG.maxTokens,
        });
    } else if (s.connectionProfile) {
        try {
            response = await generateWithProfile(s.connectionProfile, prompt);
        } catch (profileErr) {
            console.warn('Fawn: Profile generation failed, falling back to default API:', profileErr);
            notify('warning', t('profileFallback'));
            response = await generateQuietPrompt({ 
                quietPrompt: prompt, 
                removeReasoning: true,
                temperature: s.temperature || DEFAULT_CONFIG.temperature,
                max_tokens: s.maxTokens || DEFAULT_CONFIG.maxTokens,
            });
        }
    } else {
        response = await generateQuietPrompt({ 
            quietPrompt: prompt, 
            removeReasoning: true,
            temperature: s.temperature || DEFAULT_CONFIG.temperature,
            max_tokens: s.maxTokens || DEFAULT_CONFIG.maxTokens,
        });
    }

    // ЕБАНЫЙ ФИКС - ВЫТАСКИВАЕМ СТРОКУ ИЗ ОБЪЕКТА
    if (typeof response === 'string') {
        return response;
    }
    
    if (response?.choices?.[0]?.message?.content) {
        return response.choices[0].message.content;
    }
    
    if (response?.content) {
        return response.content;
    }
    
    if (response?.message?.content) {
        return response.message.content;
    }
    
    return String(response || '');
}

// ========== ИСПРАВЛЕННАЯ ГЕНЕРАЦИЯ СОБЫТИЙ ==========
export async function generateManualEventsForCurrentPlan() {
    const plan = normalizePlan(getEventDirectorPlan());
    if (!plan.categories.length) {
        throw new Error('No categories configured');
    }

    const perCategory = Number(plan.manualEventsPerCategory) > 0 ? Number(plan.manualEventsPerCategory) : DEFAULT_CONFIG.manualEventsPerCategory;
    
    // Строим промпт с точными названиями категорий
    const categoriesText = plan.categories.map((category, index) => {
        const guidance = category.guidance ? ` | guidance: ${category.guidance}` : '';
        return `${index+1}. ${category.name}${guidance}`;
    }).join('\n');
    
    const prompt = `Create ${perCategory} random roleplay event ideas for EACH category below.
Return a JSON object with EXACT category names as provided.

Format:
{
  "events": [
    { "category": "EXACT category name from list", "items": ["event 1", "event 2", "event 3"] }
  ]
}

Categories:
${categoriesText}

Rules:
- Use the EXACT category names from the list above
- Each category must have exactly ${perCategory} items
- Write concise, ready-to-use event directions
- Events can't relate to current ungoing events in history, bear in mind that any of it can be pulled at any point of story so they need to stay broad and universal to the setting
- Do not wrap items in OOC or brackets
- Every item must be unique

Extra instructions:
${plan.extraInstructions || 'None'}`;

    console.log('Generating manual events with prompt:', prompt);

    const response = await requestModel(prompt);
    console.log('Raw response:', response);
    
    const parsed = extractJsonBlock(response);
    console.log('Parsed:', parsed);
    
    if (!parsed || !Array.isArray(parsed.events) || !parsed.events.length) {
        console.error('Failed to parse JSON:', response);
        throw new Error('Failed to parse JSON response from model');
    }

    const manualEvents = [];

    // Для каждой категории из плана ищем соответствующую группу в ответе
    for (const category of plan.categories) {
        const categoryName = category.name.trim();
        
        // Ищем группу с точным совпадением названия
        let group = parsed.events.find(item => {
            if (!item?.category) return false;
            return item.category.trim().toLowerCase() === categoryName.toLowerCase();
        });
        
        // Если не нашли - ищем частичное совпадение
        if (!group) {
            group = parsed.events.find(item => {
                if (!item?.category) return false;
                const gName = item.category.trim().toLowerCase();
                const cName = categoryName.toLowerCase();
                return gName.includes(cName) || cName.includes(gName);
            });
        }
        
        // Если всё ещё не нашли - берём первую группу
        if (!group) {
            group = parsed.events[0];
            console.warn(`No exact match for category "${categoryName}", using first group: "${group?.category}"`);
        }

        if (!group || !Array.isArray(group.items)) {
            console.warn(`No items found for category: ${categoryName}`);
            continue;
        }

        const items = group.items
            .flatMap(item => typeof item === 'string' ? [item] : splitMultilineItems(item))
            .filter(Boolean);

        // Берем первые perCategory итемов или меньше, если их недостаточно
        const itemsToTake = items.slice(0, perCategory);
        
        for (const text of itemsToTake) {
            const cleanText = normalizeCategory(text);
            if (!cleanText) continue;
            
            manualEvents.push({
                id: `${category.id}_${manualEvents.length}_${Date.now()}`,
                categoryId: category.id,
                categoryName: category.name,
                text: cleanText,
                used: false,
            });
        }
        
        // Если итемов меньше чем нужно - добавляем заглушки
        if (itemsToTake.length < perCategory) {
            console.warn(`Category "${categoryName}" has only ${itemsToTake.length} items, expected ${perCategory}`);
            for (let i = itemsToTake.length; i < perCategory; i++) {
                manualEvents.push({
                    id: `${category.id}_${manualEvents.length}_${Date.now()}`,
                    categoryId: category.id,
                    categoryName: category.name,
                    text: `Event ${i+1} for ${category.name}`,
                    used: false,
                });
            }
        }
    }
    
    if (!manualEvents.length) {
        throw new Error('No manual events generated');
    }

    console.log(`Generated ${manualEvents.length} manual events`);
    saveEventDirectorPlan({ ...plan, manualEvents, manualEventsPerCategory: perCategory });
    return manualEvents;
}

export async function generateAutomaticPlanForCurrentPlan() {
    const plan = normalizePlan(getEventDirectorPlan());
    const prompt = `Create a weighted category plan for automatic roleplay events.
Return JSON only with this exact shape. You can do up to 10 distinct categories if needed.:
{
  "categories": ["category 1", "category 2", "category 3", "category 4", "category 5"],
  "summary": "one short sentence"
}

Important formatting rules:
- return one raw JSON object only
- do not wrap the JSON in markdown
- do not use code fences
- do not add explanations before or after the JSON

Rules:
- categories must be distinct
- categories should be broad enough for reuse, but specific enough to feel intentional
- they can't relate to current events in history, bear in mind that any of it can be pulled at any point of story;
- each category should be suitable for random event generation
- follow the requested pace and include only desired themes
- avoid banned themes

Desired themes:
${plan.desiredThemes || 'None'}

Avoid themes:
${plan.bannedThemes || 'None'}

Pace:
${plan.pace || 'either'}

Always send:
${plan.extraInstructions || 'None'}`;

    const response = await requestModel(prompt);
    const parsed = extractJsonBlock(response);
    
    if (!parsed || !Array.isArray(parsed.categories) || !parsed.categories.length) {
        console.error('Failed to parse JSON:', response);
        throw new Error('Failed to parse JSON response from model');
    }

    const categoryNames = parsed.categories.map(normalizeCategory).filter(Boolean);

    if (!categoryNames.length) {
        throw new Error('No categories generated');
    }

    const categories = categoryNames.map((name, index) => normalizeWeightedCategory({
        id: `auto_${index}_${Date.now()}`,
        name,
        weight: index === 0 ? 'high' : 'medium',
        default: false,
    }, index));

    saveEventDirectorPlan({
        ...plan,
        summary: String(parsed?.summary || '').trim(),
        categories,
        usedCategories: [],
        autoConfigured: true,
    });

    return categories;
}

// ========== АВТОМАТИЧЕСКИЙ РЕЖИМ ==========
function shouldTriggerAutoEvent(settings) {
    const roll = rollD100();
    const threshold = getTwistThreshold(settings);
    return roll >= threshold;
}

async function shouldTriggerAutomaticTimeskip(context, msgCount) {
    const history = getChatHistory(context, msgCount);
    const s = extension_settings[extensionName];
    
    const prompt = `TASK: Decide if a timeskip is needed based on the chat context.

CHAT CONTEXT:
${history}

RULES:
- If timeskip is NOT needed: respond with exactly "NO"
- If timeskip IS needed: write a natural timeskip OOC direction (2-3 sentences)
- Format: (OOC: your timeskip direction here)
- Be natural, logical and fit the narrative

Example responses:
- "NO"
- "(OOC: Several hours pass as they travel through the forest. Night falls and they set up camp.)"

Your response:`;

    const response = await requestModel(prompt);
    
    // Проверяем ответ
    if (response.trim().toUpperCase() === "NO") {
        return { shouldTimeskip: false, ooc: null };
    }
    
    // Если ответ - OOC, используем его напрямую
    return { shouldTimeskip: true, ooc: response };
}

export async function runAutomaticDirectorCycle() {
    if (state.isGenerating || state.isAutoProcessing) return;

    const s = extension_settings[extensionName];
    const modeState = getModeBehavior(s);
    if (!modeState.autoEvents && !modeState.autoTimeskip) return;

    const context = getContext();
    const message = getLastCharacterMessage(context);
    const messageKey = getMessageKey(message);
    if (!messageKey || state.lastAutoMessageKey === messageKey) return;

    state.lastAutoMessageKey = messageKey;
    state.messagesSinceAutoEvent += 1;

    if (!context?.chat?.length) return;

    state.isAutoProcessing = true;

    try {
        const msgCount = s.messageCount || DEFAULT_CONFIG.messageCount;

        // ====== ТАЙМСКИП ======
        // Инициализируем счетчик если его нет
        if (state.messagesSinceTimeskip === undefined) {
            state.messagesSinceTimeskip = 0;
        }

        const timeskipInterval = s.timeskipInterval || DEFAULT_TIMESKIP_INTERVAL;

        if (modeState.autoTimeskip && state.messagesSinceTimeskip >= timeskipInterval) {
        const result = await shouldTriggerAutomaticTimeskip(context, msgCount);
        if (result.shouldTimeskip && result.ooc) {
        state.messagesSinceTimeskip = 0;
        state.messagesSinceAutoEvent = 0;
        applyGeneratedOOC(result.ooc, 'timeskip', '', '');
        return;
       }
}

        // ====== ИВЕНТЫ ======
        if (!modeState.autoEvents) return;
        const cooldown = Math.max(0, Number(s.autoEventCooldownMessages) || DEFAULT_CONFIG.cooldownMessages);
        if (state.messagesSinceAutoEvent <= cooldown) return;

        if (!shouldTriggerAutoEvent(s)) return;

        const category = pickCategoryForEvent();
        if (!category) {
            notify('info', t('noCategoriesAvailable'));
            return;
        }

        state.messagesSinceAutoEvent = 0;
        const plan = normalizePlan(getEventDirectorPlan());
        const manualEvent = shouldUseManualEventPool(s) ? pickManualEvent(category) : null;
        if (manualEvent) {
            markManualEventUsed(manualEvent.id);
            applyGeneratedOOC(manualEvent.text, 'twist', '', category.name);
            return;
        }

        const preferences = buildEventGenerationPreferences(category.name, getPlanSummary(plan));
        await drivePlotWithPreferences('twist', preferences, { autoApply: true, source: 'auto-event', category: category.name });

    } catch (error) {
        console.error('Fawn auto mode error:', error);
        notify('error', t('autoModeError'));
    } finally {
        state.isAutoProcessing = false;
        // Увеличиваем счетчик сообщений с последнего таймскипа
        state.messagesSinceTimeskip += 1;
    }
}


// ========== ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ==========
export async function drivePlotWithPreferences(type, preferences = "", options = {}) {
    if (state.isGenerating) {
        notify('info', t('generationInProgress'));
        return;
    }

    console.log('Fawn Plot Driver: Generating OOC...');
    state.isGenerating = true;
    state.lastType = type;

    const btn = document.getElementById("fawn-plot-btn");
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const context = getContext();
        const s = extension_settings[extensionName];
        const msgCount = s.messageCount || DEFAULT_CONFIG.messageCount;
        const modeState = getModeBehavior(s);
        const autoApply = options.autoApply === true || (options.source === 'manual-trigger' && modeState.autoApplyManualTriggers);

        if (!context?.chat?.length) {
            notify('warning', t('startChatFirst'));
            return;
        }

        if (type === 'twist' && shouldUseManualEventPool(s) && options.source !== 'auto-event') {
            const category = pickCategoryForEvent();
            const manualEvent = category ? pickManualEvent(category) : null;
            if (manualEvent) {
                markManualEventUsed(manualEvent.id);
                const manualOocText = `(OOC: ${manualEvent.text})`;
                state.lastGeneratedOOC = { text: manualOocText, type, preferences };
                saveLastOOCForChat(state.lastGeneratedOOC);

                if (autoApply) {
                    applyGeneratedOOC(manualOocText, type, preferences, category.name);
                } else {
                    showOOCPreview(manualOocText, type);
                }
                return;
            }
        }

        const chatHistory = getChatHistory(context, msgCount);

        const instruction = type === 'timeskip' ? s.timeskipPrompt : s.twistPrompt;
        const finalInstruction = preferences?.trim()
            ? `${instruction}\n\nUSER PREFERENCES: ${preferences}`
            : instruction;

        const oocPrompt = `TASK: ${finalInstruction}

CONTEXT (last ${msgCount} messages):
${chatHistory}

RULES:
- Write ONLY OOC direction (2-3 sentences max)
- Format: (OOC: your direction here)
- NO roleplay, NO character speech, NO descriptions
- ${preferences ? 'INCORPORATE USER PREFERENCES: ' + preferences : ''}
- Example: (OOC: Time passes as they walk through the forest. Night falls and they find a campsite.)

OOC:`;

        const rawResponse = await requestModel(oocPrompt);

        let oocText = extractOOC(rawResponse);

        if (!oocText || oocText.trim().length < DEFAULT_CONFIG.minOocLength) {
            notify('warning', t('generationFailed'));
            showManualOOC(type);
            return;
        }

        if (!oocText.includes('OOC:') && !oocText.includes('(OOC:')) {
            oocText = `(OOC: ${oocText.trim()})`;
        }

        if (oocText.length > 10 && !oocText.includes('undefined')) {
            state.lastGeneratedOOC = { text: oocText, type, preferences };
            saveLastOOCForChat(state.lastGeneratedOOC);
            if (autoApply) {
                applyGeneratedOOC(oocText, type, preferences, options.category || '');
            } else {
                showOOCPreview(oocText, type);
            }
        } else {
            notify('warning', t('generationFailed'));
            showManualOOC(type);
        }

    } catch (error) {
        console.error('Fawn Plot Driver Error:', error);
        notify('error', t('generationError'));
        showManualOOC(type);
    } finally {
        state.isGenerating = false;
        const b = document.getElementById("fawn-plot-btn");
        if (b) b.innerHTML = '<i class="fa-solid fa-pen-nib"></i>';
        updateMenuState();
    }
}

// ========== ПОКАЗАТЬ ПОСЛЕДНИЙ OOC ==========
export function showLastOOC() {
    if (state.lastGeneratedOOC) {
        state.currentPreferences = state.lastGeneratedOOC.preferences || "";
        showOOCPreview(state.lastGeneratedOOC.text, state.lastGeneratedOOC.type);
    } else {
        notify('info', t('noSavedOoc'));
    }
}
