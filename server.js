const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // tu carpeta con index.html y cliente

// === Manejo de salas ===
const rooms = {}; // { roomId: { players: {} } }

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("joinRoom", ({ roomId, name }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }

    if (Object.keys(rooms[roomId].players).length >= 12) {
      socket.emit("roomFull");
      return;
    }

    // Agregar jugador
    rooms[roomId].players[socket.id] = {
      id: socket.id,
      name,
      x: 0,
      y: 1,
      z: 0,
    };

    socket.join(roomId);

    // Avisar a todos
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("move", ({ roomId, x, y, z, rotY }) => {
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      rooms[roomId].players[socket.id].x = x;
      rooms[roomId].players[socket.id].y = y;
      rooms[roomId].players[socket.id].z = z;
      rooms[roomId].players[socket.id].rotY = rotY;

      io.to(roomId).emit("updatePlayers", rooms[roomId].players);
    }
  });

  socket.on("shoot", ({ roomId, dir }) => {
    io.to(roomId).emit("playerShoot", { id: socket.id, dir });
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor en puerto", PORT));
