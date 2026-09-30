/* =========================================================
   SOCIALLY — Settings Page
   Version 1.0 — Phase 7
   (Client-side persistence via localStorage)
========================================================= */

"use strict";


const SETTINGS_KEY = "socially-settings";


const DEFAULTS = {
    profileVisibility: "public",
    showActivity: true,
    allowRequests: true,
    showEmail: false,
    notifLikes: true,
    notifComments: true,
    notifRequests: true,
    theme: "light"
};


/* =========================================================
   ELEMENTS
========================================================= */

const els = {
    profileVisibility: document.getElementById("profileVisibility"),
    showActivity:      document.getElementById("showActivity"),
    allowRequests:     document.getElementById("allowRequests"),
    showEmail:         document.getElementById("showEmail"),
    notifLikes:        document.getElementById("notifLikes"),
    notifComments:     document.getElementById("notifComments"),
    notifRequests:     document.getElementById("notifRequests"),
    themeSelect:       document.getElementById("themeSelect"),
    saveBtn:           document.getElementById("saveSettingsBtn"),
    resetBtn:          document.getElementById("resetSettingsBtn")
};


/* =========================================================
   LOAD / SAVE
========================================================= */

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...DEFAULTS };
        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (_) {
        return { ...DEFAULTS };
    }
}


function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
    } catch (_) {
        return false;
    }
}


/* =========================================================
   APPLY TO FORM
========================================================= */

function applyToForm(s) {
    if (els.profileVisibility) els.profileVisibility.value = s.profileVisibility;
    if (els.showActivity)      els.showActivity.checked = s.showActivity;
    if (els.allowRequests)     els.allowRequests.checked = s.allowRequests;
    if (els.showEmail)         els.showEmail.checked = s.showEmail;
    if (els.notifLikes)        els.notifLikes.checked = s.notifLikes;
    if (els.notifComments)     els.notifComments.checked = s.notifComments;
    if (els.notifRequests)     els.notifRequests.checked = s.notifRequests;
    if (els.themeSelect)       els.themeSelect.value = s.theme;
}


/* =========================================================
   READ FROM FORM
========================================================= */

function readFromForm() {
    return {
        profileVisibility: els.profileVisibility?.value || DEFAULTS.profileVisibility,
        showActivity:  !!els.showActivity?.checked,
        allowRequests: !!els.allowRequests?.checked,
        showEmail:     !!els.showEmail?.checked,
        notifLikes:    !!els.notifLikes?.checked,
        notifComments: !!els.notifComments?.checked,
        notifRequests: !!els.notifRequests?.checked,
        theme:         els.themeSelect?.value || DEFAULTS.theme
    };
}


/* =========================================================
   APPLY LIVE
========================================================= */

function applyLiveEffects(s) {
    /* Theme switch */
    if (s.theme === "dark") {
        document.body.classList.add("dark");
        try { localStorage.setItem("socially-theme", "dark"); } catch (_) {}
    } else {
        document.body.classList.remove("dark");
        try { localStorage.setItem("socially-theme", "light"); } catch (_) {}
    }

    /* Update theme button icon */
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = s.theme === "dark" ? "☀️" : "🌙";
}


/* =========================================================
   HANDLERS
========================================================= */

if (els.saveBtn) {
    els.saveBtn.addEventListener("click", () => {
        const s = readFromForm();

        if (saveSettings(s)) {
            applyLiveEffects(s);

            if (typeof showToast === "function") {
                showToast("💾 Settings saved");
            }
        } else {
            if (typeof showToast === "function") {
                showToast("⚠️ Could not save settings");
            }
        }
    });
}


if (els.resetBtn) {
    els.resetBtn.addEventListener("click", () => {
        if (!confirm("Reset all settings to defaults?")) return;

        saveSettings(DEFAULTS);
        applyToForm(DEFAULTS);
        applyLiveEffects(DEFAULTS);

        if (typeof showToast === "function") {
            showToast("↩️ Settings reset to defaults");
        }
    });
}


/* Live theme switch when user changes the dropdown */
if (els.themeSelect) {
    els.themeSelect.addEventListener("change", () => {
        const s = readFromForm();
        applyLiveEffects(s);
    });
}


/* =========================================================
   INIT
========================================================= */

(function init() {
    const s = loadSettings();
    applyToForm(s);
    /* Don't force theme on load — respect app.js theme already set */
    console.log("⚙️ Settings page loaded");
})();