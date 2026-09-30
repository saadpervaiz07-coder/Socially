/* =========================================================
   SOCIALLY — Main Client Application
   Version 2.1 — Phase 6 Ready
   (Theme, Nav, Friend buttons, Toasts)
   NOTE: Posts + notifications are handled in their own files.
========================================================= */

"use strict";


/* =========================================================
   1. DOM SHORTCUTS
========================================================= */

const $  = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];


/* =========================================================
   2. CONSTANTS
========================================================= */

const STORAGE_KEY_THEME = "socially-theme";
const CURRENT_USER_ID   = "u1";


/* =========================================================
   3. STATE
========================================================= */

const state = {
    theme: "light",
    currentView: "home",
    currentUser: {
        name: "Saad",
        fullName: "Saad Pervaiz",
        id: CURRENT_USER_ID
    }
};


/* =========================================================
   4. TOASTS
========================================================= */

let toastContainer = null;

function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    toastContainer.id = "toastContainer";
    document.body.appendChild(toastContainer);
    return toastContainer;
}


function showToast(message, duration = 2200) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);

    void toast.offsetWidth;
    toast.classList.add("toast-enter");

    setTimeout(() => {
        toast.classList.remove("toast-enter");
        toast.classList.add("toast-leave");
        setTimeout(() => toast.remove(), 300);
    }, duration);
}


/* =========================================================
   5. THEME
========================================================= */

const themeToggleBtn = $("#themeToggle");

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    state.theme = theme;
    if (themeToggleBtn) themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
    try { localStorage.setItem(STORAGE_KEY_THEME, theme); } catch (_) {}
}

function toggleTheme() {
    const next = state.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    showToast(next === "dark" ? "🌙 Dark mode on" : "☀️ Light mode on");
}

function loadSavedTheme() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY_THEME); } catch (_) {}

    if (saved === "dark" || saved === "light") {
        applyTheme(saved);
    } else {
        const prefersDark = window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark ? "dark" : "light");
    }
}

if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);


/* =========================================================
   6. SIDEBAR
========================================================= */

const sidebarNavItems = $$(".sidebar-nav .nav-item");

function setActiveNav(target) {
    sidebarNavItems.forEach((item) => {
        item.classList.toggle("active", item === target);
    });
}

function handleNavClick(event) {
    const button = event.currentTarget;
    const view = button.dataset.view;
    setActiveNav(button);
    if (view) {
        state.currentView = view;
        showToast(`📍 ${capitalize(view)} section`);
    }
}

sidebarNavItems.forEach((item) => item.addEventListener("click", handleNavClick));

$$(".sidebar-section .nav-item").forEach((item) => {
    item.addEventListener("click", () => {
        const shortcut = item.dataset.shortcut;
        if (shortcut) {
            showToast(`🎯 ${capitalize(shortcut)} filter (coming soon)`);
        }
    });
});


/* =========================================================
   7. FRIEND BUTTONS
========================================================= */

const addFriendButtons = $$(".add-friend");

function handleAddFriend(event) {
    const button = event.currentTarget;
    const row = button.closest(".suggestion");
    const name = row?.querySelector("strong")?.textContent || "User";
    const isRequested = button.classList.toggle("requested");

    if (isRequested) {
        button.textContent = "✓";
        button.style.background = "var(--success)";
        button.style.color = "#fff";
        showToast(`👥 Friend request sent to ${name}`);
    } else {
        button.textContent = "+";
        button.style.background = "";
        button.style.color = "";
        showToast(`↩️ Request to ${name} cancelled`);
    }
}

addFriendButtons.forEach((btn) => btn.addEventListener("click", handleAddFriend));


/* =========================================================
   8. NAVBAR
========================================================= */

const profileBtn      = $("#profileBtn");
const notificationBtn = $("#notificationBtn");
const searchInput     = $("#searchInput");

if (profileBtn && profileBtn.tagName !== "A") {
    profileBtn.addEventListener("click", () => {
        window.location.href = `profile.html?id=${state.currentUser.id}`;
    });
}

if (notificationBtn && notificationBtn.tagName !== "A") {
    notificationBtn.addEventListener("click", () => {
        window.location.href = "notifications.html";
    });
}

if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const q = searchInput.value.trim();
            if (q) showToast(`🔍 Searching for "${q}"...`);
        }
        if (event.key === "Escape") {
            searchInput.value = "";
            searchInput.blur();
        }
    });
}


/* =========================================================
   9. SEE ALL
========================================================= */

$$(".see-all-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        showToast("👥 See all suggestions — coming soon");
    });
});


/* =========================================================
   10. UTILITIES
========================================================= */

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}


/* =========================================================
   11. INIT
========================================================= */

function init() {
    loadSavedTheme();

    const activeItem = sidebarNavItems.find((i) => i.classList.contains("active"));
    if (!activeItem && sidebarNavItems[0]) {
        sidebarNavItems[0].classList.add("active");
        state.currentView = sidebarNavItems[0].dataset.view || "home";
    }

    console.log("🟣 Socially app loaded");
    console.log(`🎨 Theme: ${state.theme}`);
}


init();