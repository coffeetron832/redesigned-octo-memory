// ======= Variables globales =======
let canvas = document.getElementById('renderCanvas');
let engine = new BABYLON.Engine(canvas, true);
let scene = new BABYLON.Scene(engine);

// ======= Jugador local =======
let localPlayer = {
    hp: 100,
    canShoot: true,
    mesh: null,
};

// ======= Crear jugador =======
localPlayer.mesh = BABYLON.MeshBuilder.CreateCapsule("player", {radius:0.5, height:1.5}, scene);
localPlayer.mesh.position.set(0, 1, 0);
localPlayer.mesh.material = new BABYLON.StandardMaterial("matP", scene);
localPlayer.mesh.material.diffuseColor = new BABYLON.Color3(0.8,0.3,0.6);
localPlayer.mesh.checkCollisions = true;

// ======= Cámara tercera persona estable =======
let camera = new BABYLON.ArcRotateCamera(
    "camera",
    Math.PI/2,      // alpha
    Math.PI/4,      // beta
    6,              // radius
    localPlayer.mesh.position,
    scene
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 3;
camera.upperRadiusLimit = 10;
camera.wheelDeltaPercentage = 0.01;

// ======= Luz =======
let light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0,1,0), scene);
light.intensity = 0.9;

// ======= Piso =======
let ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.checkCollisions = true;

// ======= Mapa low-poly: bosque + ciudad =======
function createMap() {
    // Árboles (bosque)
    for(let i=0;i<50;i++){
        let trunk = BABYLON.MeshBuilder.CreateBox("trunk"+i, {height:1.5, width:0.3, depth:0.3}, scene);
        trunk.position.set(Math.random()*180-90,0.75, Math.random()*180-90);
        let leaves = BABYLON.MeshBuilder.CreateSphere("leaves"+i, {diameter:1.2}, scene);
        leaves.position.set(trunk.position.x, 1.6, trunk.position.z);
        trunk.checkCollisions = true;
        leaves.checkCollisions = true;
    }

    // Edificios (ciudad)
    for(let i=0;i<20;i++){
        let b = BABYLON.MeshBuilder.CreateBox("bldg"+i, {height:Math.random()*3+1, width:2, depth:2}, scene);
        b.position.set(Math.random()*80-40, b.scaling.y/2, Math.random()*80-40);
        b.material = new BABYLON.StandardMaterial("matB", scene);
        b.material.diffuseColor = new BABYLON.Color3(0.5,0.5,0.5);
        b.checkCollisions = true;
    }
}
createMap();

// ======= Controles teclado =======
let inputMap = {};
scene.actionManager = new BABYLON.ActionManager(scene);
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyDownTrigger,
    e => inputMap[e.sourceEvent.key.toLowerCase()] = true
));
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyUpTrigger,
    e => inputMap[e.sourceEvent.key.toLowerCase()] = false
));

// ======= Movimiento tercera persona =======
scene.onBeforeRenderObservable.add(()=>{
    let dir = new BABYLON.Vector3.Zero();

    // Vectores forward/right relativos a cámara
    let forward = new BABYLON.Vector3(
        Math.sin(camera.alpha),
        0,
        Math.cos(camera.alpha)
    );
    let right = new BABYLON.Vector3(
        Math.sin(camera.alpha + Math.PI/2),
        0,
        Math.cos(camera.alpha + Math.PI/2)
    );

    if(inputMap["w"]) dir.addInPlace(forward);
    if(inputMap["s"]) dir.subtractInPlace(forward);
    if(inputMap["a"]) dir.subtractInPlace(right);
    if(inputMap["d"]) dir.addInPlace(right);

    if(dir.lengthSquared() > 0){
        dir.normalize();
        localPlayer.mesh.moveWithCollisions(dir.scale(0.3)); // velocidad
        // girar jugador hacia dirección de movimiento
        localPlayer.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Mantener cámara centrada
    camera.target = localPlayer.mesh.position;
});

// ======= Disparo =======
canvas.addEventListener('pointerdown', ()=>{
    if(!localPlayer.canShoot) return;
    localPlayer.canShoot = false;
    setTimeout(()=> localPlayer.canShoot = true, 200);

    let origin = localPlayer.mesh.position.clone();
    let forward = new BABYLON.Vector3(Math.sin(camera.alpha),0,Math.cos(camera.alpha));
    let ray = new BABYLON.Ray(origin, forward, 50);
    let hit = scene.pickWithRay(ray, mesh=>mesh!=localPlayer.mesh);
    if(hit.hit){
        console.log("Disparo impactó en:", hit.pickedMesh.name);
    }
});

// ======= Loop =======
engine.runRenderLoop(()=>{ scene.render(); });

// ======= Resize =======
window.addEventListener('resize', ()=>engine.resize());

// ======= Iniciar con click =======
document.getElementById('startBtn').addEventListener('click', ()=>{
    canvas.requestPointerLock();
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
});
