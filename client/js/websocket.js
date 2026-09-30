/* =========================================================
   SOCIALLY — WebSocket Client
   Version 1.1 — Phase 8 + Phase 6 (Notifications)
========================================================= */

"use strict";


let socket = null;

function connectSocket() {
    if (typeof io !== "function") {
        console.warn("⚠️ Socket.IO client not loaded");
        return;
    }

    socket = io();

    socket.on("connect", () => {
        console.log("⚡ Real-time connected:", socket.id);
        if (typeof showToast === "function") {
            showToast("⚡ Real-time connected");
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("⚡ Real-time disconnected:", reason);
    });

    socket.on("connect_error", () => {
        /* Silent — only fires during nodemon restarts (expected) */
    });


    /* ---------------------------------------------------------
       POST EVENTS
    --------------------------------------------------------- */

    socket.on("post:created", (post) => {
        console.log("📩 post:created", post.id);

        if (typeof handleRealtimePostCreated === "function") {
            handleRealtimePostCreated(post);
        }

        if (typeof showToast === "function") {
            showToast(`📝 ${post.author.name} shared a new post`);
        }
    });

    socket.on("post:liked", (data) => {
        console.log("📩 post:liked", data.id, data.liked);
        if (typeof handleRealtimePostLiked === "function") {
            handleRealtimePostLiked(data);
        }
    });

    socket.on("post:commented", (data) => {
        console.log("📩 post:commented", data.postId);
        if (typeof handleRealtimePostCommented === "function") {
            handleRealtimePostCommented(data);
        }
    });


    /* ---------------------------------------------------------
       NOTIFICATION EVENT (Phase 6)
    --------------------------------------------------------- */

    socket.on("notification:new", (n) => {
        console.log("📩 notification:new", n.type, "→", n.recipientId);

        if (typeof handleRealtimeNotification === "function") {
            handleRealtimeNotification(n);
        }
    });
}


/* =========================================================
   AUTO-CONNECT
========================================================= */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connectSocket);
} else {
    connectSocket();
}