// ======= Config =======
const MOVE_SPEED = 6.0;       // m/s
const RUN_MULT = 1.6;
const MOUSE_SENS = 0.0022;
const SHOT_COOLDOWN = 200;    // ms
const BULLET_RANGE = 50;      // meters
const DAMAGE = 25;

// ======= Estado global =======
let scene, camera, renderer, controls, socket;
let local = {
  id: null,
  hp: 100,
  velocity: new THREE.Vector3(),
  canShoot: true,
  keys: { w:false,a:false,s:false,d:false,shift:false },
};
const others = new Map(); // id -> { mesh, hp }

// ======= Util: Low-Poly materiales =======
function lambert(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

// ======= Setup base =======
function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 5);

  // Luces sencillas
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.8);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5,10,3);
  scene.add(dir);

  // Piso
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(200,200, 10,10), lambert(0x2b2f3a));
  plane.rotation.x = -Math.PI/2;
  plane.receiveShadow = true;
  scene.add(plane);

  // Obstáculos low-poly
  const boxGeo = new THREE.BoxGeometry(2, 2, 2);
  for (let i=0;i<18;i++){
    const b = new THREE.Mesh(boxGeo, lambert(0x4b5563));
    b.position.set((Math.random()-0.5)*40, 1, (Math.random()-0.5)*40);
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
  }

  // Controles estilo FPS (Pointer Lock)
  controls = new PointerLockControls(camera, document.body);



  document.getElementById('startBtn').addEventListener('click', () => {
    controls.lock();
  });
  controls.addEventListener('lock', () => {
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
  });
  controls.addEventListener('unlock', () => {
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
  });

  // Capturar teclado
  const on = (e, v) => {
    if (e.code === 'KeyW') local.keys.w = v;
    if (e.code === 'KeyA') local.keys.a = v;
    if (e.code === 'KeyS') local.keys.s = v;
    if (e.code === 'KeyD') local.keys.d = v;
    if (e.code === 'ShiftLeft') local.keys.shift = v;
  };
  window.addEventListener('keydown', e => on(e, true));
  window.addEventListener('keyup', e => on(e, false));

  // Disparo con click
  window.addEventListener('mousedown', () => tryShoot());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ======= Jugador "capsula" para otros =======
function makePlayerMesh(color=0x8b5cf6) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), lambert(color));
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  // "Arma" simple
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 1), lambert(0x222));
  gun.position.set(0.4, 0.2, -0.4);
  g.add(gun);
  return g;
}

// ======= Red / Socket =======
function initNet() {
  socket = io();

  socket.on('connect', () => {
    local.id = socket.id;
  });

  socket.on('currentPlayers', (list) => {
    for (const [id, state] of Object.entries(list)) {
      if (id === local.id) continue;
      spawnOther(id, state);
    }
  });

  socket.on('playerJoined', ({ id, state }) => {
    if (id === local.id) return;
    spawnOther(id, state);
  });

  socket.on('playerMoved', ({ id, state }) => {
    const o = others.get(id);
    if (!o) return;
    o.mesh.position.set(state.x, state.y, state.z);
    o.mesh.rotation.set(state.rx, state.ry, state.rz);
  });

  socket.on('playerDamaged', ({ id, hp }) => {
    if (id === local.id) {
      local.hp = hp;
      document.getElementById('hp').textContent = `HP: ${hp}`;
    } else {
      const o = others.get(id);
      if (o) o.hp = hp;
    }
  });

  socket.on('playerRespawn', ({ id, state }) => {
    if (id === local.id) {
      local.hp = 100;
      controls.getObject().position.set(state.x, state.y, state.z);
      document.getElementById('hp').textContent = `HP: ${local.hp}`;
    } else {
      const o = others.get(id);
      if (o) {
        o.hp = 100;
        o.mesh.position.set(state.x, state.y, state.z);
      }
    }
  });

  socket.on('playerLeft', ({ id }) => {
    const o = others.get(id);
    if (o) {
      scene.remove(o.mesh);
      others.delete(id);
    }
  });

  // Efecto visual básico al disparo de otros (opcional)
  socket.on('shotFired', ({ id }) => {
    // Aquí podrías agregar un flash o sonido
  });
}

