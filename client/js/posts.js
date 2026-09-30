/* =========================================================
   SOCIALLY — Posts Feed
   Version 1.1 — Phase 8 (Real-Time Aware)
   (Fetch, render, create, like, comment — persisted + live)
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

const feedContainer  = document.getElementById("feedContainer");
const postInput      = document.getElementById("postInput");
const createPostBtn  = document.getElementById("createPostBtn");


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
    if (seconds < 3600) return Math.floor(seconds / 60) + "m";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h";
    if (seconds < 604800) return Math.floor(seconds / 86400) + "d";

    return new Date(timestamp).toLocaleDateString();
}


/* =========================================================
   4. RENDER SINGLE POST
========================================================= */

function renderPost(post) {
    const likedByMe = post.likes?.includes(CURRENT_USER_ID);

    const article = document.createElement("article");
    article.className = "card post";
    article.dataset.postId = post.id;

    const commentsHTML = (post.comments || [])
        .map(
            (c) => `
                <div class="comment-item">
                    <a href="profile.html?id=${encodeURIComponent(c.author.id)}" class="avatar-link">
                        <div class="avatar tiny-avatar">${esc(c.author.avatar)}</div>
                    </a>
                    <div class="comment-item-body">
                        <a href="profile.html?id=${encodeURIComponent(c.author.id)}" class="name-link">
                            <strong>${esc(c.author.name)}</strong>
                        </a>
                        <p>${esc(c.text)}</p>
                    </div>
                </div>
            `
        )
        .join("");

    article.innerHTML = `
        <div class="post-header">
            <div class="user-info">
                <a href="profile.html?id=${encodeURIComponent(post.author.id)}" class="avatar-link">
                    <div class="avatar">${esc(post.author.avatar)}</div>
                </a>
                <div>
                    <a href="profile.html?id=${encodeURIComponent(post.author.id)}" class="name-link">
                        <h3>${esc(post.author.name)}</h3>
                    </a>
                    <p>${esc(post.author.role)} · ${timeAgo(post.createdAt)}</p>
                </div>
            </div>
            <button class="more-btn" aria-label="More options">•••</button>
        </div>

        <div class="post-content">
            <p>${esc(post.content)}</p>
        </div>

        <div class="post-stats">
            <span class="stat-likes">❤️ <span class="like-count">${post.likeCount || 0}</span></span>
            <span class="stat-comments">💬 <span class="comment-count">${post.commentCount || 0}</span> comments</span>
        </div>

        <div class="post-buttons">
            <button class="post-action like-btn ${likedByMe ? "liked" : ""}">
                <span>❤️</span>
                Like
            </button>
            <button class="post-action comment-btn">
                <span>💬</span>
                Comment
            </button>
            <button class="post-action share-btn">
                <span>↗️</span>
                Share
            </button>
        </div>

        <div class="comment-list" ${post.comments?.length ? "" : "hidden"}>
            ${commentsHTML}
        </div>

        <div class="comment-box">
            <div class="avatar tiny-avatar">S</div>
            <input
                type="text"
                class="comment-input"
                placeholder="Write a comment..."
                maxlength="300"
            >
            <button class="comment-post-btn">Post</button>
        </div>
    `;

    /* Attach events */
    article.querySelector(".like-btn")
        .addEventListener("click", () => handleLike(post.id, article));

    article.querySelector(".comment-btn")
        .addEventListener("click", () => {
            const input = article.querySelector(".comment-input");
            input?.focus();
            input?.scrollIntoView({ behavior: "smooth", block: "center" });
        });

    article.querySelector(".share-btn")
        .addEventListener("click", () => {
            if (typeof showToast === "function") showToast("🔗 Share link copied (demo)");
        });

    article.querySelector(".more-btn")
        .addEventListener("click", () => {
            if (typeof showToast === "function") showToast("••• Options coming soon");
        });

    const commentBtn = article.querySelector(".comment-post-btn");
    const commentInput = article.querySelector(".comment-input");

    commentBtn.addEventListener("click", () => handleComment(post.id, article));
    commentInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleComment(post.id, article);
        }
    });

    return article;
}


/* =========================================================
   5. RENDER FULL FEED
========================================================= */

