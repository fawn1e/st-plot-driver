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
    if (popup) popup.remove();
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
    if (lastOocOption) {
        lastOocOption.style.display = lastGeneratedOOC ? "block" : "none";
    }
}

// ========== ОКНО НАСТРОЕК ==========
function showSettingsPopup() {
    closePopup();
    const s = extension_settings[extensionName];

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:20px; z-index:99999; width:500px; max-width:90%; max-height:80vh; overflow-y:auto;">
            <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-sliders"></i> Настройки Plot Driver
            </div>
            <div style="margin-bottom:16px;">
                <label style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8;">Промпт для Time Skip:</label>
                <textarea id="fawn-set-timeskip" style="width:100%; height:80px; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:10px; color:var(--SmartThemeBodyColor); font-size:13px; resize:vertical; font-family:inherit;">${s.timeskipPrompt}</textarea>
            </div>
            <div style="margin-bottom:16px;">
                <label style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8;">Промпт для Plot Twist:</label>
                <textarea id="fawn-set-twist" style="width:100%; height:80px; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:10px; color:var(--SmartThemeBodyColor); font-size:13px; resize:vertical; font-family:inherit;">${s.twistPrompt}</textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:8px; opacity:0.8;">Сообщений для контекста: <span id="fawn-msg-count-label">${s.messageCount}</span></label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="width:100%; height:4px; background:var(--SmartThemeBorderColor); border-radius:2px; outline:none;">
            </div>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="fawn-set-save" class="menu_button" style="background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); padding:8px 16px; border-radius:4px; border:none; font-size:13px; cursor:pointer;">Сохранить</button>
                <button id="fawn-set-close" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:8px 16px; border-radius:4px; border:1px solid var(--SmartThemeBorderColor); font-size:13px; cursor:pointer;">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-set-msgcount").addEventListener("input", function(e) {
        document.getElementById("fawn-msg-count-label").textContent = e.target.value;
    });

    document.getElementById("fawn-set-save").addEventListener("click", function() {
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        saveSettings();
        toastr.success("Настройки сохранены");
        closePopup();
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ПЕРЕПИСАННОЕ ПРЕВЬЮ - ТОЛЬКО OOC ==========
function showOOCPreview(text, type) {
    closePopup();

    const title = type === 'timeskip' ? 'Time Skip OOC' : 'Plot Twist OOC';
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:20px; z-index:99999; width:500px; max-width:90%;">
            <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid ${icon}"></i> ${title}
            </div>
            <div style="color:var(--SmartThemeBodyColor); font-size:13px; margin-bottom:16px; opacity:0.7;">
                Сгенерировано нейросетью. Отредактируйте при необходимости:
            </div>
            <div style="background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:12px; margin-bottom:16px; min-height:120px;">
                <textarea id="fawn-ooc-text" style="width:100%; height:100px; background:transparent; border:none; color:var(--SmartThemeBodyColor); font-family:inherit; font-size:14px; resize:vertical; outline:none; line-height:1.4;">${text}</textarea>
            </div>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="fawn-apply-ooc" class="menu_button" style="background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); padding:8px 16px; border-radius:4px; border:none; font-size:13px; cursor:pointer;">Применить OOC</button>
                <button id="fawn-regen-ooc" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:8px 16px; border-radius:4px; border:1px solid var(--SmartThemeBorderColor); font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-rotate"></i> Заново
                </button>
                <button id="fawn-cancel" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:8px 16px; border-radius:4px; border:1px solid var(--SmartThemeBorderColor); font-size:13px; cursor:pointer;">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-ooc").addEventListener("click", function() {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            addPlotPrompt(finalOOC);
            closePopup();
            toastr.success(`OOC ${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} применен`);
        }
    });

    document.getElementById("fawn-regen-ooc").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 150);
    });

    document.getElementById("fawn-cancel").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ OOC (ТОЛЬКО ДЛЯ ОШИБОК) ==========
