public/client_babylon.js:

// public/client_babylon.js
// ======= Variables globales =======
let canvas = document.getElementById('renderCanvas');
let engine = new BABYLON.Engine(canvas, true);
let scene = new BABYLON.Scene(engine);

// ======= Net (will be set by startGame) =======
let netSocket = null;
let currentRoom = null;
let currentName = null;

// ======= Jugador local =======
let localPlayer = {
    id: null,
    name: null,
    room: null,
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

// ======= Remote players store =======
let remotePlayers = {}; // id -> mesh

// ======= Aim target (punto en el mundo hacia donde apunta el ratón) =======
let aimTarget = new BABYLON.Vector3(0, 1.2, 5); // valor inicial

// ======= Crear jugador (local mesh) =======
localPlayer.mesh = BABYLON.MeshBuilder.CreateCapsule("player_local", {radius:0.5, height:1.5}, scene);
localPlayer.mesh.position.set(0, 1, 0);
localPlayer.mesh.material = new BABYLON.StandardMaterial("matP", scene);
localPlayer.mesh.material.diffuseColor = new BABYLON.Color3(0.8,0.3,0.6);
localPlayer.mesh.checkCollisions = true;

// ======= Arma del jugador (mesh independiente, no parentada) =======
// Creamos el mesh del arma como cubo simple; puedes sustituir por un glb más adelante.
localPlayer.weapon.mesh = BABYLON.MeshBuilder.CreateBox("pistol_local", {width:0.3, height:0.15, depth:0.9}, scene);
localPlayer.weapon.mesh.material = new BABYLON.StandardMaterial("matGun_local", scene);
localPlayer.weapon.mesh.material.diffuseColor = new BABYLON.Color3(0.12,0.12,0.12);
// No la parentamos: la posicionaremos manualmente cada frame.
// localPlayer.weapon.mesh.parent = localPlayer.mesh;
localPlayer.weapon.mesh.isPickable = false; // evitar picks sobre el arma

// Ajuste visual: elevamos el pivote si quieres rotación limpia (opcional)
// localPlayer.weapon.mesh.bakeCurrentTransformIntoVertices(); // si necesitas fijar transformaciones

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

// ======= Piso con textura (espera que pongas textures/grass.jpg en /public/textures) =======
let groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new BABYLON.Texture("textures/grass.jpg", scene);
groundMat.specularColor = new BABYLON.Color3(0,0,0);

let ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.material = groundMat;
ground.checkCollisions = true;

// ======= Mapa (texturas asumidas en /public/textures) =======
function createCity() {
    const mapSize = 120; 
    const buildingBlocks = 6;
    const buildingsPerBlock = 6;
    const treeCount = 40;
    const bushCount = 20;

    const blockSize = mapSize / buildingBlocks;
    let roads = [];

    // === Calles principales ===
    for (let i = 0; i <= buildingBlocks; i++) {
        // Horizontal (X)
        let roadX = BABYLON.MeshBuilder.CreateBox("roadX"+i, {width: mapSize, height:0.05, depth: 3}, scene);
        roadX.position.set(0,0.025, (i*blockSize)-mapSize/2);
        let roadMatX = new BABYLON.StandardMaterial("matRoadX"+i, scene);
        roadMatX.diffuseTexture = new BABYLON.Texture("textures/asphalt.jpg", scene);
        roadMatX.specularColor = new BABYLON.Color3(0,0,0);
        roadX.material = roadMatX;
        roads.push(roadX);

        // Vertical (Z)
        let roadZ = BABYLON.MeshBuilder.CreateBox("roadZ"+i, {width: 3, height:0.05, depth: mapSize}, scene);
        roadZ.position.set((i*blockSize)-mapSize/2,0.025,0);
        let roadMatZ = new BABYLON.StandardMaterial("matRoadZ"+i, scene);
        roadMatZ.diffuseTexture = new BABYLON.Texture("textures/asphalt.jpg", scene);
        roadMatZ.specularColor = new BABYLON.Color3(0,0,0);
        roadZ.material = roadMatZ;
        roads.push(roadZ);
    }

    // === Edificios organizados en bloques ===
    let wallTextures = [
        "textures/wall_brick.jpg",
        "textures/wall_concrete.jpg",
        "textures/wall_glass.jpg"
    ];

    for (let bx=0; bx<buildingBlocks; bx++) {
        for (let bz=0; bz<buildingBlocks; bz++) {
            for (let i=0; i<buildingsPerBlock; i++) {
                let w = 2 + Math.random()*2;
                let d = 2 + Math.random()*2;
                let h = 4 + Math.random()*6;

                let offsetX = (Math.random()-0.5)*blockSize*0.5;
                let offsetZ = (Math.random()-0.5)*blockSize*0.5;

                let b = BABYLON.MeshBuilder.CreateBox("bldg"+bx+"_"+bz+"_"+i,
                    {width:w, height:h, depth:d}, scene);
                b.position.set(
                    bx*blockSize - mapSize/2 + blockSize/2 + offsetX,
                    h/2,
                    bz*blockSize - mapSize/2 + blockSize/2 + offsetZ
                );
                let matB = new BABYLON.StandardMaterial("matB"+i, scene);
                matB.diffuseTexture = new BABYLON.Texture(wallTextures[Math.floor(Math.random()*wallTextures.length)], scene);
                matB.specularColor = new BABYLON.Color3(0,0,0);
                b.material = matB;
                b.checkCollisions = true;
            }
        }
    }

    // === Parques con árboles ===
    for (let i=0;i<treeCount;i++) {
        let x = (Math.floor(Math.random()*buildingBlocks) * blockSize) - mapSize/2 + blockSize/2;
        let z = (Math.floor(Math.random()*buildingBlocks) * blockSize) - mapSize/2 + blockSize/2;

        let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk"+i, {height:1.5, diameterTop:0.3, diameterBottom:0.3}, scene);
        trunk.position.set(x+(Math.random()-0.5)*blockSize*0.8,0.75,z+(Math.random()-0.5)*blockSize*0.8);
        trunk.material = new BABYLON.StandardMaterial("matTrunk"+i, scene);
        trunk.material.diffuseTexture = new BABYLON.Texture("textures/wood.jpg", scene);

        let leaves = BABYLON.MeshBuilder.CreateSphere("leaves"+i, {diameter:1.5}, scene);
        leaves.position.set(trunk.position.x, 1.6, trunk.position.z);
        leaves.material = new BABYLON.StandardMaterial("matLeaves"+i, scene);
        leaves.material.diffuseTexture = new BABYLON.Texture("textures/leaves.png", scene);
        leaves.material.diffuseTexture.hasAlpha = true;
    }

    // === Arbustos ===
    for (let i=0;i<bushCount;i++) {
        let bush = BABYLON.MeshBuilder.CreateSphere("bush"+i, {diameter:0.5 + Math.random()*0.3}, scene);
        bush.position.set(Math.random()*mapSize-mapSize/2, 0.25, Math.random()*mapSize-mapSize/2);
        bush.material = new BABYLON.StandardMaterial("matBush"+i, scene);
        bush.material.diffuseTexture = new BABYLON.Texture("textures/bush.png", scene);
        bush.material.diffuseTexture.hasAlpha = true;
    }

    // === Vehículos circulando SOLO por calles ===
    let vehicles = [];
    for (let i=0;i<12;i++) {
        let car = BABYLON.MeshBuilder.CreateBox("car"+i, {width:2, height:1, depth:1}, scene);
        car.material = new BABYLON.StandardMaterial("matCar"+i, scene);
        car.material.diffuseTexture = new BABYLON.Texture("textures/car_paint.jpg", scene);

        if (Math.random()>0.5) {
            let zLane = (Math.floor(Math.random()*(buildingBlocks+1)) * blockSize) - mapSize/2;
            car.position.set(-mapSize/2, 0.5, zLane+1.5*(Math.random()>0.5?1:-1));
            vehicles.push({mesh:car, dir:1, axis:"x"});
        } else {
            let xLane = (Math.floor(Math.random()*(buildingBlocks+1)) * blockSize) - mapSize/2;
            car.position.set(xLane+1.5*(Math.random()>0.5?1:-1), 0.5, -mapSize/2);
            vehicles.push({mesh:car, dir:1, axis:"z"});
        }
    }

    // === Animar vehículos ===
    scene.onBeforeRenderObservable.add(()=>{
        vehicles.forEach(v=>{
            if (v.axis==="x") {
                v.mesh.position.x += 0.4 * v.dir;
                if(v.mesh.position.x > mapSize/2) v.mesh.position.x = -mapSize/2;
                if(v.mesh.position.x < -mapSize/2) v.mesh.position.x = mapSize/2;
            } else {
                v.mesh.position.z += 0.4 * v.dir;
                if(v.mesh.position.z > mapSize/2) v.mesh.position.z = -mapSize/2;
                if(v.mesh.position.z < -mapSize/2) v.mesh.position.z = mapSize/2;
            }
        });
    });
}
createCity();

// ======= Ciclo Día/Noche =======
function setupDayNightCycle(scene) {
    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1, -2, -1), scene);
    sun.position = new BABYLON.Vector3(0, 100, 0);
    sun.intensity = 1;

    const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.4;

    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
    const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMat", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;

    let time = 0;

    scene.onBeforeRenderObservable.add(() => {
        time += engine.getDeltaTime() * 0.00002;
        if (time > 1) time = 0;

        let angle = time * 2 * Math.PI;
        sun.direction = new BABYLON.Vector3(Math.sin(angle), -Math.cos(angle), Math.sin(angle));

        let dayFactor = Math.max(0, Math.cos(angle));
        sun.intensity = 0.8 * dayFactor;
        ambient.intensity = 0.2 + 0.6 * dayFactor;

        if (dayFactor > 0.2) {
            skyboxMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.7, 1.0);
            skyboxMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.7, 1.0);
        } else {
            skyboxMaterial.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.05);
            skyboxMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05);
        }
    });
}
setupDayNightCycle(scene);

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

