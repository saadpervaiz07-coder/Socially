/* =========================================================
   SOCIALLY — Main Server
   Version 1.4 — Phase 6 (Notifications)
   Express + Socket.IO + JSON data layer
========================================================= */

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

/* ---------------------------------------------------------
   PATHS
--------------------------------------------------------- */

const CLIENT_DIR         = path.join(__dirname, "../client");
const DATA_DIR           = path.join(__dirname, "data");
const USERS_FILE         = path.join(DATA_DIR, "users.json");
const POSTS_FILE         = path.join(DATA_DIR, "posts.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");


/* ---------------------------------------------------------
   MIDDLEWARE
--------------------------------------------------------- */

app.use(express.json());
app.use(express.static(CLIENT_DIR));


/* ---------------------------------------------------------
   DATA HELPERS
--------------------------------------------------------- */

function readJSON(filePath, fallback = []) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, "utf-8").trim();
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        console.error(`Failed to read ${filePath}:`, err.message);
        return fallback;
    }
}

function writeJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
        return true;
    } catch (err) {
        console.error(`Failed to write ${filePath}:`, err.message);
        return false;
    }
}

function getUsers()         { return readJSON(USERS_FILE, []); }
function getPosts()         { return readJSON(POSTS_FILE, []); }
function getNotifications() { return readJSON(NOTIFICATIONS_FILE, []); }
function savePosts(posts)   { return writeJSON(POSTS_FILE, posts); }
function saveNotifications(list) { return writeJSON(NOTIFICATIONS_FILE, list); }


/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function enrichPost(post, users) {
    const author = users.find((u) => u.id === post.authorId);

    const comments = (post.comments || []).map((c) => {
        const commenter = users.find((u) => u.id === c.authorId);
        return {
            id: c.id,
            text: c.text,
            createdAt: c.createdAt,
            author: commenter
                ? { id: commenter.id, name: commenter.name, avatar: commenter.avatar }
                : { id: c.authorId, name: "Unknown", avatar: "?" }
        };
    });

    return {
        id: post.id,
        content: post.content,
        image: post.image,
        createdAt: post.createdAt,
        likes: post.likes || [],
        likeCount: (post.likes || []).length,
        commentCount: comments.length,
        comments,
        author: author
            ? { id: author.id, name: author.name, avatar: author.avatar, role: author.role }
            : { id: post.authorId, name: "Unknown", avatar: "?", role: "" }
    };
}


/* ---------------------------------------------------------
   NOTIFICATION HELPER
   Creates + persists + broadcasts a notification
   Skips if actor === recipient (don't notify yourself)
--------------------------------------------------------- */

function createNotification({ recipientId, actorId, type, postId, preview }) {
    if (!recipientId || !actorId) return null;
    if (recipientId === actorId) return null;   // don't notify yourself

    const users = getUsers();
    const actor = users.find((u) => u.id === actorId);
    if (!actor) return null;

    const list = getNotifications();

    const notification = {
        id: "n" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        recipientId,
        actorId,
        type,               // "like" | "comment" | "friend_request"
        postId: postId || null,
        preview: preview || "",
        read: false,
        createdAt: Date.now()
    };

    list.push(notification);

    /* Keep only the last 100 notifications per user to avoid bloat */
    const trimmed = list.slice(-300);
    saveNotifications(trimmed);

    /* Enrich for broadcast */
    const enriched = {
        ...notification,
        actor: {
            id: actor.id,
            name: actor.name,
            avatar: actor.avatar
        }
    };

    /* ✅ REAL-TIME: only send to the recipient */
    io.emit("notification:new", enriched);
    console.log("🔔 Notification:", type, actorId, "→", recipientId);

    return enriched;
}


/* ---------------------------------------------------------
   SOCKET.IO
--------------------------------------------------------- */

io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});


/* ---------------------------------------------------------
   API — STATUS
--------------------------------------------------------- */

app.get("/api/status", (req, res) => {
    res.json({
        app: "Socially",
        status: "running",
        message: "Socially server is working!"
    });
});


/* ---------------------------------------------------------
   API — USERS
--------------------------------------------------------- */

app.get("/api/users", (req, res) => {
    const users = getUsers();

    const safeUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        role: u.role,
        headline: u.headline,
        location: u.location,
        cover: u.cover,
        stats: u.stats
    }));

    res.json(safeUsers);
});


app.get("/api/users/:id", (req, res) => {
    const users = getUsers();
    const user = users.find((u) => u.id === req.params.id);

    if (!user) {
        return res.status(404).json({ error: "User not found", id: req.params.id });
    }

    res.json(user);
});


/* ---------------------------------------------------------
   API — POSTS
--------------------------------------------------------- */

app.get("/api/posts", (req, res) => {
    const posts = getPosts().sort((a, b) => b.createdAt - a.createdAt);
    const users = getUsers();
    res.json(posts.map((p) => enrichPost(p, users)));
});


