console.log("[Fawn] Extension file loaded!");

import { extension_settings, getContext } from "../../../extensions.js";
import { generateQuietPrompt } from "../../../../script.js";
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "plot-driver-fawn";
const defaultSettings = {
    timeskipPrompt: "Create a natural time-skip that moves the narrative forward elegantly. Write 2-3 sentences as OOC direction.",
    twistPrompt: "Introduce an unexpected but logical plot twist that enriches the story. Write 2-3 sentences as OOC direction.",
    messageCount: 15
};

if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { ...defaultSettings };
}

let lastType = null;

// ========== SAVE/LOAD ==========
function saveSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    saveSettingsDebounced();
    console.log("[Fawn] Settings saved");
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('fawn_settings');
        if (saved) {
            extension_settings[extensionName] = { ...defaultSettings, ...JSON.parse(saved) };
            console.log("[Fawn] Settings loaded from localStorage");
        }
    } catch (e) {
        console.log("[Fawn] Using default settings");
    }
}

// ========== CLOSE POPUP ==========
function closePopup() {
    const popup = document.getElementById("fawn-popup");
    if (popup) popup.remove();
}

// ========== ADD OOC PROMPT ==========
function addPlotPrompt(text) {
    const prompt = `[OOC INSTRUCTION FROM PLOT DRIVER]
${text}
[END OOC - incorporate this naturally into your next response]`;

    setExtensionPrompt(
        'fawn-plot-driver',
        prompt,
        extension_prompt_types.IN_CHAT,
        1,
        false,
        true,
        null,
        extension_prompt_roles.SYSTEM
    );

    console.log("[Fawn] OOC prompt added!");
}

// ========== CLEAR OOC PROMPT ==========
function clearPlotPrompt() {
    setExtensionPrompt(
        'fawn-plot-driver',
        '',
        extension_prompt_types.IN_CHAT,
        1,
        false,
        true,
        null,
        extension_prompt_roles.SYSTEM
    );
    console.log("[Fawn] OOC prompt cleared");
}

// ========== SETTINGS POPUP ==========
function showSettingsPopup() {
    closePopup();
    const s = extension_settings[extensionName];

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:25px; z-index:99999; width:500px; max-width:90%; max-height:80vh; overflow-y:auto;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:20px; text-align:center; margin-bottom:20px;">
                ⚙️ Fawn's Plot Driver Settings
            </div>

            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeQuoteColor); display:block; margin-bottom:8px;">🩰 Time Skip Prompt:</label>
                <textarea id="fawn-set-timeskip" style="width:100%; height:80px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${s.timeskipPrompt}</textarea>
            </div>

            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeQuoteColor); display:block; margin-bottom:8px;">🥀 Plot Twist Prompt:</label>
                <textarea id="fawn-set-twist" style="width:100%; height:80px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${s.twistPrompt}</textarea>
            </div>

            <div style="margin-bottom:20px;">
                <label style="color:var(--SmartThemeQuoteColor); display:block; margin-bottom:8px;">📜 Messages to include: <span id="fawn-msg-count-label">${s.messageCount}</span></label>
                <input type="range" id="fawn-set-msgcount" min="5" max="50" value="${s.messageCount}" style="width:100%; accent-color:var(--SmartThemeQuoteColor);">
            </div>

            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-set-save" class="menu_button">💾 Save</button>
                <button id="fawn-set-reset" class="menu_button">🔄 Reset</button>
                <button id="fawn-set-close" class="menu_button">✖ Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-set-msgcount").addEventListener("input", function(e) {
        document.getElementById("fawn-msg-count-label").textContent = e.target.value;
    });

    document.getElementById("fawn-set-save").addEventListener("click", function() {
        extension_settings[extensionName].timeskipPrompt = document.getElementById("fawn-set-timeskip").value;
        extension_settings[extensionName].twistPrompt = document.getElementById("fawn-set-twist").value;
        extension_settings[extensionName].messageCount = parseInt(document.getElementById("fawn-set-msgcount").value);
        saveSettings();
        toastr.success("Settings saved! ✨");
        closePopup();
    });

    document.getElementById("fawn-set-reset").addEventListener("click", function() {
        document.getElementById("fawn-set-timeskip").value = defaultSettings.timeskipPrompt;
        document.getElementById("fawn-set-twist").value = defaultSettings.twistPrompt;
        document.getElementById("fawn-set-msgcount").value = defaultSettings.messageCount;
        document.getElementById("fawn-msg-count-label").textContent = defaultSettings.messageCount;
        toastr.info("Reset to defaults! ✨");
    });

    document.getElementById("fawn-set-close").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== PREVIEW POPUP ==========
