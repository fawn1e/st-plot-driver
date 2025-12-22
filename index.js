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
        lastOocOption.style.display = lastGeneratedOOC ? "flex" : "none";
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
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); backdrop-filter:blur(10px); border:1px solid var(--SmartThemeBorderColor); border-radius:12px; padding:20px; z-index:99999; width:500px; max-width:90%; max-height:80vh; overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; font-weight:600; text-align:center; margin-bottom:20px; display:flex; align-items:center; justify-content:center; gap:8px;">
                <i class="fa-solid fa-gear"></i>
                <span>Fawn's Plot Driver Settings</span>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeBodyColor); display:block; margin-bottom:8px; font-weight:500; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-hourglass-half" style="color:var(--SmartThemeQuoteColor);"></i>
                    <span>Time Skip Prompt:</span>
                </label>
                <textarea id="fawn-set-timeskip" style="width:100%; height:80px; background:var(--SmartThemeInputBg); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical; font-family:monospace; font-size:13px;"></textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeBodyColor); display:block; margin-bottom:8px; font-weight:500; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-bolt" style="color:var(--SmartThemeQuoteColor);"></i>
                    <span>Plot Twist Prompt:</span>
                </label>
                <textarea id="fawn-set-twist" style="width:100%; height:80px; background:var(--SmartThemeInputBg); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical; font-family:monospace; font-size:13px;"></textarea>
            </div>
            <div style="margin-bottom:25px;">
                <label style="color:var(--SmartThemeBodyColor); display:block; margin-bottom:8px; font-weight:500; font-size:14px; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-message" style="color:var(--SmartThemeQuoteColor);"></i>
                    <span>Message Count: <span id="fawn-msg-count-label" style="font-weight:bold;">${s.messageCount}</span></span>
                </label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="width:100%; accent-color:var(--SmartThemeQuoteColor);">
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; border-top:1px solid var(--SmartThemeBorderColor); padding-top:20px;">
                <button id="fawn-set-save" class="menu_button" style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-save"></i>
                    <span>Save</span>
                </button>
                <button id="fawn-set-reset" class="menu_button" style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-rotate-left"></i>
                    <span>Reset</span>
                </button>
                <button id="fawn-set-close" class="menu_button" style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-xmark"></i>
                    <span>Close</span>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById("fawn-set-timeskip").value = s.timeskipPrompt;
    document.getElementById("fawn-set-twist").value = s.twistPrompt;
    
    document.body.appendChild(popup);

    document.getElementById("fawn-set-msgcount").addEventListener("input", function(e) {
        document.getElementById("fawn-msg-count-label").textContent = e.target.value;
    });

    document.getElementById("fawn-set-save").addEventListener("click", function() {
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        saveSettings();
        toastr.success("Settings saved!");
        closePopup();
    });

    document.getElementById("fawn-set-reset").addEventListener("click", function() {
        document.getElementById("fawn-set-timeskip").value = defaultSettings.timeskipPrompt;
        document.getElementById("fawn-set-twist").value = defaultSettings.twistPrompt;
        document.getElementById("fawn-set-msgcount").value = defaultSettings.messageCount;
        document.getElementById("fawn-msg-count-label").textContent = defaultSettings.messageCount;
        toastr.info("Reset to defaults!");
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ПЕРЕПИСАННОЕ ПРЕВЬЮ - ТОЛЬКО OOC ==========
function showOOCPreview(text, type) {
    closePopup();

    const title = type === 'timeskip' 
        ? '<i class="fa-solid fa-hourglass-half"></i> Time Skip OOC' 
        : '<i class="fa-solid fa-bolt"></i> Plot Twist OOC';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); backdrop-filter:blur(10px); border:1px solid var(--SmartThemeBorderColor); border-radius:12px; padding:20px; z-index:99999; width:500px; max-width:90%; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center; margin-bottom:12px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px;">
                ${title}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:15px; opacity:0.8; font-size:13px;">
                AI-generated direction. Edit if needed:
            </div>
            <div style="background:var(--SmartThemeInputBg); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:15px; margin-bottom:20px;">
                <textarea id="fawn-ooc-text" style="width:100%; height:100px; background:transparent; border:none; color:var(--SmartThemeBodyColor); font-family:monospace; font-size:13px; resize:vertical; outline:none; line-height:1.4;">${text}</textarea>
            </div>
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-apply-ooc" class="menu_button" style="display:flex; align-items:center; gap:6px; background:var(--SmartThemeQuoteColor); color:var(--SmartThemeBlurTintColor);">
                    <i class="fa-solid fa-check"></i>
                    <span>Apply OOC</span>
                </button>
                <button id="fawn-regen-ooc" class="menu_button" style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-rotate-left"></i>
                    <span>Regenerate</span>
                </button>
                <button id="fawn-cancel" class="menu_button" style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-xmark"></i>
                    <span>Cancel</span>
                </button>
            </div>
            <div style="font-size:11px; color:var(--SmartThemeBodyColor); opacity:0.6; text-align:center; margin-top:12px;">
                Will be applied as system instruction
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-ooc").addEventListener("click", function() {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            addPlotPrompt(finalOOC);
            closePopup();
            toastr.success(`OOC ${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} applied!`);
        }
    });

    document.getElementById("fawn-regen-ooc").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 150);
    });

    document.getElementById("fawn-cancel").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ OOC ==========
