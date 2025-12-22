import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect. Analyze the story and provide a logical time-skip. Format: (OOC: [transition description])",
    twistPrompt: "You are a genius narrative stylist. Introduce a significant plot twist. Format: (OOC: [twist description])"
};

// Загрузка настроек
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = defaultSettings;
}

async function drivePlot(type) {
    const icon = document.querySelector('#fawn-plot-driver-menu i');
    if (icon) {
        icon.classList.remove('fa-star');
        icon.classList.add('fa-pen-nib', 'fawn-writing');
    }

    const context = getContext();
    const chatHistory = context.chat.slice(-20).map(m => `${m.character}: ${m.mes}`).join('\n');
    const instruction = type === 'timeskip' ? extension_settings[extensionName].timeskipPrompt : extension_settings[extensionName].twistPrompt;

    const finalPrompt = `[System Note: You are Fawn, the silent architect. Direct the scene elegantly.]\n\nStory Context:\n${chatHistory}\n\nTask: ${instruction}\n\nWrite ONLY the OOC message.`;

    try {
        const response = await generateQuietPrompt(finalPrompt);
        if (response) {
            const textarea = document.getElementById('send_textarea');
            textarea.value = response;
            textarea.dispatchEvent(new Event('input'));
        }
    } catch (error) {
        console.error("Fawn's Plot Driver Error:", error);
    } finally {
        if (icon) {
            icon.classList.remove('fa-pen-nib', 'fawn-writing');
            icon.classList.add('fa-star');
        }
    }
}

// Функция вставки кнопки через стандартный jQuery Таверны
function addFawnButton() {
    if ($("#fawn-plot-driver-menu").length) return;

    const menuHtml = `
        <div id="fawn-plot-driver-menu" class="list_item" title="Fawn's Plot Driver">
            <i class="fa-solid fa-star" style="color:#ffb7c5;"></i>
            <div class="list_item_text">Fawn's Plot Driver</div>
            <div id="plot-driver-options" style="display:none; position:absolute; left: 220px; top: 0; background:rgba(25,25,25,0.98); border:1px solid #ffb7c5; border-radius:12px; padding:8px; z-index:9999; min-width:180px; box-shadow: 0 4px 15px rgba(255,183,197,0.4);">
                <div class="plot-item-fawn" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff;">🩰 Gentle Time Skip</div>
                <div class="plot-item-fawn" data-type="twist" style="padding:10px; cursor:pointer; color:#fff;">🥀 Dramatic Twist</div>
            </div>
        </div>
    `;

    // Вставляем В НАЧАЛО списка расширений
    $("#extensionsMenu").prepend(menuHtml);

    // Обработчики
    $("#fawn-plot-driver-menu").on("click", function(e) {
        e.stopPropagation();
        $("#plot-driver-options").toggle();
    });

    $(".plot-item-fawn").on("click", function(e) {
        e.stopPropagation();
        drivePlot($(this).data("type"));
        $("#plot-driver-options").hide();
    });
}

// Ждем полной загрузки документа и интерфейса
$(document).on('ready', function() {
    setTimeout(addFawnButton, 1000);
});

// На всякий случай запускаем проверку каждые пару секунд, если меню еще не создано
const retryInterval = setInterval(() => {
    if ($("#extensionsMenu").length) {
        addFawnButton();
        if ($("#fawn-plot-driver-menu").length) clearInterval(retryInterval);
    }
}, 2000);
