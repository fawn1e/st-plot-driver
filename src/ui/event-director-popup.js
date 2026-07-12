import { t } from "../i18n.js";
import { notify } from "../notify.js";
import { clearCurrentEventDirectorPlan, generateAutomaticPlanForCurrentPlan, generateManualEventsForCurrentPlan, getCurrentEventDirectorPlan, updateCurrentEventDirectorPlan } from "../generator.js";
import { extension_settings } from "../../../../../extensions.js";
import { extensionName } from "../constants.js";
import { createPopup, closePopup } from "./popup.js";

function getPopupMode(settings) {
    return settings.mode === 'manual' || (settings.mode === 'hybrid' && settings.autoEventEnabled !== true)
        ? 'manual-pool'
        : 'automatic-events';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCategoryChips(items) {
    if (!items?.length) {
        return `<div style="font-size:13px; opacity:0.55; padding:10px 4px;">${t('eventDirectorEmpty')}</div>`;
    }

    return items.map((item, index) => `
        <button type="button" class="fawn-ed-chip" data-index="${index}" style="display:inline-flex; align-items:center; gap:8px; padding:8px 12px; background:linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)); border:1px solid var(--SmartThemeBorderColor); border-radius:999px; color:var(--SmartThemeBodyColor); font-size:13px; cursor:pointer;">
            <span>${escapeHtml(item.name)}</span>
            <span style="font-size:11px; opacity:0.7; padding:3px 8px; border-radius:999px; background:rgba(255,255,255,0.06);">${escapeHtml(t(item.weight === 'high' ? 'weightHigh' : item.weight === 'low' ? 'weightLow' : 'weightMedium'))}</span>
            <span style="opacity:0.55; display:inline-flex; align-items:center;"><i class="fa-solid fa-pen"></i></span>
        </button>
    `).join('');
}

function renderManualCategoryBlocks(items, isMobile) {
    if (!items?.length) {
        return `<div style="font-size:13px; opacity:0.55; padding:10px 4px;">${t('eventDirectorEmpty')}</div>`;
    }

    return items.map((item, index) => `
        <div style="display:grid; gap:10px; padding:${isMobile ? '14px' : '16px'}; border:1px solid var(--SmartThemeBorderColor); border-radius:18px; background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));">
            <div style="display:flex; gap:8px; align-items:flex-start; ${isMobile ? 'flex-direction:column;' : ''}">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('eventDirectorCategoryName')}</div>
                    <input class="fawn-ed-manual-name" data-index="${index}" type="text" value="${escapeHtml(item.name)}" style="width:100%; padding:${isMobile ? '12px' : '10px 12px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'};">
                </div>
                <div style="width:${isMobile ? '100%' : '148px'};">
                    <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('eventDirectorCategoryWeight')}</div>
                    <select class="fawn-ed-manual-weight" data-index="${index}" style="width:100%; padding:${isMobile ? '12px' : '10px 12px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'};">
                        <option value="low" ${item.weight === 'low' ? 'selected' : ''}>${t('weightLow')}</option>
                        <option value="medium" ${item.weight === 'medium' ? 'selected' : ''}>${t('weightMedium')}</option>
                        <option value="high" ${item.weight === 'high' ? 'selected' : ''}>${t('weightHigh')}</option>
                    </select>
                </div>
                <button type="button" class="fawn-ed-manual-delete" data-index="${index}" style="background:transparent; border:1px solid var(--SmartThemeBorderColor); color:var(--SmartThemeBodyColor); border-radius:14px; padding:${isMobile ? '12px 14px' : '10px 12px'}; cursor:pointer; ${isMobile ? 'width:100%;' : 'margin-top:18px;'}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div>
                <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('eventDirectorCategoryGuidance')}</div>
                <textarea class="fawn-ed-manual-guidance" data-index="${index}" style="width:100%; height:${isMobile ? '96px' : '84px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; padding:12px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'}; resize:vertical; line-height:1.45;">${escapeHtml(item.guidance || '')}</textarea>
            </div>
        </div>
    `).join('');
}

function renderManualEventResults(events) {
    const groups = new Map();
    for (const event of events || []) {
        if (!groups.has(event.categoryName)) {
            groups.set(event.categoryName, []);
        }
        groups.get(event.categoryName).push(event);
    }

    if (!groups.size) return '';

    return Array.from(groups.entries()).map(([categoryName, items]) => `
        <div style="padding:16px; border:1px solid var(--SmartThemeBorderColor); border-radius:18px; background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));">
            <div style="font-size:14px; font-weight:600; margin-bottom:10px; color:var(--SmartThemeBodyColor);">${escapeHtml(categoryName)}</div>
            <ol style="margin:0; padding-left:22px; color:var(--SmartThemeBodyColor); opacity:0.88; line-height:1.55;">
                ${items.map(item => `<li style="margin-bottom:8px; ${item.used ? 'opacity:0.45; text-decoration:line-through;' : ''}">${escapeHtml(item.text)}</li>`).join('')}
            </ol>
        </div>
    `).join('');
}

export function showEventDirectorPopup() {
    const isMobile = window.innerWidth <= 768;
    const plan = getCurrentEventDirectorPlan();
    const categories = Array.isArray(plan?.categories) ? [...plan.categories] : [];
    const settings = /** @type {any} */ (extension_settings)[extensionName];
    const popupMode = getPopupMode(settings);
    const isManualPoolMode = popupMode === 'manual-pool';
    const isAutomaticConfigured = !isManualPoolMode && plan?.autoConfigured === true;
    const readyEvents = Array.isArray(plan?.manualEvents) ? plan.manualEvents.filter(item => item.used !== true) : [];
    const hasGeneratedManualEvents = isManualPoolMode && Array.isArray(plan?.manualEvents) && plan.manualEvents.length > 0;
    let editingIndex = -1;

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:${isMobile ? '18px' : '16px'}; font-weight:600; margin-bottom:${isMobile ? '18px' : '14px'}; display:flex; align-items:center; gap:8px; letter-spacing:0.01em;">
            <i class="fa-solid fa-masks-theater"></i> ${t('eventDirectorTitle')}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'}; margin-bottom:${isMobile ? '18px' : '16px'}; opacity:0.82; line-height:1.55; max-width:62ch;">
            ${isManualPoolMode ? t('eventDirectorManualIntro') : t('eventDirectorAutomaticIntro')}
        </div>

        <div style="display:grid; gap:14px; margin-bottom:18px;">
            <div style="display:${isManualPoolMode ? 'none' : (isAutomaticConfigured ? 'none' : 'block')}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="font-size:${isMobile ? '14px' : '13px'}; margin-bottom:12px; opacity:0.9; font-weight:600;">${t('eventDirectorAutomaticQuestionnaireTitle')}</div>
                <div style="display:grid; gap:12px;">
                    <div>
                        <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('desiredThemesLabel')}</div>
                        <textarea id="fawn-ed-desired" style="width:100%; height:${isMobile ? '92px' : '84px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; padding:12px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'}; resize:vertical; line-height:1.45;">${escapeHtml(plan?.desiredThemes || '')}</textarea>
                    </div>
                    <div>
                        <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('bannedThemesLabel')}</div>
                        <textarea id="fawn-ed-banned" style="width:100%; height:${isMobile ? '82px' : '76px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; padding:12px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'}; resize:vertical; line-height:1.45;">${escapeHtml(plan?.bannedThemes || '')}</textarea>
                    </div>
                    <div>
                        <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('paceLabel')}</div>
                        <select id="fawn-ed-pace" style="width:100%; padding:${isMobile ? '12px' : '10px 12px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'};">
                            <option value="slow" ${(plan?.pace || 'either') === 'slow' ? 'selected' : ''}>${t('paceSlow')}</option>
                            <option value="fast" ${(plan?.pace || 'either') === 'fast' ? 'selected' : ''}>${t('paceFast')}</option>
                            <option value="either" ${(plan?.pace || 'either') === 'either' ? 'selected' : ''}>${t('paceEither')}</option>
                        </select>
                    </div>
                </div>
                <button id="fawn-ed-generate-plan" class="menu_button" style="margin-top:14px; width:100%; background:transparent; color:var(--SmartThemeBodyColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; padding:${isMobile ? '12px 16px' : '10px 14px'}; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('generatePlan')}
                </button>
            </div>

            <div style="display:${isManualPoolMode && !hasGeneratedManualEvents ? 'block' : 'none'}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="font-size:${isMobile ? '14px' : '13px'}; margin-bottom:8px; opacity:0.9; font-weight:600;">${t('eventDirectorManualBlocksTitle')}</div>
                <div style="font-size:12px; opacity:0.65; margin-bottom:12px; line-height:1.45;">${t('eventDirectorManualBlocksHelp')}</div>
                <div id="fawn-ed-manual-blocks" style="display:grid; gap:12px;">${renderManualCategoryBlocks(categories, isMobile)}</div>
            </div>

            <div style="display:${isManualPoolMode && hasGeneratedManualEvents ? 'block' : 'none'}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="font-size:${isMobile ? '14px' : '13px'}; margin-bottom:12px; opacity:0.9; font-weight:600;">${t('manualEventResultsTitle')}</div>
                <div id="fawn-ed-manual-results" style="display:grid; gap:12px;">${renderManualEventResults(plan?.manualEvents || [])}</div>
            </div>

            <div style="display:${!isManualPoolMode && isAutomaticConfigured ? 'block' : 'none'}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="font-size:${isMobile ? '14px' : '13px'}; margin-bottom:8px; opacity:0.82; font-weight:600;">${t('eventDirectorAutomaticItemsTitle')}</div>
                <div id="fawn-ed-chip-list" style="display:flex; flex-wrap:wrap; gap:10px; min-height:44px; padding:10px; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:18px;">${renderCategoryChips(categories)}</div>
            </div>

            <div id="fawn-ed-editor" style="display:${isManualPoolMode ? 'none' : 'none'}; background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)); border:1px solid var(--SmartThemeBorderColor); border-radius:18px; padding:14px; box-shadow:0 12px 26px rgba(0,0,0,0.14);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
                    <div style="font-size:${isMobile ? '14px' : '13px'}; font-weight:600;">${t('eventDirectorEditEventItem')}</div>
                    <button type="button" id="fawn-ed-editor-close" style="background:transparent; border:none; color:var(--SmartThemeBodyColor); opacity:0.65; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="display:grid; gap:12px;">
                    <div>
                        <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('eventDirectorEventItemText')}</div>
                        <input id="fawn-ed-editor-name" type="text" style="width:100%; padding:${isMobile ? '12px' : '10px 12px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'};">
                    </div>
                    <div>
                        <div style="font-size:12px; opacity:0.75; margin-bottom:6px;">${t('eventDirectorEventItemWeight')}</div>
                        <select id="fawn-ed-editor-weight" style="width:100%; padding:${isMobile ? '12px' : '10px 12px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'};">
                            <option value="low">${t('weightLow')}</option>
                            <option value="medium">${t('weightMedium')}</option>
                            <option value="high">${t('weightHigh')}</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:8px; ${isMobile ? 'flex-direction:column;' : ''}">
                        <button type="button" id="fawn-ed-editor-apply" class="menu_button" style="flex:1; background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); border:none; border-radius:12px; padding:${isMobile ? '12px 16px' : '10px 14px'};">${t('save')}</button>
                        <button type="button" id="fawn-ed-editor-delete" class="menu_button" style="flex:1; background:transparent; color:var(--SmartThemeBodyColor); border:1px solid var(--SmartThemeBorderColor); border-radius:12px; padding:${isMobile ? '12px 16px' : '10px 14px'};">${t('delete')}</button>
                    </div>
                </div>
            </div>

            <div style="display:${isManualPoolMode && !hasGeneratedManualEvents ? 'block' : (isManualPoolMode ? 'none' : (isAutomaticConfigured ? 'block' : 'none'))}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="font-size:${isMobile ? '14px' : '13px'}; margin-bottom:8px; opacity:0.82; font-weight:600;">${isManualPoolMode ? t('eventDirectorAddBlock') : t('eventDirectorAddEventItem')}</div>
                <div style="display:flex; gap:8px; align-items:stretch; ${isMobile ? 'flex-direction:column;' : ''}">
                    <input id="fawn-ed-new-category" type="text" placeholder="${isManualPoolMode ? t('eventDirectorAddBlockPlaceholder') : t('eventDirectorAddEventPlaceholder')}" style="flex:1; min-width:0; padding:${isMobile ? '12px' : '10px 12px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'};">
                    <button id="fawn-ed-add-category" class="menu_button" style="background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); border:none; border-radius:14px; padding:${isMobile ? '12px 18px' : '10px 16px'}; min-width:${isMobile ? '100%' : '48px'}; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <i class="fa-solid fa-plus"></i>
                        <span>${isMobile ? (isManualPoolMode ? t('eventDirectorAddBlockButton') : t('eventDirectorAddButton')) : ''}</span>
                    </button>
                </div>
                <div style="font-size:11px; opacity:0.55; margin-top:6px; color:var(--SmartThemeBodyColor);">${isManualPoolMode ? t('eventDirectorAddBlockHelp') : t('eventDirectorAutomaticItemsHelp')}</div>
            </div>

            <div id="fawn-ed-manual-pool" style="display:${isManualPoolMode && !hasGeneratedManualEvents ? '' : 'none'}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px; ${isMobile ? 'flex-direction:column; align-items:flex-start;' : ''}">
                    <div>
                        <div style="font-size:${isMobile ? '14px' : '13px'}; font-weight:600; margin-bottom:4px;">${t('manualEventPoolTitle')}</div>
                        <div style="font-size:12px; opacity:0.65;">${t('manualEventPoolSubtitle', { count: settings.manualEventCountPerCategory || 3 })}</div>
                    </div>
                    <div style="font-size:12px; opacity:0.7; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.05); border:1px solid var(--SmartThemeBorderColor);">${t('manualEventPoolReady', { count: readyEvents.length })}</div>
                </div>
                <button id="fawn-ed-generate-events" class="menu_button" style="width:100%; background:transparent; color:var(--SmartThemeBodyColor); border:1px solid var(--SmartThemeBorderColor); border-radius:14px; padding:${isMobile ? '12px 16px' : '10px 14px'}; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('manualEventGenerate')}
                </button>
            </div>

            <div style="display:${!isManualPoolMode && isAutomaticConfigured ? 'block' : 'none'}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${isMobile ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
                <div style="font-size:${isMobile ? '14px' : '13px'}; margin-bottom:8px; opacity:0.82; font-weight:600;">${t('eventDirectorExtra')}</div>
                <textarea id="fawn-ed-extra" style="width:100%; height:${isMobile ? '110px' : '96px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:18px; padding:12px; color:var(--SmartThemeBodyColor); font-size:${isMobile ? '14px' : '13px'}; resize:vertical; line-height:1.45;">${escapeHtml(plan?.extraInstructions || '')}</textarea>
                <div style="font-size:11px; opacity:0.55; margin-top:6px; color:var(--SmartThemeBodyColor);">${t('eventDirectorExtraHelp')}</div>
            </div>
        </div>

        <div style="display:flex; gap:8px; justify-content:center; ${isMobile ? 'flex-direction:column;' : ''}">
            <button id="fawn-ed-save" class="menu_button" style="background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); padding:${isMobile ? '12px 18px' : '8px 16px'}; border:none; border-radius:8px; ${isMobile ? 'width:100%;' : 'flex:1;'}">${t('saveCategories')}</button>
            <button id="fawn-ed-clear" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:${isMobile ? '12px 18px' : '8px 16px'}; border:1px solid var(--SmartThemeBorderColor); border-radius:8px; ${isMobile ? 'width:100%;' : 'flex:1;'}">${t('clearPlan')}</button>
            <button id="fawn-ed-close" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:${isMobile ? '12px 18px' : '8px 16px'}; border:1px solid var(--SmartThemeBorderColor); border-radius:8px; ${isMobile ? 'width:100%;' : 'flex:1;'}">${t('close')}</button>
        </div>
    `;

    createPopup(content, '620px');

    const chipList = document.getElementById('fawn-ed-chip-list');
    const manualBlocks = document.getElementById('fawn-ed-manual-blocks');
    const newCategoryInput = /** @type {HTMLInputElement | null} */ (document.getElementById('fawn-ed-new-category'));
    const desiredField = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('fawn-ed-desired'));
    const bannedField = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('fawn-ed-banned'));
    const paceField = /** @type {HTMLSelectElement | null} */ (document.getElementById('fawn-ed-pace'));
    const extraField = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('fawn-ed-extra'));
    const editor = /** @type {HTMLElement | null} */ (document.getElementById('fawn-ed-editor'));
    const editorName = /** @type {HTMLInputElement | null} */ (document.getElementById('fawn-ed-editor-name'));
    const editorWeight = /** @type {HTMLSelectElement | null} */ (document.getElementById('fawn-ed-editor-weight'));

    function rerenderCategories() {
        if (isManualPoolMode) {
            if (!manualBlocks) return;
            manualBlocks.innerHTML = renderManualCategoryBlocks(categories, isMobile);
            manualBlocks.querySelectorAll('.fawn-ed-manual-name').forEach(input => {
                input.addEventListener('input', function () {
                    const index = Number(this.getAttribute('data-index'));
                    if (!Number.isNaN(index) && categories[index]) categories[index].name = this.value;
                });
            });
            manualBlocks.querySelectorAll('.fawn-ed-manual-weight').forEach(select => {
                select.addEventListener('change', function () {
                    const index = Number(this.getAttribute('data-index'));
                    if (!Number.isNaN(index) && categories[index]) categories[index].weight = this.value;
                });
            });
            manualBlocks.querySelectorAll('.fawn-ed-manual-guidance').forEach(textarea => {
                textarea.addEventListener('input', function () {
                    const index = Number(this.getAttribute('data-index'));
                    if (!Number.isNaN(index) && categories[index]) categories[index].guidance = this.value;
                });
            });
            manualBlocks.querySelectorAll('.fawn-ed-manual-delete').forEach(button => {
                button.addEventListener('click', function () {
                    const index = Number(this.getAttribute('data-index'));
                    if (!Number.isNaN(index)) {
                        categories.splice(index, 1);
                        rerenderCategories();
                    }
                });
            });
            return;
        }

        if (!chipList) return;
        chipList.innerHTML = renderCategoryChips(categories);
        chipList.querySelectorAll('.fawn-ed-chip').forEach(button => {
            button.addEventListener('click', function () {
                const index = Number(this.getAttribute('data-index'));
                if (!Number.isNaN(index)) openEditor(index);
            });
        });
    }

    function closeEditor() {
        editingIndex = -1;
        if (editor) editor.style.display = 'none';
    }

    function openEditor(index) {
        const item = categories[index];
        if (!item || !editor || !editorName || !editorWeight) return;
        editingIndex = index;
        editor.style.display = '';
        editorName.value = item.name;
        editorWeight.value = item.weight || 'medium';
        editor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function applyEditorChanges() {
        if (editingIndex < 0 || !categories[editingIndex] || !editorName || !editorWeight) return;
        const value = editorName.value.trim();
        if (!value) return;
        categories[editingIndex] = { ...categories[editingIndex], name: value, weight: editorWeight.value };
        rerenderCategories();
        closeEditor();
    }

    function deleteEditedCategory() {
        if (editingIndex < 0 || !categories[editingIndex]) return;
        categories.splice(editingIndex, 1);
        rerenderCategories();
        closeEditor();
    }

    function addCategory() {
        const value = (newCategoryInput?.value || '').trim();
        if (!value) return;
        if (!categories.some(item => item.name.toLowerCase() === value.toLowerCase())) {
            categories.push({
                id: `user_${Date.now()}_${categories.length}`,
                name: value,
                weight: 'medium',
                guidance: '',
                default: false,
            });
            rerenderCategories();
        }
        if (newCategoryInput) newCategoryInput.value = '';
        newCategoryInput?.focus();
    }

    rerenderCategories();

    document.getElementById('fawn-ed-add-category')?.addEventListener('click', addCategory);
    newCategoryInput?.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            addCategory();
        }
    });
    document.getElementById('fawn-ed-editor-close')?.addEventListener('click', closeEditor);
    document.getElementById('fawn-ed-editor-apply')?.addEventListener('click', applyEditorChanges);
    document.getElementById('fawn-ed-editor-delete')?.addEventListener('click', deleteEditedCategory);

    document.getElementById('fawn-ed-save')?.addEventListener('click', function () {
        updateCurrentEventDirectorPlan(categories, isManualPoolMode ? '' : (extraField?.value || ''), {
            manualEventsPerCategory: settings.manualEventCountPerCategory || 3,
            desiredThemes: isManualPoolMode ? '' : (desiredField?.value || ''),
            bannedThemes: isManualPoolMode ? '' : (bannedField?.value || ''),
            pace: isManualPoolMode ? 'either' : (paceField?.value || 'either'),
            categoryGuidance: '',
            autoConfigured: isManualPoolMode ? false : isAutomaticConfigured,
        });
        notify('success', t('eventPlanSaved'));
        closePopup();
        setTimeout(showEventDirectorPopup, 80);
    });

  document.getElementById('fawn-ed-generate-plan')?.addEventListener('click', async function () {
    const button = /** @type {HTMLButtonElement} */ (this);
    try {
        button.disabled = true;
        button.style.opacity = '0.6';
        button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('generatingPlan')}`;
        
        // Исправлено: заменяем options/current на plan
        updateCurrentEventDirectorPlan(categories, extraField?.value || '', {
            manualEventsPerCategory: settings.manualEventCountPerCategory || 3,
            desiredThemes: desiredField?.value || '',
            bannedThemes: bannedField?.value || '',
            pace: paceField?.value || 'either',
            categoryGuidance: '',
            autoConfigured: true, // При генерации авто-плана ставим true
        });
        
        await generateAutomaticPlanForCurrentPlan();
        notify('success', t('eventPlanSaved'));
        
        closePopup();
        setTimeout(showEventDirectorPopup, 100);
        
    } catch (error) {
        console.error('Fawn automatic plan generation error:', error);
        notify('error', t('eventPlanFailed'));
    } finally {
        button.disabled = false;
        button.style.opacity = '';
        button.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${t('generatePlan')}`;
    }
});

    document.getElementById('fawn-ed-generate-events')?.addEventListener('click', async function () {
        const button = /** @type {HTMLButtonElement} */ (this);
        try {
            button.disabled = true;
            button.style.opacity = '0.6';
            button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('manualEventGenerating')}`;
            updateCurrentEventDirectorPlan(categories, '', {
                manualEventsPerCategory: settings.manualEventCountPerCategory || 3,
                desiredThemes: '',
                bannedThemes: '',
                pace: 'either',
                categoryGuidance: '',
            });
            await generateManualEventsForCurrentPlan();
            notify('success', t('manualEventGenerated'));
            closePopup();
            setTimeout(showEventDirectorPopup, 80);
        } catch (error) {
            console.error('Fawn manual event generation error:', error);
            notify('error', t('manualEventGenerationFailed'));
        } finally {
            button.disabled = false;
            button.style.opacity = '';
            button.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${t('manualEventGenerate')}`;
        }
    });

    document.getElementById('fawn-ed-clear')?.addEventListener('click', function () {
        clearCurrentEventDirectorPlan();
        notify('success', t('eventPlanCleared'));
        closePopup();
        setTimeout(showEventDirectorPopup, 80);
    });

    document.getElementById('fawn-ed-close')?.addEventListener('click', closePopup);
}
