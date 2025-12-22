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
    } catch (e) {}
}

// ========== ЗАКРЫТЬ POPUP ==========
function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) popup.remove();
}

// ========== ДОБАВИТЬ OOC ПРОМПТ (как в рабочем примере!) ==========
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

    document.getElementById("fawn-set-msgcount").addEventListener("input", (e) => {
        document.getElementById("fawn-msg-count-label").textContent = e.target.value;
    });

    document.getElementById("fawn-set-save").addEventListener("click", () => {
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        saveSettings();
        toastr.success("Настройки сохранены! ✨");
        closePopup();
    });

    document.getElementById("fawn-set-reset").addEventListener("click", () => {
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

    // Вставить в поле ввода
    document.getElementById("fawn-ok").addEventListener("click", () => {
        const finalText = document.getElementById("fawn-preview-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        closePopup();
        toastr.success("Вставлено! 🩰");
    });

    // Отправить как скрытый OOC (как в рабочем примере!)
    document.getElementById("fawn-ooc").addEventListener("click", () => {
        const finalText = document.getElementById("fawn-preview-text").value;
        addPlotPrompt(finalText);
        closePopup();
        toastr.success("OOC добавлен! Теперь отправь сообщение боту ✨");
    });

    // Перегенерировать
    document.getElementById("fawn-redo").addEventListener("click", () => {
        closePopup();
        setTimeout(() => drivePlot(lastType), 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    console.log("🩰 Fawn: drivePlot вызван, тип:", type);

    lastType = type;

    const button = document.getElementById("fawn-plot-btn");
    if (button) button.innerHTML = '<i class="fa-solid fa-pen-nib fa-spin"></i>';

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Начни чат сначала! 💕");
            return;
        }

        const chatHistory = context.chat.slice(-msgCount).map(m =>
            `${m.name || 'User'}: ${m.mes}`
        ).join('\n');

        const instruction = type === 'timeskip'
            ? extension_settings[extensionName].timeskipPrompt
            : extension_settings[extensionName].twistPrompt;

        const finalPrompt = `${instruction}

Recent story (last ${msgCount} messages):
${chatHistory}

IMPORTANT: Write ONLY the scene direction. 2-3 sentences. No <think> tags, no explanations.`;

        console.log("🩰 Fawn: Отправляю запрос...");

        const response = await generateQuietPrompt(finalPrompt, false, false);

        console.log("🩰 Fawn: Ответ получен:", response);

        let text = "";

        // Обработка разных типов ответа
        if (typeof response === "string") {
            text = response;
        } else if (response && typeof response === "object") {
            text = response.text || response.message || response.content || response.mes || "";
            if (!text && response.toString) {
                text = response.toString();
            }
        }

        // Чистим от think тегов
        text = text
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/<\/think>/gi, '')
            .replace(/\[object Object\]/gi, '')
            .trim();

        console.log("🩰 Fawn: Очищенный текст:", text);

        if (text && text.length > 5) {
            showPreviewPopup(text, type);
        } else {
            // Если ответ пустой — предлагаем ввести вручную
            showManualInputPopup(type);
        }

    } catch (error) {
        console.error("🩰 Fawn Error:", error);
        toastr.error("Ошибка: " + error.message);
        showManualInputPopup(type);
    } finally {
        // ВСЕГДА возвращаем кнопку!
        if (button) button.innerHTML = '<i class="fa-solid fa-star"></i>';
    }
}

// ========== РУЧНОЙ ВВОД (если генерация не работает) ==========
function showManualInputPopup(type) {
    closePopup();

    const defaultText = type === 'timeskip'
        ? "(OOC: Time passes... [опиши что происходит за это время])"
        : "(OOC: Suddenly... [опиши неожиданный поворот])";

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center; margin-bottom:10px;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:15px; opacity:0.7;">
                Генерация не сработала 😅<br>Напиши сам или попробуй ещё раз!
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

    document.getElementById("fawn-ok").addEventListener("click", () => {
        const finalText = document.getElementById("fawn-preview-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        closePopup();
    });

    document.getElementById("fawn-ooc").addEventListener("click", () => {
        const finalText = document.getElementById("fawn-preview-text").value;
        addPlotPrompt(finalText);
        closePopup();
        toastr.success("OOC добавлен! ✨");
    });

    document.getElementById("fawn-redo").addEventListener("click", () => {
        closePopup();
        setTimeout(() => drivePlot(lastType), 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== КНОПКА ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) return false;

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.style.cssText = `
        cursor: pointer;
        padding: 10px;
        color: var(--SmartThemeQuoteColor);
        font-size: 18px;
        position: relative;
    `;

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = `
        display: none;
        position: absolute;
        bottom: 40px;
        left: 0;
        background: var(--SmartThemeBlurTintColor);
        border: 1px solid var(--SmartThemeBorderColor);
        border-radius: 8px;
        padding: 4px;
        z-index: 9999;
        min-width: 120px;
        font-size: 14px;
    `;
    menu.innerHTML = `
        <div class="fawn-option" data-action="timeskip" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px;">🩰 Time Skip</div>
        <div class="fawn-option" data-action="twist" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px;">🥀 Plot Twist</div>
        <div style="border-top:1px solid var(--SmartThemeBorderColor); margin:3px 0;"></div>
        <div class="fawn-option" data-action="settings" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); opacity:0.7; border-radius:4px;">⚙️ Настройки</div>
    `;

    btn.appendChild(menu);
    container.insertBefore(btn, container.firstChild);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    });

    menu.querySelectorAll(".fawn-option").forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.style.display = "none";
            const action = opt.dataset.action;
            if (action === "settings") {
                showSettingsPopup();
            } else {
                drivePlot(action);
            }
        });

        opt.addEventListener("mouseenter", () => {
            opt.style.background = "var(--SmartThemeQuoteColor)";
            opt.style.opacity = "0.8";
        });
        opt.addEventListener("mouseleave", () => {
            opt.style.background = "transparent";
            opt.style.opacity = "1";
        });
    });

    document.addEventListener("click", () => menu.style.display = "none");

    console.log("🩰 Fawn: Готов!");
    return true;
}

// ========== ОЧИСТКА OOC ПОСЛЕ ОТВЕТА БОТА ==========
eventSource.on(event_types.MESSAGE_RECEIVED, () => {
    clearPlotPrompt();
});

eventSource.on(event_types.MESSAGE_SWIPED, () => {
    clearPlotPrompt();
});

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    const tryAdd = setInterval(() => {
        if (addFawnMenu()) clearInterval(tryAdd);
    }, 1000);
});

console.log("🩰 Fawn: Файл загружен!");
