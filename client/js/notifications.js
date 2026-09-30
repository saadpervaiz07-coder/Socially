/* =========================================================
   SOCIALLY — Notifications Page
   Version 1.0 — Phase 6
========================================================= */

"use strict";


/* =========================================================
   1. CONFIG
========================================================= */

// const CURRENT_USER_ID = "u1";
/* NOTE: CURRENT_USER_ID is declared in app.js (loaded first) */


/* =========================================================
   2. DOM
========================================================= */

const notifLoading  = document.getElementById("notifLoading");
const notifEmpty    = document.getElementById("notifEmpty");
const notifList     = document.getElementById("notifList");
const markAllBtn    = document.getElementById("markAllReadBtn");
const clearAllBtn   = document.getElementById("clearAllBtn");
const navNotifCount = document.getElementById("navNotifCount");


/* =========================================================
   3. UTILITIES
========================================================= */

function esc(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60)   return "just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";

    return new Date(timestamp).toLocaleDateString();
}


/* =========================================================
   4. SHOW/HIDE
========================================================= */

function showLoading() {
    if (notifLoading) notifLoading.hidden = false;
    if (notifEmpty)   notifEmpty.hidden = true;
    if (notifList)    notifList.hidden = true;
}

function showEmpty() {
    if (notifLoading) notifLoading.hidden = true;
    if (notifEmpty)   notifEmpty.hidden = false;
    if (notifList)    notifList.hidden = true;
}

function showList() {
    if (notifLoading) notifLoading.hidden = true;
    if (notifEmpty)   notifEmpty.hidden = true;
    if (notifList)    notifList.hidden = false;
}


/* =========================================================
   5. UPDATE NAVBAR BADGE
========================================================= */

function updateNavBadge(count) {
    if (!navNotifCount) return;

    if (count > 0) {
        navNotifCount.textContent = count > 9 ? "9+" : String(count);
        navNotifCount.hidden = false;
    } else {
        navNotifCount.hidden = true;
    }
}


/* =========================================================
   6. RENDER ONE NOTIFICATION
========================================================= */

function renderNotification(n) {
    const a = document.createElement("div");
    a.className = "notif-item" + (n.read ? "" : " unread");
    a.dataset.notifId = n.id;

    /* Type icon */
    let typeIcon = "❤️";
    let typeClass = "like";
    let actionText = "liked your post";

    if (n.type === "comment") {
        typeIcon = "💬";
        typeClass = "comment";
        actionText = "commented on your post";
    } else if (n.type === "friend_request") {
        typeIcon = "👥";
        typeClass = "friend";
        actionText = "sent you a friend request";
    }

    a.innerHTML = `
        <div class="notif-avatar">
            ${esc(n.actor.avatar)}
            <div class="notif-type-icon ${typeClass}">${typeIcon}</div>
        </div>

        <div class="notif-body">
            <p>
                <strong>${esc(n.actor.name)}</strong>
                ${actionText}
            </p>
            ${n.preview ? `<span class="notif-preview">"${esc(n.preview)}"</span>` : ""}
            <span class="notif-time">${timeAgo(n.createdAt)}</span>
        </div>

        <button class="notif-delete" title="Delete" data-notif-id="${esc(n.id)}">✕</button>
    `;

    /* Click on the item → mark read + go to post/actor */
    a.addEventListener("click", async (e) => {
        /* Ignore if user clicked delete */
        if (e.target.closest(".notif-delete")) return;

        if (!n.read) {
            await markOneRead(n.id);
            a.classList.remove("unread");
        }

        /* Navigate to the actor's profile */
        window.location.href = `profile.html?id=${encodeURIComponent(n.actor.id)}`;
    });

    /* Delete button */
    const del = a.querySelector(".notif-delete");
    del.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteNotification(n.id);
    });

    return a;
}


/* =========================================================
   7. RENDER FULL LIST
========================================================= */

function renderList(notifications) {
    if (!notifList) return;

    notifList.innerHTML = "";

    if (!notifications || notifications.length === 0) {
        showEmpty();
        updateNavBadge(0);
        return;
    }

    notifications.forEach((n) => {
        notifList.appendChild(renderNotification(n));
    });

    const unread = notifications.filter((n) => !n.read).length;
    updateNavBadge(unread);

    showList();
}


