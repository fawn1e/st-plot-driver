import { state } from "../state.js";
import { addPlotPrompt } from "../prompt.js";
import { drivePlotWithPreferences } from "../generator.js";
import { t } from "../i18n.js";
import { notify } from "../notify.js";
import { createPopup, closePopup } from "./popup.js";
import { updateMenuState } from "./menu.js";

// ========== FALLBACK: РУЧНОЙ OOC ПОСЛЕ ОШИБКИ ГЕНЕРАЦИИ ==========
export function showManualOOC(type) {
    const m = window.innerWidth <= 768;
    const defaultOOC = type === 'timeskip'
        ? '(OOC: Time passes naturally. Describe what happens next.)'
        : '(OOC: Introduce an unexpected plot twist. Make it logical.)';
    const title = type === 'timeskip' ? t('timeSkip') : t('plotTwist');
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '18px' : '16px'}; font-weight:500; margin-bottom:${m ? '20px' : '16px'}; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid ${icon}"></i> ${title}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '16px' : '12px'}; opacity:0.7;">
            ${t('generationFailedManual')}
        </div>
        <textarea id="fawn-manual-ooc" style="
            width:100%; height:${m ? '100px' : '100px'}; margin:0 0 ${m ? '20px' : '16px'} 0;
            padding:${m ? '14px' : '12px'}; border:1px solid var(--SmartThemeBorderColor); border-radius:8px;
            background:var(--SmartThemeInputColor); color:var(--SmartThemeBodyColor);
            font-family:monospace; font-size:${m ? '14px' : '13px'}; resize:vertical;
        ">${defaultOOC}</textarea>
        <div style="display:flex; gap:${m ? '10px' : '8px'}; justify-content:center; ${m ? 'flex-direction: column;' : ''}">
            <button id="fawn-apply-manual" class="menu_button" style="
                background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'}; border:none;
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-check"></i> ${t('applyOoc')}
            </button>
            <button id="fawn-try-again" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-rotate"></i> ${t('retry')}
            </button>
            <button id="fawn-manual-err-close" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-xmark"></i> ${t('close')}
            </button>
        </div>
    `;

    createPopup(content, "450px");

    document.getElementById("fawn-apply-manual").addEventListener("click", function () {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            notify('success', t('appliedManual'));
        }
    });

    document.getElementById("fawn-try-again").addEventListener("click", function () {
        closePopup();
        // Retry без преференсов — просто регенерируем
        setTimeout(() => drivePlotWithPreferences(type, state.currentPreferences), 100);
    });

    document.getElementById("fawn-manual-err-close").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ ВВОД OOC (ИЗ МЕНЮ) ==========
export function showManualInputPopup() {
    const m = window.innerWidth <= 768;

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '18px' : '16px'}; font-weight:600; margin-bottom:${m ? '18px' : '14px'}; display:flex; align-items:center; gap:8px; letter-spacing:0.01em;">
            <i class="fa-solid fa-keyboard"></i> ${t('manualInputTitle')}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '18px' : '14px'}; opacity:0.8; line-height:1.5; max-width:54ch;">
            ${t('manualInputIntro')}
        </div>
        <div style="margin-bottom:${m ? '24px' : '20px'}; background:linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02)); border:1px solid var(--SmartThemeBorderColor); border-radius:20px; padding:${m ? '14px' : '16px'}; box-shadow:0 10px 30px rgba(0,0,0,0.12);">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-pen fa-xs"></i> ${t('oocText')}
            </div>
            <textarea id="fawn-manual-text" style="
                width:100%; height:${m ? '120px' : '120px'};
                background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor);
                border-radius:14px; padding:${m ? '14px' : '12px'}; color:var(--SmartThemeBodyColor);
                font-family:monospace; font-size:${m ? '14px' : '13px'}; resize:vertical; line-height:1.5;
            " placeholder="${t('manualInputPlaceholder')}"></textarea>
        </div>
        <div style="display:flex; gap:${m ? '10px' : '8px'}; justify-content:center; ${m ? 'flex-direction: column;' : ''}">
            <button id="fawn-manual-apply" class="menu_button" style="
                background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'}; border:none;
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-check"></i> ${t('applyOoc')}
            </button>
            <button id="fawn-manual-close" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-xmark"></i> ${t('close')}
            </button>
        </div>
    `;

    createPopup(content, "500px");

    document.getElementById("fawn-manual-apply").addEventListener("click", function () {
        const oocText = document.getElementById("fawn-manual-text").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            state.lastGeneratedOOC = { text: oocText, type: 'manual', preferences: "" };
            closePopup();
            notify('success', t('appliedManual'));
            updateMenuState();
        }
    });

    document.getElementById("fawn-manual-close").addEventListener("click", closePopup);
}