function spawnOther(id, state) {
  const color = 0x22c55e; // verde para otros
  const mesh = makePlayerMesh(color);
  mesh.position.set(state.x, state.y, state.z);
  scene.add(mesh);
  others.set(id, { mesh, hp: state.hp ?? 100 });
}

// ======= Movimiento FPS =======
const tmpDir = new THREE.Vector3();
function update(dt) {
  // Dirección local
  tmpDir.set(0,0,0);
  if (local.keys.w) tmpDir.z -= 1;
  if (local.keys.s) tmpDir.z += 1;
  if (local.keys.a) tmpDir.x -= 1;
  if (local.keys.d) tmpDir.x += 1;
  if (tmpDir.lengthSq() > 0) tmpDir.normalize();

  // Velocidad
  const speed = (local.keys.shift ? MOVE_SPEED*RUN_MULT : MOVE_SPEED);
  // Transformar dir a espacio mundial según cámara
  const yaw = camera.rotation.y;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const dx = tmpDir.x * cos - tmpDir.z * sin;
  const dz = tmpDir.x * sin + tmpDir.z * cos;

  // Aplicar
  const obj = controls.getObject();
  obj.position.x += dx * speed * dt;
  obj.position.z += dz * speed * dt;

  // Mantener altura y límites simples
  obj.position.y = 1.6;
  obj.position.x = THREE.MathUtils.clamp(obj.position.x, -95, 95);
  obj.position.z = THREE.MathUtils.clamp(obj.position.z, -95, 95);
}

// ======= Disparo / Raycast =======
const raycaster = new THREE.Raycaster();
function tryShoot() {
  if (!local.canShoot || !controls.isLocked) return;
  local.canShoot = false;
  setTimeout(() => local.canShoot = true, SHOT_COOLDOWN);

  // Ray desde cámara hacia adelante
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  camera.getWorldPosition(origin);

  raycaster.set(origin, dir);
  const targets = [];
  for (const [id, o] of others.entries()) {
    if (!o.mesh) continue;
    targets.push(o.mesh);
  }

  // Chequeo simple de impacto con bounding boxes
  let hitId = null;
  let minDist = Infinity;
  targets.forEach(mesh => mesh.updateMatrixWorld());
  const intersects = raycaster.intersectObjects(targets, true);
  for (const inter of intersects) {
    const root = inter.object.parent; // nuestro group
    // Buscar id por mesh
    for (const [id, o] of others.entries()) {
      if (o.mesh === root) {
        const d = inter.distance;
        if (d < minDist && d <= BULLET_RANGE) {
          minDist = d;
          hitId = id;
        }
      }
    }
  }

  // Notificar disparo (para efectos)
  socket.emit('shotFired', { origin: origin.toArray(), dir: dir.toArray() });

  if (hitId) {
    socket.emit('hitPlayer', { targetId: hitId, damage: DAMAGE });
    // chispazo simple
    muzzleFlash(origin.clone().add(dir.clone().multiplyScalar(0.8)));
  } else {
    muzzleFlash(origin.clone().add(dir.clone().multiplyScalar(0.8)));
  }
}

// Efecto de fogonazo ultra simple
function muzzleFlash(pos) {
  const geo = new THREE.SphereGeometry(0.08, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const s = new THREE.Mesh(geo, mat);
  s.position.copy(pos);
  scene.add(s);
  setTimeout(() => scene.remove(s), 60);
}

// ======= Loop =======
let last = performance.now();
let sendAccum = 0;
function animate() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (controls.isLocked) update(dt);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);

  // Networking: enviar estado ~20 veces por segundo
  sendAccum += dt;
  if (sendAccum >= 0.05 && socket && local.id) {
    sendAccum = 0;
    const obj = controls.getObject();
    socket.emit('updateState', {
      x: obj.position.x, y: obj.position.y, z: obj.position.z,
      rx: camera.rotation.x, ry: camera.rotation.y, rz: camera.rotation.z
    });
  }
}

// ======= Boot =======
initThree();
initNet();
animate();
