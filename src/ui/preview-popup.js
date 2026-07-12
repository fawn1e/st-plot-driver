import { state } from "../state.js";
import { addPlotPrompt } from "../prompt.js";
import { t } from "../i18n.js";
import { notify } from "../notify.js";
import { saveLastOOCForChat } from "../storage.js";
import { drivePlotWithPreferences } from "../generator.js";
import { createPopup, closePopup } from "./popup.js";
import { updateMenuState } from "./menu.js";

// ========== ПРЕВЬЮ СГЕНЕРИРОВАННОГО OOC ==========
export function showOOCPreview(text, type) {
    const m = window.innerWidth <= 768;
    const title = type === 'timeskip' ? t('previewTitleTimeSkip') : t('previewTitleTwist');
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';
    const prefs = state.currentPreferences;

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '18px' : '16px'}; font-weight:500; margin-bottom:${m ? '16px' : '12px'}; display:flex; align-items:center; gap:8px; ${m ? 'flex-wrap: wrap;' : ''}">
            <i class="fa-solid ${icon}"></i> ${title}
            ${prefs ? `<span style="font-size:11px; background:var(--SmartThemeQuoteColor); color:white; padding:2px 6px; border-radius:10px; margin-left:8px;">${t('withPreferences')}</span>` : ''}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '20px' : '16px'}; opacity:0.7;">
            ${t('previewDescription')}
        </div>
        <div style="background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:${m ? '16px' : '12px'}; margin-bottom:${m ? '20px' : '16px'}; min-height:120px;">
            <textarea id="fawn-ooc-text" style="
                width:100%; height:${m ? '100px' : '100px'};
                background:transparent; border:none; color:var(--SmartThemeBodyColor);
                font-family:monospace; font-size:${m ? '14px' : '13px'}; resize:vertical; outline:none; line-height:1.4;
            ">${text}</textarea>
        </div>
        <div style="display:flex; gap:${m ? '10px' : '8px'}; justify-content:center; ${m ? 'flex-direction: column;' : ''}">
            <button id="fawn-apply-ooc" class="menu_button" style="
                background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'}; border:none;
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-check"></i> ${t('applyOoc')}
            </button>
            <button id="fawn-regen-ooc" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-rotate"></i> ${t('regenerate')}
            </button>
            <button id="fawn-cancel" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-xmark"></i> ${t('cancel')}
            </button>
        </div>
        ${prefs ? `
        <div style="margin-top:${m ? '20px' : '16px'}; padding-top:${m ? '16px' : '16px'}; border-top:1px solid var(--SmartThemeBorderColor);">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '13px' : '12px'}; opacity:0.7; margin-bottom:${m ? '8px' : '6px'}; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-lightbulb fa-xs"></i> ${t('appliedPreferences')}
            </div>
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '13px' : '12px'}; opacity:0.6; background:var(--SmartThemeInputColor); padding:${m ? '10px' : '8px'}; border-radius:4px; font-family:monospace; line-height:1.4; max-height:80px; overflow-y:auto;">${prefs}</div>
        </div>
        ` : ''}
    `;

    createPopup(content, "500px");

    // Обновляем lastGeneratedOOC и сохраняем
    state.lastGeneratedOOC = { text, type, preferences: prefs };
    saveLastOOCForChat(state.lastGeneratedOOC);
    updateMenuState();

    document.getElementById("fawn-apply-ooc").addEventListener("click", function () {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            state.lastGeneratedOOC.text = finalOOC;
            saveLastOOCForChat(state.lastGeneratedOOC);
            addPlotPrompt(finalOOC);
            closePopup();
            notify('success', t('appliedType', { type: type === 'timeskip' ? t('timeSkip') : t('plotTwist') }));
        }
    });

    document.getElementById("fawn-regen-ooc").addEventListener("click", function () {
        closePopup();
        setTimeout(() => drivePlotWithPreferences(state.lastType, state.currentPreferences), 150);
    });

    document.getElementById("fawn-cancel").addEventListener("click", closePopup);
}
