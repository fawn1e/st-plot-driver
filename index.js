import { extension_settings, getContext } from "../../../extensions.js";
import { callGenericChatCompletion } from "../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "You are a master story architect with a sophisticated sense of pacing. Analyze the story and provide a logical time-skip or transition to move the plot forward. Ensure it feels natural and grounded. Format the output strictly as: (OOC: [transition description])",
    twistPrompt: "You are a genius narrative stylist. Analyze the subtext and introduce a significant plot twist that fits the characters but raises the stakes. Avoid cliches or 'too much' chaos. Format the output strictly as: (OOC: [twist description])"
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = defaultSettings;
}

async function drivePlot(type) {
    const icon = document.querySelector('#fawn-plot-driver-menu i');
    
    // Включаем анимацию пишущего пера
    icon.classList.remove('fa-star');
    icon.classList.add('fa-pen-nib', 'fawn-writing');

    const context = getContext();
    // Берем последние 20 сообщений для глубокого анализа
    const chatHistory = context.chat.slice(-20).map(m => `${m.character}: ${m.mes}`).join('\n');
    
    const instruction = type === 'timeskip' 
        ? extension_settings[extensionName].timeskipPrompt 
        : extension_settings[extensionName].twistPrompt;

    // Скрытая установка для модели (Фавн как "стиль мышления")
    const finalPrompt = `[System Note: You are Fawn, the silent architect of this story. You are elegant, smart, and have perfect taste. Your task is to direct the scene without revealing your identity.]\n\nStory Context:\n${chatHistory}\n\nTask: ${instruction}\n\nWrite ONLY the OOC message. No conversational filler.`;

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
        // Возвращаем иконку звездочки обратно
        icon.classList.remove('fa-pen-nib', 'fawn-writing');
        icon.classList.add('fa-star');
    }
}

// Регистрация в меню расширений (Extensions Menu)
jQuery(function () {
    const menuHtml = `
        <div id="fawn-plot-driver-menu" class="list_item" title="Fawn's Plot Driver">
            <i class="fa-solid fa-star" style="color:#ffb7c5;"></i>
            <div class="list_item_text">Fawn's Plot Driver</div>
        </div>
    `;

    const optionsHtml = `
        <div id="plot-driver-options" style="display:none; position:absolute; left:220px; background:rgba(20,20,20,0.95); border:1px solid #ffb7c5; border-radius:12px; padding:8px; z-index:2000; min-width:180px; box-shadow: 0 4px 15px rgba(255,183,197,0.3);">
            <div class="plot-item" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff; font-size:0.95em;">🩰 Gentle Time Skip</div>
            <div class="plot-item" data-type="twist" style="padding:10px; cursor:pointer; color:#fff; font-size:0.95em;">🥀 Dramatic Twist</div>
        </div>
    `;
    
    // Добавляем в вертикальный список расширений
    $("#extensionsMenu").append(menuHtml);
    $("#fawn-plot-driver-menu").append(optionsHtml);

    // Логика открытия меню при клике
    $(document).on('click', '#fawn-plot-driver-menu', function(e) {
        e.stopPropagation();
        $("#plot-driver-options").toggle();
    });

    // Клик по варианту (Таймскип или Твист)
    $(document).on('click', '.plot-item', function(e) {
        e.stopPropagation();
        const type = $(this).attr('data-type');
        $("#plot-driver-options").hide();
        drivePlot(type);
    });

    // Закрытие меню, если кликнули в другом месте
    $(document).on('click', function() {
        $("#plot-driver-options").hide();
    });
});