function renderFeed(posts) {
    if (!feedContainer) return;

    feedContainer.innerHTML = "";

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-feed">
                <div class="empty-icon">📭</div>
                <h3>No posts yet</h3>
                <p>Be the first to share something!</p>
            </div>
        `;
        return;
    }

    posts.forEach((post) => {
        feedContainer.appendChild(renderPost(post));
    });
}


/* =========================================================
   6. FETCH POSTS
========================================================= */

async function loadPosts() {
    try {
        const res = await fetch("/api/posts");
        const posts = await res.json();
        renderFeed(posts);
    } catch (err) {
        console.error("Failed to load posts:", err);
        if (feedContainer) {
            feedContainer.innerHTML = `
                <div class="empty-feed">
                    <div class="empty-icon">⚠️</div>
                    <h3>Could not load posts</h3>
                    <p>Is the server running?</p>
                </div>
            `;
        }
    }
}


/* =========================================================
   7. CREATE POST
========================================================= */

async function handleCreatePost() {
    if (!postInput) return;

    const content = postInput.value.trim();

    if (!content) {
        if (typeof showToast === "function") showToast("⚠️ Write something first");
        return;
    }

    createPostBtn.disabled = true;
    createPostBtn.textContent = "Posting…";

    try {
        const res = await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                authorId: CURRENT_USER_ID,
                content
            })
        });

        if (!res.ok) throw new Error("Server rejected post");

        postInput.value = "";

        /* NOTE: We DON'T manually prepend here.
           The WebSocket `post:created` event will handle it. */

        if (typeof showToast === "function") showToast("✅ Post created");

    } catch (err) {
        console.error("Failed to create post:", err);
        if (typeof showToast === "function") showToast("❌ Could not create post");
    } finally {
        createPostBtn.disabled = false;
        createPostBtn.textContent = "Post";
    }
}


/* =========================================================
   8. LIKE POST
========================================================= */

async function handleLike(postId, article) {
    try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: CURRENT_USER_ID })
        });

        if (!res.ok) throw new Error("Like failed");

        /* NOTE: UI update happens via WebSocket `post:liked` event */

        const result = await res.json();

        if (typeof showToast === "function") {
            showToast(result.liked ? "❤️ Post liked" : "💔 Like removed");
        }
    } catch (err) {
        console.error("Failed to like post:", err);
    }
}


/* =========================================================
   9. COMMENT ON POST
========================================================= */

async function handleComment(postId, article) {
    const input = article.querySelector(".comment-input");
    if (!input) return;

    const text = input.value.trim();

    if (!text) {
        if (typeof showToast === "function") showToast("⚠️ Write a comment first");
        return;
    }

    try {
        const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/comment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: CURRENT_USER_ID,
                text
            })
        });

        if (!res.ok) throw new Error("Comment failed");

        input.value = "";

        /* NOTE: UI update happens via WebSocket `post:commented` event */

        if (typeof showToast === "function") showToast("💬 Comment posted");
    } catch (err) {
        console.error("Failed to comment:", err);
    }
}


/* =========================================================
   10. REAL-TIME HANDLERS
   (Called from websocket.js)
========================================================= */

/* When any client creates a post → prepend to our feed */
function handleRealtimePostCreated(post) {
    if (!feedContainer) return;

    /* Avoid duplicate if post is already rendered */
    if (feedContainer.querySelector(`[data-post-id="${post.id}"]`)) {
        return;
    }

    /* Remove empty state if present */
    const emptyState = feedContainer.querySelector(".empty-feed");
    if (emptyState) emptyState.remove();

    const article = renderPost(post);
    feedContainer.insertBefore(article, feedContainer.firstChild);
}


/* When any client likes a post → update our UI */
function handleRealtimePostLiked(data) {
    const article = document.querySelector(`[data-post-id="${data.id}"]`);
    if (!article) return;

    const likeBtn = article.querySelector(".like-btn");
    const likeCount = article.querySelector(".like-count");

    if (likeCount) likeCount.textContent = data.likeCount;

    /* Only update the "liked" class if it's OUR like */
    if (likeBtn && data.userId === CURRENT_USER_ID) {
        likeBtn.classList.toggle("liked", data.liked);
    }
}


/* When any client comments → append to our UI */
function handleRealtimePostCommented(data) {
    const article = document.querySelector(`[data-post-id="${data.postId}"]`);
    if (!article) return;

    /* Avoid duplicate */
    if (article.querySelector(`[data-comment-id="${data.id}"]`)) return;

    const countEl = article.querySelector(".comment-count");
    if (countEl) countEl.textContent = data.commentCount;

    const list = article.querySelector(".comment-list");
    if (!list) return;

    list.hidden = false;

    const commentHTML = `
        <div class="comment-item" data-comment-id="${esc(data.id)}">
            <a href="profile.html?id=${encodeURIComponent(data.author.id)}" class="avatar-link">
                <div class="avatar tiny-avatar">${esc(data.author.avatar)}</div>
            </a>
            <div class="comment-item-body">
                <a href="profile.html?id=${encodeURIComponent(data.author.id)}" class="name-link">
                    <strong>${esc(data.author.name)}</strong>
                </a>
                <p>${esc(data.text)}</p>
            </div>
        </div>
    `;

    list.insertAdjacentHTML("beforeend", commentHTML);
}


/* =========================================================
   11. WIRE UP
========================================================= */

if (createPostBtn) {
    createPostBtn.addEventListener("click", handleCreatePost);
}

if (postInput) {
    postInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleCreatePost();
        }
    });
}


/* =========================================================
   12. INIT
========================================================= */

loadPosts();
console.log("📝 Posts feed loaded (real-time ready)");