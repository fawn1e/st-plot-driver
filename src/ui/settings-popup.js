import { extension_settings } from "../../../../../extensions.js";
import { ConnectionManagerRequestService } from "../../../../shared.js";
import { extensionName, twistChanceThresholds, DEFAULT_TIMESKIP_INTERVAL } from "../constants.js";
import { t } from "../i18n.js";
import { notify } from "../notify.js";
import { saveSettings } from "../storage.js";
import { createPopup, closePopup } from "./popup.js";

function getSettings() {
    const allSettings = /** @type {Record<string, any>} */ (extension_settings);
    return allSettings[extensionName];
}

/** @param {string} id */
function getInput(id) {
    return /** @type {HTMLInputElement | null} */ (document.getElementById(id));
}

/** @param {string} id */
function getSelect(id) {
    return /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
}

/** @param {string} id */
function getTextarea(id) {
    return /** @type {HTMLTextAreaElement | null} */ (document.getElementById(id));
}

function updateModeFieldsVisibility() {
    const mode = getSelect("fawn-set-mode")?.value;
    const autoEventsEnabled = getInput("fawn-set-auto-event")?.checked === true;
    const autoTimeskipEnabled = getInput("fawn-set-auto-timeskip")?.checked === true;
    
    const hybridFields = document.querySelectorAll("[data-fawn-hybrid-only='true']");
    const autoFields = document.querySelectorAll("[data-fawn-auto-only='true']");
    const manualPoolFields = document.querySelectorAll("[data-fawn-manual-pool-only='true']");
    const timeskipIntervalFields = document.querySelectorAll("[data-fawn-timeskip-interval='true']");

    hybridFields.forEach(node => {
        /** @type {HTMLElement} */ (node).style.display = mode === 'hybrid' ? '' : 'none';
    });

    autoFields.forEach(node => {
        /** @type {HTMLElement} */ (node).style.display = mode === 'manual' ? 'none' : '';
    });

    const showManualPool = mode === 'manual' || (mode === 'hybrid' && !autoEventsEnabled);
    manualPoolFields.forEach(node => {
        /** @type {HTMLElement} */ (node).style.display = showManualPool ? '' : 'none';
    });

    // ====== НОВАЯ ЛОГИКА ДЛЯ ТАЙМСКИП ИНТЕРВАЛА ======
    const showTimeskipInterval = mode === 'automatic' || (mode === 'hybrid' && autoTimeskipEnabled);
    timeskipIntervalFields.forEach(node => {
        /** @type {HTMLElement} */ (node).style.display = showTimeskipInterval ? '' : 'none';
    });
}

// ========== ПОЛУЧИТЬ ПРОФИЛИ ИЗ CONNECTION MANAGER ==========
function getSupportedProfiles() {
    try {
        return ConnectionManagerRequestService.getSupportedProfiles();
    } catch (e) {
        // Connection Manager отключён или недоступен
        return [];
    }
}

/** @param {string | null | undefined} selectedId */
function buildProfileOptions(selectedId) {
    const profiles = getSupportedProfiles();
    const defaultOpt = `<option value="" ${!selectedId ? 'selected' : ''}>${t('defaultApi')}</option>`;
    if (profiles.length === 0) {
        return defaultOpt + `<option disabled>— ${t('noProfiles')} —</option>`;
    }
    return defaultOpt + profiles.map(p =>
        `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name ?? p.id}</option>`
    ).join('');
}

