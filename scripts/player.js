// scripts/player.js
import { gameLog } from '../main.js';

let input = {
  forward:false, back:false, left:false, right:false, interact:false
};

export async function createPlayer(scene, progressCb = ()=>{}){
  // Simple mesh placeholder (box as character)
  const mat = new THREE.MeshStandardMaterial({ color: 0x6f9dd1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3,5,2), mat);
  body.position.set(-50, 2.5, 0);
  body.castShadow = true;
  scene.add(body);

  // Camera follow target (optional): we'll keep camera static isométrica
  progressCb(75);

  // Input listeners
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Basic collision/interaction stub
  const playerObj = {
    mesh: body,
    speed: 24, // units per second
    update(dt){
      const dir = new THREE.Vector3();
      if (input.forward) dir.z -= 1;
      if (input.back) dir.z += 1;
      if (input.left) dir.x -= 1;
      if (input.right) dir.x += 1;
      if (dir.lengthSq() > 0){
        dir.normalize();
        // move in world XZ plane
        body.position.x += dir.x * this.speed * dt;
        body.position.z += dir.z * this.speed * dt;
      }
      // Simple interaction detection: cast small sphere around player
      if (input.interact){
        // (a) raycast or distance check to nearest interactable (to be implemented)
        gameLog('Intentando interactuar...');
        input.interact = false; // single trigger
      }
    }
  };

  progressCb(95);
  return playerObj;
}

function onKeyDown(e){
  switch(e.code){
    case 'KeyW': case 'ArrowUp': input.forward = true; break;
    case 'KeyS': case 'ArrowDown': input.back = true; break;
    case 'KeyA': case 'ArrowLeft': input.left = true; break;
    case 'KeyD': case 'ArrowRight': input.right = true; break;
    case 'Space': input.interact = true; break;
  }
}
function onKeyUp(e){
  switch(e.code){
    case 'KeyW': case 'ArrowUp': input.forward = false; break;
    case 'KeyS': case 'ArrowDown': input.back = false; break;
    case 'KeyA': case 'ArrowLeft': input.left = false; break;
    case 'KeyD': case 'ArrowRight': input.right = false; break;
  }
}
