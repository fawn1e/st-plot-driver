console.log("🩰 Fawn: Загрузка...");

import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Analyze the story and provide a logical time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
    twistPrompt: "You are a genius narrative stylist. Introduce a dramatic and unexpected plot twist that enriches the story. Write 2-3 sentences as OOC direction.",
    messageCount: 15
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

let lastType = null;
let isGenerating = false;

// ========== СОХРАНИТЬ НАСТРОЙКИ ==========
function saveSettings() {
    localStorage.setItem('fawn_settings', JSON.stringify(extension_settings[extensionName]));
    console.log("🩰 Fawn: Настройки сохранены!");
}

// ========== ЗАГРУЗИТЬ НАСТРОЙКИ ==========
function loadSettings() {
    try {
        const saved = localStorage.getItem('fawn_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            extension_settings[extensionName] = { ...defaultSettings, ...parsed };
        }
    } catch (e) {
        console.log("🩰 Fawn: Используем дефолтные настройки");
    }
}

// ========== ЗАКРЫТЬ ЛЮБОЙ POPUP ==========
function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) popup.remove();
}

// ========== ОКНО НАСТРОЕК ==========
function showSettingsPopup() {
    closePopup();

    const s = extension_settings[extensionName];

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#1e1e1e; border:2px solid #ffb7c5; border-radius:15px; padding:25px; z-index:99999; width:500px; max-width:90%; max-height:80vh; overflow-y:auto;">
            <div style="color:#ffb7c5; font-size:20px; text-align:center; margin-bottom:20px;">
                ⚙️ Настройки Fawn's Plot Driver
            </div>

            <div style="margin-bottom:20px;">
                <label style="color:#ffb7c5; display:block; margin-bottom:8px;">🩰 Промпт для Time Skip:</label>
                <textarea id="fawn-set-timeskip" style="width:100%; height:80px; background:#111; border:1px solid #444; border-radius:8px; padding:10px; color:#fff; resize:vertical;">${s.timeskipPrompt}</textarea>
            </div>

            <div style="margin-bottom:20px;">
                <label style="color:#ffb7c5; display:block; margin-bottom:8px;">🥀 Промпт для Plot Twist:</label>
                <textarea id="fawn-set-twist" style="width:100%; height:80px; background:#111; border:1px solid #444; border-radius:8px; padding:10px; color:#fff; resize:vertical;">${s.twistPrompt}</textarea>
            </div>

            <div style="margin-bottom:20px;">
                <label style="color:#ffb7c5; display:block; margin-bottom:8px;">📜 Сколько сообщений учитывать: <span id="fawn-msg-count-label">${s.messageCount}</span></label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="width:100%; accent-color:#ffb7c5;">
            </div>

            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-set-save" style="padding:12px 25px; background:#ffb7c5; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">💾 Сохранить</button>
                <button id="fawn-set-reset" style="padding:12px 25px; background:#333; color:#fff; border:1px solid #555; border-radius:8px; cursor:pointer;">🔄 Сбросить</button>
                <button id="fawn-set-close" style="padding:12px 25px; background:#222; color:#888; border:none; border-radius:8px; cursor:pointer;">✖ Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Обновление label при движении слайдера
    document.getElementById("fawn-set-msgcount").addEventListener("input", (e) => {
        document.getElementById("fawn-msg-count-label").textContent = e.target.value;
    });

    // Сохранить
    document.getElementById("fawn-set-save").addEventListener("click", () => {
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        saveSettings();
        toastr.success("Настройки сохранены! 💕");
        closePopup();
    });

    // Сбросить
    document.getElementById("fawn-set-reset").addEventListener("click", () => {
        document.getElementById("fawn-set-timeskip").value = defaultSettings.timeskipPrompt;
        document.getElementById("fawn-set-twist").value = defaultSettings.twistPrompt;
        document.getElementById("fawn-set-msgcount").value = defaultSettings.messageCount;
        document.getElementById("fawn-msg-count-label").textContent = defaultSettings.messageCount;
        toastr.info("Сброшено на дефолт! ✨");
    });

    // Закрыть
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
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#1e1e1e; border:2px solid #ffb7c5; border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:#ffb7c5; font-size:18px; text-align:center; margin-bottom:10px;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:#aaa; text-align:center; margin-bottom:15px;">Как тебе такое? ✨</div>
            <textarea id="fawn-preview-text" style="width:100%; height:120px; background:#111; border:1px solid #444; border-radius:8px; padding:10px; color:#fff; resize:vertical;">${text}</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:center;">
                <button id="fawn-ok" style="padding:10px 20px; background:#ffb7c5; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">💕 Вставить!</button>
                <button id="fawn-redo" style="padding:10px 20px; background:#333; color:#fff; border:1px solid #555; border-radius:8px; cursor:pointer;">🔄 Ещё раз</button>
                <button id="fawn-no" style="padding:10px 20px; background:#222; color:#666; border:none; border-radius:8px; cursor:pointer;">✖ Отмена</button>
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
        toastr.success("Вставлено! 🩰");
    });

    document.getElementById("fawn-redo").addEventListener("click", () => {
        closePopup();
        setTimeout(() => drivePlot(lastType), 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========
async function drivePlot(type) {
    console.log("🩰 Fawn: drivePlot", type);

    if (isGenerating) return;
    isGenerating = true;
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

IMPORTANT: Write ONLY the OOC direction. No thinking, no explanations, no tags. Just 2-3 sentences of scene direction.`;

        console.log("🩰 Fawn: Генерирую...");

        // Пробуем получить ответ
        let response = await generateQuietPrompt(finalPrompt);

        console.log("🩰 Fawn: Raw response:", response);

        // Если ответ пустой — пробуем достать из DOM
        if (!response) {
            // Иногда ответ попадает в последнее сообщение чата
            const newContext = getContext();
            if (newContext.chat && newContext.chat.length > context.chat.length) {
                const lastMsg = newContext.chat[newContext.chat.length - 1];
                response = lastMsg.mes;
                console.log("🩰 Fawn: Взял из чата:", response);
            }
        }

        // Обрабатываем ответ
        let text = "";
        if (typeof response === "string") {
            text = response;
        } else if (response && typeof response === "object") {
            text = response.text || response.message || response.content || response.mes || "";
        }

        // Чистим
        text = text
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/<\/think>/gi, '')
            .trim();

        console.log("🩰 Fawn: Clean text:", text);

        if (text && text.length > 10) {
            showPreviewPopup(text, type);
        } else {
            toastr.warning("Не получилось, попробуй ещё раз! 🔄");
        }

    } catch (error) {
        console.error("🩰 Fawn Error:", error);
        toastr.error("Ошибка: " + error.message);
    } finally {
        isGenerating = false;
        if (button) button.innerHTML = '<i class="fa-solid fa-star"></i>';
    }
}

// ========== КНОПКА С ТРЕМЯ ОПЦИЯМИ ==========
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
        color: #ffb7c5;
        font-size: 18px;
        position: relative;
    `;

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = `
        display: none;
        position: absolute;
        bottom: 45px;
        left: 0;
        background: #1a1a1a;
        border: 2px solid #ffb7c5;
        border-radius: 12px;
        padding: 8px;
        z-index: 9999;
        min-width: 160px;
    `;
    menu.innerHTML = `
        <div class="fawn-option" data-action="timeskip" style="padding:10px; cursor:pointer; color:#fff;">🩰 Time Skip</div>
        <div class="fawn-option" data-action="twist" style="padding:10px; cursor:pointer; color:#fff;">🥀 Plot Twist</div>
        <div style="border-top:1px solid #444; margin:5px 0;"></div>
        <div class="fawn-option" data-action="settings" style="padding:10px; cursor:pointer; color:#aaa;">⚙️ Настройки</div>
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
            opt.style.background = "rgba(255,183,197,0.2)";
        });
        opt.addEventListener("mouseleave", () => {
            opt.style.background = "transparent";
        });
    });

    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    console.log("🩰 Fawn: Готов!");
    return true;
}

// ========== ЗАПУСК ==========
jQuery(() => {
    loadSettings();
    const tryAdd = setInterval(() => {
        if (addFawnMenu()) {
            clearInterval(tryAdd);
        }
    }, 1000);
});
