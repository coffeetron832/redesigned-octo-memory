// server.js (mejorado)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Configura Socket.IO con CORS (evita problemas si el cliente está en otro origen)
const io = new Server(server, {
  cors: {
    origin: "*", // en producción restringe esto a tu dominio
    methods: ["GET","POST"]
  },
  // transports: ["websocket", "polling"] // opcional
});

// Servir carpeta pública
app.use(express.static(path.join(__dirname, "public")));

// health check
app.get("/health", (req, res) => res.send("ok"));

// Estructura de salas
// rooms = { roomId: { players: { socketId: { id, name, x, y, z, rotY, hp } } } }
const rooms = {};

io.on("connection", (socket) => {
  console.log("[io] connection:", socket.id);

  // joinRoom: { roomId, name }
  socket.on("joinRoom", (payload) => {
    try {
      const roomId = (payload && payload.roomId) ? String(payload.roomId) : null;
      const name = (payload && payload.name) ? String(payload.name) : ("player_" + socket.id.slice(0,5));
      if (!roomId) {
        socket.emit("joinError", { msg: "roomId missing" });
        return;
      }

      if (!rooms[roomId]) rooms[roomId] = { players: {} };

      const currentPlayers = Object.keys(rooms[roomId].players).length;
      if (currentPlayers >= 12) {
        socket.emit("roomFull", { roomId });
        console.log(`[io] ${socket.id} denied join to ${roomId} (full)`);
        return;
      }

      // spawn position (random small offset)
      const spawn = { x: (Math.random()-0.5)*2, y: 1, z: (Math.random()-0.5)*2, rotY: 0, hp: 100 };

      rooms[roomId].players[socket.id] = {
        id: socket.id,
        name,
        ...spawn
      };

      socket.join(roomId);
      socket.data.roomId = roomId; // store room on socket
      socket.data.name = name;

      // ack / init
      socket.emit("init", { id: socket.id });

      // current players to this new client
      socket.emit("currentPlayers", rooms[roomId].players);

      // tell others somebody joined
      socket.to(roomId).emit("playerJoined", { id: socket.id, state: rooms[roomId].players[socket.id] });

      // full snapshot to room (useful)
      io.to(roomId).emit("updatePlayers", rooms[roomId].players);

      console.log(`[io] ${socket.id} joined room ${roomId} (players: ${Object.keys(rooms[roomId].players).length})`);
    } catch (err) {
      console.error("joinRoom error:", err);
      socket.emit("joinError", { msg: "server error" });
    }
  });

  // update position: { id, room, x, y, z, rot }
  socket.on("updatePos", (data) => {
    const room = data && data.room ? String(data.room) : socket.data.roomId;
    if (!room || !rooms[room] || !rooms[room].players[socket.id]) return;

    const p = rooms[room].players[socket.id];
    if (typeof data.x === "number") p.x = data.x;
    if (typeof data.y === "number") p.y = data.y;
    if (typeof data.z === "number") p.z = data.z;
    if (typeof data.rot === "number" || typeof data.rotY === "number") p.rotY = (typeof data.rot === "number" ? data.rot : data.rotY);

    // broadcast incremental
    socket.to(room).emit("playerMoved", { id: socket.id, state: { x: p.x, y: p.y, z: p.z, rot: p.rotY }});

    // Optionally send full snapshot occasionally (not every tick)
    // io.to(room).emit("updatePlayers", rooms[room].players);
  });

  // shoot: { id, room, origin, forward } or { room, dir }
  socket.on("shoot", (data) => {
    const room = data && data.room ? String(data.room) : socket.data.roomId;
    if (!room) return;
    // forward origin could be arrays or objects; we just relay to room
    io.to(room).emit("playerShoot", { id: socket.id, origin: data.origin || null, forward: data.forward || data.dir || null });
  });

  // disconnect
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    console.log("[io] disconnect:", socket.id, "room:", roomId);
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    // remove player
    if (room.players[socket.id]) {
      delete room.players[socket.id];
      // notify remaining players
      socket.to(roomId).emit("playerLeft", { id: socket.id });
      io.to(roomId).emit("updatePlayers", room.players);

      console.log(`[io] ${socket.id} removed from ${roomId} (remaining: ${Object.keys(room.players).length})`);
    }

    // cleanup if empty
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomId];
      console.log(`[io] cleaned empty room ${roomId}`);
    }
  });

  // safety: catch-all error logging
  socket.on("error", (err) => {
    console.warn("[io] socket error:", socket.id, err);
  });
});

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server escuchando en puerto ${PORT}`));
