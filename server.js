// server.js
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const players = new Map(); // socketId -> { x,y,z, rx,ry,rz, hp }

io.on('connection', (socket) => {
  // Estado inicial del nuevo jugador
  players.set(socket.id, {
    x: 0, y: 1.2, z: 0,
    rx: 0, ry: 0, rz: 0,
    hp: 100,
  });

  // Enviar a este jugador quiénes están ya conectados
  socket.emit('currentPlayers', Object.fromEntries(players));

  // Avisar a todos del nuevo jugador
  io.emit('playerJoined', { id: socket.id, state: players.get(socket.id) });

  // Actualizaciones de pose (posición/rotación)
  socket.on('updateState', (state) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.x = state.x; p.y = state.y; p.z = state.z;
    p.rx = state.rx; p.ry = state.ry; p.rz = state.rz;
    // Reenvía a los demás (no al mismo)
    socket.broadcast.emit('playerMoved', { id: socket.id, state: p });
  });

  // Disparo (raycast resuelto en el cliente que impacta)
  socket.on('shotFired', (data) => {
    // Solo se retransmite para efectos (muzzle/sonido) y para que
    // el cliente impactado verifique si le pegó
    socket.broadcast.emit('shotFired', { id: socket.id, data });
  });

  // Reporte de impacto (cliente que calcula raycast manda a server)
  socket.on('hitPlayer', ({ targetId, damage }) => {
    const victim = players.get(targetId);
    if (!victim) return;
    victim.hp = Math.max(0, victim.hp - (damage || 20));
    io.emit('playerDamaged', { id: targetId, hp: victim.hp });
    if (victim.hp <= 0) {
      // Respawn sencillo
      victim.hp = 100;
      victim.x = (Math.random() - 0.5) * 10;
      victim.z = (Math.random() - 0.5) * 10;
      victim.y = 1.2;
      io.emit('playerRespawn', { id: targetId, state: victim });
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('playerLeft', { id: socket.id });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
