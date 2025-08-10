// game.js - Versión pulida: colisión por tile (circle-rect), cámara suave con anticipación,
// spawn en centro asegurado y sliding natural.

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

  /* tweakables */
  const PLAYER_RADIUS = 0.35; // en unidades de tiles (map coords). Ajusta para mayor/menos "pegado".
  const CAMERA_SMOOTH = 10;   // mayor = más snappy; rango útil 4..20
  const CAMERA_AHEAD = 1.0;   // cuántos tiles mira hacia adelante según velocidad
  const CAMERA_PAD = 40;      // padding en px para clamp de cámara

  /* Simple map generation: 0 = grass, 1 = path, 2 = tree (blocked), 3 = house (blocked) */
  const map = Array.from({length:mapH}, (_,j) =>
    Array.from({length:mapW}, (_,i)=> 0)
  );

  // create a winding path
  for(let t=0;t<mapW*2;t++){
    const i = Math.max(0, Math.min(mapW-1, Math.floor(mapW/2 + (t - mapW/2) + Math.sin(t*0.6)*4)));
    const j = Math.max(0, Math.min(mapH-1, Math.floor(t/1.2)));
    map[j][i] = 1;
  }

  // scatter some trees (blocked)
  for(let k=0;k<60;k++){
    const i = Math.floor(Math.random()*mapW);
    const j = Math.floor(Math.random()*mapH);
    if(map[j][i] === 0 && !(i>8 && i<12 && j>4 && j<8)) map[j][i] = 2;
  }

  // place a house (occupies 2x2)
  const housePos = {i:10, j:6};
  map[housePos.j][housePos.i] = 3;
  map[housePos.j][housePos.i+1] = 3;
  map[housePos.j+1][housePos.i] = 3;
  map[housePos.j+1][housePos.i+1] = 3;

  /* UTIL: is tile blocked? */
  function isBlocked(i,j){
    if(i < 0 || j < 0 || i >= mapW || j >= mapH) return true;
    return (map[j][i] === 2 || map[j][i] === 3);
  }

  /* Find nearest walkable tile to (x,y) by BFS limited radius */
  function findNearestWalkable(si, sj, maxR = 10){
    const q = [[Math.floor(si), Math.floor(sj)]];
    const seen = new Set();
    for(let idx=0; idx<q.length && q.length < 1000; idx++){
      const [i,j] = q[idx];
      const key = `${i},${j}`;
      if(seen.has(key)) continue;
      seen.add(key);
      if(i >= 0 && j >= 0 && i < mapW && j < mapH && !isBlocked(i,j)) return {i: i + 0.5, j: j + 0.5};
      // push neighbors
      q.push([i+1,j],[i-1,j],[i,j+1],[i,j-1]);
    }
    // fallback center
    return {i: Math.floor(si)+0.5, j: Math.floor(sj)+0.5};
  }

  /* Player: spawn center but ensure walkable */
  let player = { i: mapW/2, j: mapH/2, speed: 3.2, size: 10, color:'#2b2bff' };
