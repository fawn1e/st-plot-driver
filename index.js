(function() {
    'use strict';

    // Импорты из SillyTavern
    const { extension_settings, getContext } = SillyTavern;
    const { callGenericChatCompletion } = SillyTavern;

    const extensionName = "plot-driver-fawn";
    const defaultSettings = {
        timeskipPrompt: "You are a master story architect with a sophisticated sense of pacing. Analyze the story and provide a logical time-skip or transition. Format: (OOC: [transition description])",
        twistPrompt: "You are a genius narrative stylist. Analyze the subtext and introduce a significant plot twist. Format: (OOC: [twist description])"
    };

    // Загрузка настроек
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = defaultSettings;
    }

    // Функция ожидания элемента (как в твоём примере)
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
        });
    }

    // Логика генерации сюжета
    async function drivePlot(type) {
        const icon = document.querySelector('#fawn-plot-driver-menu i');
        if (icon) {
            icon.classList.remove('fa-star');
            icon.classList.add('fa-pen-nib', 'fawn-writing');
        }

        const context = getContext();
        const chatHistory = context.chat.slice(-20).map(m => `${m.character}: ${m.mes}`).join('\n');
        
        const instruction = type === 'timeskip' 
            ? extension_settings[extensionName].timeskipPrompt 
            : extension_settings[extensionName].twistPrompt;

        const finalPrompt = `[System Note: You are Fawn, the silent architect of this story. You have perfect taste and drive the plot elegantly.]\n\nStory Context:\n${chatHistory}\n\nTask: ${instruction}\n\nWrite ONLY the OOC message.`;

        try {
            const response = await callGenericChatCompletion(finalPrompt, "Fawn's Plot Analysis");
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

    // Создание и вставка меню
    async function initFawnMenu() {
        const extensionsMenu = await waitForElement('#extensionsMenu');
        if (!extensionsMenu) return;

        // Удаляем старую кнопку, если она была
        if (document.getElementById('fawn-plot-driver-menu')) {
            document.getElementById('fawn-plot-driver-menu').remove();
        }

        const menuHtml = document.createElement('div');
        menuHtml.id = 'fawn-plot-driver-menu';
        menuHtml.className = 'list_item';
        menuHtml.style.position = 'relative';
        menuHtml.innerHTML = `
            <i class="fa-solid fa-star" style="color:#ffb7c5;"></i>
            <div class="list_item_text">Fawn's Plot Driver</div>
            <div id="plot-driver-options" style="display:none; position:absolute; left: 100%; top: 0; background:rgba(30,30,30,0.98); border:1px solid #ffb7c5; border-radius:12px; padding:8px; z-index:9999; min-width:180px; box-shadow: 0 4px 15px rgba(255,183,197,0.4);">
                <div class="plot-item-fawn" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff; border-radius:8px;">🩰 Gentle Time Skip</div>
                <div class="plot-item-fawn" data-type="twist" style="padding:10px; cursor:pointer; color:#fff; border-radius:8px;">🥀 Dramatic Twist</div>
            </div>
        `;

        // Вставляем в начало списка
        extensionsMenu.insertBefore(menuHtml, extensionsMenu.firstChild);

        // Обработчики кликов
        menuHtml.addEventListener('click', (e) => {
            e.stopPropagation();
            const options = document.getElementById('plot-driver-options');
            options.style.display = options.style.display === 'none' ? 'block' : 'none';
        });

        menuHtml.querySelectorAll('.plot-item-fawn').forEach(item => {
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
    }

    // Запуск
    jQuery(async () => {
        await initFawnMenu();
        
        // Переподключаем при смене чата
        const eventSource = getContext().eventSource;
        const eventTypes = getContext().eventTypes;
        eventSource.on(eventTypes.CHAT_CHANGED, () => initFawnMenu());
    });

})();
