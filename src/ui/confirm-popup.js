import { clearPlotPrompt } from "../prompt.js";
import { t } from "../i18n.js";
import { notify } from "../notify.js";
import { createPopup, closePopup } from "./popup.js";
import { updateMenuState } from "./menu.js";

// ========== ПОДТВЕРЖДЕНИЕ ОЧИСТКИ OOC ==========
export function showClearConfirmationPopup() {
    const m = window.innerWidth <= 768;

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--SmartThemeQuoteColor);"></i> ${t('clearPromptTitle')}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:13px; margin-bottom:20px; line-height:1.5; opacity:0.8;">
            ${t('clearPromptDescription')}
        </div>
        <div style="display:flex; gap:8px; justify-content:center; ${m ? 'flex-direction: column;' : ''}">
            <button id="fawn-confirm-clear" class="menu_button" style="
                background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor);
                padding:8px 16px; border-radius:4px; border:none; font-size:13px;
                cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'} justify-content:center; min-width:120px;
            ">
                <i class="fa-solid fa-check"></i> ${t('clearYes')}
            </button>
            <button id="fawn-cancel-clear" class="menu_button" style="
                background:transparent; color:var(--SmartThemeBodyColor);
                padding:8px 16px; border-radius:4px; border:1px solid var(--SmartThemeBorderColor);
                font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;
                ${m ? 'width: 100%;' : 'flex: 1;'} justify-content:center; min-width:120px;
            ">
                <i class="fa-solid fa-xmark"></i> ${t('cancel')}
            </button>
        </div>
    `;

    createPopup(content, "400px");

    document.getElementById("fawn-confirm-clear").addEventListener("click", function () {
        clearPlotPrompt();
        closePopup();
        notify('success', t('promptCleared'));
        setTimeout(updateMenuState, 100);
    });

    document.getElementById("fawn-cancel-clear").addEventListener("click", closePopup);
}
