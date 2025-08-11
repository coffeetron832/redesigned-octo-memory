import { utils } from './engine.js';

export class Camera {
  constructor(canvas, worldWidth, worldHeight){
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.smooth = 8.0; // mayor = más suave
  }

  follow(targetX, targetY, dt){
    // target es la posición en pantalla a la que queremos llevar el centro
    const halfW = this.canvas.width / 2 / (window.devicePixelRatio || 1);
    const halfH = this.canvas.height / 2 / (window.devicePixelRatio || 1);

    // Lerp la posición de la cámara para suavizar
    this.x = utils.lerp(this.x, targetX - halfW, 1 - Math.exp(-this.smooth * dt));
    this.y = utils.lerp(this.y, targetY - halfH, 1 - Math.exp(-this.smooth * dt));

    // Limitar a los bordes del mundo
    this.x = Math.max(0, Math.min(this.x, this.worldWidth - halfW * 2));
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - halfH * 2));
  }
}
