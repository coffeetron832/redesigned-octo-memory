// Ya no usamos import, THREE y PointerLockControls están en global
const canvas = document.getElementById('game');
const scene = new THREE.Scene();

// Cámara
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.y = 2;

// Render
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Luz
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Suelo
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Cubo de prueba
const cubeGeo = new THREE.BoxGeometry();
const cubeMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.position.set(0, 1, -5);
scene.add(cube);

// Controles (PointerLock)
const controls = new THREE.PointerLockControls(camera, document.body);
document.getElementById('startBtn').addEventListener('click', () => {
  controls.lock();
});
scene.add(controls.getObject());

// Animación
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