// ensure spawn on walkable tile
  player = Object.assign(player, findNearestWalkable(player.i, player.j));

  /* Keep previous for velocity */
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

  /* Helpers: world (tile) -> screen (pixels) */
  function tileToScreen(i,j){
    const x = (i - j) * (tileW/2);
    const y = (i + j) * (tileH/2);
    return {x,y};
  }

  /* Collision test: circle (player at px,py, r) vs tile rect [ti,ti+1]x[tj,tj+1] in map coords.
     Returns true if intersects. */
  function circleIntersectsTile(px, py, ti, tj, r){
    // tile rect in map coords:
    const left = ti, right = ti + 1, top = tj, bottom = tj + 1;
    // closest point on rect to circle center
    const cx = Math.max(left, Math.min(px, right));
    const cy = Math.max(top, Math.min(py, bottom));
    const dx = px - cx, dy = py - cy;
    return (dx*dx + dy*dy) < (r * r);
  }

  /* Check if position (ni,nj) collides any blocked tile */
  function collidesAt(ni, nj){
    const r = PLAYER_RADIUS;
    const minI = Math.floor(ni - r);
    const maxI = Math.floor(ni + r);
    const minJ = Math.floor(nj - r);
    const maxJ = Math.floor(nj + r);
    for(let tj = minJ; tj <= maxJ; tj++){
      for(let ti = minI; ti <= maxI; ti++){
        if(isBlocked(ti, tj) && circleIntersectsTile(ni, nj, ti, tj, r)) return true;
      }
    }
    return false;
  }

  /* PRECOMPUTE world bounds in screen coords (to clamp camera) */
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
  const camera = {
    x: 0, y: 0,
    smooth: CAMERA_SMOOTH,
    ahead: CAMERA_AHEAD,
    pad: CAMERA_PAD,
  };

  // init camera centered on player
  (function initCameraNow() {
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
    if(clampX !== null) { camera.x = clampX; } else { camera.x = Math.min(Math.max(tX, minCamX), maxCamX); }
    if(clampY !== null) { camera.y = clampY; } else { camera.y = Math.min(Math.max(tY, minCamY), maxCamY); }
  })();

  function updateCamera(dt){
    const viewW = canvas.width / DPR;
    const viewH = canvas.height / DPR;

    // compute velocity in map coords (tiles/sec)
    const velI = (player.i - prevPlayer.i) / Math.max(1e-6, dt);
    const velJ = (player.j - prevPlayer.j) / Math.max(1e-6, dt);

    // projected point ahead in map coords
    const aheadI = player.i + velI * (camera.ahead * 0.12); // scaled small to feel natural
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

    // smooth lerp (exponential)
    const t = 1 - Math.exp(-camera.smooth * dt);
    camera.x += (targetX - camera.x) * t;
    camera.y += (targetY - camera.y) * t;
    return {ox: camera.x, oy: camera.y};
  }

  /* Update & movement with collision resolution */
  let last = performance.now();
  function loop(ts){
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt);
    render(dt);
    prevPlayer.i = player.i; prevPlayer.j = player.j;
    requestAnimationFrame(loop);
  }

  function update(dt){
    let dx = 0, dy = 0;
    if(keys['w'] || keys['arrowup']) dy -= 1;
    if(keys['s'] || keys['arrowdown']) dy += 1;
    if(keys['a'] || keys['arrowleft']) dx -= 1;
    if(keys['d'] || keys['arrowright']) dx += 1;

    if(dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

    const speed = player.speed;
    const ni = player.i + dx * speed * dt;
    const nj = player.j + dy * speed * dt;

    // full move
    if(!collidesAt(ni, nj)){
      player.i = ni; player.j = nj;
      return;
    }

    // sliding attempt on i then j
    if(!collidesAt(ni, player.j)){
      player.i = ni;
    } else if(!collidesAt(player.i, nj)){
      player.j = nj;
    } // else blocked, stay
  }

  /* Draw helpers */
  function drawTile(x,y,type){
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileW/2, tileH/2);
    ctx.lineTo(0, tileH);
    ctx.lineTo(-tileW/2, tileH/2);
    ctx.closePath();
    if(type === 1) {
      ctx.fillStyle = '#cdb98a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(0,0,0,tileH);
      g.addColorStop(0, '#9ad57a');
      g.addColorStop(1, '#6fb64a');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-tileW/2, tileH*0.6, tileW, 2);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawTree(screenX, screenY){
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.fillStyle = '#6b3f1a';
    ctx.fillRect(-6, -18, 12, 18);
    ctx.beginPath();
    ctx.fillStyle = '#1f7a2e';
    ctx.ellipse(0, -34, 22, 18, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawHouse(screenX, screenY){
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.beginPath();
    ctx.moveTo(0, -tileH - 6);
    ctx.lineTo(tileW/2, -tileH/2 + 6);
    ctx.lineTo(tileW/2, tileH/2 + 6);
    ctx.lineTo(0, tileH + 6);
    ctx.closePath();
    ctx.fillStyle = '#f5efe6';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -tileH - 6);
    ctx.lineTo(-tileW/2, -tileH/2 + 6);
    ctx.lineTo(0, tileH/2 + 2);
    ctx.lineTo(tileW/2, -tileH/2 + 6);
    ctx.closePath();
    ctx.fillStyle = '#c94b3a';
    ctx.fill();
    ctx.restore();
  }

  /* Render */
  function render(dt){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const {ox, oy} = updateCamera(dt);
    const cam = {x: ox, y: oy};

    // draw tiles
    for(let j=0;j<mapH;j++){
      for(let i=0;i<mapW;i++){
        const s = tileToScreen(i,j);
        const sx = s.x - cam.x + canvas.width/DPR/2;
        const sy = s.y - cam.y + canvas.height/DPR/2;
        drawTile(sx, sy, map[j][i]);
      }
    }

    // draw objects sorted by depth
    const drawables = [];
    for(let j=0;j<mapH;j++){
      for(let i=0;i<mapW;i++){
        const t = map[j][i];
        if(t === 2){ // tree
          const s = tileToScreen(i,j);
          const sx = s.x - cam.x + canvas.width/DPR/2;
          const sy = s.y - cam.y + canvas.height/DPR/2;
          drawables.push({depth: sy, fn: ()=> drawTree(sx, sy - tileH/2)});
        } else if(t === 3){ // house (draw only once at top-left)
          if(i === housePos.i && j === housePos.j){
            const s = tileToScreen(i,j);
            const sx = s.x - cam.x + canvas.width/DPR/2;
            const sy = s.y - cam.y + canvas.height/DPR/2;
            drawables.push({depth: sy, fn: ()=> drawHouse(sx, sy - tileH - 6)});
          }
        }
      }
    }

    // player screen pos
    const pScreen = tileToScreen(player.i, player.j);
    const px = pScreen.x - cam.x + canvas.width/DPR/2;
    const py = pScreen.y - cam.y + canvas.height/DPR/2;

    // draw player as part of drawables for correct depth
    drawables.push({
      depth: py,
      fn: ()=> {
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
      }
    });

    drawables.sort((a,b)=> a.depth - b.depth);
    for(const d of drawables) d.fn();

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(8,8,230,28);
    ctx.fillStyle = '#111';
    ctx.font = '13px Inter, Arial';
    ctx.fillText(`Pos: ${player.i.toFixed(2)}, ${player.j.toFixed(2)}  |  R:${PLAYER_RADIUS}`, 14, 26);
  }

  requestAnimationFrame(loop);

  /* --- Expose helper adjustments in console for quick tuning --- */
  window.__game_debug = {
    player, map, setPlayerRadius(r){ console.log('set radius', r); /* no runtime rebuild */ },
    camera, setCameraSmooth(v){ camera.smooth = v; console.log('camera.smooth=', v); },
    setCameraAhead(v){ camera.ahead = v; console.log('camera.ahead=', v); }
  };
})();