// Recargar con R
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyDownTrigger,
    e => {
        if(e.sourceEvent.key.toLowerCase() === "r"){
            localPlayer.weapon.ammo = localPlayer.weapon.maxAmmo;
            console.log("Recargando...");
        }
    }
));

// ======= Pointer handling: actualizar aimTarget =======
function updateAimFromScreenCoords(screenX, screenY){
    // intenta hacer pick en la escena con la cámara actual
    const pick = scene.pick(screenX, screenY, (mesh) => { return mesh !== localPlayer.weapon.mesh; }, false, camera);
    if(pick && pick.hit && pick.pickedPoint){
        aimTarget.copyFrom(pick.pickedPoint);
    } else {
        // si no hay pick, proyectamos un punto lejos en la dirección de la cámara
        // (obtiene el rayo de la cámara desde la pantalla)
        const ray = scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), camera);
        aimTarget.copyFrom(camera.position.add(ray.direction.scale(50)));
    }
}

// escuchamos movimiento del puntero cuando no está locked
canvas.addEventListener('pointermove', (ev) => {
    // solo actualizar target si el mouse no está bloqueado (cuando está bloqueado usamos centro)
    if(document.pointerLockElement !== canvas){
        // screen coords relativos al canvas
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        updateAimFromScreenCoords(x, y);
    }
});

