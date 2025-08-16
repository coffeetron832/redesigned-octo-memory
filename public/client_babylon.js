// ======= Variables globales =======
let canvas = document.getElementById('renderCanvas');
let engine = new BABYLON.Engine(canvas, true);
let scene = new BABYLON.Scene(engine);

// ======= Jugador local =======
let localPlayer = {
    hp: 100,
    canShoot: true,
    mesh: null,
    weapon: {
        name: "Pistol",
        damage: 25,
        cooldown: 300,
        canShoot: true,
        ammo: 12,
        maxAmmo: 12,
        mesh: null
    }
};

// ======= Crear jugador =======
localPlayer.mesh = BABYLON.MeshBuilder.CreateCapsule("player", {radius:0.5, height:1.5}, scene);
localPlayer.mesh.position.set(0, 1, 0);
localPlayer.mesh.material = new BABYLON.StandardMaterial("matP", scene);
localPlayer.mesh.material.diffuseColor = new BABYLON.Color3(0.8,0.3,0.6);
localPlayer.mesh.checkCollisions = true;

// ======= Arma del jugador =======
localPlayer.weapon.mesh = BABYLON.MeshBuilder.CreateBox("pistol", {width:0.3, height:0.2, depth:1}, scene);
localPlayer.weapon.mesh.material = new BABYLON.StandardMaterial("matGun", scene);
localPlayer.weapon.mesh.material.diffuseColor = new BABYLON.Color3(0.1,0.1,0.1);
localPlayer.weapon.mesh.parent = localPlayer.mesh;
localPlayer.weapon.mesh.position.set(0.3,1,0.5);

// ======= Cámara estilo GTA =======
let camera = new BABYLON.ArcRotateCamera("arcCam", -Math.PI/2, Math.PI/3, 6, localPlayer.mesh.position, scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 2;
camera.upperRadiusLimit = 12;
camera.wheelDeltaPercentage = 0.01;
camera.checkCollisions = true;
camera.collisionRadius = new BABYLON.Vector3(0.5,0.5,0.5);
camera.upperBetaLimit = Math.PI/2.2;
camera.lowerBetaLimit = 0.1;

// ======= Luz =======
let light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0,1,0), scene);
light.intensity = 0.9;

// ======= Piso =======
let ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.checkCollisions = true;

// ======= Mapa pintoresco =======
// ======= Mapa tipo ciudad =======
function createCity() {
    const mapSize = 150; // más pequeño y denso
    const buildingCount = 60;
    const roadCount = 20;
    const parkCount = 4;

    // Calles en cuadrícula
    for(let i=0;i<roadCount;i++){
        let isVertical = i % 2 === 0;
        let roadLength = mapSize;
        let roadWidth = 4;
        let road = BABYLON.MeshBuilder.CreateBox("road"+i, {
            width: isVertical ? roadWidth : roadLength,
            height: 0.05,
            depth: isVertical ? roadLength : roadWidth
        }, scene);

        road.position.set(
            isVertical ? (i/2 - roadCount/4) * 15 : 0,
            0.025,
            isVertical ? 0 : (i/2 - roadCount/4) * 15
        );

        road.material = new BABYLON.StandardMaterial("matRoad"+i, scene);
        road.material.diffuseColor = new BABYLON.Color3(0.15,0.15,0.15);
        road.checkCollisions = true;
    }

    // Edificios variados
    for(let i=0;i<buildingCount;i++){
        let w = Math.random()*3+3;
        let d = Math.random()*3+3;
        let h = Math.random()*10+3;
        let b = BABYLON.MeshBuilder.CreateBox("bldg"+i, {width:w, height:h, depth:d}, scene);
        b.position.set(Math.random()*mapSize-mapSize/2, h/2, Math.random()*mapSize-mapSize/2);
        b.material = new BABYLON.StandardMaterial("matB"+i, scene);
        b.material.diffuseColor = new BABYLON.Color3(Math.random()*0.6+0.3, Math.random()*0.6+0.3, Math.random()*0.6+0.3);
        b.checkCollisions = true;
    }

    // Parques con árboles
    for(let i=0;i<parkCount;i++){
        let park = BABYLON.MeshBuilder.CreateGround("park"+i, {width:15, height:15}, scene);
        park.position.set(Math.random()*mapSize-mapSize/2, 0, Math.random()*mapSize-mapSize/2);
        park.material = new BABYLON.StandardMaterial("matPark"+i, scene);
        park.material.diffuseColor = new BABYLON.Color3(0.2,0.5,0.2);

        // Árboles dentro del parque
        for(let j=0;j<6;j++){
            let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk"+i+"_"+j, {height:1.5, diameterTop:0.3, diameterBottom:0.3}, scene);
            trunk.position.set(park.position.x + Math.random()*10-5,0.75, park.position.z + Math.random()*10-5);
            trunk.material = new BABYLON.StandardMaterial("matTrunk"+i+j, scene);
            trunk.material.diffuseColor = new BABYLON.Color3(0.55,0.27,0.07);

            let leaves = BABYLON.MeshBuilder.CreateSphere("leaves"+i+"_"+j, {diameter:1.5}, scene);
            leaves.position.set(trunk.position.x, 1.6, trunk.position.z);
            leaves.material = new BABYLON.StandardMaterial("matLeaves"+i+j, scene);
            leaves.material.diffuseColor = new BABYLON.Color3(0.2+Math.random()*0.3, 0.6+Math.random()*0.3, 0.2+Math.random()*0.3);

            trunk.checkCollisions = true;
            leaves.checkCollisions = true;
        }
    }

    // Plazas pequeñas
    for(let i=0;i<3;i++){
        let plaza = BABYLON.MeshBuilder.CreateDisc("plaza"+i, {radius:8, tessellation:30}, scene);
        plaza.rotation.x = Math.PI/2;
        plaza.position.set(Math.random()*mapSize-mapSize/2, 0.01, Math.random()*mapSize-mapSize/2);
        plaza.material = new BABYLON.StandardMaterial("matPlaza"+i, scene);
        plaza.material.diffuseColor = new BABYLON.Color3(0.6,0.6,0.6);
        plaza.checkCollisions = true;
    }
}

