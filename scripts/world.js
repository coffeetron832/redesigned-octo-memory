// scripts/world.js
import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

export function createWorld(scene) {
  // Luces
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 50, 20);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Suelo
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x88cc88 });
  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Objetos de prueba
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
  const boxGeo = new THREE.BoxGeometry(5, 5, 5);
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(0, 2.5, 0);
  box.castShadow = true;
  scene.add(box);
}