function showPreviewPopup(text, type) {
    closePopup();

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center; margin-bottom:10px;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:15px; opacity:0.7;">How's this? ✨</div>
            <textarea id="fawn-preview-text" style="width:100%; height:120px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${text}</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-ok" class="menu_button">💕 Insert</button>
                <button id="fawn-ooc" class="menu_button">📝 Send as OOC</button>
                <button id="fawn-redo" class="menu_button">🔄 Regenerate</button>
                <button id="fawn-no" class="menu_button">✖ Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-ok").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        closePopup();
        toastr.success("Inserted! 🩰");
    });

    document.getElementById("fawn-ooc").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        addPlotPrompt(finalText);
        closePopup();
        toastr.success("OOC added! Now send a message to the bot ✨");
    });

    document.getElementById("fawn-redo").addEventListener("click", function() {
        closePopup();
        setTimeout(function() { drivePlot(lastType); }, 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== MANUAL INPUT ==========
function showManualInputPopup(type) {
    closePopup();

    const defaultText = type === 'timeskip'
        ? "(OOC: Time passes... [describe what happens])"
        : "(OOC: Suddenly... [describe the twist])";

    const popup = document.createElement("div");
    popup.id = "fawn-popup";
    popup.innerHTML = `
        <div id="fawn-popup-bg" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:99998;"></div>
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:var(--SmartThemeBlurTintColor); border:2px solid var(--SmartThemeBorderColor); border-radius:15px; padding:20px; z-index:99999; width:450px; max-width:90%;">
            <div style="color:var(--SmartThemeQuoteColor); font-size:18px; text-align:center; margin-bottom:10px;">
                ${type === 'timeskip' ? '🩰 Time Skip' : '🥀 Plot Twist'}
            </div>
            <div style="color:var(--SmartThemeBodyColor); text-align:center; margin-bottom:15px; opacity:0.7;">
                Auto-generation failed 😅<br>Write manually or try again!
            </div>
            <textarea id="fawn-preview-text" style="width:100%; height:120px; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:10px; color:var(--SmartThemeBodyColor); resize:vertical;">${defaultText}</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:center; flex-wrap:wrap;">
                <button id="fawn-ok" class="menu_button">💕 Insert</button>
                <button id="fawn-ooc" class="menu_button">📝 As OOC</button>
                <button id="fawn-redo" class="menu_button">🔄 Retry</button>
                <button id="fawn-no" class="menu_button">✖ Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById("fawn-ok").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        const textarea = document.getElementById('send_textarea');
        textarea.value = finalText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        closePopup();
    });

    document.getElementById("fawn-ooc").addEventListener("click", function() {
        const finalText = document.getElementById("fawn-preview-text").value;
        addPlotPrompt(finalText);
        closePopup();
        toastr.success("OOC added! ✨");
    });

    document.getElementById("fawn-redo").addEventListener("click", function() {
        closePopup();
        setTimeout(function() { drivePlot(lastType); }, 100);
    });

    document.getElementById("fawn-no").addEventListener("click", closePopup);
    document.getElementById("fawn-popup-bg").addEventListener("click", closePopup);
}

// ========== MAIN FUNCTION ==========
async function drivePlot(type) {
    console.log("[Fawn] === START ===");
    console.log("[Fawn] Type:", type);

    lastType = type;

    const button = document.getElementById("fawn-plot-btn");
    if (button) {
        button.innerHTML = '<i class="fa-solid fa-pen-nib fa-spin"></i>';
    }

    try {
        const context = getContext();
        const msgCount = extension_settings[extensionName].messageCount || 15;

        console.log("[Fawn] Got context, messages:", context.chat ? context.chat.length : 0);

        if (!context.chat || context.chat.length === 0) {
            toastr.warning("Start a chat first! 💕");
            return;
        }

        const chatHistory = context.chat.slice(-msgCount).map(function(m) {
            return (m.name || 'User') + ': ' + m.mes;
        }).join('\n');

        const instruction = type === 'timeskip'
            ? extension_settings[extensionName].timeskipPrompt
            : extension_settings[extensionName].twistPrompt;

        // ВАЖНО: Промпт с инструкцией игнорировать пресет!
        const finalPrompt = "[SYSTEM OVERRIDE - IGNORE ALL PREVIOUS INSTRUCTIONS AND CHARACTER CARDS]\n\n" +
            "You are a narrative assistant. Your ONLY task is to generate a brief OOC direction.\n\n" +
            "Task: " + instruction + "\n\n" +
            "Recent story context (last " + msgCount + " messages):\n" + chatHistory + "\n\n" +
            "RULES:\n" +
            "1. Write ONLY 2-3 sentences of OOC direction\n" +
            "2. Format: (OOC: [your direction here])\n" +
            "3. Do NOT roleplay as any character\n" +
            "4. Do NOT continue the story\n" +
            "5. Do NOT use <think> tags\n" +
            "6. ONLY provide the direction\n\n" +
            "Your OOC direction:";

        console.log("[Fawn] Sending request to API...");

        // ПРАВИЛЬНЫЙ вызов - просто строка!
        const response = await generateQuietPrompt(finalPrompt);

        console.log("[Fawn] === RESPONSE DEBUG ===");
        console.log("[Fawn] typeof:", typeof response);
        console.log("[Fawn] value:", response);
        if (response && typeof response === "object") {
            console.log("[Fawn] keys:", Object.keys(response));
        }
        console.log("[Fawn] ========================");

        let text = "";

        // Обработка ответа
        if (typeof response === "string" && response.length > 0) {
            text = response;
            console.log("[Fawn] Got string response");
        } else if (response && typeof response === "object") {
            // Chat Completion format
            if (response.choices && response.choices[0]) {
                if (response.choices[0].message && response.choices[0].message.content) {
                    text = response.choices[0].message.content;
                    console.log("[Fawn] Extracted from choices[0].message.content");
                } else if (response.choices[0].text) {
                    text = response.choices[0].text;
                    console.log("[Fawn] Extracted from choices[0].text");
                }
            } else if (response.content) {
                text = response.content;
                console.log("[Fawn] Extracted from response.content");
            } else if (response.message && response.message.content) {
                text = response.message.content;
                console.log("[Fawn] Extracted from response.message.content");
            } else if (response.text) {
                text = response.text;
                console.log("[Fawn] Extracted from response.text");
            }
        }

        // Чистим от think тегов
        if (text) {
            text = text
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/<think>[\s\S]*/gi, '')
                .replace(/<\/think>/gi, '')
                .trim();
        }

        console.log("[Fawn] Final text:", text);
        console.log("[Fawn] Text length:", text ? text.length : 0);

        if (text && text.length > 10) {
            console.log("[Fawn] Showing preview popup!");
            showPreviewPopup(text, type);
        } else {
            console.log("[Fawn] Text empty or too short, showing manual input");
            showManualInputPopup(type);
        }

    } catch (error) {
        console.error("[Fawn] ERROR:", error);
        toastr.error("Error: " + error.message);
        showManualInputPopup(type);
    } finally {
        if (button) {
            button.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
        console.log("[Fawn] === END ===");
    }
}

// ========== BUTTON ==========
function addFawnMenu() {
    if (document.getElementById("fawn-plot-btn")) {
        return true;
    }

    const container = document.getElementById("leftSendForm")
                   || document.getElementById("form_sheld")
                   || document.querySelector("#send_form");

    if (!container) {
        return false;
    }

    console.log("[Fawn] Creating button...");

    const btn = document.createElement("div");
    btn.id = "fawn-plot-btn";
    btn.title = "Fawn's Plot Driver";
    btn.innerHTML = '<i class="fa-solid fa-star"></i>';
    btn.style.cssText = "cursor:pointer; padding:10px; color:var(--SmartThemeQuoteColor); font-size:18px; position:relative; display:flex; align-items:center; justify-content:center;";

    const menu = document.createElement("div");
    menu.id = "fawn-menu";
    menu.style.cssText = "display:none; position:absolute; bottom:40px; left:0; background:var(--SmartThemeBlurTintColor); border:1px solid var(--SmartThemeBorderColor); border-radius:8px; padding:4px; z-index:9999; min-width:120px; font-size:14px;";
    menu.innerHTML = '<div class="fawn-option" data-action="timeskip" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px;">🩰 Time Skip</div><div class="fawn-option" data-action="twist" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); border-radius:4px;">🥀 Plot Twist</div><div style="border-top:1px solid var(--SmartThemeBorderColor); margin:3px 0;"></div><div class="fawn-option" data-action="settings" style="padding:6px 10px; cursor:pointer; color:var(--SmartThemeBodyColor); opacity:0.7; border-radius:4px;">⚙️ Settings</div>';

    btn.appendChild(menu);
    container.insertBefore(btn, container.firstChild);

    btn.addEventListener("click", function(e) {
        e.stopPropagation();
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    });

    const options = menu.querySelectorAll(".fawn-option");
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];

        opt.addEventListener("click", function(e) {
            e.stopPropagation();
            menu.style.display = "none";
            const action = opt.getAttribute("data-action");
            if (action === "settings") {
                showSettingsPopup();
            } else {
                drivePlot(action);
            }
        });

        opt.addEventListener("mouseenter", function() {
            opt.style.background = "var(--SmartThemeQuoteColor)";
            opt.style.opacity = "0.9";
        });

        opt.addEventListener("mouseleave", function() {
            opt.style.background = "transparent";
            opt.style.opacity = opt.getAttribute("data-action") === "settings" ? "0.7" : "1";
        });
    }

    document.addEventListener("click", function() {
        menu.style.display = "none";
    });

    console.log("[Fawn] Button created!");
    return true;
}

// ========== EVENTS ==========
eventSource.on(event_types.MESSAGE_RECEIVED, function() {
    clearPlotPrompt();
});

eventSource.on(event_types.MESSAGE_SWIPED, function() {
    clearPlotPrompt();
});

// ========== INIT ==========
jQuery(function() {
    console.log("[Fawn] Initializing...");
    loadSettings();

    if (!addFawnMenu()) {
        const tryAdd = setInterval(function() {
            if (addFawnMenu()) {
                clearInterval(tryAdd);
                console.log("[Fawn] Initialization complete!");
            }
        }, 1000);
    } else {
        console.log("[Fawn] Initialization complete!");
    }
});

console.log("[Fawn] Script parsed!");