// ========== ОКНО НАСТРОЕК ==========
export function showSettingsPopup() {
    const s = getSettings();
    const isMobile = window.innerWidth <= 768;
    const m = isMobile;

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '18px' : '16px'}; font-weight:500; margin-bottom:${m ? '24px' : '20px'}; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-sliders"></i> ${t('settingsTitle')}
        </div>

        <div style="margin-bottom:${m ? '20px' : '16px'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8;">${t('modeLabel')}</div>
            <select id="fawn-set-mode" style="width:100%; padding:${m ? '12px' : '8px 10px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'};">
                <option value="manual" ${s.mode === 'manual' ? 'selected' : ''}>${t('modeManual')}</option>
                <option value="hybrid" ${s.mode === 'hybrid' ? 'selected' : ''}>${t('modeHybrid')}</option>
                <option value="automatic" ${s.mode === 'automatic' ? 'selected' : ''}>${t('modeAutomatic')}</option>
            </select>
            <div style="color:var(--SmartThemeBodyColor); font-size:11px; opacity:0.5; margin-top:4px;">${t('modeHelp')}</div>
        </div>

        <div data-fawn-hybrid-only="true" style="margin-bottom:${m ? '20px' : '16px'}; display:${s.mode === 'hybrid' ? 'grid' : 'none'}; gap:10px;">
            <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer;">
                <input id="fawn-set-auto-event" type="checkbox" ${s.autoEventEnabled ? 'checked' : ''}>
                <span style="font-size:${m ? '14px' : '13px'};">${t('autoEventEnabled')}</span>
            </label>
            <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer;">
                <input id="fawn-set-auto-timeskip" type="checkbox" ${s.autoTimeskipEnabled ? 'checked' : ''}>
                <span style="font-size:${m ? '14px' : '13px'};">${t('autoTimeskipEnabled')}</span>
            </label>
            <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer;">
                <input id="fawn-set-auto-apply" type="checkbox" ${s.autoApplyManualTriggers ? 'checked' : ''}>
                <span style="font-size:${m ? '14px' : '13px'};">${t('autoApplyManualTriggers')}</span>
            </label>
        </div>

        <div style="margin-bottom:${m ? '20px' : '16px'};">
            <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer;">
                <input id="fawn-set-toast" type="checkbox" ${s.toastEnabled ? 'checked' : ''}>
                <span style="font-size:${m ? '14px' : '13px'};">${t('toastEnabled')}</span>
            </label>
        </div>

        <div data-fawn-auto-only="true" style="margin-bottom:${m ? '20px' : '16px'}; display:${s.mode === 'manual' ? 'none' : ''};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8;">${t('twistChanceLabel')}</div>
            <select id="fawn-set-twist-chance" style="width:100%; padding:${m ? '12px' : '8px 10px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'};">
                <option value="low" ${s.autoTwistChance === 'low' ? 'selected' : ''}>${t('twistChanceLow')}</option>
                <option value="medium" ${(!s.autoTwistChance || s.autoTwistChance === 'medium') ? 'selected' : ''}>${t('twistChanceMedium')}</option>
                <option value="often" ${s.autoTwistChance === 'often' ? 'selected' : ''}>${t('twistChanceOften')}</option>
                <option value="chaos" ${s.autoTwistChance === 'chaos' ? 'selected' : ''}>${t('twistChanceChaos')}</option>
            </select>
            <div style="color:var(--SmartThemeBodyColor); font-size:11px; opacity:0.5; margin-top:4px;">${t('twistChanceHelp')}</div>
        </div>

        <!-- ====== ИНТЕРВАЛ ТАЙМСКИПОВ ====== -->
<div data-fawn-timeskip-interval="true" style="margin-bottom:${m ? '20px' : '16px'}; display:${s.mode === 'manual' ? 'none' : ''};">
    <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8;">${t('timeskipIntervalLabel')}</div>
    <input type="number" id="fawn-set-timeskip-interval" min="2" max="20" value="${s.timeskipInterval || DEFAULT_TIMESKIP_INTERVAL}" style="width:100%; padding:${m ? '12px' : '8px 10px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; font-family:monospace;">
    <div style="color:var(--SmartThemeBodyColor); font-size:11px; opacity:0.5; margin-top:4px;">${t('timeskipIntervalHelp')}</div>
