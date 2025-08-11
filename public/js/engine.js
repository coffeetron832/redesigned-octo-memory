export class Loader {
  constructor(){ this.images = new Map(); this.jsons = new Map(); }

  loadImage(src, key){
    return new Promise((res, rej)=>{
      const img = new Image();
      img.onload = ()=>{ this.images.set(key, img); res(img); };
      img.onerror = (e)=> rej(new Error(`Error cargando imagen ${src}`));
      img.src = src;
    });
  }

  getImage(key){ return this.images.get(key); }

  loadJSON(src, key){
    return fetch(src).then(r=>{
      if(!r.ok) throw new Error(`Error fetching ${src}`);
      return r.json();
    }).then(data=>{
      this.jsons.set(key, data);
      return data;
    });
  }

  getJSON(key){ return this.jsons.get(key); }
}

export const utils = {
  lerp(a,b,t){ return a + (b-a) * t; },
  clamp(v,min,max){ return Math.max(min, Math.min(max, v)); },
  isoToScreen(tx, ty, tileW, tileH){
    // Convierte coordenadas de tile isométrico (col,row) a pantalla (x,y) en base a tileW/tileH
    const sx = (tx - ty) * (tileW / 2);
    const sy = (tx + ty) * (tileH / 2);
    return { x: sx, y: sy };
  }
};
