export class Entity {
  constructor(x=0, y=0){
    this.x = x; // mundo (px)
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 32;
    this.height = 48;
  }
  update(dt, scene){}
  draw(ctx, camX=0, camY=0){ }
}

/* Player simple: control por teclado, sprite placeholder */
export class Player extends Entity {
  constructor(x,y, spritesImg){
    super(x,y);
    this.speed = 120; // px / s
    this.sprites = spritesImg;
    this.frame = 0;
    this.animTimer = 0;
    this.width = 32;
    this.height = 48;
  }

  update(dt, scene){
    const k = scene.keyboard;
    let dx = 0, dy = 0;
    if(k.isDown('ArrowUp','w','W')) dy -= 1;
    if(k.isDown('ArrowDown','s','S')) dy += 1;
    if(k.isDown('ArrowLeft','a','A')) dx -= 1;
    if(k.isDown('ArrowRight','d','D')) dx += 1;

    // Normalizar para velocidad diagonal correcta
    if(dx !== 0 && dy !== 0){
      const inv = 1 / Math.sqrt(2);
      dx *= inv; dy *= inv;
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Animación simple
    if(Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1){
      this.animTimer += dt;
      if(this.animTimer > 0.15){
        this.frame = (this.frame + 1) % 4;
        this.animTimer = 0;
      }
    } else {
      this.frame = 0;
      this.animTimer = 0;
    }

    // Evitar salirse del mundo (si existe tilemap)
    if(scene.tilemap){
      const worldW = scene.tilemap.width * scene.tilemap.tileW;
      const worldH = scene.tilemap.height * scene.tilemap.tileH;
      this.x = Math.max(0, Math.min(this.x, worldW));
      this.y = Math.max(0, Math.min(this.y, worldH));
    }
  }

  draw(ctx, camX=0, camY=0){
    // Dibujar placeholder: un pequeño sprite o rectángulo con sombra
    const drawX = Math.round(this.x - camX);
    const drawY = Math.round(this.y - camY);

    // Sombra
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(drawX + 12, drawY + 28, 10, 6, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    ctx.restore();

    // Si hay sprites, dibujar el sprite (asumimos atlas simple)
    if(this.sprites){
      // suponer sprite sheet con frames en fila, frame size this.width x this.height
      ctx.drawImage(this.sprites,
        this.frame * this.width, 0, this.width, this.height,
        drawX, drawY - (this.height - this.tileOffset || 0), this.width, this.height
      );
    } else {
      // placeholder
      ctx.fillStyle = '#f5f3f4';
      ctx.fillRect(drawX, drawY - 24, 24, 32);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(drawX, drawY - 24, 24, 32);
    }
  }
}
