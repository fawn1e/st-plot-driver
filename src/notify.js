import { extension_settings } from "../../../../extensions.js";
import { extensionName } from "./constants.js";

function canToast() {
    return extension_settings?.[extensionName]?.toastEnabled !== false;
}

export function notify(type, message) {
    if (!canToast() || !window.toastr?.[type]) return;
    window.toastr[type](message);
}
