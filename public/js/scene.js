import { TileMap } from './tilemap.js';
import { Player } from './entities.js';
import { Camera } from './camera.js';

export class Scene {
  constructor({ ctx, canvas, loader, keyboard }){
    this.ctx = ctx;
    this.canvas = canvas;
    this.loader = loader;
    this.keyboard = keyboard;
    this.tilemap = null;
    this.player = null;
    this.camera = null;

    this.init();
  }

  init(){
    const mapJSON = this.loader.getJSON('map1');
    const tilesImg = this.loader.getImage('tiles');
    const spritesImg = this.loader.getImage('sprites');

    this.tilemap = new TileMap(mapJSON, tilesImg);

    // world size (aprox) en px (usamos tilemap para estimar)
    const worldW = this.tilemap.width * this.tilemap.tileW;
    const worldH = this.tilemap.height * this.tilemap.tileH;

    // Crear player en posición de spawn si existe
    const spawn = (mapJSON.objects && mapJSON.objects.find(o=>o.type === 'playerSpawn')) || { x: 0, y: 0 };
    // convertir tile spawn (col,row) a world px
    const spawnTile = spawn.tile || { col: Math.floor(this.tilemap.width/2), row: Math.floor(this.tilemap.height/2) };
    const pos = this.tilemap.tileToWorld(spawnTile.col, spawnTile.row);
    // ajustar para centrar player sobre tile
    const px = pos.x + this.tilemap.tileW/2;
    const py = pos.y + this.tilemap.tileH/2;

    this.player = new Player(px, py, spritesImg);

    this.camera = new Camera(this.canvas, worldW, worldH);
  }

  update(dt){
    // actualizar entidades
    this.player.update(dt, this);

    // calcular cámara para seguir al player (usando player.x/y en world px)
    this.camera.follow(this.player.x, this.player.y, dt);
  }

  draw(){
    const ctx = this.ctx;
    // offset: cámara (negativo)
    const camX = Math.round(this.camera.x);
    const camY = Math.round(this.camera.y);

    // Dibujar mapa con offset centrado (centrar mapa en pantalla opcional)
    // Para que el mapa quede bien centrado en pantalla, añadimos un offset fijo
    const centerOffsetX = (this.canvas.width / (window.devicePixelRatio||1)) / 2 - (this.tilemap.tileW / 2);
    const centerOffsetY = 80; // pequeño desplazamiento vertical para estética

    this.tilemap.draw(ctx, -camX + centerOffsetX, -camY + centerOffsetY);

    // Dibujar player (en orden: después de floor layer para overlap correcto)
    this.player.draw(ctx, camX - centerOffsetX, camY - centerOffsetY);
  }
}
