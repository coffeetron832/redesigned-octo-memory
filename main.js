// main.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { createPlayer } from './scripts/player.js';
import { createWorld } from './scripts/world.js';

let scene, renderer, camera;
let player;
let canvas, loadingEl, percentEl, logEl;

init();

async function init(){
  canvas = document.getElementById('gameCanvas');
  loadingEl = document.getElementById('loading');
  percentEl = document.getElementById('percent');
  logEl = document.getElementById('log');

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfeee0);

  // Cámara ortográfica para look isométrico
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 120;
  camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2, frustumSize * aspect / 2,
    frustumSize / 2, -frustumSize / 2,
    0.1, 1000
  );
  // Rotar la cámara para efecto isométrico
  camera.position.set(80, 80, 80);
  camera.lookAt(0, 0, 0);

  // Luces
  const amb = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(50, 80, 10);
  dir.castShadow = true;
  scene.add(dir);

  // Cargar mundo y jugador (simulando carga)
  updateLoading(10);
  await createWorld(scene, updateLoading);
  updateLoading(60);
  player = await createPlayer(scene, updateLoading);
  updateLoading(100);
  loadingEl.style.display = 'none';

  window.addEventListener('resize', onResize);
  onResize();

  animate();
}

function updateLoading(percent){
  percentEl.innerText = `${Math.round(percent)}%`;
}

function onResize(){
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w,h);
  const aspect = w / h;
  const frustumSize = 120;
  camera.left = -frustumSize * aspect / 2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
}

const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (player && player.update) player.update(dt);
  renderer.render(scene, camera);
}

// Simple logging helper
export function gameLog(text){
  logEl.innerText = text;
}
