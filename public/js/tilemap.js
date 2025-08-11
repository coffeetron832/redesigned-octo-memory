import { utils } from './engine.js';

export class TileMap {
  constructor(mapJSON, tilesImage){
    this.map = mapJSON;
    this.tilesImg = tilesImage;
    this.tileW = mapJSON.tileWidth;
    this.tileH = mapJSON.tileHeight;
    this.width = mapJSON.width;
    this.height = mapJSON.height;
    this.layers = mapJSON.layers || [];
    // Asumimos tileset simple con tiles ordenadas en filas
    this.tilesPerRow = Math.floor(tilesImage.width / this.tileW);
  }

  // dibuja todas las capas en coordenadas del mundo (con offset)
  draw(ctx, offsetX, offsetY){
    for(const layer of this.layers){
      this._drawLayer(ctx, layer, offsetX, offsetY);
    }
  }

  _drawLayer(ctx, layer, offsetX, offsetY){
    const data = layer.data;
    for(let row=0; row < this.height; row++){
      for(let col=0; col < this.width; col++){
        const idx = row * this.width + col;
        const tileId = data[idx]; // 0 = vacío; >0 = índice del tileset
        if(!tileId) continue;
        const tileIndex = tileId - 1; // convertir a 0-based
        const sx = (tileIndex % this.tilesPerRow) * this.tileW;
        const sy = Math.floor(tileIndex / this.tilesPerRow) * this.tileH;

        // convertir col,row a x,y isométrico
        const pos = utils.isoToScreen(col, row, this.tileW, this.tileH);
        ctx.drawImage(
          this.tilesImg,
          sx, sy, this.tileW, this.tileH,
          Math.round(pos.x + offsetX), Math.round(pos.y + offsetY), this.tileW, this.tileH
        );
      }
    }
  }

  // coordenadas de mundo (en píxeles) del punto (col,row) del tilemap
  tileToWorld(col, row){
    const pos = utils.isoToScreen(col, row, this.tileW, this.tileH);
    return pos;
  }
}
