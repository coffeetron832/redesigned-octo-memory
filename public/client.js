import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

const canvas = document.getElementById('game');
const startBtn = document.getElementById('startBtn');
const hpEl = document.getElementById('hp');
const playersEl = document.getElementById('players');
const pingEl = document.getElementById('ping');

const socket = io(); // del script /socket.io/socket.io.js

// Escena base
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 1.2, 5);

const controls = new PointerLockControls(camera, document.body);

const light = new THREE.HemisphereLight(0xffffff, 0x223344, 0.9);
scene.add(light);
const dir = new THREE.DirectionalLight(0xffffff, 0.4);
dir.position.set(5, 10, 2);
scene.add(dir);

// Mapa low-poly
const groundGeo = new THREE.PlaneGeometry(120, 120, 10, 10);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 1, metalness: 0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);

// Obstáculos simples
for (let i = 0; i < 18; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1 + Math.random()*2, 1 + Math.random()*2, 1 + Math.random()*2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.3, 0.55) })
  );
  box.position.set((Math.random()-0.5)*60, box.geometry.parameters.height/2, (Math.random()-0.5)*60);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
}

// Estados
let selfId = null;
let hp = 100;
let lastPing = '--';
const key = {};
const speed = 7.0;
const players = new Map(); // id -> mesh
const nameplates = new Map(); // id -> Sprite
const bullets = new Map(); // id -> mesh

// Helper: crear jugador (cubo)
function makePlayer(color = '#5aa9e6') {
  const geom = new THREE.BoxGeometry(0.8, 1.6, 0.8);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  return mesh;
}

function makeNameplate(text = 'P') {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0,0,128,32);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 16);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

function spawnPlayer(p) {
  if (players.has(p.id)) return;
  const mesh = makePlayer(p.color);
  mesh.position.set(p.x, p.y, p.z);
  scene.add(mesh);
  players.set(p.id, mesh);

  const tag = makeNameplate(p.name || p.id.slice(0,4));
  tag.position.set(0, 1.2, 0);
  mesh.add(tag);
  nameplates.set(p.id, tag);

  playersEl.textContent = `Jugadores: ${players.size}`;
}

function removePlayer(id) {
  const mesh = players.get(id);
  if (mesh) scene.remove(mesh);
  players.delete(id);
  nameplates.delete(id);
  playersEl.textContent = `Jugadores: ${players.size}`;
}

function spawnBullet(b) {
  if (bullets.has(b.id)) return;
  const geom = new THREE.SphereGeometry(0.12, 6, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffbe0b, emissive: 0x332200, emissiveIntensity: 0.5 });
  const m = new THREE.Mesh(geom, mat);
  m.position.set(b.x, b.y, b.z);
  scene.add(m);
  bullets.set(b.id, { mesh: m, data: b });
}

function removeBullet(id) {
  const entry = bullets.get(id);
  if (entry) scene.remove(entry.mesh);
  bullets.delete(id);
}

// Entrada
document.addEventListener('keydown', (e) => key[e.code] = true);
document.addEventListener('keyup', (e) => key[e.code] = false);

// Bloqueo de puntero para mirar/disparar
startBtn.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  startBtn.style.display = 'none';
});
controls.addEventListener('unlock', () => {
  startBtn.style.display = '';
});

// Disparo
document.addEventListener('mousedown', (e) => {
  if (!controls.isLocked) return;
  if (e.button !== 0) return;
  shoot();
});

function shoot() {
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  socket.emit('shoot', { dir: { x: dir.x, y: dir.y, z: dir.z } });
}

// Red: eventos
socket.on('init', ({ selfId: id, players: list }) => {
  selfId = id;
  list.forEach(spawnPlayer);
  playersEl.textContent = `Jugadores: ${players.size}`;
});

socket.on('player:join', (p) => spawnPlayer(p));
socket.on('player:leave', (id) => removePlayer(id));

socket.on('state:snapshot', ({ players: list }) => {
  list.forEach(p => {
    if (!players.has(p.id)) return;
    const m = players.get(p.id);
    // Interpolación ligera
    m.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.5);
    m.rotation.y = p.ry;
    if (p.id === selfId) {
      hp = p.hp;
      hpEl.textContent = `HP: ${hp}`;
    }
  });
});

socket.on('bullet:spawn', (b) => spawnBullet(b));

socket.on('player:hit', ({ playerId, hp: newHp }) => {
  if (playerId === selfId) {
    hp = newHp;
    hpEl.textContent = `HP: ${hp}`;
  }
});

socket.on('player:respawn', ({ playerId, x, y, z, ry, hp: newHp }) => {
  const m = players.get(playerId);
  if (m) {
    m.position.set(x, y, z);
    m.rotation.y = ry;
  }
  if (playerId === selfId) {
    hp = newHp;
    hpEl.textContent = `HP: ${hp}`;
  }
});

// Ping simple
setInterval(() => {
  const start = performance.now();
  socket.timeout(1000).emit('ping:check', () => {
    lastPing = Math.round(performance.now() - start) + 'ms';
    pingEl.textContent = 'Ping: ' + lastPing;
  });
}, 2000);
socket.on('connect', () => pingEl.textContent = 'Ping: --');

// Servidor eco para ping
socket.on('connect', () => {
  socket.on('ping:check', (cb) => cb && cb());
});

// Loop cliente
const clock = new THREE.Clock();

function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function update(dt) {
  // Movimiento local
  const dir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).negate();

  if (controls.isLocked) {
    if (key['KeyW']) dir.add(forward);
    if (key['KeyS']) dir.add(forward.clone().negate());
    if (key['KeyA']) dir.add(right.clone().negate());
    if (key['KeyD']) dir.add(right);
  }

  if (dir.lengthSq() > 0) {
    dir.normalize().multiplyScalar(speed * dt);
    camera.position.add(dir);
  }

  // Mantener "y" a 1.0 (sin gravedad en MVP)
  camera.position.y = 1.2;

  // Actualizar rotación (ry) y enviar al server
  const ry = camera.rotation.y;
  socket.emit('state:update', { x: camera.position.x, y: 1.0, z: camera.position.z, ry });

  // Seguir al propio "mesh" (si se quiere ver el propio cubo, opcional)
  const selfMesh = players.get(selfId);
  if (selfMesh) {
    selfMesh.position.set(camera.position.x, 1.0, camera.position.z);
    selfMesh.rotation.y = ry;
  }

  // Avanzar balas localmente
  const toDelete = [];
  bullets.forEach((entry, id) => {
    const b = entry.data; const m = entry.mesh;
    const dtLocal = dt;
    m.position.x += b.vx * dtLocal;
    m.position.y += b.vy * dtLocal;
    m.position.z += b.vz * dtLocal;
    // Despawn si se va lejos
    if (m.position.length() > 500) toDelete.push(id);
  });
  toDelete.forEach(removeBullet);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
