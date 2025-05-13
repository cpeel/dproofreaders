import translate from "./gettext.js";

window.addEventListener("DOMContentLoaded", () => {
    var translation = translate.gettext("Working, please wait...");
    console.log(translation);
    document.getElementById("alert").textContent = translation;
});
