import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Analyze the story and provide a logical time-skip that moves the narrative forward elegantly.",
    twistPrompt: "You are a genius narrative stylist. Introduce a dramatic and unexpected plot twist that enriches the story."
};

// Загружаем настройки
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = defaultSettings;
}

// Главная функция — делает магию! ✨
async function drivePlot(type) {
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

        const finalPrompt = `${instruction}\n\nRecent story:\n${chatHistory}\n\nWrite a brief, elegant OOC direction for the next scene:`;

        const response = await generateQuietPrompt(finalPrompt);

        if (response) {
            const textarea = document.getElementById('send_textarea');
            textarea.value = response;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            toastr.success("Готово! 🩰");
        }
    } catch (error) {
        console.error("Fawn Error:", error);
        toastr.error("Ой, что-то пошло не так: " + error.message);
    } finally {
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
    }
}

// Создаём меню
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) return;

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) {
        console.log("Fawn: Жду интерфейс...");
        return false;
    }

    // Кнопка
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

    // Меню
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

    // Клики
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

    // Закрыть при клике снаружи
    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    console.log("🩰 Fawn's Plot Driver готов!");
    return true;
}

// Запуск
jQuery(() => {
    const tryAdd = setInterval(() => {
        if (addFawnMenu()) {
            clearInterval(tryAdd);
        }
    }, 1000);
});