createCity();



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

// Recarga tecla R
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyDownTrigger,
    e => {
        if(e.sourceEvent.key.toLowerCase() === "r"){
            localPlayer.weapon.ammo = localPlayer.weapon.maxAmmo;
            console.log("Recargando...");
        }
    }
));

// ======= Movimiento relativa a cámara =======
scene.onBeforeRenderObservable.add(()=>{
    let dir = new BABYLON.Vector3.Zero();
    let camForward = camera.getTarget().subtract(camera.position);
    camForward.y = 0;
    camForward.normalize();
    let camRight = new BABYLON.Vector3(-camForward.z, 0, camForward.x);

    if(inputMap["w"]) dir.addInPlace(camForward);
    if(inputMap["s"]) dir.subtractInPlace(camForward);
    if(inputMap["a"]) dir.subtractInPlace(camRight);
    if(inputMap["d"]) dir.addInPlace(camRight);

    if(dir.lengthSquared() > 0){
        dir.normalize();
        localPlayer.mesh.moveWithCollisions(dir.scale(0.3));
        let targetRotation = Math.atan2(dir.x, dir.z);
        localPlayer.mesh.rotation.y += (targetRotation - localPlayer.mesh.rotation.y) * 0.2;
    }
});

// ======= Disparo =======
canvas.addEventListener('pointerdown', ()=>{
    if(!localPlayer.weapon.canShoot || localPlayer.weapon.ammo <= 0) return;

    localPlayer.weapon.canShoot = false;
    localPlayer.weapon.ammo--;
    setTimeout(()=> localPlayer.weapon.canShoot = true, localPlayer.weapon.cooldown);

    let origin = localPlayer.mesh.position.add(new BABYLON.Vector3(0,1.2,0));
    let forward = camera.getTarget().subtract(camera.position).normalize();

    // Raycast
    let ray = new BABYLON.Ray(origin, forward, 50);
    let hit = scene.pickWithRay(ray, mesh=>mesh!=localPlayer.mesh && mesh!=localPlayer.weapon.mesh);
    if(hit.hit){
        console.log(`Disparo impactó en: ${hit.pickedMesh.name}`);
    }

    // Bala visual
    let bullet = BABYLON.MeshBuilder.CreateSphere("bullet", {diameter:0.1}, scene);
    bullet.position = origin.clone();
    bullet.material = new BABYLON.StandardMaterial("matBullet", scene);
    bullet.material.diffuseColor = new BABYLON.Color3(1,1,0);

    let bulletSpeed = 1;
    let moveBullet = scene.onBeforeRenderObservable.add(()=>{
        bullet.position.addInPlace(forward.scale(bulletSpeed));
        if(bullet.position.subtract(origin).length() > 50){
            bullet.dispose();
            scene.onBeforeRenderObservable.remove(moveBullet);
        }
    });
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
