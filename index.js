import { extension_settings, getContext, saveSettingsDebounced } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";

const extensionName = "plot-driver-fawn";

const defaultSettings = {
    timeskipPrompt: `You are an elegant narrator. Create a smooth time-skip transition that moves the story forward naturally.
Write 2-3 sentences describing how time passes and what changes.
Example: "(OOC: A week passes. The autumn leaves have fallen, and a comfortable routine has settled between them.)"`,

    twistPrompt: `You are a master storyteller. Introduce an unexpected but logical plot twist that adds excitement to the story.
Write 2-3 sentences with a dramatic development.
Example: "(OOC: A mysterious letter arrives, revealing a secret from the past that changes everything.)"`
};

// Загрузка настроек
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}
const settings = extension_settings[extensionName];

// Переменная для хранения текущего типа (для перегенерации)
let currentType = null;

// ============ ГЛАВНАЯ ФУНКЦИЯ ============
async function drivePlot(type) {
    currentType = type;

    const button = document.getElementById("fawn-plot-btn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-pen-nib fa-spin"></i>';
    }

    try {
        const context = getContext();

        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Сначала начни чат! 💕");
            return;
        }

        const chatHistory = context.chat.slice(-15).map(m =>
            `${m.name || 'User'}: ${m.mes}`
        ).join('\n');

        const instruction = type === 'timeskip'
            ? settings.timeskipPrompt
            : settings.twistPrompt;

        const finalPrompt = `${instruction}

Current story context:
${chatHistory}

Respond with ONLY the creative direction. No thinking tags, no explanations. Just the scene direction itself.`;

        const response = await generateQuietPrompt(finalPrompt, false, false);

        if (response) {
            // Чистим от <think> тегов
            let cleanResponse = response
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .trim();

            if (!cleanResponse) cleanResponse = response;

            // Показываем окошко превью!
            showPreviewPopup(cleanResponse, type);
        }
    } catch (error) {
        console.error("Fawn Error:", error);
        toastr.error("Ой, ошибка: " + error.message);
    } finally {
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
    }
}

// ============ ОКОШКО ПРЕВЬЮ ============
function showPreviewPopup(text, type) {
    // Удаляем старое окно если есть
    const oldPopup = document.getElementById("fawn-preview-popup");
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement("div");
    popup.id = "fawn-preview-popup";
    popup.innerHTML = `
        <div class="fawn-popup-overlay"></div>
        <div class="fawn-popup-box">
            <div class="fawn-popup-header">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div class="fawn-popup-question">Как тебе такое? ✨</div>
            <textarea class="fawn-popup-text" id="fawn-result-text">${text}</textarea>
            <div class="fawn-popup-buttons">
                <button id="fawn-btn-accept" class="fawn-btn fawn-btn-yes">
                    💕 Отлично, вставить!
                </button>
                <button id="fawn-btn-regen" class="fawn-btn fawn-btn-regen">
                    🔄 Перегенерировать
                </button>
                <button id="fawn-btn-cancel" class="fawn-btn fawn-btn-no">
                    ✖ Отмена
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Кнопка "Вставить"
    document.getElementById("fawn-btn-accept").addEventListener("click", () => {
        const finalText = document.getElementById("fawn-result-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        popup.remove();
        toastr.success("Вставлено! 🩰");
    });

    // Кнопка "Перегенерировать"
    document.getElementById("fawn-btn-regen").addEventListener("click", () => {
        popup.remove();
        drivePlot(currentType);
    });

    // Кнопка "Отмена"
    document.getElementById("fawn-btn-cancel").addEventListener("click", () => {
        popup.remove();
    });

    // Клик по overlay тоже закрывает
    popup.querySelector(".fawn-popup-overlay").addEventListener("click", () => {
        popup.remove();
    });
}

// ============ ПАНЕЛЬ НАСТРОЕК ============
function createSettingsPanel() {
    const settingsHtml = `
        <div id="fawn-settings" class="fawn-settings-panel">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>🩰 Fawn's Plot Driver</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="fawn-setting-item">
                        <label>🩰 Time Skip промпт:</label>
                        <textarea id="fawn-timeskip-prompt" class="text_pole" rows="4">${settings.timeskipPrompt}</textarea>
                    </div>
                    <div class="fawn-setting-item">
                        <label>🥀 Plot Twist промпт:</label>
                        <textarea id="fawn-twist-prompt" class="text_pole" rows="4">${settings.twistPrompt}</textarea>
                    </div>
                    <div class="fawn-setting-item">
                        <button id="fawn-reset-defaults" class="menu_button">
                            🔄 Сбросить на дефолт
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Вставляем в настройки extensions
    $("#extensions_settings").append(settingsHtml);

    // Сохранение при изменении
    $("#fawn-timeskip-prompt").on("input", function() {
        settings.timeskipPrompt = $(this).val();
        saveSettingsDebounced();
    });

    $("#fawn-twist-prompt").on("input", function() {
        settings.twistPrompt = $(this).val();
        saveSettingsDebounced();
    });

    // Кнопка сброса
    $("#fawn-reset-defaults").on("click", function() {
        settings.timeskipPrompt = defaultSettings.timeskipPrompt;
        settings.twistPrompt = defaultSettings.twistPrompt;
        $("#fawn-timeskip-prompt").val(settings.timeskipPrompt);
        $("#fawn-twist-prompt").val(settings.twistPrompt);
        saveSettingsDebounced();
        toastr.success("Промпты сброшены! ✨");
    });
}