// Si el usuario tiene pointer lock, apuntamos al centro de la pantalla
function updateAimCenter(){
    const cx = engine.getRenderWidth() / 2;
    const cy = engine.getRenderHeight() / 2;
    updateAimFromScreenCoords(cx, cy);
}

// ======= Movimiento =======
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

    // actualizar aimTarget (centro si pointer lock)
    if(document.pointerLockElement === canvas){
        updateAimCenter();
    }

    // ======= Posicionar y orientar arma hacia aimTarget =======
    if(localPlayer.weapon.mesh){
        // offset local: delante y ligeramente a la derecha del jugador (ajusta a gusto)
        const forward = new BABYLON.Vector3(Math.sin(localPlayer.mesh.rotation.y), 0, Math.cos(localPlayer.mesh.rotation.y));
        const right = new BABYLON.Vector3(Math.sin(localPlayer.mesh.rotation.y + Math.PI/2), 0, Math.cos(localPlayer.mesh.rotation.y + Math.PI/2));
        const weaponOffset = forward.scale(0.5).add(right.scale(0.15)).add(new BABYLON.Vector3(0, 1.05, 0));
        const weaponWorldPos = localPlayer.mesh.position.add(weaponOffset);

        localPlayer.weapon.mesh.position.copyFrom(weaponWorldPos);

        // hacer que el arma mire al aimTarget
        localPlayer.weapon.mesh.lookAt(aimTarget);

        // si quieres limitar pitch (mirada hacia arriba/abajo), puedes leer la rotación resultante y clampear:
        // let euler = localPlayer.weapon.mesh.rotation; ... ajustar euler.x
    }

    // Enviar posición al servidor (si estamos conectados)
    if(netSocket && localPlayer.id && currentRoom){
        netSocket.emit("updatePos", {
            id: localPlayer.id,
            room: currentRoom,
            x: localPlayer.mesh.position.x,
            y: localPlayer.mesh.position.y,
            z: localPlayer.mesh.position.z,
            rot: localPlayer.mesh.rotation.y
        });
    }
});

