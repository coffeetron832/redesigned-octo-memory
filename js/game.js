// js/game.js - Mapa vacío y movimiento limpio (sin obstáculos), cámara suave y centrada.
// Reemplaza el archivo actual por este.

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * 0.9 * DPR);
    canvas.height = Math.floor((window.innerHeight - 120) * DPR);
    canvas.style.width = Math.floor(window.innerWidth * 0.9) + 'px';
    canvas.style.height = Math.floor(window.innerHeight - 120) + 'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR, DPR);
  }
  window.addEventListener('resize', resize);
  resize();

  /* CONFIG */
  const tileW = 64;
  const tileH = 32;
  const mapW = 20;
  const mapH = 20;

  /* Tweakables */
  const PLAYER_RADIUS = 0.35; // en tiles (no se usa para bloqueo ahora, pero lo dejo para futuras colisiones)
  const CAMERA_SMOOTH = 10;   // mayor = más snappy; rango útil 4..20
  const CAMERA_AHEAD = 1.0;   // cuántos tiles mira hacia adelante según movimiento
  const CAMERA_PAD = 40;      // padding en px para clamp de cámara

  /* MAP VACÍO: 0 = grass/path (walkable) */
  const map = Array.from({length:mapH}, () => Array.from({length:mapW}, () => 0) );

  /* No hay árboles ni casas: map está vacío.
     Si quieres reactivar objetos más adelante, podremos poner valores distintos en map[y][x]. */

  /* Player: spawn centrado (ajustado a centro de los tiles) */
  const player = { i: mapW / 2 + 0.0, j: mapH / 2 + 0.0, speed: 3.2, size: 10, color:'#2b2bff' };
  let prevPlayer = { i: player.i, j: player.j };

  /* Input */
  const keys = {};
  window.addEventListener('keydown', e=>{
    keys[e.key.toLowerCase()] = true;
    if(e.key === 'h' || e.key === 'H') {
      const hdr = document.querySelector('header');
      hdr.style.display = hdr.style.display === 'none' ? 'flex' : 'none';
    }
  });
  window.addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);

  /* world->screen */
  function tileToScreen(i,j){
    const x = (i - j) * (tileW/2);
    const y = (i + j) * (tileH/2);
    return {x,y};
  }

  /* worldBounds (para clamping de cámara) */
  const worldBounds = (() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for(let j=0;j<mapH;j++){
      for(let i=0;i<mapW;i++){
        const s = tileToScreen(i,j);
        minX = Math.min(minX, s.x - tileW/2);
        maxX = Math.max(maxX, s.x + tileW/2);
        minY = Math.min(minY, s.y - tileH/2);
        maxY = Math.max(maxY, s.y + tileH + 20);
      }
    }
    return {minX, maxX, minY, maxY};
  })();

  /* Camera */
  const camera = { x:0, y:0, smooth: CAMERA_SMOOTH, ahead: CAMERA_AHEAD, pad: CAMERA_PAD };

  // inicializa la cámara centrada sin saltos
  (function initCameraNow(){
    const viewW = canvas.width / DPR;
    const viewH = canvas.height / DPR;
    const pScreen = tileToScreen(player.i, player.j);
    const tX = pScreen.x - viewW/2;
    const tY = pScreen.y - viewH/2;
    const minCamX = worldBounds.minX - camera.pad;
    const maxCamX = worldBounds.maxX - viewW + camera.pad;
    const minCamY = worldBounds.minY - camera.pad;
    const maxCamY = worldBounds.maxY - viewH + camera.pad;
    const clampX = (minCamX > maxCamX) ? (minCamX + maxCamX)/2 : null;
    const clampY = (minCamY > maxCamY) ? (minCamY + maxCamY)/2 : null;
    if(clampX !== null) camera.x = clampX; else camera.x = Math.min(Math.max(tX, minCamX), maxCamX);
    if(clampY !== null) camera.y = clampY; else camera.y = Math.min(Math.max(tY, minCamY), maxCamY);
  })();

  function updateCamera(dt){
    const viewW = canvas.width / DPR;
    const viewH = canvas.height / DPR;

    // velocidad en coords de tiles/sec
    const velI = (player.i - prevPlayer.i) / Math.max(1e-6, dt);
    const velJ = (player.j - prevPlayer.j) / Math.max(1e-6, dt);

    // punto adelantado en coords de mapa (ligero)
    const aheadI = player.i + velI * (camera.ahead * 0.12);
    const aheadJ = player.j + velJ * (camera.ahead * 0.12);

    const pScreen = tileToScreen(aheadI, aheadJ);
    let targetX = pScreen.x - viewW/2;
    let targetY = pScreen.y - viewH/2;

    // clamp
    const minCamX = worldBounds.minX - camera.pad;
    const maxCamX = worldBounds.maxX - viewW + camera.pad;
    const minCamY = worldBounds.minY - camera.pad;
    const maxCamY = worldBounds.maxY - viewH + camera.pad;

    if(minCamX > maxCamX) targetX = (minCamX + maxCamX)/2;
    else targetX = Math.min(Math.max(targetX, minCamX), maxCamX);

    if(minCamY > maxCamY) targetY = (minCamY + maxCamY)/2;
    else targetY = Math.min(Math.max(targetY, minCamY), maxCamY);

    // lerp exponencial frame-rate independent
    const t = 1 - Math.exp(-camera.smooth * dt);
    camera.x += (targetX - camera.x) * t;
    camera.y += (targetY - camera.y) * t;
    return {ox: camera.x, oy: camera.y};
  }

  /* Movement (no colisiones: todo walkable). Sliding preserved for smooth feel. */
  function update(dt){
    let dx = 0, dy = 0;
    if(keys['w'] || keys['arrowup']) dy -= 1;
    if(keys['s'] || keys['arrowdown']) dy += 1;
    if(keys['a'] || keys['arrowleft']) dx -= 1;
    if(keys['d'] || keys['arrowright']) dx += 1;

    if(dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

    player.i += dx * player.speed * dt;
    player.j += dy * player.speed * dt;

    // keep player inside logical map bounds (optional)
    player.i = Math.max(0.0, Math.min(mapW - 0.01, player.i));
    player.j = Math.max(0.0, Math.min(mapH - 0.01, player.j));
  }

  /* Drawing helpers (same look) */
  function drawTile(x,y,type){
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileW/2, tileH/2);
    ctx.lineTo(0, tileH);
    ctx.lineTo(-tileW/2, tileH/2);
    ctx.closePath();
    // uniform grass
    const g = ctx.createLinearGradient(0,0,0,tileH);
    g.addColorStop(0, '#9ad57a');
    g.addColorStop(1, '#6fb64a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.stroke();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-tileW/2, tileH*0.6, tileW, 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* Render */
  let last = performance.now();
  function loop(ts){
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt);
    render(dt);
    prevPlayer.i = player.i; prevPlayer.j = player.j;
    requestAnimationFrame(loop);
  }

  function render(dt){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const {ox, oy} = updateCamera(dt);
    const cam = {x: ox, y: oy};

    // tiles
    for(let j=0;j<mapH;j++){
      for(let i=0;i<mapW;i++){
        const s = tileToScreen(i,j);
        const sx = s.x - cam.x + canvas.width/DPR/2;
        const sy = s.y - cam.y + canvas.height/DPR/2;
        drawTile(sx, sy, map[j][i]);
      }
    }

    // player
    const pScreen = tileToScreen(player.i, player.j);
    const px = pScreen.x - cam.x + canvas.width/DPR/2;
    const py = pScreen.y - cam.y + canvas.height/DPR/2;

    // shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(px, py + 6, player.size*1.6, player.size*0.8, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
    ctx.restore();

    // body
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(px, py - 8, player.size, 0, Math.PI*2);
    ctx.fill();

    // visor
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(px - player.size*0.4, py - 12, player.size*0.9, 6);

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(8,8,190,28);
    ctx.fillStyle = '#111';
    ctx.font = '13px Inter, Arial';
    ctx.fillText(`Pos: ${player.i.toFixed(2)}, ${player.j.toFixed(2)}`, 14, 26);
  }

  requestAnimationFrame(loop);

  /* Quick tuning from console */
  window.__game_debug = {
    player, map, camera,
    setCameraSmooth(v){ camera.smooth = v; console.log('camera.smooth=', v); },
    setCameraAhead(v){ camera.ahead = v; console.log('camera.ahead=', v); },
    setPlayerSpeed(s){ player.speed = s; console.log('player.speed=', s); }
  };
})();