/* =========================================================
   8. LOAD
========================================================= */

async function loadNotifications() {
    showLoading();

    try {
        const res = await fetch(`/api/notifications/${CURRENT_USER_ID}`);
        const list = await res.json();
        renderList(list);
    } catch (err) {
        console.error("Failed to load notifications:", err);
        showEmpty();
    }
}


/* =========================================================
   9. MARK ONE READ
========================================================= */

async function markOneRead(notifId) {
    try {
        await fetch(`/api/notifications/${CURRENT_USER_ID}/${encodeURIComponent(notifId)}/read`, {
            method: "POST"
        });

        /* Decrement badge */
        const current = parseInt(navNotifCount?.textContent || "0", 10);
        if (current > 0) updateNavBadge(current - 1);
    } catch (err) {
        console.error("Failed to mark read:", err);
    }
}


/* =========================================================
   10. MARK ALL READ
========================================================= */

async function markAllRead() {
    try {
        await fetch(`/api/notifications/${CURRENT_USER_ID}/read-all`, {
            method: "POST"
        });

        document.querySelectorAll(".notif-item.unread").forEach((el) => {
            el.classList.remove("unread");
        });

        updateNavBadge(0);

        if (typeof showToast === "function") showToast("✓ All marked as read");
    } catch (err) {
        console.error("Failed to mark all read:", err);
    }
}


/* =========================================================
   11. DELETE ONE
========================================================= */

async function deleteNotification(notifId) {
    const item = document.querySelector(`[data-notif-id="${notifId}"]`);
    const wasUnread = item?.classList.contains("unread");

    try {
        await fetch(`/api/notifications/${CURRENT_USER_ID}/${encodeURIComponent(notifId)}`, {
            method: "DELETE"
        });

        item?.remove();

        /* If list is now empty, show empty state */
        if (notifList && notifList.children.length === 0) {
            showEmpty();
        }

        /* Update badge */
        if (wasUnread) {
            const current = parseInt(navNotifCount?.textContent || "0", 10);
            if (current > 0) updateNavBadge(current - 1);
        }

        if (typeof showToast === "function") showToast("🗑️ Notification deleted");
    } catch (err) {
        console.error("Failed to delete:", err);
    }
}


/* =========================================================
   12. CLEAR ALL
========================================================= */

async function clearAll() {
    if (!confirm("Delete all notifications? This cannot be undone.")) return;

    try {
        await fetch(`/api/notifications/${CURRENT_USER_ID}`, {
            method: "DELETE"
        });

        if (notifList) notifList.innerHTML = "";
        updateNavBadge(0);
        showEmpty();

        if (typeof showToast === "function") showToast("🗑️ All notifications cleared");
    } catch (err) {
        console.error("Failed to clear all:", err);
    }
}


/* =========================================================
   13. REAL-TIME HANDLER
   (Called from websocket.js when notification:new arrives)
========================================================= */

function handleRealtimeNotification(n) {
    /* Only show if it's for ME */
    if (n.recipientId !== CURRENT_USER_ID) return;

    /* If on the notifications page, prepend to list */
    if (notifList) {
        if (notifList.hidden || notifEmpty?.hidden === false) {
            notifList.innerHTML = "";
            showList();
        }

        const item = renderNotification(n);
        notifList.insertBefore(item, notifList.firstChild);
    }

    /* Update navbar badge */
    const current = parseInt(navNotifCount?.textContent || "0", 10);
    updateNavBadge(current + 1);

    /* Toast */
    if (typeof showToast === "function") {
        if (n.type === "like") {
            showToast(`❤️ ${n.actor.name} liked your post`);
        } else if (n.type === "comment") {
            showToast(`💬 ${n.actor.name} commented on your post`);
        } else {
            showToast(`🔔 New notification from ${n.actor.name}`);
        }
    }
}


/* =========================================================
   14. WIRE UP
========================================================= */

if (markAllBtn) markAllBtn.addEventListener("click", markAllRead);
if (clearAllBtn) clearAllBtn.addEventListener("click", clearAll);


/* =========================================================
   15. INIT
========================================================= */

loadNotifications();
console.log("🔔 Notifications page loaded");