// ======= Disparo =======
canvas.addEventListener('pointerdown', (ev)=>{
    // solo disparar con botón izquierdo
    if(ev.button !== 0) return;

    if(!localPlayer.weapon.canShoot || localPlayer.weapon.ammo <= 0) return;
    if(!currentRoom || !netSocket) return;

    localPlayer.weapon.canShoot = false;
    localPlayer.weapon.ammo--;
    setTimeout(()=> localPlayer.weapon.canShoot = true, localPlayer.weapon.cooldown);

    // origen desde la boca del arma (aprox)
    const origin = localPlayer.weapon.mesh.position.add(localPlayer.weapon.mesh.getDirection(BABYLON.Axis.Z).scale(0.5));
    // forward según orientación del arma (eje Z local)
    const forwardVec = localPlayer.weapon.mesh.getDirection(BABYLON.Axis.Z).normalize();

    // Raycast local (opcional - para impacto inmediato)
    const ray = new BABYLON.Ray(origin, forwardVec, 50);
    const hit = scene.pickWithRay(ray, (mesh) => mesh !== localPlayer.mesh && mesh !== localPlayer.weapon.mesh);
    if(hit && hit.hit){
        console.log(`Disparo impactó en: ${hit.pickedMesh.name}`);
    }

    // Enviar disparo al servidor (transformamos origin a array)
    const originArr = [origin.x, origin.y, origin.z];
    const forwardArr = [forwardVec.x, forwardVec.y, forwardVec.z];
    netSocket.emit("shoot", { id: localPlayer.id, room: currentRoom, origin: originArr, forward: forwardArr });

    // Bala visual local
    let bullet = BABYLON.MeshBuilder.CreateSphere("bullet", {diameter:0.08}, scene);
    bullet.position = origin.clone();
    bullet.material = new BABYLON.StandardMaterial("matBullet", scene);
    bullet.material.diffuseColor = new BABYLON.Color3(1,1,0.2);

    let bulletSpeed = 2.0;
    let moveBullet = scene.onBeforeRenderObservable.add(()=>{
        bullet.position.addInPlace(forwardVec.scale(bulletSpeed));
        if(bullet.position.subtract(origin).length() > 50){
            bullet.dispose();
            scene.onBeforeRenderObservable.remove(moveBullet);
        }
    });
});

// ======= Network helpers: spawn / despawn =======
function spawnRemote(id, state){
    if(remotePlayers[id]) return;
    const p = BABYLON.MeshBuilder.CreateCapsule("remote_"+id, {radius:0.5, height:1.5}, scene);
    p.position.set(state.x || 0, state.y || 1, state.z || 0);
    let mat = new BABYLON.StandardMaterial("matR"+id, scene);
    mat.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    p.material = mat;
    remotePlayers[id] = p;
}

function despawnRemote(id){
    if(remotePlayers[id]){
        remotePlayers[id].dispose();
        delete remotePlayers[id];
    }
}