app.post("/api/posts", (req, res) => {
    const { authorId, content } = req.body;

    if (!authorId || !content || !content.trim()) {
        return res.status(400).json({ error: "authorId and content are required" });
    }

    const users = getUsers();
    const author = users.find((u) => u.id === authorId);
    if (!author) return res.status(404).json({ error: "Author not found" });

    const posts = getPosts();

    const newPost = {
        id: "p" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        authorId,
        content: content.trim(),
        image: null,
        createdAt: Date.now(),
        likes: [],
        comments: []
    };

    posts.push(newPost);
    savePosts(posts);

    const enriched = enrichPost(newPost, users);
    io.emit("post:created", enriched);

    res.status(201).json(enriched);
});


/* Toggle like — sends notification to post author */
app.post("/api/posts/:id/like", (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const posts = getPosts();
    const post = posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.likes = post.likes || [];

    const idx = post.likes.indexOf(userId);
    let liked;

    if (idx === -1) {
        post.likes.push(userId);
        liked = true;
    } else {
        post.likes.splice(idx, 1);
        liked = false;
    }

    savePosts(posts);

    const payload = {
        id: post.id,
        liked,
        likeCount: post.likes.length,
        likes: post.likes,
        userId
    };

    io.emit("post:liked", payload);

    /* 🔔 Notify the post author (only on LIKE, not on unlike) */
    if (liked) {
        createNotification({
            recipientId: post.authorId,
            actorId: userId,
            type: "like",
            postId: post.id,
            preview: post.content.slice(0, 60)
        });
    }

    res.json(payload);
});


/* Add comment — sends notification to post author */
app.post("/api/posts/:id/comment", (req, res) => {
    const { userId, text } = req.body;

    if (!userId || !text || !text.trim()) {
        return res.status(400).json({ error: "userId and text are required" });
    }

    const users = getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = getPosts();
    const post = posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments = post.comments || [];

    const newComment = {
        id: "c" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        authorId: userId,
        text: text.trim(),
        createdAt: Date.now()
    };

    post.comments.push(newComment);
    savePosts(posts);

    const payload = {
        postId: post.id,
        id: newComment.id,
        text: newComment.text,
        createdAt: newComment.createdAt,
        author: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
        },
        commentCount: post.comments.length
    };

    io.emit("post:commented", payload);

    /* 🔔 Notify the post author */
    createNotification({
        recipientId: post.authorId,
        actorId: userId,
        type: "comment",
        postId: post.id,
        preview: text.slice(0, 60)
    });

    res.status(201).json(payload);
});


/* ---------------------------------------------------------
   API — NOTIFICATIONS
--------------------------------------------------------- */

/* Get notifications for a user (most recent first) */
app.get("/api/notifications/:userId", (req, res) => {
    const list = getNotifications();
    const users = getUsers();

    const mine = list
        .filter((n) => n.recipientId === req.params.userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 50);

    const enriched = mine.map((n) => {
        const actor = users.find((u) => u.id === n.actorId);
        return {
            ...n,
            actor: actor
                ? { id: actor.id, name: actor.name, avatar: actor.avatar }
                : { id: n.actorId, name: "Unknown", avatar: "?" }
        };
    });

    res.json(enriched);
});


/* Mark all notifications as read */
app.post("/api/notifications/:userId/read-all", (req, res) => {
    const list = getNotifications();
    let changed = 0;

    list.forEach((n) => {
        if (n.recipientId === req.params.userId && !n.read) {
            n.read = true;
            changed++;
        }
    });

    if (changed > 0) saveNotifications(list);

    res.json({ ok: true, changed });
});


/* Mark single notification as read */
app.post("/api/notifications/:userId/:notifId/read", (req, res) => {
    const list = getNotifications();
    const notif = list.find(
        (n) => n.id === req.params.notifId && n.recipientId === req.params.userId
    );

    if (!notif) return res.status(404).json({ error: "Notification not found" });

    notif.read = true;
    saveNotifications(list);

    res.json({ ok: true });
});


/* Delete a single notification */
app.delete("/api/notifications/:userId/:notifId", (req, res) => {
    const list = getNotifications();
    const filtered = list.filter(
        (n) => !(n.id === req.params.notifId && n.recipientId === req.params.userId)
    );

    saveNotifications(filtered);

    res.json({ ok: true });
});


/* Clear all notifications for a user */
app.delete("/api/notifications/:userId", (req, res) => {
    const list = getNotifications();
    const filtered = list.filter((n) => n.recipientId !== req.params.userId);

    saveNotifications(filtered);

    res.json({ ok: true });
});


/* ---------------------------------------------------------
   START
--------------------------------------------------------- */

server.listen(PORT, () => {
    console.log(`Socially is running at http://localhost:${PORT}`);
    console.log(`⚡ Socket.IO listening for real-time connections`);
    console.log(`🔔 Notifications API ready`);
});