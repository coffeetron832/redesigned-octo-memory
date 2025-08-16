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

// ======= Cámara estilo GTA =======
let camera = new BABYLON.ArcRotateCamera("arcCam", -Math.PI/2, Math.PI/3, 6, localPlayer.mesh.position, scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 2;
camera.upperRadiusLimit = 12;
camera.wheelDeltaPercentage = 0.01;
camera.checkCollisions = true;
camera.collisionRadius = new BABYLON.Vector3(0.5,0.5,0.5);
camera.upperBetaLimit = Math.PI/2.2; // evitar mirar debajo del suelo
camera.lowerBetaLimit = 0.1;

// ======= Luz =======
let light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0,1,0), scene);
light.intensity = 0.9;

// ======= Piso =======
let ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.checkCollisions = true;

// ======= Mapa low-poly: bosque + ciudad =======
// ======= Mapa pintoresco =======
function createMap() {
    // Árboles variados
    for(let i=0;i<40;i++){
        let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk"+i, {height:1.5, diameterTop:0.3, diameterBottom:0.3}, scene);
        trunk.position.set(Math.random()*180-90,0.75, Math.random()*180-90);
        trunk.material = new BABYLON.StandardMaterial("matTrunk"+i, scene);
        trunk.material.diffuseColor = new BABYLON.Color3(0.55,0.27,0.07);

        let leaves = BABYLON.MeshBuilder.CreateSphere("leaves"+i, {diameter:1.5}, scene);
        leaves.position.set(trunk.position.x, 1.6, trunk.position.z);
        leaves.material = new BABYLON.StandardMaterial("matLeaves"+i, scene);
        leaves.material.diffuseColor = new BABYLON.Color3(Math.random()*0.3+0.3, Math.random()*0.5+0.3, Math.random()*0.3+0.3);

        trunk.checkCollisions = true;
        leaves.checkCollisions = true;
    }

    // Rocas
    for(let i=0;i<20;i++){
        let rock = BABYLON.MeshBuilder.CreateIcoSphere("rock"+i, {radius: Math.random()*0.5+0.2}, scene);
        rock.position.set(Math.random()*180-90, 0.25, Math.random()*180-90);
        rock.material = new BABYLON.StandardMaterial("matRock"+i, scene);
        rock.material.diffuseColor = new BABYLON.Color3(0.4,0.4,0.4);
        rock.checkCollisions = true;
    }

    // Edificios variados
    for(let i=0;i<15;i++){
        let h = Math.random()*4+1;
        let b = BABYLON.MeshBuilder.CreateBox("bldg"+i, {height:h, width:2, depth:2}, scene);
        b.position.set(Math.random()*80-40, h/2, Math.random()*80-40);
        b.material = new BABYLON.StandardMaterial("matB"+i, scene);
        b.material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        b.checkCollisions = true;
    }

    // Arbustos
    for(let i=0;i<30;i++){
        let bush = BABYLON.MeshBuilder.CreateSphere("bush"+i, {diameter:0.7}, scene);
        bush.position.set(Math.random()*180-90, 0.35, Math.random()*180-90);
        bush.material = new BABYLON.StandardMaterial("matBush"+i, scene);
        bush.material.diffuseColor = new BABYLON.Color3(Math.random()*0.2+0.3, Math.random()*0.5+0.3, Math.random()*0.2+0.3);
        bush.checkCollisions = true;
    }

    // Lagos / charcos
    for(let i=0;i<5;i++){
        let lake = BABYLON.MeshBuilder.CreateDisc("lake"+i, {radius: Math.random()*3+2, tessellation:20}, scene);
        lake.rotation.x = Math.PI/2;
        lake.position.set(Math.random()*180-90, 0.01, Math.random()*180-90);
        lake.material = new BABYLON.StandardMaterial("matLake"+i, scene);
        lake.material.diffuseColor = new BABYLON.Color3(0,0.5,0.7);
        lake.material.alpha = 0.7;
        lake.checkCollisions = false; // los lagos no bloquean al jugador
    }

    // Caminos simples (rectángulos)
    for(let i=0;i<5;i++){
        let road = BABYLON.MeshBuilder.CreateBox("road"+i, {width: Math.random()*20+10, height:0.05, depth:4}, scene);
        road.position.set(Math.random()*160-80, 0.025, Math.random()*160-80);
        road.material = new BABYLON.StandardMaterial("matRoad"+i, scene);
        road.material.diffuseColor = new BABYLON.Color3(0.2,0.2,0.2);
        road.checkCollisions = true;
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

// ======= Movimiento relativa a cámara =======
scene.onBeforeRenderObservable.add(()=>{
    let dir = new BABYLON.Vector3.Zero();

    // forward/right según cámara horizontal (proyección XZ)
    let camForward = camera.getTarget().subtract(camera.position);
    camForward.y = 0;
    camForward.normalize();

    let camRight = new BABYLON.Vector3(-camForward.z, 0, camForward.x); // perpendicular en XZ

    if(inputMap["w"]) dir.addInPlace(camForward);
    if(inputMap["s"]) dir.subtractInPlace(camForward);
    if(inputMap["a"]) dir.subtractInPlace(camRight);
    if(inputMap["d"]) dir.addInPlace(camRight);

    if(dir.lengthSquared() > 0){
        dir.normalize();
        localPlayer.mesh.moveWithCollisions(dir.scale(0.3));

        // girar jugador hacia dirección de movimiento
        let targetRotation = Math.atan2(dir.x, dir.z);
        localPlayer.mesh.rotation.y += (targetRotation - localPlayer.mesh.rotation.y) * 0.2;
    }
});

// ======= Disparo =======
canvas.addEventListener('pointerdown', ()=>{
    if(!localPlayer.canShoot) return;
    localPlayer.canShoot = false;
    setTimeout(()=> localPlayer.canShoot = true, 200);

    let origin = localPlayer.mesh.position.clone();
    let forward = camera.getTarget().subtract(camera.position).normalize();
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