function showManualOOC(type) {
    const defaultOOC = type === 'timeskip'
        ? '(OOC: Time passes naturally. Describe what happens next.)'
        : '(OOC: Introduce an unexpected plot twist. Make it logical.)';

    closePopup();

    const title = type === 'timeskip'
        ? '<i class="fa-solid fa-hourglass-half"></i> Manual Time Skip'
        : '<i class="fa-solid fa-bolt"></i> Manual Plot Twist';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); backdrop-filter:blur(10px); border:1px solid var(--SmartThemeBorderColor); border-radius:12px; padding:20px; z-index:99999; width:450px; max-width:90%; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
            <div style="color:var(--SmartThemeQuoteColor); font-size:16px; text-align:center; margin-bottom:15px; display:flex; align-items:center; justify-content:center; gap:6px;">
                ${title}
            </div>
            <textarea id="fawn-manual-ooc" style="width:100%; height:100px; margin:15px 0; padding:12px; border:1px solid var(--SmartThemeBorderColor); border-radius:8px; background:var(--SmartThemeInputBg); color:var(--SmartThemeBodyColor); resize:vertical; font-family:monospace; font-size:13px;">${defaultOOC}</textarea>
            <div style="display:flex; gap:8px; justify-content:center;">
                <button id="fawn-apply-manual" class="menu_button" style="display:flex; align-items:center; gap:6px; background:var(--SmartThemeQuoteColor); color:var(--SmartThemeBlurTintColor);">
                    <i class="fa-solid fa-check"></i>
                    <span>Apply OOC</span>
                </button>
                <button id="fawn-regen" class="menu_button" style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-rotate-left"></i>
                    <span>Regenerate</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-manual").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            toastr.success("Manual OOC applied!");
        }
    });

    document.getElementById("fawn-regen").addEventListener("click", function() {
        closePopup();
        setTimeout(() => drivePlot(lastType), 100);
    });

    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    if (isGenerating) {
        toastr.info("Please wait, generating...");
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
            toastr.warning("Start a chat first!");
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

        if (oocText && !oocText.includes('OOC:')) {
            oocText = `(OOC: ${oocText.trim()})`;
        }

        if (oocText?.length > 5) {
            lastGeneratedOOC = { text: oocText, type: type };
            updateMenuState();
            showOOCPreview(oocText, type);
        } else {
            toastr.warning("Failed to generate OOC");
            showManualOOC(type);
        }

    } catch (error) {
        console.error('Fawn: Error:', error);
        toastr.error("OOC generation failed");
        showManualOOC(type);
    } finally {
        isGenerating = false;
        const icon = document.querySelector("#fawn-plot-btn i");
        if (icon) {
            icon.className = "fa-solid fa-star";
        }
    }
}

// ========== ПОКАЗАТЬ ПОСЛЕДНИЙ OOC ==========
function showLastOOC() {
    if (lastGeneratedOOC) {
        showOOCPreview(lastGeneratedOOC.text, lastGeneratedOOC.type);
    } else {
        toastr.info("No saved OOC found!");
    }
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

    text = text
        ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
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

    return text;
}

