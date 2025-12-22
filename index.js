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

// Умная функция вставки кнопки
function injectFawnButton() {
    // Если кнопка уже есть, ничего не делаем
    if (document.getElementById('fawn-plot-driver-menu')) return;

    // Ищем список расширений (тот самый с твоего скрина)
    const extensionsMenu = document.getElementById('extensionsMenu');

    if (extensionsMenu) {
        const menuHtml = `
            <div id="fawn-plot-driver-menu" class="list_item" title="Fawn's Plot Driver" style="position: relative;">
                <i class="fa-solid fa-star" style="color:#ffb7c5;"></i>
                <div class="list_item_text">Fawn's Plot Driver</div>
                <div id="plot-driver-options" style="display:none; position:absolute; left: 100%; top: 0; background:rgba(30,30,30,0.98); border:1px solid #ffb7c5; border-radius:12px; padding:8px; z-index:9999; min-width:180px; box-shadow: 0 4px 15px rgba(255,183,197,0.4);">
                    <div class="plot-item-fawn" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff; border-radius:8px;">🩰 Gentle Time Skip</div>
                    <div class="plot-item-fawn" data-type="twist" style="padding:10px; cursor:pointer; color:#fff; border-radius:8px;">🥀 Dramatic Twist</div>
                </div>
            </div>
        `;
        
        extensionsMenu.insertAdjacentHTML('beforeend', menuHtml);
        console.log("🎀 Fawn: Menu item injected!");

        // Навешиваем события сразу после вставки
        document.getElementById('fawn-plot-driver-menu').addEventListener('click', (e) => {
            e.stopPropagation();
            const options = document.getElementById('plot-driver-options');
            options.style.display = options.style.display === 'none' ? 'block' : 'none';
        });

        document.querySelectorAll('.plot-item-fawn').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                drivePlot(item.getAttribute('data-type'));
                document.getElementById('plot-driver-options').style.display = 'none';
            });
        });

        document.addEventListener('click', () => {
            const options = document.getElementById('plot-driver-options');
            if (options) options.style.display = 'none';
        });

    } else {
        // Если меню еще не прогрузилось, пробуем снова через полсекунды
        setTimeout(injectFawnButton, 500);
    }
}

// Запуск при загрузке страницы
$(document).ready(() => {
    injectFawnButton();
});
