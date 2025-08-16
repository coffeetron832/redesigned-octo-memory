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

// ======= Mapa  =======
function createCity() {
    const mapSize = 120; 
    const buildingBlocks = 6;
    const buildingsPerBlock = 6;
    const treeCount = 40;
    const bushCount = 20;

    // === Calles principales en cuadrícula ===
    let roads = [];
    for(let i=0; i<buildingBlocks+1; i++){
        let roadX = BABYLON.MeshBuilder.CreateBox("roadX"+i, {width: mapSize, height:0.05, depth: 3}, scene);
        roadX.position.set(0,0.025, (i*(mapSize/buildingBlocks))-mapSize/2);
        roadX.material = new BABYLON.StandardMaterial("matRoadX"+i, scene);
        roadX.material.diffuseColor = new BABYLON.Color3(0.15,0.15,0.15);
        roads.push(roadX);

        let roadZ = BABYLON.MeshBuilder.CreateBox("roadZ"+i, {width: 3, height:0.05, depth: mapSize}, scene);
        roadZ.position.set((i*(mapSize/buildingBlocks))-mapSize/2,0.025,0);
        roadZ.material = new BABYLON.StandardMaterial("matRoadZ"+i, scene);
        roadZ.material.diffuseColor = new BABYLON.Color3(0.15,0.15,0.15);
        roads.push(roadZ);
    }

    // === Manzanas de edificios ===
    const blockSize = mapSize/buildingBlocks;
    for(let bx=0; bx<buildingBlocks; bx++){
        for(let bz=0; bz<buildingBlocks; bz++){
            for(let i=0; i<buildingsPerBlock; i++){
                let w = 2 + Math.random()*2;
                let d = 2 + Math.random()*2;
                let h = 4 + Math.random()*6;
                let offsetX = (Math.random()-0.5)*blockSize*0.6;
                let offsetZ = (Math.random()-0.5)*blockSize*0.6;

                let b = BABYLON.MeshBuilder.CreateBox("bldg"+bx+"_"+bz+"_"+i,
                    {width:w, height:h, depth:d}, scene);
                b.position.set(
                    bx*blockSize - mapSize/2 + blockSize/2 + offsetX,
                    h/2,
                    bz*blockSize - mapSize/2 + blockSize/2 + offsetZ
                );
                b.material = new BABYLON.StandardMaterial("matB"+i, scene);
                b.material.diffuseColor = new BABYLON.Color3(Math.random()*0.5+0.5, Math.random()*0.5+0.5, Math.random()*0.5+0.5);
                b.checkCollisions = true;
            }
        }
    }

    // === Parques con árboles ===
    for(let i=0;i<treeCount;i++){
        let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk"+i, {height:1.5, diameterTop:0.3, diameterBottom:0.3}, scene);
        trunk.position.set(Math.random()*mapSize-mapSize/2,0.75,Math.random()*mapSize-mapSize/2);
        trunk.material = new BABYLON.StandardMaterial("matTrunk"+i, scene);
        trunk.material.diffuseColor = new BABYLON.Color3(0.55,0.27,0.07);

        let leaves = BABYLON.MeshBuilder.CreateSphere("leaves"+i, {diameter:1.5}, scene);
        leaves.position.set(trunk.position.x, 1.6, trunk.position.z);
        leaves.material = new BABYLON.StandardMaterial("matLeaves"+i, scene);
        leaves.material.diffuseColor = new BABYLON.Color3(0.1+Math.random()*0.3, 0.5+Math.random()*0.5, 0.1+Math.random()*0.3);

        trunk.checkCollisions = true;
        leaves.checkCollisions = true;
    }

    // === Arbustos ===
    for(let i=0;i<bushCount;i++){
        let bush = BABYLON.MeshBuilder.CreateSphere("bush"+i, {diameter:0.5 + Math.random()*0.3}, scene);
        bush.position.set(Math.random()*mapSize-mapSize/2, 0.25, Math.random()*mapSize-mapSize/2);
        bush.material = new BABYLON.StandardMaterial("matBush"+i, scene);
        bush.material.diffuseColor = new BABYLON.Color3(0.2+Math.random()*0.3,0.6+Math.random()*0.3,0.2+Math.random()*0.3);
        bush.checkCollisions = true;
    }

    // === Plazas con fuentes ===
    for(let i=0;i<3;i++){
        let plaza = BABYLON.MeshBuilder.CreateDisc("plaza"+i, {radius: 6, tessellation:30}, scene);
        plaza.rotation.x = Math.PI/2;
        plaza.position.set(Math.random()*mapSize-mapSize/2, 0.01, Math.random()*mapSize-mapSize/2);
        plaza.material = new BABYLON.StandardMaterial("matPlaza"+i, scene);
        plaza.material.diffuseColor = new BABYLON.Color3(0.8,0.8,0.8);

        let fountain = BABYLON.MeshBuilder.CreateCylinder("fountain"+i, {diameterTop:2, diameterBottom:2, height:0.5}, scene);
        fountain.position.set(plaza.position.x,0.25,plaza.position.z);
        fountain.material = new BABYLON.StandardMaterial("matFountain"+i, scene);
        fountain.material.diffuseColor = new BABYLON.Color3(0,0.5,0.8);
    }

    // === Farolas en las calles ===
    for(let i=0;i<roads.length;i++){
        if(Math.random() > 0.5) continue; // no poner farolas en todas

        let pos = roads[i].position.clone();
        pos.x += (Math.random()>0.5?2:-2); 
        pos.y = 1;

        let pole = BABYLON.MeshBuilder.CreateCylinder("lampPost"+i, {diameter:0.2, height:2}, scene);
        pole.position.set(pos.x,1,pos.z);
        pole.material = new BABYLON.StandardMaterial("matPole"+i, scene);
        pole.material.diffuseColor = new BABYLON.Color3(0.3,0.3,0.3);

        let lightBulb = BABYLON.MeshBuilder.CreateSphere("bulb"+i, {diameter:0.4}, scene);
        lightBulb.position.set(pos.x,2.2,pos.z);
        lightBulb.material = new BABYLON.StandardMaterial("matBulb"+i, scene);
        lightBulb.material.emissiveColor = new BABYLON.Color3(1,1,0.6);

        let lampLight = new BABYLON.PointLight("lampLight"+i, new BABYLON.Vector3(pos.x,2.2,pos.z), scene);
        lampLight.intensity = 0.6;
        lampLight.range = 8;
    }

    // === Vehículos en movimiento ===
    let vehicles = [];
    for(let i=0;i<8;i++){
        let car = BABYLON.MeshBuilder.CreateBox("car"+i, {width:2, height:1, depth:1}, scene);
        car.position.set(Math.random()*mapSize-mapSize/2,0.5, (Math.random()>0.5? -mapSize/2 : mapSize/2));
        car.material = new BABYLON.StandardMaterial("matCar"+i, scene);
        car.material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        vehicles.push({mesh:car, dir: (Math.random()>0.5?1:-1)});
    }

    // === Animar vehículos ===
    scene.onBeforeRenderObservable.add(()=>{
        vehicles.forEach(v=>{
            v.mesh.position.z += 0.2 * v.dir;
            if(v.mesh.position.z > mapSize/2) v.mesh.position.z = -mapSize/2;
            if(v.mesh.position.z < -mapSize/2) v.mesh.position.z = mapSize/2;
        });
    });
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
