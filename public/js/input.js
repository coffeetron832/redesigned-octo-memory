export class Keyboard {
  constructor(){
    this.keys = {};
    this.bind();
  }
  bind(){
    window.addEventListener('keydown', e=>{
      this.keys[e.key] = true;
      // prevenir scroll con flechas
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    }, { passive: false });
    window.addEventListener('keyup', e=>{ this.keys[e.key] = false; });
  }
  isDown(...ks){
    return ks.some(k => !!this.keys[k]);
  }
}
