import { state } from "../state.js";
import { extension_settings } from "../../../../../extensions.js";
import { extensionName } from "../constants.js";
import { t } from "../i18n.js";
import { checkActiveOOCPrompt } from "../prompt.js";
import { closePopup } from "./popup.js";
import { showSettingsPopup } from "./settings-popup.js";
import { showPreferencesPopup } from "./preferences-popup.js";
import { showManualInputPopup } from "./manual-popup.js";
import { showClearConfirmationPopup } from "./confirm-popup.js";
import { drivePlotWithPreferences, getModeState, showLastOOC } from "../generator.js";
import { showEventDirectorPopup } from "./event-director-popup.js";
import { ensureActiveChat } from "./popup.js";

// ========== ОБНОВИТЬ СОСТОЯНИЕ МЕНЮ ==========
export function updateMenuState() {
    const lastOocOption = document.getElementById("fawn-last-ooc-option");
    const clearOocOption = document.getElementById("fawn-clear-ooc-option");
    const modeHint = document.getElementById("fawn-mode-hint");
    const modeState = getModeState();

    if (lastOocOption) {
        const hasLastOOC = state.lastGeneratedOOC?.text?.trim().length > 0;
        lastOocOption.style.display = hasLastOOC && !modeState.hideLastAndClear ? "flex" : "none";
    }

    if (clearOocOption) {
        clearOocOption.style.display = checkActiveOOCPrompt() && !modeState.hideLastAndClear ? "flex" : "none";
    }

    if (modeHint) {
        modeHint.style.display = extension_settings[extensionName]?.mode === 'automatic' ? 'flex' : 'none';
    }
}

// ========== КНОПКА И МЕНЮ ==========
export function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm")
        || document.getElementById("form_sheld")
        || document.querySelector("#send_form");

    if (!container) return false;

    // Определяем размер кнопки по соседним кнопкам
    const existingButtons = container.querySelectorAll("button, .menu_button, .fa-icon-button");
    let buttonSize = "32px", buttonPadding = "0", fontSize = "14px";
    if (existingButtons.length > 0) {
        const ref = existingButtons[0];
        const rect = ref.getBoundingClientRect();
        buttonSize = Math.max(rect.width, rect.height) + "px";
        buttonPadding = window.getComputedStyle(ref).padding || "6px";
        const faIcons = container.querySelectorAll(".fa, .fas, .far, .fab");
        if (faIcons.length > 0) {
            fontSize = window.getComputedStyle(faIcons[0]).fontSize || "14px";
        }
    }

    // Кнопка
    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = t('extensionTitle');
    btn.innerHTML = '<i class="fa-solid fa-pen-nib"></i>';
    btn.style.cssText = `
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        width: ${buttonSize}; height: ${buttonSize}; min-width: ${buttonSize}; min-height: ${buttonSize};
        padding: ${buttonPadding}; color: var(--SmartThemeBodyColor); font-size: ${fontSize};
        margin: 0 2px; border-radius: 5px; transition: all 0.2s;
        user-select: none; opacity: 0.8; flex-shrink: 0;
    `;
    btn.addEventListener("mouseenter", function () {
        this.style.background = "var(--SmartThemeBorderColor)";
        this.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", function () {
        this.style.background = "";
        this.style.opacity = "0.8";
    });

    // Меню
    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = `
        display: none; position: absolute; bottom: calc(100% + 5px); left: 0;
        background: var(--SmartThemeBlurTintColor); backdrop-filter: blur(10px);
        border: 1px solid var(--SmartThemeBorderColor); border-radius: 6px;
        padding: 6px; z-index: 1001; min-width: 180px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-height: 300px; overflow-y: auto;
    `;
    menu.innerHTML = `
        <div id="fawn-mode-hint" style="padding:6px 10px; display:none; align-items:center; gap:6px; font-size:11px; opacity:0.75; color:var(--SmartThemeBodyColor);">
            <i class="fa-solid fa-robot"></i> ${t('autoModeMenuHint')}
        </div>
        <div class="fawn-option" data-action="timeskip" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px;">
            <i class="fa-solid fa-hourglass-half" style="width:16px; opacity:0.7;"></i> ${t('timeSkip')}
        </div>
        <div class="fawn-option" data-action="twist" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px;">
            <i class="fa-solid fa-bolt" style="width:16px; opacity:0.7;"></i> ${t('plotTwist')}
        </div>
        <div id="fawn-last-ooc-option" class="fawn-option" data-action="lastooc" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:none; align-items:center; gap:8px; font-size:13px; font-weight:500;">
            <i class="fa-solid fa-clock-rotate-left" style="width:16px;"></i> ${t('lastOoc')}
        </div>
        <div id="fawn-clear-ooc-option" class="fawn-option" data-action="clearooc" style="padding:8px 12px; cursor:pointer; color:#ff6b6b; border-radius:4px; margin:2px 0; display:none; align-items:center; gap:8px; font-size:13px; font-weight:500;">
            <i class="fa-solid fa-eraser" style="width:16px;"></i> ${t('clearOoc')}
        </div>
        <hr style="border:none; border-top:1px solid var(--SmartThemeBorderColor); margin:6px 0;">
        <div class="fawn-option" data-action="director" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.9;">
            <i class="fa-solid fa-masks-theater" style="width:16px;"></i> ${t('eventDirector')}
        </div>
        <div class="fawn-option" data-action="manual" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.8;">
            <i class="fa-solid fa-keyboard" style="width:16px;"></i> ${t('manualInput')}
        </div>
        <div class="fawn-option" data-action="settings" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.8;">
            <i class="fa-solid fa-sliders" style="width:16px;"></i> ${t('settings')}
        </div>
    `;

    container.insertBefore(btn, container.firstChild);
    document.body.appendChild(menu);

    // Открытие/закрытие меню
    btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        updateMenuState();
        const btnRect = btn.getBoundingClientRect();
        menu.style.left = btnRect.left + "px";
        menu.style.bottom = (window.innerHeight - btnRect.top + 5) + "px";
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    // Клики по пунктам меню
    menu.querySelectorAll(".fawn-option").forEach(opt => {
        opt.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            menu.style.display = "none";
            const action = this.dataset.action;
            if (!ensureActiveChat()) return;
            if (action === "settings") showSettingsPopup();
            else if (action === "director") showEventDirectorPopup();
            else if (action === "manual") showManualInputPopup();
            else if (action === "lastooc") showLastOOC();
            else if (action === "clearooc") showClearConfirmationPopup();
            else if (getModeState().autoApplyManualTriggers) drivePlotWithPreferences(action, "", { source: 'manual-trigger' });
            else showPreferencesPopup(action);
        });
        opt.addEventListener("mouseenter", function () {
            this.style.background = this.dataset.action === "clearooc" ? "#ff6b6b" : "var(--SmartThemeQuoteColor)";
            this.style.color = "white";
        });
        opt.addEventListener("mouseleave", function () {
            this.style.background = "";
            this.style.color = this.dataset.action === "clearooc" ? "#ff6b6b" : "var(--SmartThemeBodyColor)";
        });
    });

    document.addEventListener("click", function (e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });
    window.addEventListener("scroll", () => { menu.style.display = "none"; });
    window.addEventListener("resize", () => { menu.style.display = "none"; });

    return true;
}