// ======= startGame: call from index.html with socket and room info =======
function startGame(socketParam, roomParam, nameParam){
    if(!socketParam){
        console.error("startGame: socketParam missing");
        return;
    }
    netSocket = socketParam;
    currentRoom = roomParam;
    currentName = nameParam || ("player_" + Math.floor(Math.random()*1000));
    localPlayer.name = currentName;
    localPlayer.room = currentRoom;

    // If server-side join wasn't sent, send it now
    try { netSocket.emit && netSocket.emit("joinRoom", { room: currentRoom, name: currentName }); } catch(e){}

    // Listeners (cover a few common server event names)
    netSocket.on("init", data=>{
        localPlayer.id = data.id || netSocket.id || data.socketId;
        console.log("INIT from server. my id:", localPlayer.id);
    });

    // If server sends a full list keyed by id
    netSocket.on("currentPlayers", (list)=>{
        // spawn / sync
        for(const [id, state] of Object.entries(list)){
            if(id === localPlayer.id) continue;
            spawnRemote(id, state);
        }
    });

    netSocket.on("playerJoined", ({id, state})=>{
        if(id === localPlayer.id) return;
        spawnRemote(id, state);
    });

    netSocket.on("playerMoved", ({id, state})=>{
        if(id === localPlayer.id) return;
        if(remotePlayers[id]){
            remotePlayers[id].position.set(state.x, state.y, state.z);
            if(state.rot !== undefined) remotePlayers[id].rotation.y = state.rot;
        } else {
            spawnRemote(id, state);
        }
    });

    netSocket.on("playerLeft", ({id})=>{
        despawnRemote(id);
    });

    // Generic updatePlayers (server might send full snapshot)
    netSocket.on("updatePlayers", (playersObj)=>{
        // Ensure all present, spawn missing, remove extra
        const serverIds = new Set(Object.keys(playersObj || {}));
        // spawn/update
        for(const id of serverIds){
            if(id === localPlayer.id) continue;
            const state = playersObj[id];
            if(!remotePlayers[id]) spawnRemote(id, state);
            else {
                remotePlayers[id].position.set(state.x, state.y, state.z);
                if(state.rot !== undefined) remotePlayers[id].rotation.y = state.rot;
            }
        }
        // remove locals not on server
        for(const id in remotePlayers){
            if(!serverIds.has(id)) despawnRemote(id);
        }
    });

    // Shoot event from server
    netSocket.on("playerShoot", ({ id, origin, forward })=>{
        // origin may be array or object
        let o;
        if(Array.isArray(origin)) o = new BABYLON.Vector3(origin[0], origin[1], origin[2]);
        else if(origin && origin.x !== undefined) o = origin;
        else o = (remotePlayers[id] ? remotePlayers[id].position.clone() : new BABYLON.Vector3(0,1,0));

        let f;
        if(Array.isArray(forward)) f = new BABYLON.Vector3(forward[0], forward[1], forward[2]);
        else if(forward && forward.x !== undefined) f = forward;
        else f = new BABYLON.Vector3(0,0,1);

        // Visual bullet
        const bullet = BABYLON.MeshBuilder.CreateSphere("rb_"+Date.now(), {diameter:0.08}, scene);
        bullet.position = o.clone();
        bullet.material = new BABYLON.StandardMaterial("rbMat", scene);
        bullet.material.diffuseColor = new BABYLON.Color3(1,0.3,0.1);
        let spd = 2;
        let mover = scene.onBeforeRenderObservable.add(()=>{
            bullet.position.addInPlace(f.scale(spd));
            if(bullet.position.subtract(o).length() > 50){
                bullet.dispose();
                scene.onBeforeRenderObservable.remove(mover);
            }
        });
    });

    console.log("startGame: network handlers attached for room:", currentRoom);
}

// Expose startGame globally so index.html can call it
window.startGame = startGame;

// ======= Render loop =======
engine.runRenderLoop(()=>{ scene.render(); });

// ======= Resize =======
window.addEventListener('resize', ()=>engine.resize());

// ======= Start button (if present) =======
const startBtnEl = document.getElementById('startBtn');
if(startBtnEl){
    startBtnEl.addEventListener('click', ()=>{
        if(canvas.requestPointerLock) canvas.requestPointerLock();
        startBtnEl.classList.add('hidden');
        const hud = document.getElementById('hud');
        if(hud) hud.classList.remove('hidden');
    });
}