// ============ КНОПКА В ИНТЕРФЕЙСЕ ============
function addFawnButton() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) return false;

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.className = "fawn-main-btn";

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.className = "fawn-dropdown";
    menu.innerHTML = `
        <div class="fawn-option" data-type="timeskip">🩰 Time Skip</div>
        <div class="fawn-option" data-type="twist">🥀 Plot Twist</div>
    `;

    btn.appendChild(menu);
    container.insertBefore(btn, container.firstChild);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("show");
    });

    menu.querySelectorAll(".fawn-option").forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.remove("show");
            drivePlot(opt.dataset.type);
        });
    });

    document.addEventListener("click", () => {
        menu.classList.remove("show");
    });

    console.log("🩰 Fawn's Plot Driver готов!");
    return true;
}

// ============ ЗАПУСК ============
jQuery(async () => {
    // Добавляем стили
    addStyles();

    // Создаём панель настроек
    createSettingsPanel();

    // Ждём и добавляем кнопку
    const tryAdd = setInterval(() => {
        if (addFawnButton()) {
            clearInterval(tryAdd);
        }
    }, 1000);
});

// ============ СТИЛИ ============
function addStyles() {
    const css = `
        /* Главная кнопка */
        .fawn-main-btn {
            cursor: pointer;
            padding: 10px;
            color: #ffb7c5;
            font-size: 18px;
            position: relative;
            transition: all 0.3s ease;
        }
        .fawn-main-btn:hover {
            color: #ff8fa3;
            transform: scale(1.1);
        }

        /* Выпадающее меню */
        .fawn-dropdown {
            display: none;
            position: absolute;
            bottom: 45px;
            left: 0;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #ffb7c5;
            border-radius: 12px;
            padding: 8px;
            z-index: 9999;
            min-width: 160px;
            box-shadow: 0 8px 25px rgba(255, 183, 197, 0.3);
        }
        .fawn-dropdown.show {
            display: block;
            animation: fawnFadeIn 0.2s ease;
        }
        .fawn-option {
            padding: 12px 15px;
            cursor: pointer;
            color: #fff;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .fawn-option:hover {
            background: rgba(255, 183, 197, 0.2);
            transform: translateX(5px);
        }

        /* Popup превью */
        .fawn-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99998;
        }
        .fawn-popup-box {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
            border: 2px solid #ffb7c5;
            border-radius: 20px;
            padding: 25px;
            z-index: 99999;
            min-width: 400px;
            max-width: 600px;
            box-shadow: 0 15px 50px rgba(255, 183, 197, 0.4);
            animation: fawnFadeIn 0.3s ease;
        }
        .fawn-popup-header {
            font-size: 20px;
            color: #ffb7c5;
            margin-bottom: 10px;
            text-align: center;
        }
        .fawn-popup-question {
            color: #ccc;
            text-align: center;
            margin-bottom: 15px;
        }
        .fawn-popup-text {
            width: 100%;
            min-height: 120px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 10px;
            padding: 15px;
            color: #fff;
            font-size: 14px;
            resize: vertical;
            margin-bottom: 20px;
        }
        .fawn-popup-text:focus {
            border-color: #ffb7c5;
            outline: none;
        }
        .fawn-popup-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .fawn-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        .fawn-btn-yes {
            background: linear-gradient(135deg, #ffb7c5 0%, #ff8fa3 100%);
            color: #1a1a1a;
            font-weight: bold;
        }
        .fawn-btn-yes:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 20px rgba(255, 183, 197, 0.5);
        }
        .fawn-btn-regen {
            background: #3a3a3a;
            color: #fff;
            border: 1px solid #555;
        }
        .fawn-btn-regen:hover {
            background: #4a4a4a;
        }
        .fawn-btn-no {
            background: #2a2a2a;
            color: #888;
        }
        .fawn-btn-no:hover {
            color: #fff;
        }

        /* Панель настроек */
        .fawn-settings-panel {
            margin-top: 10px;
        }
        .fawn-setting-item {
            margin: 15px 0;
        }
        .fawn-setting-item label {
            display: block;
            color: #ffb7c5;
            margin-bottom: 5px;
        }

        /* Анимация */
        @keyframes fawnFadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
}
