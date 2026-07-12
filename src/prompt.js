import { getContext } from "../../../../extensions.js";
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../../script.js";
import { t } from "./i18n.js";
import { notify } from "./notify.js";
import { saveActiveOOCForChat, clearActiveOOCForChat, loadActiveOOCForChat } from "./storage.js";

// ========== ДОБАВИТЬ OOC ПРОМПТ ==========
export function addPlotPrompt(text) {
    const cleanText = String(text || '')
        .replace(/^\(?\s*OOC\s*:\s*/i, '')
        .replace(/\)\s*$/, '')
        .trim();

    const prompt = `[For the next step: ${cleanText}]`;

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

    saveActiveOOCForChat(text);
    notify('success', t('promptAdded'));
}

// ========== ОЧИСТИТЬ OOC ПРОМПТ ==========
export function clearPlotPrompt() {
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
    clearActiveOOCForChat();
}

// ========== ПРОВЕРИТЬ АКТИВНЫЙ OOC ==========
export function checkActiveOOCPrompt() {
    try {
        const savedPrompt = loadActiveOOCForChat();
        if (savedPrompt?.trim().length > 0) return true;

        const context = getContext();
        if (!context) return false;

        if (context.extensionPrompts?.length > 0) {
            return context.extensionPrompts.some(p =>
                p.name === 'fawn-plot-driver' && p.value?.trim().length > 0
            );
        }
        return false;
    } catch (e) {
        console.error('Fawn: Error checking active OOC:', e);
        return false;
    }
}

// ========== ИЗВЛЕЧЬ OOC ИЗ ОТВЕТА ==========
export function extractOOC(response) {
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

    if (!text) return '';

    text = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?think[^>]*>/gi, '')
        .replace(/^\s*\n/gm, '')
        .trim();

    if (text.length > 500) {
        const cut = text.substring(0, 500);
        const lastEnd = Math.max(cut.lastIndexOf(')'), cut.lastIndexOf('.'), cut.lastIndexOf('!'));
        text = lastEnd > 100 ? cut.substring(0, lastEnd + 1) : cut;
    }

    return text || '';
}
