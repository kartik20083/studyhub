// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Railway deployment ready
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "studyhub-data.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// File upload
const upload = multer({ dest: "public/uploads/" });

// In-memory state
let state = { messages: [], notes: [] };

// Load persisted state
if (fs.existsSync(DATA_FILE)) {
  state = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

// Persist function
function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

// File upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Send initial state
  socket.emit("init", state);

  // Chat message
  socket.on("chat:send", (msg) => {
    const m = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      user: msg.user || "Anon",
      text: msg.text,
      ts: Date.now(),
    };
    state.messages.push(m);
    io.emit("chat:new", m);
    persist();
  });

  // Notes save
  socket.on("notes:save", (note) => {
    if (note.id) {
      const idx = state.notes.findIndex((n) => n.id === note.id);
      if (idx !== -1) state.notes[idx] = note;
    } else {
      note.id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      state.notes.push(note);
    }
    io.emit("notes:update", state.notes);
    persist();
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`StudyHub running at http://localhost:${PORT}`);
});
