console.log('Fawn Plot Driver: Initializing...');

import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
    twistPrompt: "You are a genius narrative stylist. Introduce an unexpected but logical plot twist. Write 2-3 sentences as OOC direction.",
    messageCount: 15
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

let lastType = null;
let isGenerating = false;
let lastGeneratedOOC = null;
let currentPreferences = "";

// ========== СОХРАНИТЬ/ЗАГРУЗИТЬ ==========
function saveSettings() {
    localStorage.setItem('fawn_settings', JSON.stringify(extension_settings[extensionName]));
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('fawn_settings');
        if (saved) {
            extension_settings[extensionName] = { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {}
}

// ========== ЗАКРЫТЬ POPUP ==========
function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) {
        popup.remove();
        // Удаляем обработчик ESC
        document.removeEventListener('keydown', function(e) {
            if (e.key === 'Escape') closePopup();
        });
    }
    document.body.style.overflow = '';
}

// ========== ДОБАВИТЬ OOC ПРОМПТ ==========
function addPlotPrompt(text) {
    const prompt = `[OOC INSTRUCTION FROM PLOT DRIVER]
${text}
[END OOC - incorporate this naturally into your next response]`;

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

    lastGeneratedOOC = null;
    updateMenuState();
    toastr.success("OOC prompt added");
}

// ========== ОЧИСТИТЬ OOC ПРОМПТ ==========
function clearPlotPrompt() {
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
}

// ========== ОБНОВИТЬ СОСТОЯНИЕ МЕНЮ ==========
function updateMenuState() {
    const lastOocOption = document.getElementById("fawn-last-ooc-option");
    const clearOocOption = document.getElementById("fawn-clear-ooc-option");
    
    if (lastOocOption) {
        lastOocOption.style.display = lastGeneratedOOC ? "flex" : "none";
    }
    
    if (clearOocOption) {
        const hasActiveOOC = checkActiveOOCPrompt();
        clearOocOption.style.display = hasActiveOOC ? "flex" : "none";
    }
}

// ========== ПРОВЕРИТЬ АКТИВНЫЙ OOC ПРОМПТ ==========
function checkActiveOOCPrompt() {
    try {
        const context = getContext();
        if (context?.extensionPrompts?.length > 0) {
            return context.extensionPrompts.some(prompt => 
                prompt.name === 'fawn-plot-driver' && 
                prompt.value && 
                prompt.value.trim().length > 0
            );
        }
    } catch (e) {
        console.error('Error checking active OOC:', e);
    }
    return false;
}

// ========== УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ POPUP (ИСПРАВЛЕННАЯ) ==========
function createPopup(content, width = "500px") {
    closePopup();
    
    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    
    const isMobile = window.innerWidth <= 768;
    const maxWidth = isMobile ? "calc(100vw - 40px)" : `min(${width}, 90vw)`;
    
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 99998;
            touch-action: pan-y;
        "></div>
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${maxWidth};
            max-height: ${isMobile ? '85vh' : '80vh'};
            background: var(--SmartThemeBlurTintColor);
            border: 1px solid var(--SmartThemeBorderColor);
            border-radius: 8px;
            padding: ${isMobile ? '16px' : '20px'};
            z-index: 99999;
            box-sizing: border-box;
            overflow-y: auto;
            overscroll-behavior: contain;
        ">
            ${content}
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Блокируем скролл под попапом
    document.body.style.overflow = 'hidden';
    
    // Закрытие по клику на фон
    document.getElementById("fawn-popup-bg").addEventListener("click", function() {
        closePopup();
    });
    
    // Закрытие по ESC
    const closeOnEsc = function(e) {
        if (e.key === 'Escape') {
            closePopup();
            document.removeEventListener('keydown', closeOnEsc);
        }
    };
    document.addEventListener('keydown', closeOnEsc);
    
    return popup;
}

