import { extension_settings, getContext } from "../../../extensions.js";
import { callGenericChatCompletion } from "../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect with a sophisticated sense of pacing. Analyze the story and provide a logical time-skip or transition. Format: (OOC: [transition description])",
    twistPrompt: "You are a genius narrative stylist. Analyze the subtext and introduce a significant plot twist. Format: (OOC: [twist description])"
};

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

    const finalPrompt = `[System Note: You are Fawn, the silent architect of this story. Direct the scene elegantly.]\n\nStory Context:\n${chatHistory}\n\nTask: ${instruction}\n\nWrite ONLY the OOC message.`;

    try {
        const response = await callGenericChatCompletion(finalPrompt, "Fawn's Analysis");
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

// Функция инициализации
function initFawn() {
    // Проверяем, нет ли уже этой кнопки (чтобы не дублировать)
    if ($("#fawn-plot-driver-menu").length) return;

    const menuHtml = `
        <div id="fawn-plot-driver-menu" class="list_item" title="Fawn's Plot Driver" style="position: relative;">
            <i class="fa-solid fa-star" style="color:#ffb7c5;"></i>
            <div class="list_item_text">Fawn's Plot Driver</div>
            <div id="plot-driver-options" style="display:none; position:absolute; left: 100%; top: 0; background:rgba(20,20,20,0.95); border:1px solid #ffb7c5; border-radius:12px; padding:8px; z-index:9999; min-width:180px; box-shadow: 0 4px 15px rgba(255,183,197,0.3);">
                <div class="plot-item" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff;">🩰 Gentle Time Skip</div>
                <div class="plot-item" data-type="twist" style="padding:10px; cursor:pointer; color:#fff;">🥀 Dramatic Twist</div>
            </div>
        </div>
    `;

    // Пытаемся добавить в разные возможные места меню
    const target = $("#extensionsMenu, #extensions_menu, .extensionsMenu");
    
    if (target.length) {
        target.append(menuHtml);
        console.log("Fawn's Plot Driver: Menu injected successfully!");
    } else {
        console.log("Fawn's Plot Driver: Menu target not found, retrying...");
        setTimeout(initFawn, 1000); // Пробуем еще раз через секунду
    }
}

// Запуск при загрузке
jQuery(function () {
    setTimeout(initFawn, 500); // Небольшая задержка для уверенности

    $(document).on('click', '#fawn-plot-driver-menu', function(e) {
        e.stopPropagation();
        $("#plot-driver-options").toggle();
    });

    $(document).on('click', '.plot-item', function(e) {
        e.stopPropagation();
        drivePlot($(this).attr('data-type'));
        $("#plot-driver-options").hide();
    });

    $(document).on('click', function() {
        $("#plot-driver-options").hide();
    });
});
