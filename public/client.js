// ======= Variables globales =======
let scene, camera, renderer, controls;
let local = { keys: { w:false,a:false,s:false,d:false,shift:false }, canShoot:true, hp:100 };

// ======= Inicialización Three.js =======
function initThree() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 5);

  // Luces
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 0.8));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5,10,3);
  scene.add(dir);

  // Piso
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshLambertMaterial({ color:0x2b2f3a, flatShading:true }));
  plane.rotation.x = -Math.PI/2;
  plane.receiveShadow = true;
  scene.add(plane);

  // Controles FPS
  controls = new PointerLockControls(camera, document.body);

  document.getElementById('startBtn').addEventListener('click', () => controls.lock());
  controls.addEventListener('lock', () => {
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
  });
  controls.addEventListener('unlock', () => {
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
  });

  // Teclado
  const onKey = (e, v) => {
    if(e.code === 'KeyW') local.keys.w=v;
    if(e.code === 'KeyA') local.keys.a=v;
    if(e.code === 'KeyS') local.keys.s=v;
    if(e.code === 'KeyD') local.keys.d=v;
    if(e.code === 'ShiftLeft') local.keys.shift=v;
  };
  window.addEventListener('keydown', e=>onKey(e,true));
  window.addEventListener('keyup', e=>onKey(e,false));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ======= Loop básico =======
let last = performance.now();
function animate() {
  const now = performance.now();
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;

  // Movimiento simple
  if(controls.isLocked){
    const dir = new THREE.Vector3();
    if(local.keys.w) dir.z-=1;
    if(local.keys.s) dir.z+=1;
    if(local.keys.a) dir.x-=1;
    if(local.keys.d) dir.x+=1;
    if(dir.lengthSq()>0){
      dir.normalize();
      const speed = local.keys.shift?6*1.5:6;
      const obj = controls.getObject();
      obj.position.x += dir.x*speed*dt;
      obj.position.z += dir.z*speed*dt;
      obj.position.y = 1.6;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ======= Boot =======
initThree();
animate();
