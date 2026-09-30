/* =========================================================
   SOCIALLY — Friends Page
   Version 1.0 — Phase 5
========================================================= */

"use strict";


const MY_USER_ID = "u1";


/* =========================================================
   DOM
========================================================= */

const friendsGrid        = document.getElementById("friendsGrid");
const friendsLoading     = document.getElementById("friendsLoading");
const friendsEmpty       = document.getElementById("friendsEmpty");
const friendsSearchInput = document.getElementById("friendsSearchInput");
const friendsSearchClear = document.getElementById("friendsSearchClear");
const friendsTabs        = document.querySelectorAll(".friends-tab");


/* =========================================================
   STATE
========================================================= */

let allUsers       = [];
let currentTab     = "all";
let currentSearch  = "";


/* =========================================================
   UTILITIES
========================================================= */

function esc(v) {
    return String(v)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   SHOW/HIDE
========================================================= */

function showLoading() {
    friendsLoading.hidden = false;
    friendsEmpty.hidden = true;
    friendsGrid.hidden = true;
}

function showEmpty() {
    friendsLoading.hidden = true;
    friendsEmpty.hidden = false;
    friendsGrid.hidden = true;
}

function showGrid() {
    friendsLoading.hidden = true;
    friendsEmpty.hidden = true;
    friendsGrid.hidden = false;
}


/* =========================================================
   FILTER
========================================================= */

function getFilteredUsers() {
    let list = allUsers.slice();

    /* Filter out myself */
    list = list.filter((u) => u.id !== MY_USER_ID);

    /* Tab filter */
    if (currentTab === "myfriends") {
        /* Fetch my friend list from /api/users/u1 (has .friends array) */
        /* We load it once and cache it */
        if (Array.isArray(window.__myFriends)) {
            list = list.filter((u) => window.__myFriends.includes(u.id));
        }
    }

    /* Search filter */
    const q = currentSearch.trim().toLowerCase();
    if (q) {
        list = list.filter((u) =>
            (u.name || "").toLowerCase().includes(q) ||
            (u.role || "").toLowerCase().includes(q) ||
            (u.headline || "").toLowerCase().includes(q)
        );
    }

    return list;
}


/* =========================================================
   RENDER
========================================================= */

function renderUsers() {
    const list = getFilteredUsers();

    if (list.length === 0) {
        showEmpty();
        return;
    }

    friendsGrid.innerHTML = "";

    list.forEach((u) => {
        const card = document.createElement("div");
        card.className = "friend-page-card";
        card.innerHTML = `
            <div class="friend-page-avatar">${esc(u.avatar || "?")}</div>
            <h3>${esc(u.name)}</h3>
            <p class="friend-page-role">${esc(u.role || "")}</p>
            ${u.location ? `<p class="friend-page-location">📍 ${esc(u.location)}</p>` : ""}
            <div class="friend-page-actions">
                <a class="friend-page-btn view" href="profile.html?id=${encodeURIComponent(u.id)}">
                    View
                </a>
                <button class="friend-page-btn add" data-uid="${esc(u.id)}">
                    + Add
                </button>
            </div>
        `;

        /* Add-friend button */
        const addBtn = card.querySelector(".add");
        addBtn.addEventListener("click", () => {
            const requested = addBtn.classList.toggle("requested");

            if (requested) {
                addBtn.textContent = "✓ Requested";
                if (typeof showToast === "function") {
                    showToast(`👥 Friend request sent to ${u.name}`);
                }
            } else {
                addBtn.textContent = "+ Add";
                if (typeof showToast === "function") {
                    showToast(`↩️ Request cancelled`);
                }
            }
        });

        friendsGrid.appendChild(card);
    });

    showGrid();
}


/* =========================================================
   LOAD
========================================================= */

async function loadUsers() {
    showLoading();

    try {
        const [usersRes, myRes] = await Promise.all([
            fetch("/api/users"),
            fetch(`/api/users/${MY_USER_ID}`)
        ]);

        allUsers = await usersRes.json();

        const me = await myRes.json();
        window.__myFriends = me.friends || [];

        renderUsers();
    } catch (err) {
        console.error("Failed to load users:", err);
        showEmpty();
    }
}


/* =========================================================
   WIRE UP
========================================================= */

friendsTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        friendsTabs.forEach((t) => t.classList.toggle("active", t === tab));
        currentTab = tab.dataset.tab;
        renderUsers();
    });
});


if (friendsSearchInput) {
    friendsSearchInput.addEventListener("input", () => {
        currentSearch = friendsSearchInput.value;
        friendsSearchClear.hidden = currentSearch.length === 0;
        renderUsers();
    });

    friendsSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            friendsSearchInput.value = "";
            currentSearch = "";
            friendsSearchClear.hidden = true;
            renderUsers();
        }
    });
}

if (friendsSearchClear) {
    friendsSearchClear.addEventListener("click", () => {
        friendsSearchInput.value = "";
        currentSearch = "";
        friendsSearchClear.hidden = true;
        renderUsers();
        friendsSearchInput.focus();
    });
}


/* =========================================================
   INIT
========================================================= */

loadUsers();
console.log("👥 Friends page loaded");