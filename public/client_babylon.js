// ======= Variables globales =======
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

const camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, 2, -5), scene);
camera.attachControl(canvas, true);
camera.speed = 0.2;
camera.angularSensibility = 400;
camera.applyGravity = true;
camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);

// Luces
const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0,1,0), scene);
light.intensity = 0.9;

// Piso
const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.checkCollisions = true;

// Jugador local
const localPlayer = {
    hp: 100,
    canShoot: true
};

// Otros jugadores
const others = new Map();

// ======= Controles teclado =======
const inputMap = {};
scene.actionManager = new BABYLON.ActionManager(scene);

scene.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, evt => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    })
);
scene.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    })
);

// ======= Movimiento FPS =======
const MOVE_SPEED = 0.2;
const RUN_MULT = 1.5;

scene.onBeforeRenderObservable.add(()=>{
    let dir = new BABYLON.Vector3.Zero();

    const forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y),
        0,
        Math.cos(camera.rotation.y)
    );
    const right = new BABYLON.Vector3(
        Math.sin(camera.rotation.y + Math.PI/2),
        0,
        Math.cos(camera.rotation.y + Math.PI/2)
    );

    if(inputMap["w"]) dir.addInPlace(forward);
    if(inputMap["s"]) dir.subtractInPlace(forward);
    if(inputMap["a"]) dir.subtractInPlace(right);
    if(inputMap["d"]) dir.addInPlace(right);

    if(dir.lengthSquared() > 0){
        dir.normalize();
        const speed = inputMap["shift"] ? MOVE_SPEED*RUN_MULT : MOVE_SPEED;
        camera.position.addInPlace(dir.scale(speed));
    }
});

// ======= Función de disparo =======
function shoot(){
    if(!localPlayer.canShoot) return;
    localPlayer.canShoot = false;
    setTimeout(()=> localPlayer.canShoot = true, 200);

    const origin = camera.position.clone();
    const forward = new BABYLON.Vector3(
        Math.sin(camera.rotation.y),
        0,
        Math.cos(camera.rotation.y)
    );

    const ray = new BABYLON.Ray(origin, forward, 50);
    const hit = scene.pickWithRay(ray, mesh => others.has(mesh.name));

    // Efecto visual simple
    const sphere = BABYLON.MeshBuilder.CreateSphere("muzzle", {diameter:0.1}, scene);
    sphere.position = origin.add(forward.scale(1));
    sphere.material = new BABYLON.StandardMaterial("mat", scene);
    sphere.material.emissiveColor = new BABYLON.Color3(1,1,0);
    setTimeout(()=> sphere.dispose(), 100);

    if(hit.hit){
        console.log("Impacto en jugador:", hit.pickedMesh.name);
        // Aquí se emitiría Socket.IO hitPlayer
    }
}

canvas.addEventListener('pointerdown', shoot);

// ======= Render loop =======
engine.runRenderLoop(()=> scene.render());

// ======= Resize =======
window.addEventListener('resize', ()=> engine.resize());

// ======= Iniciar con click =======
document.getElementById('startBtn').addEventListener('click', ()=>{
    canvas.requestPointerLock();
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
});
