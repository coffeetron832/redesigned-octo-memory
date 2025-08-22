// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] } // restringe en producción
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.send("ok"));

// Endpoint para listar salas (útil si usas fetch)
app.get("/rooms", (req, res) => {
  const list = Object.entries(rooms).map(([id, room]) => ({
    id,
    count: Object.keys(room.players).length
  }));
  res.json(list);
});

// === Rooms storage ===
const rooms = {}; // { roomId: { players: { socketId: { id, name, x, y, z, rotY, hp } } } }

function emitRoomsListToAll() {
  const list = Object.entries(rooms).map(([id, room]) => ({
    id,
    count: Object.keys(room.players).length
  }));
  io.emit("roomsList", list);
}

io.on("connection", (socket) => {
  console.log("[io] connected:", socket.id);

  // Client asks for rooms list
  socket.on("listRooms", () => {
    const list = Object.entries(rooms).map(([id, room]) => ({
      id,
      count: Object.keys(room.players).length
    }));
    socket.emit("roomsList", list);
  });

  socket.on("joinRoom", (payload) => {
    const roomId = payload && payload.room ? String(payload.room) : (payload && payload.roomId ? String(payload.roomId) : null) || payload;
    const name = payload && payload.name ? String(payload.name) : ("player_" + socket.id.slice(0,5));
    if (!roomId) {
      socket.emit("joinError", { msg: "roomId missing" });
      return;
    }

    if (!rooms[roomId]) rooms[roomId] = { players: {} };
    const count = Object.keys(rooms[roomId].players).length;
    if (count >= 12) {
      socket.emit("roomFull", { roomId });
      return;
    }

    // spawn coords random small offset
    const spawn = { x: (Math.random()-0.5)*2, y:1, z:(Math.random()-0.5)*2, rotY:0, hp:100 };
    rooms[roomId].players[socket.id] = { id: socket.id, name, ...spawn };

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    // inform the new client
    socket.emit("init", { id: socket.id });

    // send current players in room to the newcomer
    socket.emit("currentPlayers", rooms[roomId].players);

    // notify others
    socket.to(roomId).emit("playerJoined", { id: socket.id, state: rooms[roomId].players[socket.id] });

    // snapshot to room
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);

    // update global rooms list (so UI updates)
    emitRoomsListToAll();

    console.log(`[io] ${socket.id} joined ${roomId} (players: ${Object.keys(rooms[roomId].players).length})`);
  });

  socket.on("updatePos", (data) => {
    const room = (data && data.room) ? String(data.room) : socket.data.roomId;
    if (!room || !rooms[room] || !rooms[room].players[socket.id]) return;
    const p = rooms[room].players[socket.id];
    if (typeof data.x === "number") p.x = data.x;
    if (typeof data.y === "number") p.y = data.y;
    if (typeof data.z === "number") p.z = data.z;
    if (typeof data.rot === "number") p.rotY = data.rot;
    // broadcast incremental update
    socket.to(room).emit("playerMoved", { id: socket.id, state: { x: p.x, y: p.y, z: p.z, rot: p.rotY }});
  });

  socket.on("shoot", (data) => {
    const room = data && data.room ? String(data.room) : socket.data.roomId;
    if (!room) return;
    io.to(room).emit("playerShoot", { id: socket.id, origin: data.origin || null, forward: data.forward || data.dir || null });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      console.log("[io] disconnect (no room):", socket.id);
      return;
    }
    if (!rooms[roomId]) return;

    if (rooms[roomId].players[socket.id]) {
      delete rooms[roomId].players[socket.id];
      socket.to(roomId).emit("playerLeft", { id: socket.id });
      io.to(roomId).emit("updatePlayers", rooms[roomId].players);
      console.log(`[io] ${socket.id} left ${roomId}`);
    }

    // cleanup empty room
    if (Object.keys(rooms[roomId].players).length === 0) {
      delete rooms[roomId];
      console.log(`[io] cleaned empty room ${roomId}`);
    }

    // update rooms list for all
    emitRoomsListToAll();
  });

  socket.on("error", (err) => {
    console.warn("[io] socket error:", socket.id, err);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server escuchando en puerto ${PORT}`));