</div>

        <div data-fawn-hybrid-only="true" style="margin-bottom:${m ? '20px' : '16px'}; display:${s.mode === 'hybrid' ? '' : 'none'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8;">${t('eventCooldownMessages')}</div>
            <input type="number" id="fawn-set-cooldown" min="0" max="20" value="${s.autoEventCooldownMessages}" style="width:100%; padding:${m ? '12px' : '8px 10px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; font-family:monospace;">
            <div style="color:var(--SmartThemeBodyColor); font-size:11px; opacity:0.5; margin-top:4px;">${t('cooldownHelp')}</div>
        </div>

        <div data-fawn-manual-pool-only="true" style="margin-bottom:${m ? '20px' : '16px'}; display:none;">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8;">${t('manualEventCountLabel')}</div>
            <input type="number" id="fawn-set-manual-count" min="1" max="10" value="${s.manualEventCountPerCategory || 3}" style="width:100%; padding:${m ? '12px' : '8px 10px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; font-family:monospace;">
            <div style="color:var(--SmartThemeBodyColor); font-size:11px; opacity:0.5; margin-top:4px;">${t('manualEventCountHelp')}</div>
        </div>

        <div style="margin-bottom:${m ? '20px' : '16px'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-plug fa-xs"></i> ${t('connectionProfile')}
            </div>
            <select id="fawn-set-profile" style="
                width:100%; padding:${m ? '12px' : '8px 10px'};
                background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor);
                border-radius:8px; color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'};
                font-family:monospace;
            ">
                ${buildProfileOptions(s.connectionProfile)}
            </select>
            <div style="color:var(--SmartThemeBodyColor); font-size:11px; opacity:0.5; margin-top:4px;">
                ${t('profileHelp')}
            </div>
        </div>

        <div style="margin-bottom:${m ? '20px' : '16px'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-hourglass-half fa-xs"></i> ${t('timeSkipPrompt')}
            </div>
            <textarea id="fawn-set-timeskip" style="
                width:100%; height:${m ? '90px' : '80px'};
                background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor);
                border-radius:8px; padding:${m ? '14px' : '10px'}; color:var(--SmartThemeBodyColor);
                font-size:${m ? '14px' : '13px'}; resize:vertical; font-family:monospace; line-height:1.4;
            ">${s.timeskipPrompt}</textarea>
        </div>

        <div style="margin-bottom:${m ? '20px' : '16px'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-bolt fa-xs"></i> ${t('plotTwistPrompt')}
            </div>
            <textarea id="fawn-set-twist" style="
                width:100%; height:${m ? '90px' : '80px'};
                background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor);
                border-radius:8px; padding:${m ? '14px' : '10px'}; color:var(--SmartThemeBodyColor);
                font-size:${m ? '14px' : '13px'}; resize:vertical; font-family:monospace; line-height:1.4;
            ">${s.twistPrompt}</textarea>
        </div>

        <div style="margin-bottom:${m ? '24px' : '20px'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-message fa-xs"></i> ${t('messageCount')}
            </div>
            <div style="display:flex; align-items:center; gap:10px; ${m ? 'flex-direction: column; align-items: flex-start;' : ''}">
                <input type="number" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="
                    ${m ? 'width: 100%;' : 'width: 80px;'}
                    padding:${m ? '12px' : '8px 10px'};
                    background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor);
                    border-radius:8px; color:var(--SmartThemeBodyColor);
                    font-size:${m ? '14px' : '13px'}; font-family:monospace;
                ">
                <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '13px' : '12px'}; opacity:0.6; ${m ? 'margin-top: 8px;' : ''}">(5–50 messages)</div>
            </div>
        </div>

        <div style="display:flex; gap:${m ? '10px' : '8px'}; justify-content:center; ${m ? 'flex-direction: column;' : ''}">
            <button id="fawn-set-save" class="menu_button" style="
                background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'}; border:none;
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : ''} justify-content:center;
            ">
                <i class="fa-solid fa-save"></i> ${t('save')}
            </button>
            <button id="fawn-set-close" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%;' : ''} justify-content:center;
            ">
                <i class="fa-solid fa-xmark"></i> ${t('close')}
            </button>
        </div>
    `;

    createPopup(content, "520px");

    getSelect("fawn-set-mode")?.addEventListener("change", updateModeFieldsVisibility);
    getInput("fawn-set-auto-event")?.addEventListener("change", updateModeFieldsVisibility);
    getInput("fawn-set-auto-timeskip")?.addEventListener("change", updateModeFieldsVisibility);
    updateModeFieldsVisibility();

    const saveButton = /** @type {HTMLElement | null} */ (document.getElementById("fawn-set-save"));
    const closeButton = /** @type {HTMLElement | null} */ (document.getElementById("fawn-set-close"));

    saveButton?.addEventListener("click", function () {
        const settings = getSettings();
        const mode = getSelect("fawn-set-mode")?.value || 'manual';
        const msgCount = parseInt(getInput("fawn-set-msgcount")?.value || '0');
        const cooldown = parseInt(getInput("fawn-set-cooldown")?.value || "0");
        const manualEventCount = parseInt(getInput("fawn-set-manual-count")?.value || '0');
        const timeskipInterval = parseInt(getInput("fawn-set-timeskip-interval")?.value || DEFAULT_TIMESKIP_INTERVAL);
        
        if (msgCount < 5 || msgCount > 50) {
            notify('warning', t('invalidMessageCount'));
            return;
        }
        if (mode === 'hybrid' && (cooldown < 0 || cooldown > 20)) {
            notify('warning', t('invalidCooldown'));
            return;
        }
        if (manualEventCount < 1 || manualEventCount > 10) {
            notify('warning', t('invalidManualEventCount'));
            return;
        }
        if (timeskipInterval < 2 || timeskipInterval > 20) {
            notify('warning', t('invalidTimeskipInterval'));
            return;
        }
        
        settings.timeskipPrompt = getTextarea("fawn-set-timeskip")?.value || '';
        settings.twistPrompt = getTextarea("fawn-set-twist")?.value || '';
        settings.messageCount = msgCount;
        settings.connectionProfile = getSelect("fawn-set-profile")?.value || null;
        settings.mode = mode;
        settings.toastEnabled = getInput("fawn-set-toast")?.checked === true;
        settings.manualEventCountPerCategory = manualEventCount;
        settings.timeskipInterval = timeskipInterval;
        
        if (mode !== 'manual') {
            settings.autoTwistChance = getSelect("fawn-set-twist-chance")?.value || 'medium';
            settings.autoEventRollThreshold = twistChanceThresholds[/** @type {'low' | 'medium' | 'often' | 'chaos'} */ (settings.autoTwistChance)] ?? settings.autoEventRollThreshold;
        }

        if (mode === 'automatic') {
            settings.autoEventEnabled = true;
            settings.autoTimeskipEnabled = true;
            settings.autoApplyManualTriggers = true;
            settings.autoEventCooldownMessages = cooldown;
        } else if (mode === 'manual') {
            settings.autoEventEnabled = false;
            settings.autoTimeskipEnabled = false;
            settings.autoApplyManualTriggers = false;
            settings.autoEventCooldownMessages = cooldown;
        } else {
            settings.autoEventEnabled = getInput("fawn-set-auto-event")?.checked === true;
            settings.autoTimeskipEnabled = getInput("fawn-set-auto-timeskip")?.checked === true;
            settings.autoApplyManualTriggers = getInput("fawn-set-auto-apply")?.checked === true;
            settings.autoEventCooldownMessages = cooldown;
        }

        saveSettings();
        notify('success', t('settingsSaved'));
        closePopup();
    });

    closeButton?.addEventListener("click", closePopup);
}