import { extension_settings, getContext, saveSettingsDebounced } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";

const extensionName = "plot-driver-fawn";

const defaultSettings = {
    timeskipPrompt: `You are an elegant narrator. Create a smooth time-skip transition that moves the story forward naturally. Write 2-3 sentences as OOC direction.`,
    twistPrompt: `You are a master storyteller. Introduce an unexpected but logical plot twist. Write 2-3 sentences as OOC direction.`
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}
const settings = extension_settings[extensionName];

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

Respond with ONLY the creative direction. No thinking tags, no explanations.`;

        const response = await generateQuietPrompt(finalPrompt, false, false);

        if (response) {
            let cleanResponse = response
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .trim();

            if (!cleanResponse) cleanResponse = response;

            showPreviewPopup(cleanResponse, type);
        }
    } catch (error) {
        console.error("Fawn Error:", error);
        toastr.error("Ошибка: " + error.message);
    } finally {
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
    }
}

// ============ ОКОШКО ПРЕВЬЮ ============
function showPreviewPopup(text, type) {
    const oldPopup = document.getElementById("fawn-preview-popup");
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement("div");
    popup.id = "fawn-preview-popup";
    popup.innerHTML = `
        <div id="fawn-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#1e1e1e; border:2px solid #ffb7c5; border-radius:20px; padding:25px; z-index:99999; min-width:400px; max-width:600px;">
            <div style="font-size:20px; color:#ffb7c5; margin-bottom:10px; text-align:center;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:#ccc; text-align:center; margin-bottom:15px;">Как тебе такое? ✨</div>
            <textarea id="fawn-result-text" style="width:100%; min-height:120px; background:#1a1a1a; border:1px solid #444; border-radius:10px; padding:15px; color:#fff; font-size:14px; resize:vertical; margin-bottom:20px;">${text}</textarea>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-btn-accept" style="padding:12px 20px; background:linear-gradient(135deg,#ffb7c5,#ff8fa3); color:#1a1a1a; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">💕 Вставить!</button>
                <button id="fawn-btn-regen" style="padding:12px 20px; background:#3a3a3a; color:#fff; border:1px solid #555; border-radius:10px; cursor:pointer;">🔄 Ещё раз</button>
                <button id="fawn-btn-cancel" style="padding:12px 20px; background:#2a2a2a; color:#888; border:none; border-radius:10px; cursor:pointer;">✖ Отмена</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    document.getElementById("fawn-btn-accept").addEventListener("click", () => {
        const finalText = document.getElementById("fawn-result-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        popup.remove();
        toastr.success("Вставлено! 🩰");
    });

    document.getElementById("fawn-btn-regen").addEventListener("click", () => {
        popup.remove();
        drivePlot(currentType);
    });

    document.getElementById("fawn-btn-cancel").addEventListener("click", () => {
        popup.remove();
    });

    document.getElementById("fawn-overlay").addEventListener("click", () => {
        popup.remove();
    });
}

// ============ ПАНЕЛЬ НАСТРОЕК ============
function createSettingsPanel() {
    const settingsHtml = `
        <div id="fawn-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>🩰 Fawn's Plot Driver</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div style="margin:15px 0;">
                        <label style="color:#ffb7c5;">🩰 Time Skip промпт:</label>
                        <textarea id="fawn-timeskip-prompt" class="text_pole" rows="3">${settings.timeskipPrompt}</textarea>
                    </div>
                    <div style="margin:15px 0;">
                        <label style="color:#ffb7c5;">🥀 Plot Twist промпт:</label>
                        <textarea id="fawn-twist-prompt" class="text_pole" rows="3">${settings.twistPrompt}</textarea>
                    </div>
                    <button id="fawn-reset-defaults" class="menu_button">🔄 Сбросить</button>
                </div>
            </div>
        </div>
    `;

    $("#extensions_settings").append(settingsHtml);

    $("#fawn-timeskip-prompt").on("input", function() {
        settings.timeskipPrompt = $(this).val();
        saveSettingsDebounced();
    });

    $("#fawn-twist-prompt").on("input", function() {
        settings.twistPrompt = $(this).val();
        saveSettingsDebounced();
    });

    $("#fawn-reset-defaults").on("click", function() {
        settings.timeskipPrompt = defaultSettings.timeskipPrompt;
        settings.twistPrompt = defaultSettings.twistPrompt;
        $("#fawn-timeskip-prompt").val(settings.timeskipPrompt);
        $("#fawn-twist-prompt").val(settings.twistPrompt);
        saveSettingsDebounced();
        toastr.success("Сброшено! ✨");
    });
}

// ============ КНОПКА — КАК БЫЛО! ============
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return true;

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) {
        console.log("Fawn: Жду интерфейс...");
        return false;
    }

    // Кнопка — точно как было!
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

    // Меню — точно как было!
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

// ============ ЗАПУСК ============
jQuery(() => {
    createSettingsPanel();

    const tryAdd = setInterval(() => {
        if (addFawnMenu()) {
            clearInterval(tryAdd);
        }
    }, 1000);
});
