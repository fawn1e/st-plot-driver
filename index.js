import { extension_settings, getContext } from "../../../extensions.js";
import { callGenericChatCompletion } from "../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    // Фавн инструктирует модель быть умной, но не называть себя
    timeskipPrompt: "You are a master story architect with a sophisticated sense of pacing. Analyze the story and provide a logical time-skip or transition to move the plot forward. Ensure it feels natural and grounded. Format the output strictly as: (OOC: [transition description])",
    twistPrompt: "You are a genius narrative stylist. Analyze the subtext and introduce a significant plot twist that fits the characters but raises the stakes. Avoid cliches or 'too much' chaos. Format the output strictly as: (OOC: [twist description])"
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = defaultSettings;
}

async function drivePlot(type) {
    const icon = document.getElementById('plot-driver-icon');
    
    // Анимация пера
    icon.classList.remove('fa-star');
    icon.classList.add('fa-pen-nib', 'fawn-writing');

    const context = getContext();
    const chatHistory = context.chat.slice(-20).map(m => `${m.character}: ${m.mes}`).join('\n');
    
    const instruction = type === 'timeskip' 
        ? extension_settings[extensionName].timeskipPrompt 
        : extension_settings[extensionName].twistPrompt;

    // В системном промпте мы объясняем, что Фавн — это стиль мышления
    const finalPrompt = `[System Note: You are Fawn, the silent architect of this story. You are elegant, smart, and have perfect taste. Your task is to direct the scene without revealing your identity.]\n\nStory Context:\n${chatHistory}\n\nTask: ${instruction}\n\nWrite ONLY the OOC message. No conversational filler.`;

    try {
        const response = await callGenericChatCompletion(finalPrompt, "Fawn's Analysis");
        if (response) {
            const textarea = document.getElementById('send_textarea');
            textarea.value = response;
            textarea.dispatchEvent(new Event('input'));
        }
    } catch (error) {
        console.error("Plot Driver Error:", error);
    } finally {
        icon.classList.remove('fa-pen-nib', 'fawn-writing');
        icon.classList.add('fa-star');
    }
}

// UI регистрация остается прежней...
jQuery(function () {
    const ui = `
        <div id="plot-driver-wrapper" style="display:inline-block; position:relative; margin-left:10px;">
            <i id="plot-driver-icon" class="fa-solid fa-star message_icon" title="Fawn's Plot Driver" style="cursor:pointer; color:#ffb7c5;"></i>
            <div id="plot-driver-options" style="display:none; position:absolute; bottom:35px; left:0; background:rgba(20,20,20,0.9); border:1px solid #ffb7c5; border-radius:12px; padding:8px; z-index:1000; min-width:160px; box-shadow: 0 4px 15px rgba(255,183,197,0.3);">
                <div class="plot-item" data-type="timeskip" style="padding:10px; cursor:pointer; color:#fff; font-size:0.9em;">🩰 Gentle Time Skip</div>
                <div class="plot-item" data-type="twist" style="padding:10px; cursor:pointer; color:#fff; font-size:0.9em;">🥀 Dramatic Twist</div>
            </div>
        </div>`;
    
    $("#extensions_menu").append(ui);
    $(document).on('click', '#plot-driver-icon', () => $("#plot-driver-options").toggle());
    $(document).on('click', '.plot-item', function() {
        const type = $(this).attr('data-type');
        $("#plot-driver-options").hide();
        drivePlot(type);
    });
});
