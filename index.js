import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Analyze the story and provide a logical time-skip that moves the narrative forward elegantly.",
    twistPrompt: "You are a genius narrative stylist. Introduce a dramatic and unexpected plot twist that enriches the story."
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = defaultSettings;
}

let lastType = null;
let isGenerating = false;

// ========== ЗАКРЫТЬ POPUP ==========
function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) popup.remove();
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
    console.log("=== Fawn: Старт! Тип:", type, "===");

    if (isGenerating) {
        console.log("Fawn: Уже генерирую, выхожу");
        return;
    }

    isGenerating = true;
    lastType = type;

    const button = document.getElementById("fawn-plot-btn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-pen-nib fa-spin"></i>';
    }

    try {
        const context = getContext();

        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Начни чат сначала! 💕");
            return;
        }

        const chatHistory = context.chat.slice(-15).map(m =>
            `${m.name || 'User'}: ${m.mes}`
        ).join('\n');

        const instruction = type === 'timeskip'
            ? extension_settings[extensionName].timeskipPrompt
            : extension_settings[extensionName].twistPrompt;

        const finalPrompt = `${instruction}

Recent story:
${chatHistory}

Write ONLY the OOC direction. 2-3 sentences. No thinking, no explanations.`;

        console.log("Fawn: Отправляю запрос...");

        const response = await generateQuietPrompt(finalPrompt);

        // ===== ОТЛАДКА =====
        console.log("Fawn: === ОТВЕТ ===");
        console.log("Fawn: typeof =", typeof response);
        console.log("Fawn: value =", response);
        console.log("Fawn: JSON =", JSON.stringify(response));
        console.log("Fawn: =============");
        // ===================

        // Проверяем разные варианты ответа
        let text = "";

        if (typeof response === "string") {
            text = response;
        } else if (response && typeof response === "object") {
            // Может это объект с полем text, message, content и т.д.
            text = response.text || response.message || response.content || response.mes || "";
        }

        // Чистим от think тегов
        text = text
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<think>[\s\S]*/gi, '')
            .replace(/<\/think>/gi, '')
            .trim();

        console.log("Fawn: Очищенный текст:", text);

        if (text) {
            showPreviewPopup(text, type);
        } else {
            toastr.warning("Пустой ответ, попробуй ещё раз! 🔄");
        }

    } catch (error) {
        console.error("Fawn ОШИБКА:", error);
        toastr.error("Ошибка: " + error.message);
    } finally {
        isGenerating = false;
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
        console.log("Fawn: Готов!");
    }
}

// ========== КНОПКА — НЕ ТРОГАЕМ! ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) {
        return false;
    }

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
        <div class="fawn-option" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff;">🩰 Time Skip</div>
        <div class="fawn-option" data-type="twist" style="padding:10px; cursor:pointer; color:#fff;">🥀 Plot Twist</div>
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
            drivePlot(opt.dataset.type);
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

    console.log("🩰 Fawn's Plot Driver готов!");
    return true;
}

// ========== ЗАПУСК ==========
jQuery(() => {
    const tryAdd = setInterval(() => {
        if (addFawnMenu()) {
            clearInterval(tryAdd);
        }
    }, 1000);
});