function showManualOOC(type) {
    const defaultOOC = type === 'timeskip'
        ? '(OOC: Time passes naturally. Describe what happens next.)'
        : '(OOC: Introduce an unexpected plot twist. Make it logical.)';

    closePopup();

    const title = type === 'timeskip' ? 'Time Skip' : 'Plot Twist';
    const icon = type === 'timeskip' ? 'fa-hourglass-half' : 'fa-bolt';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid ${icon}"></i> ${title}
            </div>
            <textarea id="fawn-manual-ooc" style="width:100%; height:100px; margin:0 0 16px 0; padding:12px; border:1px solid var(--SmartThemeBorderColor); border-radius:6px; background:var(--SmartThemeInputColor); color:var(--SmartThemeBodyColor); font-family:inherit; font-size:14px; resize:vertical;">${defaultOOC}</textarea>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="fawn-apply-manual" class="menu_button" style="background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); padding:8px 16px; border-radius:4px; border:none; font-size:13px; cursor:pointer;">Применить OOC</button>
                <button id="fawn-try-again" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:8px 16px; border-radius:4px; border:1px solid var(--SmartThemeBorderColor); font-size:13px; cursor:pointer;">Заново</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-manual").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            toastr.success("OOC применен вручную");
        }
    });

    document.getElementById("fawn-try-again").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(type), 100);
    });

    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    if (isGenerating) {
        toastr.info("Генерация уже выполняется");
        return;
    }

    console.log('Fawn Plot Driver: Generating OOC...');
    isGenerating = true;
    lastType = type;

    const icon = document.querySelector("#fawn-plot-btn i");
    if (icon) {
        icon.className = "fa-solid fa-spinner fa-spin";
    }

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        if (!context?.chat?.length) {
            toastr.warning("Начните чат сначала");
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

        const oocPrompt = `TASK: ${instruction}

CONTEXT (last ${msgCount} messages):
${chatHistory}

RULES:
- Write ONLY OOC direction (2-3 sentences max)
- Format: (OOC: your direction here)
- NO roleplay, NO character speech, NO descriptions
- Example: (OOC: Time passes as they walk through the forest. Night falls and they find a campsite.)

OOC:`;

        const response = await generateQuietPrompt(oocPrompt, false, false);
        let oocText = extractOOC(response);

        if (!oocText || oocText.trim().length < 5) {
            toastr.warning("Не удалось сгенерировать OOC. Попробуйте вручную.");
            showManualOOC(type);
            return;
        }

        if (oocText && !oocText.includes('OOC:') && !oocText.includes('(OOC:')) {
            oocText = `(OOC: ${oocText.trim()})`;
        }

        if (oocText && oocText.length > 10 && !oocText.includes('undefined')) {
            lastGeneratedOOC = { text: oocText, type: type };
            showOOCPreview(oocText, type);
        } else {
            toastr.warning("Не удалось сгенерировать OOC. Попробуйте вручную.");
            showManualOOC(type);
        }

    } catch (error) {
        console.error('Fawn Plot Driver Error:', error);
        toastr.error("Ошибка генерации OOC");
        showManualOOC(type);
    } finally {
        isGenerating = false;
        const icon = document.querySelector("#fawn-plot-btn i");
        if (icon) {
            icon.className = "fa-solid fa-pen-nib";
        }
        updateMenuState();
    }
}

// ========== ПОКАЗАТЬ ПОСЛЕДНИЙ OOC ==========
function showLastOOC() {
    if (lastGeneratedOOC) {
        showOOCPreview(lastGeneratedOOC.text, lastGeneratedOOC.type);
    } else {
        toastr.info("Нет сохраненного OOC");
    }
}

