/* =========================================================
   SOCIALLY — Profile Page Logic
   Version 1.0 — Phase 3
   (Fetches user by ?id= query param and renders profile)
========================================================= */

"use strict";


/* =========================================================
   1. QUERY PARAM HELPER
========================================================= */

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}


/* =========================================================
   2. DOM
========================================================= */

const loadingEl        = document.getElementById("profileLoading");
const errorEl          = document.getElementById("profileError");
const errorMessageEl   = document.getElementById("profileErrorMessage");
const contentEl        = document.getElementById("profileContent");

const coverEl          = document.getElementById("profileCover");
const avatarEl         = document.getElementById("profileAvatar");
const nameEl           = document.getElementById("profileName");
const headlineEl       = document.getElementById("profileHeadline");
const roleEl           = document.getElementById("profileRole");
const locationEl       = document.getElementById("profileLocation");

const statFriendsEl    = document.getElementById("statFriends");
const statPostsEl      = document.getElementById("statPosts");
const statLikesEl      = document.getElementById("statLikes");
const statJoinedEl     = document.getElementById("statJoined");

const aboutBioEl       = document.getElementById("aboutBio");
const aboutUsernameEl  = document.getElementById("aboutUsername");
const aboutRoleEl      = document.getElementById("aboutRole");
const aboutLocationEl  = document.getElementById("aboutLocation");
const aboutJoinedEl    = document.getElementById("aboutJoined");

const friendsGridEl    = document.getElementById("friendsGrid");

const addFriendBtn     = document.getElementById("addFriendBtn");
const messageBtn       = document.getElementById("messageBtn");

const profileTabs      = document.querySelectorAll(".profile-tab");
const profileTabContents = document.querySelectorAll(".profile-tab-content");


/* =========================================================
   3. STATE
========================================================= */

let currentProfile = null;


/* =========================================================
   4. SHOW / HIDE HELPERS
========================================================= */

function showLoading() {
    loadingEl.hidden = false;
    errorEl.hidden = true;
    contentEl.hidden = true;
}

function showError(message) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    contentEl.hidden = true;

    if (errorMessageEl) errorMessageEl.textContent = message;
}

function showContent() {
    loadingEl.hidden = true;
    errorEl.hidden = true;
    contentEl.hidden = false;
}


/* =========================================================
   5. RENDER PROFILE
========================================================= */

function renderProfile(user) {
    currentProfile = user;

    /* Cover */
    if (coverEl) {
        coverEl.className = `profile-cover ${user.cover || "gradient-1"}`;
    }

    /* Hero */
    if (avatarEl)  avatarEl.textContent = user.avatar || "?";
    if (nameEl)    nameEl.textContent = user.name || "Unknown";
    if (headlineEl) headlineEl.textContent = user.headline || "";
    if (roleEl)    roleEl.textContent = user.role || "";
    if (locationEl) locationEl.textContent = user.location || "";

    /* Stats */
    if (statFriendsEl) statFriendsEl.textContent = user.stats?.friends ?? 0;
    if (statPostsEl)   statPostsEl.textContent   = user.stats?.posts ?? 0;
    if (statLikesEl)   statLikesEl.textContent   = user.stats?.likes ?? 0;
    if (statJoinedEl)  statJoinedEl.textContent  = user.joined || "—";

    /* About tab */
    if (aboutBioEl)      aboutBioEl.textContent      = user.bio || "No bio yet.";
    if (aboutUsernameEl) aboutUsernameEl.textContent = "@" + (user.username || "");
    if (aboutRoleEl)     aboutRoleEl.textContent     = user.role || "—";
    if (aboutLocationEl) aboutLocationEl.textContent = user.location || "—";
    if (aboutJoinedEl)   aboutJoinedEl.textContent   = user.joined || "—";

    /* Friend button state (only show if not own profile) */
    if (addFriendBtn) {
        const isOwnProfile = user.id === "u1";

        if (isOwnProfile) {
            addFriendBtn.style.display = "none";
        } else {
            addFriendBtn.style.display = "";
        }
    }

    /* Update page title */
    document.title = `${user.name} — Socially`;

    showContent();
}


