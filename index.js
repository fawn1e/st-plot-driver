console.log("🩰 Fawn: Загрузка...");

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
    } catch (e) {
        console.log("🩰 Fawn: Используем дефолтные настройки");
    }
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

    console.log("🩰 Fawn: OOC промпт добавлен!");
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
    console.log("🩰 Fawn: OOC промпт очищен");
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

// ========== ОКОШКО ПРЕВЬЮ ==========
function showPreviewPopup(text, type) {
    closePopup();

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center; margin-bottom:10px;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:15px; opacity:0.7;">Как тебе такое? ✨</div>
            <textarea id="fawn-preview-text" style="width:100%; height:120px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${text}</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-ok" class="menu_button">💕 Вставить в чат</button>
                <button id="fawn-ooc" class="menu_button">📝 Отправить как OOC</button>
                <button id="fawn-redo" class="menu_button">🔄 Ещё раз</button>
                <button id="fawn-no" class="menu_button">✖ Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-ok").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        closePopup();
        toastr.success("Вставлено! 🩰");
    });

    document.getElementById("fawn-ooc").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        addPlotPrompt(finalText);
        closePopup();
        toastr.success("OOC добавлен! Теперь отправь сообщение боту ✨");
    });

    document.getElementById("fawn-redo").addEventListener("click", function() {
        closePopup();
        setTimeout(function() { drivePlot(lastType); }, 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== РУЧНОЙ ВВОД ==========
function showManualInputPopup(type) {
    closePopup();

    const defaultText = type === 'timeskip'
        ? "(OOC: Time passes... [опиши что происходит])"
        : "(OOC: Suddenly... [опиши поворот сюжета])";

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center; margin-bottom:10px;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:15px; opacity:0.7;">
                Автогенерация не сработала 😅<br>Напиши сам или попробуй ещё раз!
            </div>
            <textarea id="fawn-preview-text" style="width:100%; height:120px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${defaultText}</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-ok" class="menu_button">💕 Вставить</button>
                <button id="fawn-ooc" class="menu_button">📝 Как OOC</button>
                <button id="fawn-redo" class="menu_button">🔄 Ещё раз</button>
                <button id="fawn-no" class="menu_button">✖ Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-ok").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        closePopup();
    });

    document.getElementById("fawn-ooc").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        addPlotPrompt(finalText);
        closePopup();
        toastr.success("OOC добавлен! ✨");
    });

    document.getElementById("fawn-redo").addEventListener("click", function() {
        closePopup();
        setTimeout(function() { drivePlot(lastType); }, 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    console.log("🩰 Fawn: === НАЧАЛО ===");
    console.log("🩰 Fawn: Тип:", type);

    lastType = type;

    const button = document.getElementById("fawn-plot-btn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-pen-nib fa-spin"></i>';
    }

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Начни чат сначала! 💕");
            return;
        }

        const chatHistory = context.chat.slice(-msgCount).map(function(m) {
            return (m.name || 'User') + ': ' + m.mes;
        }).join('\n');

        const instruction = type === 'timeskip'
            ? extension_settings[extensionName].timeskipPrompt
            : extension_settings[extensionName].twistPrompt;

        const finalPrompt = instruction + "\n\nRecent story (last " + msgCount + " messages):\n" + chatHistory + "\n\nWrite ONLY the OOC direction. 2-3 sentences.";

        console.log("🩰 Fawn: Отправляю запрос...");

        const response = await generateQuietPrompt(finalPrompt, false, false);

        // ========== ОТЛАДКА ==========
        console.log("🩰 Fawn: ====== ОТВЕТ ======");
        console.log("🩰 Fawn: typeof =", typeof response);
        console.log("🩰 Fawn: value =", response);

        if (typeof response === "object" && response !== null) {
            console.log("🩰 Fawn: keys =", Object.keys(response));
        }
        console.log("🩰 Fawn: ===================");
        // =============================

        let text = "";

        // Извлекаем текст из ответа
        if (typeof response === "string" && response.length > 0) {
            text = response;
            console.log("🩰 Fawn: Взял как строку");
        } else if (response && typeof response === "object") {
            // Формат Chat Completion API
            if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
                text = response.choices[0].message.content;
                console.log("🩰 Fawn: Взял из choices[0].message.content");
            } else if (response.content) {
                text = response.content;
                console.log("🩰 Fawn: Взял из response.content");
            } else if (response.message && response.message.content) {
                text = response.message.content;
                console.log("🩰 Fawn: Взял из response.message.content");
            } else if (response.text) {
                text = response.text;
                console.log("🩰 Fawn: Взял из response.text");
            } else if (response.mes) {
                text = response.mes;
                console.log("🩰 Fawn: Взял из response.mes");
            }
        }

        // Чистим от think тегов
        if (text) {
            text = text
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/<think>[\s\S]*/gi, '')
                .replace(/<\/think>/gi, '')
                .trim();
        }

        console.log("🩰 Fawn: Финальный текст:", text);
        console.log("🩰 Fawn: Длина:", text ? text.length : 0);

        if (text && text.length > 5) {
            console.log("🩰 Fawn: Показываю превью!");
            showPreviewPopup(text, type);
        } else {
            console.log("🩰 Fawn: Текст пустой, ручной ввод");
            showManualInputPopup(type);
        }

    } catch (error) {
        console.error("🩰 Fawn: ОШИБКА:", error);
        toastr.error("Ошибка: " + error.message);
        showManualInputPopup(type);
    } finally {
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
        console.log("🩰 Fawn: === КОНЕЦ ===");
    }
}