// ========== ИСПРАВЛЕННАЯ КНОПКА И МЕНЮ ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm") ||
                     document.getElementById("form_sheld") ||
                     document.querySelector("#send_form");

    if (!container) return false;

    // Создаем кнопку
    const btn = document.createElement("button");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.style.cssText = `
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        margin: 0 4px;
        padding: 0;
        border: 1px solid var(--SmartThemeBorderColor);
        border-radius: 8px;
        background: var(--SmartThemeInputBg);
        color: var(--SmartThemeBodyColor);
        font-size: 16px;
        transition: all 0.2s ease;
        position: relative;
        z-index: 1000;
    `;

    btn.addEventListener("mouseenter", function() {
        this.style.background = "var(--SmartThemeQuoteColor)";
        this.style.color = "var(--SmartThemeBlurTintColor)";
        this.style.borderColor = "var(--SmartThemeQuoteColor)";
        this.style.transform = "translateY(-1px)";
    });
    
    btn.addEventListener("mouseleave", function() {
        this.style.background = "var(--SmartThemeInputBg)";
        this.style.color = "var(--SmartThemeBodyColor)";
        this.style.borderColor = "var(--SmartThemeBorderColor)";
        this.style.transform = "translateY(0)";
    });

    // Создаем меню
    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = `
        display: none;
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-bottom: 8px;
        background: var(--SmartThemeBlurTintColor);
        backdrop-filter: blur(10px);
        border: 1px solid var(--SmartThemeBorderColor);
        border-radius: 8px;
        padding: 6px 0;
        z-index: 1001;
        min-width: 160px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        max-height: 300px;
        overflow-y: auto;
    `;
    
    menu.innerHTML = `
        <div class="fawn-option" data-action="timeskip" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:0; display:flex; align-items:center; gap:8px; font-size:14px; transition:all 0.15s;">
            <i class="fa-solid fa-hourglass-half" style="width:16px; text-align:center;"></i>
            <span>Time Skip</span>
        </div>
        <div class="fawn-option" data-action="twist" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:0; display:flex; align-items:center; gap:8px; font-size:14px; transition:all 0.15s;">
            <i class="fa-solid fa-bolt" style="width:16px; text-align:center;"></i>
            <span>Plot Twist</span>
        </div>
        <div id="fawn-last-ooc-option" class="fawn-option" data-action="lastooc" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeQuoteColor); border-radius:0; display:none; align-items:center; gap:8px; font-size:14px; font-weight:500; transition:all 0.15s;">
            <i class="fa-solid fa-clock-rotate-left" style="width:16px; text-align:center;"></i>
            <span>Last OOC</span>
        </div>
        <div style="border-top:1px solid var(--SmartThemeBorderColor); margin:6px 0;"></div>
        <div class="fawn-option" data-action="settings" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:0; display:flex; align-items:center; gap:8px; font-size:14px; transition:all 0.15s;">
            <i class="fa-solid fa-gear" style="width:16px; text-align:center;"></i>
            <span>Settings</span>
        </div>
    `;

    // Вставляем кнопку
    container.insertBefore(btn, container.firstChild);
    
    // Добавляем меню в body для корректного позиционирования
    document.body.appendChild(menu);

    // Функция для обновления позиции меню
    const updateMenuPosition = () => {
        const btnRect = btn.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        
        let left = btnRect.left;
        let bottom = window.innerHeight - btnRect.top + 8;
        
        // Проверяем, чтобы меню не выходило за правый край
        if (left + menuRect.width > window.innerWidth - 10) {
            left = window.innerWidth - menuRect.width - 10;
        }
        
        // Проверяем, чтобы меню не выходило за левый край
        if (left < 10) {
            left = 10;
        }
        
        menu.style.left = left + "px";
        menu.style.bottom = bottom + "px";
    };

    // Обработчик клика по кнопке
    btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        updateMenuState();
        
        // Позиционируем меню
        updateMenuPosition();
        
        // Показываем/скрываем меню
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
            } else if (action === "lastooc") {
                showLastOOC();
            } else {
                drivePlot(action);
            }
        });

        opt.addEventListener("mouseenter", function() {
            this.style.background = "var(--SmartThemeQuoteColor)";
            this.style.color = "var(--SmartThemeBlurTintColor)";
        });
        
        opt.addEventListener("mouseleave", function() {
            this.style.background = "";
            this.style.color = this.dataset.action === "lastooc" ? 
                "var(--SmartThemeQuoteColor)" : "var(--SmartThemeBodyColor)";
        });
    });

    // Закрытие меню при клике вне
    document.addEventListener("click", function(e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

    // Обновление позиции при ресайзе и скролле
    window.addEventListener("resize", function() {
        if (menu.style.display === "block") {
            updateMenuPosition();
        }
    });
    
    window.addEventListener("scroll", function() {
        if (menu.style.display === "block") {
            updateMenuPosition();
        }
    });

    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, clearPlotPrompt);
eventSource.on(event_types.MESSAGE_SWIPED, clearPlotPrompt);

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    
    // Создаем кнопку при загрузке
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
    }, 500);
    
    // Запасной таймер
    setTimeout(() => {
        if (!document.getElementById("fawn-plot-btn")) {
            addFawnMenu();
        }
    }, 2000);
});