// ========== ОКНО ПОДТВЕРЖДЕНИЯ ОЧИСТКИ OOC ==========
function showClearConfirmationPopup() {
    const isMobile = window.innerWidth <= 768;
    
    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--SmartThemeQuoteColor);"></i> Clear OOC Prompt?
        </div>
        
        <div style="color:var(--SmartThemeBodyColor); font-size:13px; margin-bottom:20px; line-height:1.5; opacity:0.8;">
            Are you sure you want to remove the active OOC prompt?<br>
            This action cannot be undone.
        </div>
        
        <div style="display:flex; gap:8px; justify-content:center; width:100%; ${isMobile ? 'flex-direction: column;' : ''}">
            <button id="fawn-confirm-clear" class="menu_button" style="
                background:var(--SmartThemeButtonColor); 
                color:var(--SmartThemeButtonTextColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:none; 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-check"></i> Yes, Clear
            </button>
            <button id="fawn-cancel-clear" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-xmark"></i> Cancel
            </button>
        </div>
    `;
    
    const popup = createPopup(content, "400px");
    
    document.getElementById("fawn-confirm-clear").addEventListener("click", function() {
        clearPlotPrompt();
        closePopup();
        toastr.success("OOC prompt cleared");
        updateMenuState();
    });

    document.getElementById("fawn-cancel-clear").addEventListener("click", closePopup);
}

// ========== ОКНО НАСТРОЕК ==========
function showSettingsPopup() {
    const s = extension_settings[extensionName];
    const isMobile = window.innerWidth <= 768;
    
    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-sliders"></i> Plot Driver Settings
        </div>
        
        <div style="margin-bottom:16px;">
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-hourglass-half fa-xs"></i> Time Skip Prompt:
            </div>
            <textarea id="fawn-set-timeskip" style="width:100%; height:${isMobile ? '70px' : '80px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:10px; color:var(--SmartThemeBodyColor); font-size:13px; resize:vertical; font-family:monospace;">${s.timeskipPrompt}</textarea>
        </div>
        
        <div style="margin-bottom:16px;">
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-bolt fa-xs"></i> Plot Twist Prompt:
            </div>
            <textarea id="fawn-set-twist" style="width:100%; height:${isMobile ? '70px' : '80px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:10px; color:var(--SmartThemeBodyColor); font-size:13px; resize:vertical; font-family:monospace;">${s.twistPrompt}</textarea>
        </div>
        
        <div style="margin-bottom:20px;">
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-message fa-xs"></i> Message Count:
            </div>
            <div style="display:flex; align-items:center; gap:10px; ${isMobile ? 'flex-direction: column; align-items: flex-start;' : ''}">
                <input type="number" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="
                    ${isMobile ? 'width: 100%;' : 'width: 80px;'}
                    padding:8px 10px; 
                    background:var(--SmartThemeInputColor); 
                    border:1px solid var(--SmartThemeBorderColor); 
                    border-radius:6px; 
                    color:var(--SmartThemeBodyColor); 
                    font-size:13px; 
                    font-family:monospace;
                ">
                <div style="color:var(--SmartThemeBodyColor); font-size:12px; opacity:0.6; ${isMobile ? 'margin-top: 8px;' : ''}">(5-50 messages)</div>
            </div>
        </div>
        
        <div style="display:flex; gap:8px; justify-content:center; ${isMobile ? 'flex-direction: column;' : ''}">
            <button id="fawn-set-save" class="menu_button" style="
                background:var(--SmartThemeButtonColor); 
                color:var(--SmartThemeButtonTextColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:none; 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : ''}
                justify-content:center;
            ">
                <i class="fa-solid fa-save"></i> Save
            </button>
            <button id="fawn-set-close" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%;' : ''}
                justify-content:center;
            ">
                <i class="fa-solid fa-xmark"></i> Close
            </button>
        </div>
    `;
    
    const popup = createPopup(content, "500px");
    
    document.getElementById("fawn-set-save").addEventListener("click", function() {
        const msgCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        if (msgCount < 5 || msgCount > 50) {
            toastr.warning("Please enter a number between 5 and 50");
            return;
        }
        
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = msgCount;
        saveSettings();
        toastr.success("Settings saved");
        closePopup();
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
}

// ========== ОКНО ПРЕФЕРЕНСОВ ==========
function showPreferencesPopup(type) {
    closePopup();
    lastType = type;
    currentPreferences = "";
    
    const isMobile = window.innerWidth <= 768;
    const title = type === 'timeskip' ? 'Time Skip Preferences' : 'Plot Twist Preferences';
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';
    const examples = type === 'timeskip' 
        ? 'Examples:\n• Skip to the next morning\n• Fast-forward to evening\n• Jump ahead one week\n• Transition to the next scene'
        : 'Examples:\n• A character reveals a secret\n• Unexpected event occurs\n• Plot direction changes\n• New obstacle appears';

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid ${icon}"></i> ${title}
        </div>
        
        <div style="color:var(--SmartThemeBodyColor); font-size:13px; margin-bottom:16px; opacity:0.8; line-height:1.5;">
            Add specific details or preferences for this ${type === 'timeskip' ? 'time skip' : 'plot twist'}.
            The AI will incorporate these into the OOC direction.
        </div>
        
        <div style="margin-bottom:16px;">
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-lightbulb fa-xs"></i> Your Preferences (optional):
            </div>
            <textarea id="fawn-preferences-text" style="width:100%; height:${isMobile ? '100px' : '120px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:12px; color:var(--SmartThemeBodyColor); font-family:monospace; font-size:13px; resize:vertical; line-height:1.4;" placeholder="Enter any specific details or requirements..."></textarea>
        </div>
        
        <div style="background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:12px; margin-bottom:20px; max-height: ${isMobile ? '120px' : '140px'}; overflow-y: auto;">
            <div style="color:var(--SmartThemeBodyColor); font-size:12px; font-weight:500; margin-bottom:8px; opacity:0.7; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-list fa-xs"></i> ${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} Examples:
            </div>
            <div style="color:var(--SmartThemeBodyColor); font-size:12px; opacity:0.6; white-space: pre-line; line-height:1.5; font-family:monospace;">
                ${examples}
            </div>
        </div>
        
        <div style="display:flex; gap:8px; justify-content:center; ${isMobile ? 'flex-direction: column;' : ''}">
            <button id="fawn-pref-generate" class="menu_button" style="
                background:var(--SmartThemeButtonColor); 
                color:var(--SmartThemeButtonTextColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:none; 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Generate with Preferences
            </button>
            <button id="fawn-pref-skip" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-forward"></i> Skip Preferences
            </button>
            <button id="fawn-pref-close" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-xmark"></i> Close
            </button>
        </div>
    `;
    
    const popup = createPopup(content, "500px");
    
    setTimeout(() => {
        const textarea = document.getElementById("fawn-preferences-text");
        if (textarea) textarea.focus();
    }, 100);

    document.getElementById("fawn-pref-generate").addEventListener("click", function() {
        const preferences = document.getElementById("fawn-preferences-text").value.trim();
        currentPreferences = preferences;
        closePopup();
        setTimeout(() => drivePlotWithPreferences(type, preferences), 100);
    });

    document.getElementById("fawn-pref-skip").addEventListener("click", function() {
        currentPreferences = "";
        closePopup();
        setTimeout(() => drivePlotWithPreferences(type, ""), 100);
    });

    document.getElementById("fawn-pref-close").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ С ПРЕФЕРЕНСАМИ ==========
async function drivePlotWithPreferences(type, preferences = "") {
    if (isGenerating) {
        toastr.info("Generation in progress");
        return;
    }

    console.log('Fawn Plot Driver: Generating OOC with preferences...');
    isGenerating = true;
    lastType = type;

    const btn = document.getElementById("fawn-plot-btn");
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        if (!context?.chat?.length) {
            toastr.warning("Start a chat first");
            return;
        }

        const chatHistory = context.chat.slice(-msgCount).map(m => {
            const name = m.is_user ? 'User' : (m.name || 'Character');
            const cleanMes = m.mes.replace(/<[^>]*>/g, '').trim();
            return `${name}: ${cleanMes}`;
        }).join('\n');

        const instruction = type === 'timeskip'
            ? extension_settings[extensionName].timeskipPrompt
            : extension_settings[extensionName].twistPrompt;

        let finalInstruction = instruction;
        if (preferences && preferences.trim().length > 0) {
            finalInstruction = `${instruction}\n\nUSER PREFERENCES: ${preferences}`;
        }

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

        const response = await generateQuietPrompt(oocPrompt, false, false);
        let oocText = extractOOC(response);

        if (!oocText || oocText.trim().length < 5) {
            toastr.warning("Failed to generate OOC");
            showManualOOC(type);
            return;
        }

        if (oocText && !oocText.includes('OOC:') && !oocText.includes('(OOC:')) {
            oocText = `(OOC: ${oocText.trim()})`;
        }

        if (oocText && oocText.length > 10 && !oocText.includes('undefined')) {
            lastGeneratedOOC = { text: oocText, type: type, preferences: preferences };
            showOOCPreview(oocText, type);
        } else {
            toastr.warning("Failed to generate OOC");
            showManualOOC(type);
        }

    } catch (error) {
        console.error('Fawn Plot Driver Error:', error);
        toastr.error("OOC generation error");
        showManualOOC(type);
    } finally {
        isGenerating = false;
        const btn = document.getElementById("fawn-plot-btn");
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-pen-nib"></i>';
        }
        updateMenuState();
    }
}

// ========== ПЕРЕПИСАННОЕ ПРЕВЬЮ - ТОЛЬКО OOC ==========
function showOOCPreview(text, type) {
    const isMobile = window.innerWidth <= 768;
    const title = type === 'timeskip' ? 'Time Skip OOC' : 'Plot Twist OOC';
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:12px; display:flex; align-items:center; gap:8px; ${isMobile ? 'flex-wrap: wrap;' : ''}">
            <i class="fa-solid ${icon}"></i> ${title}
            ${currentPreferences ? '<span style="font-size:11px; background:var(--SmartThemeQuoteColor); color:white; padding:2px 6px; border-radius:10px; margin-left:8px; margin-top:4px;">With Preferences</span>' : ''}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:13px; margin-bottom:16px; opacity:0.7;">
            AI-generated OOC. Edit if needed:
        </div>
        <div style="background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:12px; margin-bottom:16px; min-height:${isMobile ? '100px' : '120px'};">
            <textarea id="fawn-ooc-text" style="width:100%; height:${isMobile ? '80px' : '100px'}; background:transparent; border:none; color:var(--SmartThemeBodyColor); font-family:monospace; font-size:13px; resize:vertical; outline:none; line-height:1.4;">${text}</textarea>
        </div>
        <div style="display:flex; gap:8px; justify-content:center; ${isMobile ? 'flex-direction: column;' : ''}">
            <button id="fawn-apply-ooc" class="menu_button" style="
                background:var(--SmartThemeButtonColor); 
                color:var(--SmartThemeButtonTextColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:none; 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-check"></i> Apply OOC
            </button>
            <button id="fawn-regen-ooc" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-rotate"></i> Regenerate
            </button>
            <button id="fawn-cancel" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-xmark"></i> Cancel
            </button>
        </div>
        ${currentPreferences ? `
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--SmartThemeBorderColor);">
            <div style="color:var(--SmartThemeBodyColor); font-size:12px; opacity:0.7; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-lightbulb fa-xs"></i> Applied Preferences:
            </div>
            <div style="color:var(--SmartThemeBodyColor); font-size:12px; opacity:0.6; background:var(--SmartThemeInputColor); padding:8px; border-radius:4px; font-family:monospace; line-height:1.4; max-height: 80px; overflow-y: auto;">
                ${currentPreferences}
            </div>
        </div>
        ` : ''}
    `;
    
    const popup = createPopup(content, "500px");

    document.getElementById("fawn-apply-ooc").addEventListener("click", function() {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            addPlotPrompt(finalOOC);
            closePopup();
            toastr.success(`OOC ${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} applied`);
        }
    });

    document.getElementById("fawn-regen-ooc").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlotWithPreferences(lastType, currentPreferences), 150);
    });

    document.getElementById("fawn-cancel").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ OOC (ТОЛЬКО ДЛЯ ОШИБОК) ==========
