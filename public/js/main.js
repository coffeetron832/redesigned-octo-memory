import { Loader } from './engine.js';
import { Keyboard } from './input.js';
import { Scene } from './scene.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // no alpha for slightly better perf

const loader = new Loader();
const keyboard = new Keyboard();

async function init(){
  // Cargar recursos
  await Promise.all([
    loader.loadImage('/public/assets/tiles.png', 'tiles'),
    loader.loadImage('/public/assets/sprites.png', 'sprites'),
    loader.loadJSON('/public/maps/map1.json', 'map1')
  ]);

  // Crear escena
  const scene = new Scene({ ctx, canvas, loader, keyboard });

  // Ajuste simple de pixelRatio (opcional)
  const DPR = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * DPR;
  canvas.height = canvas.clientHeight * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now - last) / 1000); // clamp dt a 50ms
    last = now;
    scene.update(dt);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    scene.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// Inicializar
init().catch(err=>{ console.error('Error init:', err); alert('Error cargando recursos, revisa la consola.'); });
