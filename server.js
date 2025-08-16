import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const players = new Map(); // id -> {id,x,y,z,ry,hp,name,color}
let bullets = [];          // {id, ownerId, x,y,z, vx,vy,vz, bornAt}

const TICK_RATE = 20;      // 20Hz
const BULLET_SPEED = 35;
const BULLET_TTL_MS = 1500;
const PLAYER_RADIUS = 0.8; // para colisiones simples
const BULLET_RADIUS = 0.2;
const HIT_DAMAGE = 25;

io.on('connection', (socket) => {
  // Crear jugador
  const color = randomColor();
  const spawn = { x: (Math.random()-0.5)*20, y: 1.0, z: (Math.random()-0.5)*20, ry: 0 };
  const player = { id: socket.id, ...spawn, hp: 100, name: `P${socket.id.slice(0,4)}`, color };
  players.set(socket.id, player);

  // Enviar snapshot inicial al jugador
  socket.emit('init', { selfId: socket.id, players: Array.from(players.values()) });
  // Anunciar nuevo jugador
  socket.broadcast.emit('player:join', player);

  socket.on('state:update', (data) => {
    const p = players.get(socket.id);
    if (!p) return;
    // Saneamiento básico
    if (typeof data.x === 'number') p.x = clamp(data.x, -100, 100);
    if (typeof data.y === 'number') p.y = clamp(data.y, 0, 20);
    if (typeof data.z === 'number') p.z = clamp(data.z, -100, 100);
    if (typeof data.ry === 'number') p.ry = data.ry % (Math.PI*2);
  });

  socket.on('shoot', (data) => {
    const p = players.get(socket.id);
    if (!p) return;
    const dir = normalize(data.dir || {x:0,y:0,z:-1});
    const b = {
      id: `${socket.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ownerId: socket.id,
      x: p.x, y: p.y + 0.6, z: p.z,
      vx: dir.x * BULLET_SPEED,
      vy: dir.y * BULLET_SPEED,
      vz: dir.z * BULLET_SPEED,
      bornAt: Date.now()
    };
    bullets.push(b);
    io.emit('bullet:spawn', b);
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('player:leave', socket.id);
  });
});

// Bucle simple del servidor (movimiento de balas + colisiones + broadcast)
setInterval(() => {
  const now = Date.now();
  // Actualizar balas
  bullets.forEach((b) => {
    const dt = 1 / TICK_RATE;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
  });

  // Colisiones bala-jugador (muy simple: esfera-esfera)
  const alivePlayers = Array.from(players.values());
  const remaining = [];
  for (const b of bullets) {
    let hit = false;
    for (const p of alivePlayers) {
      if (p.id === b.ownerId) continue;
      const d2 = dist2(b.x, b.y, b.z, p.x, p.y + 0.6, p.z);
      const r = PLAYER_RADIUS + BULLET_RADIUS;
      if (d2 <= r * r) {
        p.hp = Math.max(0, p.hp - HIT_DAMAGE);
        io.emit('player:hit', { playerId: p.id, hp: p.hp, by: b.ownerId });
        hit = true;
        if (p.hp === 0) {
          // "respawn" rápido
          p.x = (Math.random()-0.5)*20;
          p.y = 1.0;
          p.z = (Math.random()-0.5)*20;
          p.ry = 0;
          p.hp = 100;
          io.emit('player:respawn', { playerId: p.id, x: p.x, y: p.y, z: p.z, ry: p.ry, hp: p.hp });
        }
        break;
      }
    }
    const tooOld = now - b.bornAt > BULLET_TTL_MS;
    if (!hit && !tooOld) remaining.push(b);
  }
  bullets = remaining;

  // Broadcast snapshot ligero
  io.emit('state:snapshot', { players: alivePlayers.map(p => ({ id: p.id, x: p.x, y: p.y, z: p.z, ry: p.ry, hp: p.hp })) });
}, 1000 / TICK_RATE);

httpServer.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});

// Utilidades
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist2(ax,ay,az,bx,by,bz){ const dx=ax-bx,dy=ay-by,dz=az-bz; return dx*dx+dy*dy+dz*dz; }
function normalize(v){ const m=Math.hypot(v.x||0,v.y||0,v.z||0)||1; return {x:(v.x||0)/m,y:(v.y||0)/m,z:(v.z||0)/m}; }
function randomColor(){
  const palette = ['#6ecb63','#5aa9e6','#f06543','#ffbe0b','#9b5de5','#00bbf9','#00f5d4'];
  return palette[Math.floor(Math.random()*palette.length)];
}