function showManualOOC(type) {
    const isMobile = window.innerWidth <= 768;
    const defaultOOC = type === 'timeskip'
        ? '(OOC: Time passes naturally. Describe what happens next.)'
        : '(OOC: Introduce an unexpected plot twist. Make it logical.)';

    const title = type === 'timeskip' ? 'Time Skip' : 'Plot Twist';
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';

    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid ${icon}"></i> ${title}
        </div>
        <div style="color:var(--SmartThemeBodyColor); font-size:13px; margin-bottom:12px; opacity:0.7;">
            Generation failed. Enter OOC manually:
        </div>
        <textarea id="fawn-manual-ooc" style="width:100%; height:${isMobile ? '80px' : '100px'}; margin:0 0 16px 0; padding:12px; border:1px solid var(--SmartThemeBorderColor); border-radius:6px; background:var(--SmartThemeInputColor); color:var(--SmartThemeBodyColor); font-family:monospace; font-size:13px; resize:vertical;">${defaultOOC}</textarea>
        <div style="display:flex; gap:8px; justify-content:center; ${isMobile ? 'flex-direction: column;' : ''}">
            <button id="fawn-apply-manual" class="menu_button" style="
                background:var(--SmartThemeButtonColor); 
                color:var(--SmartThemeButtonTextColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:none; 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-check"></i> Apply OOC
            </button>
            <button id="fawn-try-again" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-rotate"></i> Retry
            </button>
            <button id="fawn-manual-close" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-xmark"></i> Close
            </button>
        </div>
    `;
    
    const popup = createPopup(content, "450px");

    document.getElementById("fawn-apply-manual").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            toastr.success("OOC applied manually");
        }
    });

    document.getElementById("fawn-try-again").addEventListener("click", function() {
        closePopup();
        setTimeout(() => showPreferencesPopup(type), 100);
    });

    document.getElementById("fawn-manual-close").addEventListener("click", closePopup);
}

// ========== ПОКАЗАТЬ ПОСЛЕДНИЙ OOC ==========
function showLastOOC() {
    if (lastGeneratedOOC) {
        currentPreferences = lastGeneratedOOC.preferences || "";
        showOOCPreview(lastGeneratedOOC.text, lastGeneratedOOC.type);
    } else {
        toastr.info("No saved OOC found");
    }
}

// ========== РУЧНОЙ ВВОД OOC (ОТДЕЛЬНАЯ ФУНКЦИЯ) ==========
function showManualInputPopup() {
    const isMobile = window.innerWidth <= 768;
    
    const content = `
        <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-keyboard"></i> Manual OOC Input
        </div>
        <div style="margin-bottom:16px;">
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-tag fa-xs"></i> OOC Type:
            </div>
            <select id="fawn-manual-type" style="width:100%; padding:10px; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; color:var(--SmartThemeBodyColor); font-size:13px; font-family:monospace;">
                <option value="timeskip">⏳ Time Skip</option>
                <option value="twist">⚡ Plot Twist</option>
            </select>
        </div>
        <div style="margin-bottom:20px;">
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-pen fa-xs"></i> OOC Text:
            </div>
            <textarea id="fawn-manual-text" style="width:100%; height:${isMobile ? '100px' : '120px'}; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:12px; color:var(--SmartThemeBodyColor); font-family:monospace; font-size:13px; resize:vertical;" placeholder="(OOC: Your text here)"></textarea>
        </div>
        <div style="display:flex; gap:8px; justify-content:center; ${isMobile ? 'flex-direction: column;' : ''}">
            <button id="fawn-manual-apply" class="menu_button" style="
                background:var(--SmartThemeButtonColor); 
                color:var(--SmartThemeButtonTextColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:none; 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%; margin-bottom: 8px;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-check"></i> Apply OOC
            </button>
            <button id="fawn-manual-close" class="menu_button" style="
                background:transparent; 
                color:var(--SmartThemeBodyColor); 
                padding:8px 16px; 
                border-radius:4px; 
                border:1px solid var(--SmartThemeBorderColor); 
                font-size:13px; 
                cursor:pointer; 
                display:flex; 
                align-items:center; 
                gap:6px; 
                ${isMobile ? 'width: 100%;' : 'flex: 1;'}
                justify-content:center; 
                min-width: 120px;
            ">
                <i class="fa-solid fa-xmark"></i> Close
            </button>
        </div>
    `;
    
    const popup = createPopup(content, "500px");

    document.getElementById("fawn-manual-apply").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-text").value.trim();
        const oocType = document.getElementById("fawn-manual-type").value;
        
        if (oocText) {
            addPlotPrompt(oocText);
            lastGeneratedOOC = { text: oocText, type: oocType, preferences: "" };
            closePopup();
            toastr.success("OOC applied manually");
            updateMenuState();
        }
    });

    document.getElementById("fawn-manual-close").addEventListener("click", closePopup);
}

// ========== ИЗВЛЕЧЕНИЕ OOC ==========
function extractOOC(response) {
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

    if (!text) {
        return '';
    }

    text = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?think[^>]*>/gi, '')
        .replace(/^\s*\n/gm, '')
        .trim();

    if (text && text.length > 500) {
        const cut = text.substring(0, 500);
        const lastEnd = Math.max(
            cut.lastIndexOf(')'),
            cut.lastIndexOf('.'),
            cut.lastIndexOf('!')
        );
        if (lastEnd > 100) {
            text = cut.substring(0, lastEnd + 1);
        } else {
            text = cut;
        }
    }

    return text || '';
}

// ========== ИСПРАВЛЕННАЯ КНОПКА И МЕНЮ ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm") ||
                     document.getElementById("form_sheld") ||
                     document.querySelector("#send_form");

    if (!container) return false;

    const existingButtons = container.querySelectorAll("button, .menu_button, .fa-icon-button");
    
    let buttonSize = "32px";
    let buttonPadding = "0";
    let fontSize = "14px";
    
    if (existingButtons.length > 0) {
        const referenceButton = existingButtons[0];
        const rect = referenceButton.getBoundingClientRect();
        
        buttonSize = Math.max(rect.width, rect.height) + "px";
        buttonPadding = window.getComputedStyle(referenceButton).padding || "6px";
        
        const faIcons = container.querySelectorAll(".fa, .fas, .far, .fab");
        if (faIcons.length > 0) {
            const faStyle = window.getComputedStyle(faIcons[0]);
            fontSize = faStyle.fontSize || "14px";
        }
    }

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-pen-nib"></i>';
    btn.style.cssText = `
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${buttonSize};
        height: ${buttonSize};
        min-width: ${buttonSize};
        min-height: ${buttonSize};
        padding: ${buttonPadding};
        color: var(--SmartThemeBodyColor);
        font-size: ${fontSize};
        margin: 0 2px;
        border-radius: 5px;
        transition: all 0.2s;
        user-select: none;
        opacity: 0.8;
        flex-shrink: 0;
    `;

    btn.addEventListener("mouseenter", function() {
        this.style.background = "var(--SmartThemeBorderColor)";
        this.style.opacity = "1";
    });
    
    btn.addEventListener("mouseleave", function() {
        this.style.background = "";
        this.style.opacity = "0.8";
    });

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = `
        display: none;
        position: absolute;
        bottom: calc(100% + 5px);
        left: 0;
        background: var(--SmartThemeBlurTintColor);
        backdrop-filter: blur(10px);
        border: 1px solid var(--SmartThemeBorderColor);
        border-radius: 6px;
        padding: 6px;
        z-index: 1001;
        min-width: 180px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-height: 300px;
        overflow-y: auto;
    `;
    
    menu.innerHTML = `
        <div class="fawn-option" data-action="timeskip" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px;">
            <i class="fa-solid fa-hourglass-half" style="width:16px; opacity:0.7;"></i> Time Skip
        </div>
        <div class="fawn-option" data-action="twist" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px;">
            <i class="fa-solid fa-bolt" style="width:16px; opacity:0.7;"></i> Plot Twist
        </div>
        <div id="fawn-last-ooc-option" class="fawn-option" data-action="lastooc" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:none; align-items:center; gap:8px; font-size:13px; font-weight:500;">
            <i class="fa-solid fa-clock-rotate-left" style="width:16px;"></i> Last OOC
        </div>
        <div id="fawn-clear-ooc-option" class="fawn-option" data-action="clearooc" style="padding:8px 12px; cursor:pointer; color:#ff6b6b; border-radius:4px; margin:2px 0; display:none; align-items:center; gap:8px; font-size:13px; font-weight:500;">
            <i class="fa-solid fa-eraser" style="width:16px;"></i> Clear OOC
        </div>
        <hr style="border:none; border-top:1px solid var(--SmartThemeBorderColor); margin:6px 0;">
        <div class="fawn-option" data-action="manual" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.8;">
            <i class="fa-solid fa-keyboard" style="width:16px;"></i> Manual Input
        </div>
        <div class="fawn-option" data-action="settings" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.8;">
            <i class="fa-solid fa-sliders" style="width:16px;"></i> Settings
        </div>
    `;

    container.insertBefore(btn, container.firstChild);
    document.body.appendChild(menu);

    btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        
        updateMenuState();
        
        const btnRect = btn.getBoundingClientRect();
        menu.style.left = btnRect.left + "px";
        menu.style.bottom = (window.innerHeight - btnRect.top + 5) + "px";
        
        const isMenuVisible = menu.style.display === "block";
        menu.style.display = isMenuVisible ? "none" : "block";
    });

    menu.querySelectorAll(".fawn-option").forEach(opt => {
        opt.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            menu.style.display = "none";
            const action = this.dataset.action;
            
            if (action === "settings") {
                showSettingsPopup();
            } else if (action === "manual") {
                showManualInputPopup();
            } else if (action === "lastooc") {
                showLastOOC();
            } else if (action === "clearooc") {
                showClearConfirmationPopup();
            } else {
                showPreferencesPopup(action);
            }
        });

        opt.addEventListener("mouseenter", function() {
            if (this.dataset.action === "clearooc") {
                this.style.background = "#ff6b6b";
                this.style.color = "white";
            } else {
                this.style.background = "var(--SmartThemeQuoteColor)";
                this.style.color = "white";
            }
        });
        
        opt.addEventListener("mouseleave", function() {
            this.style.background = "";
            if (this.dataset.action === "clearooc") {
                this.style.color = "#ff6b6b";
            } else if (this.dataset.action === "lastooc") {
                this.style.color = "var(--SmartThemeBodyColor)";
            } else {
                this.style.color = "var(--SmartThemeBodyColor)";
            }
        });
    });

    document.addEventListener("click", function(e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

    window.addEventListener("scroll", function() {
        menu.style.display = "none";
    });
    
    window.addEventListener("resize", function() {
        menu.style.display = "none";
    });

    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, function() {
    clearPlotPrompt();
    updateMenuState();
});

eventSource.on(event_types.MESSAGE_SWIPED, function() {
    clearPlotPrompt();
    updateMenuState();
});

// ========== ДЕБАГ ФУНКЦИЯ ==========
function debugMenuState() {
    console.log('=== Fawn Plot Driver Debug ===');
    console.log('lastGeneratedOOC:', lastGeneratedOOC);
    console.log('hasActiveOOC:', checkActiveOOCPrompt());
    console.log('Last OOC element:', document.getElementById("fawn-last-ooc-option"));
    console.log('Clear OOC element:', document.getElementById("fawn-clear-ooc-option"));
    console.log('=============================');
}

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    
    lastGeneratedOOC = null;
    currentPreferences = "";
    
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
        updateMenuState();
    }, 500);
    
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
        updateMenuState();
    }, 2000);
});