// ========== КНОПКА ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) {
        return true;
    }

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) {
        return false;
    }

    console.log("🩰 Fawn: Создаю кнопку...");

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.style.cssText = "cursor:pointer; padding:10px; color:var(--SmartThemeQuoteColor); font-size:18px; position:relative;";

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = "display:none; position:absolute; bottom:40px; left:0; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:4px; z-index:9999; min-width:120px; font-size:14px;";
    menu.innerHTML = '<div class="fawn-option" data-action="timeskip" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px;">🩰 Time Skip</div><div class="fawn-option" data-action="twist" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px;">🥀 Plot Twist</div><div style="border-top:1px solid var(--SmartThemeBorderColor); margin:3px 0;"></div><div class="fawn-option" data-action="settings" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); opacity:0.7; border-radius:4px;">⚙️ Настройки</div>';

    btn.appendChild(menu);
    container.insertBefore(btn, container.firstChild);

    btn.addEventListener("click", function(e) {
        e.stopPropagation();
        if (menu.style.display === "none") {
            menu.style.display = "block";
        } else {
            menu.style.display = "none";
        }
    });

    const options = menu.querySelectorAll(".fawn-option");
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];

        opt.addEventListener("click", function(e) {
            e.stopPropagation();
            menu.style.display = "none";
            const action = opt.getAttribute("data-action");
            if (action === "settings") {
                showSettingsPopup();
            } else {
                drivePlot(action);
            }
        });

        opt.addEventListener("mouseenter", function() {
            opt.style.background = "var(--SmartThemeQuoteColor)";
            opt.style.opacity = "0.8";
        });

        opt.addEventListener("mouseleave", function() {
            opt.style.background = "transparent";
            opt.style.opacity = "1";
        });
    }

    document.addEventListener("click", function() {
        menu.style.display = "none";
    });

    console.log("🩰 Fawn: Кнопка создана!");
    return true;
}

// ========== СОБЫТИЯ ==========
eventSource.on(event_types.MESSAGE_RECEIVED, function() {
    clearPlotPrompt();
});

eventSource.on(event_types.MESSAGE_SWIPED, function() {
    clearPlotPrompt();
});

// ========== ЗАПУСК ==========
jQuery(function() {
    console.log("🩰 Fawn: jQuery ready!");
    loadSettings();

    const tryAdd = setInterval(function() {
        if (addFawnMenu()) {
            clearInterval(tryAdd);
        }
    }, 1000);
});

console.log("🩰 Fawn: Файл загружен!");