// ========== РУЧНОЙ ВВОД OOC (ОТДЕЛЬНАЯ ФУНКЦИЯ) ==========
function showManualInputPopup() {
    closePopup();

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:20px; z-index:99999; width:500px; max-width:90%;">
            <div style="color:var(--SmartThemeBodyColor); font-size:16px; font-weight:500; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-keyboard"></i> Ручной ввод OOC
            </div>
            <div style="margin-bottom:16px;">
                <label style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8;">Тип OOC:</label>
                <select id="fawn-manual-type" style="width:100%; padding:10px; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; color:var(--SmartThemeBodyColor); font-size:13px; font-family:inherit;">
                    <option value="timeskip">Time Skip</option>
                    <option value="twist">Plot Twist</option>
                </select>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeBodyColor); font-size:13px; display:block; margin-bottom:6px; opacity:0.8;">OOC текст:</label>
                <textarea id="fawn-manual-text" style="width:100%; height:120px; background:var(--SmartThemeInputColor); border:1px solid var(--SmartThemeBorderColor); border-radius:6px; padding:12px; color:var(--SmartThemeBodyColor); font-family:inherit; font-size:14px; resize:vertical;" placeholder="(OOC: Ваш текст здесь)"></textarea>
            </div>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button id="fawn-manual-apply" class="menu_button" style="background:var(--SmartThemeButtonColor); color:var(--SmartThemeButtonTextColor); padding:8px 16px; border-radius:4px; border:none; font-size:13px; cursor:pointer;">Применить OOC</button>
                <button id="fawn-manual-cancel" class="menu_button" style="background:transparent; color:var(--SmartThemeBodyColor); padding:8px 16px; border-radius:4px; border:1px solid var(--SmartThemeBorderColor); font-size:13px; cursor:pointer;">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-manual-apply").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-text").value.trim();
        const oocType = document.getElementById("fawn-manual-type").value;
        
        if (oocText) {
            addPlotPrompt(oocText);
            lastGeneratedOOC = { text: oocText, type: oocType };
            closePopup();
            toastr.success("OOC применен вручную");
            updateMenuState();
        }
    });

    document.getElementById("fawn-manual-cancel").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
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

    // Находим другие кнопки для примера стилей
    const existingButtons = container.querySelectorAll("button, .menu_button, .fa-icon-button");
    let buttonSize = "28px";
    let buttonPadding = "8px";
    let fontSize = "16px";

    if (existingButtons.length > 0) {
        const firstButton = existingButtons[0];
        const computedStyle = window.getComputedStyle(firstButton);
        if (firstButton.clientHeight > 0) {
            buttonSize = firstButton.clientHeight + "px";
        }
        if (parseFloat(computedStyle.padding) > 0) {
            buttonPadding = computedStyle.padding;
        }
        if (computedStyle.fontSize) {
            fontSize = computedStyle.fontSize;
        }
    }

    // Кнопка (основная иконка)
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
        padding: ${buttonPadding};
        color: var(--SmartThemeBodyColor);
        font-size: ${fontSize};
        margin: 0 2px;
        border-radius: 5px;
        transition: all 0.2s;
        user-select: none;
        opacity: 0.8;
    `;

    btn.addEventListener("mouseenter", function() {
        this.style.background = "var(--SmartThemeBorderColor)";
        this.style.opacity = "1";
    });
    
    btn.addEventListener("mouseleave", function() {
        this.style.background = "";
        this.style.opacity = "0.8";
    });

    // Меню (отдельный элемент, абсолютное позиционирование)
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
        min-width: 160px;
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
            <i class="fa-solid fa-clock-rotate-left" style="width:16px;"></i> Последний OOC
        </div>
        <hr style="border:none; border-top:1px solid var(--SmartThemeBorderColor); margin:6px 0;">
        <div class="fawn-option" data-action="manual" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.8;">
            <i class="fa-solid fa-keyboard" style="width:16px;"></i> Ручной ввод
        </div>
        <div class="fawn-option" data-action="settings" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px; margin:2px 0; display:flex; align-items:center; gap:8px; font-size:13px; opacity:0.8;">
            <i class="fa-solid fa-sliders" style="width:16px;"></i> Настройки
        </div>
    `;

    // Вставляем кнопку в контейнер формы
    container.insertBefore(btn, container.firstChild);
    
    // Добавляем меню в body, но позиционируем относительно кнопки
    document.body.appendChild(menu);

    // Обработчик клика по кнопке
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

    // Обработчики для пунктов меню
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
            } else {
                drivePlot(action);
            }
        });

        opt.addEventListener("mouseenter", function() {
            this.style.background = "var(--SmartThemeQuoteColor)";
            this.style.color = "white";
        });
        
        opt.addEventListener("mouseleave", function() {
            this.style.background = "";
            this.style.color = this.dataset.action === "lastooc" ? 
                "var(--SmartThemeBodyColor)" : "var(--SmartThemeBodyColor)";
        });
    });

    // Закрытие меню при клике вне
    document.addEventListener("click", function(e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

    // Закрытие меню при скролле или изменении размера окна
    window.addEventListener("scroll", function() {
        menu.style.display = "none";
    });
    
    window.addEventListener("resize", function() {
        menu.style.display = "none";
    });

    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, clearPlotPrompt);
eventSource.on(event_types.MESSAGE_SWIPED, clearPlotPrompt);

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    
    lastGeneratedOOC = null;
    
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
    }, 500);
    
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
    }, 2000);
});
