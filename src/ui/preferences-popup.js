import { state } from "../state.js";
import { drivePlotWithPreferences } from "../generator.js";
import { t } from "../i18n.js";
import { createPopup, closePopup } from "./popup.js";

// ========== ОКНО ПРЕФЕРЕНСОВ ==========
export function showPreferencesPopup(type) {
    closePopup();
    state.lastType = type;
    state.currentPreferences = "";

    const m = window.innerWidth <= 768;
    const title = type === 'timeskip' ? t('preferencesTitleTimeSkip') : t('preferencesTitleTwist');
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';
    const examples = type === 'timeskip'
        ? '• Skip to the next morning\n• Fast-forward to evening\n• Jump ahead one week\n• Transition to the next scene'
        : '• A character reveals a secret\n• Unexpected event occurs\n• Plot direction changes\n• New obstacle appears';

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '18px' : '16px'}; font-weight:500; margin-bottom:${m ? '20px' : '16px'}; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid ${icon}"></i> ${title}
        </div>

        <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '20px' : '16px'}; opacity:0.8; line-height:1.5;">
            ${type === 'timeskip' ? t('preferencesDescriptionTimeSkip') : t('preferencesDescriptionTwist')}
        </div>

        <div style="margin-bottom:${m ? '20px' : '16px'};">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '14px' : '13px'}; margin-bottom:${m ? '8px' : '6px'}; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-lightbulb fa-xs"></i> ${t('yourPreferences')}
            </div>
            <textarea id="fawn-preferences-text" style="
                width:100%; height:${m ? '120px' : '120px'};
                background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor);
                border-radius:8px; padding:${m ? '14px' : '12px'}; color:var(--SmartThemeBodyColor);
                font-family:monospace; font-size:${m ? '14px' : '13px'}; resize:vertical; line-height:1.4;
            " placeholder="${t('preferencesPlaceholder')}"></textarea>
        </div>

        <div style="background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:${m ? '14px' : '12px'}; margin-bottom:${m ? '24px' : '20px'}; max-height:140px; overflow-y:auto;">
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '13px' : '12px'}; font-weight:500; margin-bottom:${m ? '10px' : '8px'}; opacity:0.7; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-list fa-xs"></i> ${t('examples')}
            </div>
            <div style="color:var(--SmartThemeBodyColor); font-size:${m ? '13px' : '12px'}; opacity:0.6; white-space:pre-line; line-height:1.5; font-family:monospace;">${examples}</div>
        </div>

        <div style="display:flex; gap:${m ? '10px' : '8px'}; justify-content:center; ${m ? 'flex-direction: column;' : ''}">
            <button id="fawn-pref-generate" class="menu_button" style="
                background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'}; border:none;
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ${t('generateWithPreferences')}
            </button>
            <button id="fawn-pref-skip" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:${m ? '14px 20px' : '8px 16px'}; border-radius:${m ? '8px' : '4px'};
                border:1px solid var(--SmartThemeBorderColor);
                font-size:${m ? '15px' : '13px'}; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center;
            ">
                <i class="fa-solid fa-forward"></i> ${t('skipPreferences')}
            </button>
            <button id="fawn-pref-close" class="menu_button" style="
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

    setTimeout(() => document.getElementById("fawn-preferences-text")?.focus(), 100);

    document.getElementById("fawn-pref-generate").addEventListener("click", function () {
        const prefs = document.getElementById("fawn-preferences-text").value.trim();
        state.currentPreferences = prefs;
        closePopup();
        setTimeout(() => drivePlotWithPreferences(type, prefs), 100);
    });

    document.getElementById("fawn-pref-skip").addEventListener("click", function () {
        state.currentPreferences = "";
        closePopup();
        setTimeout(() => drivePlotWithPreferences(type, ""), 100);
    });

    document.getElementById("fawn-pref-close").addEventListener("click", closePopup);
}
