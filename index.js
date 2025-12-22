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
let lastGeneratedOOC = null; // 🩰 СОХРАНЯЕМ ПОСЛЕДНИЙ OOC

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

    // 🩰 После применения очищаем сохранённый OOC
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
        if (lastGeneratedOOC) {
            lastOocOption.style.display = "block";
        } else {
            lastOocOption.style.display = "none";
        }
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
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:25px; z-index:99999; width:500px; max-width:90%; max-height:80vh; overflow-y:auto;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:20px; text-align:center; margin-bottom:20px;">
                ⚙️ Настройки Fawn's Plot Driver
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeQuoteColor); display:block; margin-bottom:8px;">🩰 Промпт для Time Skip:</label>
                <textarea id="fawn-set-timeskip" style="width:100%; height:80px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${s.timeskipPrompt}</textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeQuoteColor); display:block; margin-bottom:8px;">🥀 Промпт для Plot Twist:</label>
                <textarea id="fawn-set-twist" style="width:100%; height:80px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${s.twistPrompt}</textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeQuoteColor); display:block; margin-bottom:8px;">📜 Сколько сообщений: <span id="fawn-msg-count-label">${s.messageCount}</span></label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="width:100%; accent-color:var(--SmartThemeQuoteColor);">
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-set-save" class="menu_button">💾 Сохранить</button>
                <button id="fawn-set-reset" class="menu_button">🔄 Сбросить</button>
                <button id="fawn-set-close" class="menu_button">✖ Закрыть</button>
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
        toastr.success("Настройки сохранены! ✨");
        closePopup();
    });

    document.getElementById("fawn-set-reset").addEventListener("click", function() {
        document.getElementById("fawn-set-timeskip").value = defaultSettings.timeskipPrompt;
        document.getElementById("fawn-set-twist").value = defaultSettings.twistPrompt;
        document.getElementById("fawn-set-msgcount").value = defaultSettings.messageCount;
        document.getElementById("fawn-msg-count-label").textContent = defaultSettings.messageCount;
        toastr.info("Сброшено! ✨");
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ПЕРЕПИСАННОЕ ПРЕВЬЮ - ТОЛЬКО OOC ==========
function showOOCPreview(text, type) {
    closePopup();

    const title = type === 'timeskip' ? '🩰 Time Skip OOC' : '🥀 Plot Twist OOC';

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeQuoteColor); border-radius:15px; padding:20px; z-index:99999; width:520px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:20px; text-align:center; margin-bottom:12px; font-weight:bold;">
                ${title}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:18px; opacity:0.9; font-size:14px;">
                Сгенерировано нейронкой. Отредактируй если нужно:
            </div>
            <div style="background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeQuoteColor); border-radius:10px; padding:15px; margin-bottom:15px; min-height:120px;">
                <textarea id="fawn-ooc-text" style="width:100%; height:100px; background:transparent; border:none; color:var(--SmartThemeQuoteColor); font-family:monospace; font-size:14px; resize:vertical; outline:none;">${text}</textarea>
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:10px;">
                <button id="fawn-apply-ooc" class="menu_button" style="background:var(--SmartThemeQuoteColor); color:white; padding:12px 20px; font-size:16px;">✅ ПРИМЕНИТЬ OOC</button>
                <button id="fawn-regen-ooc" class="menu_button" style="padding:12px 20px;">🔄 Новая генерация</button>
                <button id="fawn-cancel" class="menu_button">❌ Отмена</button>
            </div>
            <div style="font-size:12px; color:var(--SmartThemeBodyColor); opacity:0.7; text-align:center;">
                Применит как системную инструкцию боту
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-ooc").addEventListener("click", function() {
        const finalOOC = document.getElementById("fawn-ooc-text").value.trim();
        if (finalOOC) {
            addPlotPrompt(finalOOC);
            closePopup();
            toastr.success(`OOC ${type === 'timeskip' ? 'Time Skip' : 'Plot Twist'} применен! Отправь сообщение боту 🩰✨`);
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

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center;">${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}</div>
            <textarea id="fawn-manual-ooc" style="width:100%; height:100px; margin:15px 0; padding:12px; border:2px solid var(--SmartThemeBorderColor); border-radius:8px; background:var(--SmartThemeBlurTintColor); color:var(--SmartThemeBodyColor); resize:vertical;">${defaultOOC}</textarea>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="fawn-apply-manual" class="menu_button" style="background:var(--SmartThemeQuoteColor);">✅ Применить OOC</button>
                <button id="fawn-regen" class="menu_button">🔄 Попробовать снова</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-apply-manual").addEventListener("click", function() {
        const oocText = document.getElementById("fawn-manual-ooc").value.trim();
        if (oocText) {
            addPlotPrompt(oocText);
            closePopup();
            toastr.success("OOC применен вручную! 🩰");
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
        toastr.info("Подожди, генерируется! 💕");
        return;
    }

    console.log('Fawn Plot Driver: Generating OOC...');
    isGenerating = true;
    lastType = type;

    const button = document.getElementById("fawn-plot-btn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-pen-nib fa-spin"></i>';
    }

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        if (!context?.chat?.length) {
            toastr.warning("Начни чат сначала! 💕");
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
            // 🩰 СОХРАНЯЕМ OOC НА СЛУЧАЙ МИСКЛИКА
            lastGeneratedOOC = { text: oocText, type: type };
            updateMenuState();
            showOOCPreview(oocText, type);
        } else {
            toastr.warning("OOC не сгенерировался 😅");
            showManualOOC(type);
        }

    } catch (error) {
        console.error(' Fawn: Error:', error);
        toastr.error("Ошибка генерации OOC");
        showManualOOC(type);
    } finally {
        isGenerating = false;
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
    }
}

// ========== ПОКАЗАТЬ ПОСЛЕДНИЙ OOC ==========
function showLastOOC() {
    if (lastGeneratedOOC) {
        showOOCPreview(lastGeneratedOOC.text, lastGeneratedOOC.type);
    } else {
        toastr.info("Нет сохранённого OOC! Сгенерируй новый 💕");
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

    // 🥀 УМНАЯ ОБРЕЗКА: если текст слишком длинный, обрезаем по последней точке/скобке
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

// ========== ИСПРАВЛЕННАЯ КНОПКА ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm") ||
                     document.getElementById("form_sheld") ||
                     document.querySelector("#send_form");

    if (!container) return false;

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.style.cssText = "cursor:pointer; padding:10px; color:var(--SmartThemeQuoteColor); font-size:18px; position:relative; z-index:1000;";

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = "display:none; position:absolute; bottom:40px; left:0; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:4px; z-index:1001; min-width:120px;";
    menu.innerHTML = `
        <div class="fawn-option" data-action="timeskip" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor);">🩰 Time Skip</div>
        <div class="fawn-option" data-action="twist" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor);">🥀 Plot Twist</div>
        <div id="fawn-last-ooc-option" class="fawn-option" data-action="lastooc" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeQuoteColor); display:none;">✨ Последний OOC</div>
        <hr style="border:none; border-top:1px solid var(--SmartThemeBorderColor); margin:5px 0;">
        <div class="fawn-option" data-action="settings" style="padding:8px 12px; cursor:pointer; color:var(--SmartThemeBodyColor); opacity:0.7;">⚙️ Настройки</div>
    `;

    btn.appendChild(menu);
    container.insertBefore(btn, container.firstChild);

    btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        updateMenuState(); // 🩰 Обновляем видимость кнопки "Последний OOC"
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

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
            this.style.color = "white";
        });
        opt.addEventListener("mouseleave", function() {
            this.style.background = "";
            this.style.color = this.dataset.action === "lastooc" ? "var(--SmartThemeQuoteColor)" : "var(--SmartThemeBodyColor)";
        });
    });

    const globalClickHandler = function(e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    };

    document.removeEventListener("click", globalClickHandler);
    setTimeout(() => {
        document.addEventListener("click", globalClickHandler);
    }, 100);

    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, clearPlotPrompt);
eventSource.on(event_types.MESSAGE_SWIPED, clearPlotPrompt);

// 🔥 ЗАЩИТА КНОПКИ
setInterval(() => {
    if (!document.getElementById('fawn-plot-btn')) {
        addFawnMenu();
    }
}, 2000);

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    const interval = setInterval(() => {
        if (addFawnMenu()) clearInterval(interval);
    }, 100);
});
