// ======= Variables globales =======
let canvas = document.getElementById('renderCanvas');
let engine = new BABYLON.Engine(canvas, true);
let scene = new BABYLON.Scene(engine);

let camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 2, -5), scene);
camera.attachControl(canvas, true);

camera.speed = 0.2; // velocidad básica
camera.angularSensibility = 400; // sensibilidad del mouse
camera.applyGravity = true;
camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);

// Luces
let light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.9;

// Piso
let ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.checkCollisions = true;

// Jugador local
let localPlayer = {
    hp: 100,
    canShoot: true,
};

// Otros jugadores
let others = new Map();

// ======= Controles teclado simple =======
let inputMap = {};
scene.actionManager = new BABYLON.ActionManager(scene);

scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function(evt){
    inputMap[evt.sourceEvent.key] = true;
}));

scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function(evt){
    inputMap[evt.sourceEvent.key] = false;
}));

// ======= Movimiento básico =======
scene.onBeforeRenderObservable.add(()=>{
    let forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y),
        0,
        Math.cos(camera.rotation.y)
    );

    let right = new BABYLON.Vector3(
        Math.sin(camera.rotation.y + Math.PI/2),
        0,
        Math.cos(camera.rotation.y + Math.PI/2)
    );

    let dir = new BABYLON.Vector3.Zero();

    if(inputMap["w"]) dir.addInPlace(forward);
    if(inputMap["s"]) dir.subtractInPlace(forward);
    if(inputMap["a"]) dir.subtractInPlace(right);
    if(inputMap["d"]) dir.addInPlace(right);

    if(dir.lengthSquared() > 0){
        dir.normalize();
        camera.position.addInPlace(dir.scale(0.2));
    }
});

// ======= Función de disparo =======
canvas.addEventListener('pointerdown', () => {
    if(!localPlayer.canShoot) return;
    localPlayer.canShoot = false;
    setTimeout(()=> localPlayer.canShoot = true, 200);

    // Ray desde cámara
    let origin = camera.position.clone();
    let forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y),
        0,
        Math.cos(camera.rotation.y)
    );

    let ray = new BABYLON.Ray(origin, forward, 50);
    let hit = scene.pickWithRay(ray, mesh => others.has(mesh.name));

    if(hit.hit){
        console.log("Impacto en jugador:", hit.pickedMesh.name);
        // Aquí puedes emitir el evento via Socket.IO
    }
});

// ======= Loop =======
engine.runRenderLoop(()=>{
    scene.render();
});

// ======= Resize =======
window.addEventListener('resize', ()=>{ engine.resize(); });

// ======= Iniciar con click =======
document.getElementById('startBtn').addEventListener('click', ()=>{
    canvas.requestPointerLock();
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
});
