import { getContext } from "../../../../../extensions.js";
import { t } from "../i18n.js";
import { notify } from "../notify.js";

// ========== БАЗОВЫЙ POPUP ==========

export function ensureActiveChat() {
    const context = getContext();
    if (context?.chatId) {
        return true;
    }

    notify('warning', t('chooseChatFirst'));
    return false;
}

export function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) {
        popup.remove();
        document.removeEventListener('keydown', _escHandler);
    }
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}

function _escHandler(e) {
    if (e.key === 'Escape') {
        closePopup();
        document.removeEventListener('keydown', _escHandler);
    }
}

/**
 * Создаёт универсальный popup с фоном.
 * @param {string} content HTML-содержимое
 * @param {string} [width="500px"]
 * @returns {HTMLElement}
 */
export function createPopup(content, width = "500px") {
    closePopup();

    const isMobile = window.innerWidth <= 768;
    const maxWidth = isMobile ? "calc(100vw - 40px)" : `min(${width}, 90vw)`;

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 99998; touch-action: pan-y;
        "></div>
        <div id="fawn-popup-content" style="
            position: fixed;
            top: ${isMobile ? '20px' : '50%'};
            left: 50%;
            transform: ${isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)'};
            width: ${maxWidth};
            max-height: ${isMobile ? 'calc(100vh - 40px)' : '80vh'};
            background: var(--SmartThemeBlurTintColor);
            border: 1px solid var(--SmartThemeBorderColor);
            border-radius: 12px;
            padding: ${isMobile ? '20px 16px' : '20px'};
            z-index: 99999;
            box-sizing: border-box;
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
            ${content}
        </div>
    `;

    document.body.appendChild(popup);
    document.body.style.overflow = 'hidden';
    if (isMobile) {
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    }

    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
    document.addEventListener('keydown', _escHandler);

    setTimeout(() => {
        const first = popup.querySelector('textarea, input:not([type="hidden"]), button');
        if (first && !first.disabled) first.focus();
    }, 100);

    return popup;
}

// ========== ОБЩИЕ СТИЛИ КНОПОК ==========
export function btnStyle(isMobile, variant = 'primary') {
    const base = `
        padding: ${isMobile ? '14px 20px' : '8px 16px'};
        border-radius: ${isMobile ? '8px' : '4px'};
        font-size: ${isMobile ? '15px' : '13px'};
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        ${isMobile ? 'width: 100%;' : 'flex: 1;'}
        justify-content: center;
        min-width: ${isMobile ? 'auto' : '120px'};
    `;
    if (variant === 'primary') {
        return base + `
            background: var(--SmartThemeButtonColor);
            color: var(--SmartThemeButtonTextColor);
            border: none;
            ${isMobile ? 'margin-bottom: 8px;' : ''}
        `;
    }
    return base + `
        background: transparent;
        color: var(--SmartThemeBodyColor);
        border: 1px solid var(--SmartThemeBorderColor);
    `;
}