/* =========================================================
   6. RENDER FRIENDS GRID
========================================================= */

async function renderFriends(friendIds) {
    if (!friendsGridEl) return;

    if (!Array.isArray(friendIds) || friendIds.length === 0) {
        friendsGridEl.innerHTML = `
            <div class="empty-tab-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">👥</div>
                <h3>No friends yet</h3>
                <p>This user hasn't added any friends.</p>
            </div>
        `;
        return;
    }

    try {
        const res = await fetch("/api/users");
        const allUsers = await res.json();

        const friends = friendIds
            .map((id) => allUsers.find((u) => u.id === id))
            .filter(Boolean);

        if (friends.length === 0) {
            friendsGridEl.innerHTML = `
                <div class="empty-tab-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">👥</div>
                    <h3>No friends to display</h3>
                </div>
            `;
            return;
        }

        friendsGridEl.innerHTML = friends
            .map(
                (f) => `
                    <a class="friend-card" href="profile.html?id=${encodeURIComponent(f.id)}">
                        <div class="avatar">${escapeHTML(f.avatar || "?")}</div>
                        <strong>${escapeHTML(f.name)}</strong>
                        <span>${escapeHTML(f.role || "")}</span>
                    </a>
                `
            )
            .join("");
    } catch (err) {
        console.error("Failed to render friends:", err);
        friendsGridEl.innerHTML = `
            <div class="empty-tab-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">⚠️</div>
                <h3>Could not load friends</h3>
            </div>
        `;
    }
}


/* =========================================================
   7. FETCH PROFILE FROM API
========================================================= */

async function fetchProfile(id) {
    showLoading();

    try {
        const res = await fetch(`/api/users/${encodeURIComponent(id)}`);

        if (!res.ok) {
            showError(`No user found with id "${id}".`);
            return;
        }

        const user = await res.json();

        renderProfile(user);
        await renderFriends(user.friends || []);

    } catch (err) {
        console.error("Failed to fetch profile:", err);
        showError("Could not reach the server. Is it running?");
    }
}


/* =========================================================
   8. TAB SWITCHING
========================================================= */

function setupTabs() {
    profileTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab;

            profileTabs.forEach((t) => {
                t.classList.toggle("active", t === tab);
            });

            profileTabContents.forEach((content) => {
                content.classList.toggle(
                    "active",
                    content.dataset.tabContent === target
                );
            });
        });
    });
}


/* =========================================================
   9. ADD FRIEND BUTTON
========================================================= */

function setupAddFriendButton() {
    if (!addFriendBtn) return;

    let requested = false;

    addFriendBtn.addEventListener("click", () => {
        requested = !requested;

        if (requested) {
            addFriendBtn.classList.add("requested");
            addFriendBtn.innerHTML = `<span>✓</span> Requested`;
            if (typeof showToast === "function") {
                showToast(`👥 Friend request sent to ${currentProfile?.name || "user"}`);
            }
        } else {
            addFriendBtn.classList.remove("requested");
            addFriendBtn.innerHTML = `<span>👥</span> Add Friend`;
            if (typeof showToast === "function") {
                showToast("↩️ Request cancelled");
            }
        }
    });
}


/* =========================================================
   10. MESSAGE BUTTON
========================================================= */

function setupMessageButton() {
    if (!messageBtn) return;

    messageBtn.addEventListener("click", () => {
        if (typeof showToast === "function") {
            showToast("💬 Messaging coming in a later phase");
        }
    });
}


/* =========================================================
   11. UTILITIES
========================================================= */

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   12. INIT
========================================================= */

function init() {
    setupTabs();
    setupAddFriendButton();
    setupMessageButton();

    const id = getQueryParam("id");

    if (!id) {
        showError("No user id provided. Try profile.html?id=u1");
        return;
    }

    fetchProfile(id);

    console.log(`👤 Loading profile: ${id}`);
}


init();