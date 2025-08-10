// game.js - Mini mundo isométrico
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

  /* Simple map generation: 0 = grass, 1 = path, 2 = tree, 3 = house */
  const map = Array.from({length:mapH}, (_,j) =>
    Array.from({length:mapW}, (_,i)=> 0)
  );

  // create a winding path
  for(let t=0;t<mapW*2;t++){
    const i = Math.max(0, Math.min(mapW-1, Math.floor(mapW/2 + (t - mapW/2) + Math.sin(t*0.6)*4)));
    const j = Math.max(0, Math.min(mapH-1, Math.floor(t/1.2)));
    map[j][i] = 1;
  }

  // scatter some trees
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

  /* Player in map coordinates (float for smooth movement) */
  const player = { i: 5.5, j: 12.5, speed: 3.2, size: 10, color:'#2b2bff' };

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

  /* Helpers: world (tile) -> screen */
  function tileToScreen(i,j){
    const x = (i - j) * (tileW/2);
    const y = (i + j) * (tileH/2);
    return {x,y};
  }

  /* Collision: check if tile is walkable */
  function walkable(i,j){
    if(i < 0 || j < 0 || i >= mapW || j >= mapH) return false;
    const t = map[j][i];
    return (t === 0 || t === 1);
  }

  /* Camera */
  function getCameraOffset() {
    const screen = tileToScreen(player.i, player.j);
    const cx = canvas.width / DPR / 2;
    const cy = canvas.height / DPR / 2;
    return {ox: screen.x - cx, oy: screen.y - cy};
  }

  /* Render loop */
  let last = performance.now();
  function loop(ts){
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* Update player movement in map coordinate axes (i,j) */
  function update(dt){
    let dx = 0, dy = 0;
    if(keys['w'] || keys['arrowup']) dy -= 1;
    if(keys['s'] || keys['arrowdown']) dy += 1;
    if(keys['a'] || keys['arrowleft']) dx -= 1;
    if(keys['d'] || keys['arrowright']) dx += 1;

    if(dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

    const ni = player.i + dx * player.speed * dt;
    const nj = player.j + dy * player.speed * dt;

    if(walkable(Math.floor(ni+0.5), Math.floor(nj+0.5))) {
      player.i = ni; player.j = nj;
    } else {
      if(walkable(Math.floor(ni+0.5), Math.floor(player.j+0.5))) player.i = ni;
      if(walkable(Math.floor(player.i+0.5), Math.floor(nj+0.5))) player.j = nj;
    }
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

  /* Render everything */
  function render(){
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const {ox, oy} = getCameraOffset();
    const cam = {x: ox, y: oy};

    for(let j=0;j<mapH;j++){
      for(let i=0;i<mapW;i++){
        const s = tileToScreen(i,j);
        const sx = s.x - cam.x + canvas.width/DPR/2;
        const sy = s.y - cam.y + canvas.height/DPR/2;
        drawTile(sx, sy, map[j][i]);
      }
    }

    const drawables = [];
    for(let j=0;j<mapH;j++){
      for(let i=0;i<mapW;i++){
        const t = map[j][i];
        if(t === 2){
          const s = tileToScreen(i,j);
          const sx = s.x - cam.x + canvas.width/DPR/2;
          const sy = s.y - cam.y + canvas.height/DPR/2;
          drawables.push({depth: sy, fn: ()=> drawTree(sx, sy - tileH/2)});
        } else if(t === 3){
          if(i === housePos.i && j === housePos.j){
            const s = tileToScreen(i,j);
            const sx = s.x - cam.x + canvas.width/DPR/2;
            const sy = s.y - cam.y + canvas.height/DPR/2;
            drawables.push({depth: sy, fn: ()=> drawHouse(sx, sy - tileH - 6)});
          }
        }
      }
    }

    const pScreen = tileToScreen(player.i, player.j);
    const px = pScreen.x - cam.x + canvas.width/DPR/2;
    const py = pScreen.y - cam.y + canvas.height/DPR/2;

    drawables.push({
      depth: py,
      fn: ()=> {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(px, py + 6, player.size*1.6, player.size*0.8, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.fillStyle = player.color;
        ctx.arc(px, py - 8, player.size, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(px - player.size*0.4, py - 12, player.size*0.9, 6);
      }
    });

    drawables.sort((a,b)=> a.depth - b.depth);
    for(const d of drawables) d.fn();

    // HUD
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(8,8,190,28);
    ctx.fillStyle = '#111';
    ctx.font = '13px Inter, Arial';
    ctx.fillText(`Pos: ${player.i.toFixed(2)}, ${player.j.toFixed(2)}`, 14, 26);
  }

  requestAnimationFrame(loop);
})();
