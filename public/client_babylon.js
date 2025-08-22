// public/client_babylon.js (ACTUALIZADO: aim con right-click + pointer lock + arma separada)
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
localPlayer.weapon.mesh = BABYLON.MeshBuilder.CreateBox("pistol_local", {width:0.3, height:0.15, depth:0.9}, scene);
localPlayer.weapon.mesh.material = new BABYLON.StandardMaterial("matGun_local", scene);
localPlayer.weapon.mesh.material.diffuseColor = new BABYLON.Color3(0.12,0.12,0.12);
localPlayer.weapon.mesh.isPickable = false;

// ======= Cámara estilo GTA (ArcRotate) =======
const NORMAL_RADIUS = 6;
const AIM_RADIUS = 2.0;
let desiredRadius = NORMAL_RADIUS;
let isAiming = false;

const AIM_SENS = 1.2;
const NORMAL_SENS = 1.0;
const AIM_LERP = 0.18; // suavizado de zoom
const WEAPON_LERP = 0.22; // suavizado arma

let camera = new BABYLON.ArcRotateCamera("arcCam", -Math.PI/2, Math.PI/3, NORMAL_RADIUS, localPlayer.mesh.position, scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 1.5;
camera.upperRadiusLimit = 12;
camera.wheelDeltaPercentage = 0.01;
camera.checkCollisions = true;
camera.collisionRadius = new BABYLON.Vector3(0.5,0.5,0.5);
camera.upperBetaLimit = Math.PI/2.2;
camera.lowerBetaLimit = 0.1;

// ======= Luz =======
let light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0,1,0), scene);
light.intensity = 0.9;

// ======= Piso con textura (pon tus texturas en /public/textures) =======
let groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new BABYLON.Texture("textures/grass.jpg", scene);
groundMat.specularColor = new BABYLON.Color3(0,0,0);
let ground = BABYLON.MeshBuilder.CreateGround("ground", {width:200, height:200}, scene);
ground.material = groundMat;
ground.checkCollisions = true;

/* ------------------------
   Aquí puedes mantener tu función createCity() existente
   (no la pego completa para no duplicar; conserva la tuya)
   ------------------------ */
createCity && createCity();

// ======= Day/Night (mantén la tuya) =======
setupDayNightCycle && setupDayNightCycle(scene);

// ======= Input handling =======
let inputMap = {};
scene.actionManager = new BABYLON.ActionManager(scene);
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key.toLowerCase()] = true));
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key.toLowerCase()] = false));

// Evitar menú contextual en canvas (importante para right-click)
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ======= Funciones para actualizar aimTarget a partir de coordenadas de pantalla =======
function updateAimFromScreenCoords(screenX, screenY){
    const pick = scene.pick(screenX, screenY, (mesh) => { return mesh !== localPlayer.weapon.mesh; }, false, camera);
    if(pick && pick.hit && pick.pickedPoint){
        aimTarget.copyFrom(pick.pickedPoint);
    } else {
        const ray = scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), camera);
        aimTarget.copyFrom(camera.position.add(ray.direction.scale(50)));
    }
}

canvas.addEventListener('pointermove', (ev) => {
    // si pointer lock activo, no usamos client coords; movimiento se procesa en 'mousemove' listener con movementX/Y
    if(document.pointerLockElement === canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    updateAimFromScreenCoords(x, y);
});

// cuando pointer lock -> apuntamos al centro cada frame
function updateAimCenter(){
    const cx = engine.getRenderWidth() / 2;
    const cy = engine.getRenderHeight() / 2;
    updateAimFromScreenCoords(cx, cy);
}

// ======= Pointer lock mouse movement (rotar cámara con movementX / movementY) =======
function onMouseMoveWhileLocked(e){
    if(document.pointerLockElement !== canvas) return;
    // sensitivities
    const sens = isAiming ? AIM_SENS : NORMAL_SENS;
    camera.alpha -= (e.movementX || 0) * 0.002 * sens;
    camera.beta  -= (e.movementY || 0) * 0.002 * sens;
    // clamp beta
    camera.beta = Math.max(camera.lowerBetaLimit, Math.min(camera.upperBetaLimit, camera.beta));
}
document.addEventListener('mousemove', onMouseMoveWhileLocked);

// ======= Aiming enter/exit =======
function enterAim(){
    if(isAiming) return;
    isAiming = true;
    desiredRadius = AIM_RADIUS;
    // request pointer lock to capture mouse movement
    if(canvas.requestPointerLock) canvas.requestPointerLock();
    // visual crosshair if exists
    const ch = document.getElementById('crosshair');
    if(ch) ch.classList.add('aiming');
}

function exitAim(){
    if(!isAiming) return;
    isAiming = false;
    desiredRadius = NORMAL_RADIUS;
    // exit pointer lock (user can also press ESC)
    try { if(document.exitPointerLock) document.exitPointerLock(); } catch(e){}
    const ch = document.getElementById('crosshair');
    if(ch) ch.classList.remove('aiming');
}

// si el pointer lock se pierde (ej: ESC), salimos de aiming
document.addEventListener('pointerlockchange', () => {
    if(document.pointerLockElement !== canvas && isAiming){
        // lost lock -> exit aim
        isAiming = false;
        desiredRadius = NORMAL_RADIUS;
        const ch = document.getElementById('crosshair');
        if(ch) ch.classList.remove('aiming');
    }
});

// ======= Movimiento + lógica por frame =======
scene.onBeforeRenderObservable.add(()=>{
    // movimiento relativo cámara (igual que antes)
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

    // actualizar aimTarget (si pointer lock -> centro)
    if(document.pointerLockElement === canvas){
        updateAimCenter();
    }

    // camera sigue al jugador
    camera.setTarget(localPlayer.mesh.position);

    // suavizar zoom hacia desiredRadius (efecto ADS)
    camera.radius += (desiredRadius - camera.radius) * AIM_LERP;

    // ===== posicionar y orientar arma (lerp entre hip-fire y ADS) =====
    if(localPlayer.weapon.mesh){
        // posición hip-fire (junto al jugador)
        const forward = new BABYLON.Vector3(Math.sin(localPlayer.mesh.rotation.y), 0, Math.cos(localPlayer.mesh.rotation.y));
        const right = new BABYLON.Vector3(Math.sin(localPlayer.mesh.rotation.y + Math.PI/2), 0, Math.cos(localPlayer.mesh.rotation.y + Math.PI/2));
        const hipPos = localPlayer.mesh.position.add(forward.scale(0.5)).add(right.scale(0.15)).add(new BABYLON.Vector3(0, 1.05, 0));

        // posición ADS (cerca de la cámara, delante de ella)
        const camForwardRay = camera.getForwardRay();
        const adsPos = camera.position.add(camForwardRay.direction.scale(1.0));

        // elegir objetivo y lerpear
        const targetPos = isAiming ? adsPos : hipPos;

        // Lerp manual: p_new = p_old + (target - p_old) * t
        localPlayer.weapon.mesh.position.x += (targetPos.x - localPlayer.weapon.mesh.position.x) * WEAPON_LERP;
        localPlayer.weapon.mesh.position.y += (targetPos.y - localPlayer.weapon.mesh.position.y) * WEAPON_LERP;
        localPlayer.weapon.mesh.position.z += (targetPos.z - localPlayer.weapon.mesh.position.z) * WEAPON_LERP;

        // orientar arma hacia aimTarget (suavizado opcional no implementado para simplificar)
        localPlayer.weapon.mesh.lookAt(aimTarget);
    }

    // mandar posición al servidor si hay conexión
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

// ======= Disparo (left click) + manejo de pointerdown para right-click =======
canvas.addEventListener('pointerdown', (ev) => {
    // right button -> aim (enter)
    if(ev.button === 2){
        enterAim();
        return;
    }

    // left button -> fire
    if(ev.button !== 0) return;

    if(!localPlayer.weapon.canShoot || localPlayer.weapon.ammo <= 0) return;
    if(!currentRoom || !netSocket) return;

    localPlayer.weapon.canShoot = false;
    localPlayer.weapon.ammo--;
    setTimeout(()=> localPlayer.weapon.canShoot = true, localPlayer.weapon.cooldown);

    // origen: "muzzle" aproximado (adelante del arma)
    const origin = localPlayer.weapon.mesh.position.add(localPlayer.weapon.mesh.getDirection(BABYLON.Axis.Z).scale(0.5));
    const forwardVec = localPlayer.weapon.mesh.getDirection(BABYLON.Axis.Z).normalize();

    // raycast local para impacto
    const ray = new BABYLON.Ray(origin, forwardVec, 50);
    const hit = scene.pickWithRay(ray, (mesh) => mesh !== localPlayer.mesh && mesh !== localPlayer.weapon.mesh);
    if(hit && hit.hit){
        console.log(`Disparo impactó en: ${hit.pickedMesh.name}`);
    }

    // enviar disparo al servidor
    const originArr = [origin.x, origin.y, origin.z];
    const forwardArr = [forwardVec.x, forwardVec.y, forwardVec.z];
    netSocket.emit("shoot", { id: localPlayer.id, room: currentRoom, origin: originArr, forward: forwardArr });

    // bala visual local
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

// pointerup: salir de aim si sueltas botón derecho
canvas.addEventListener('pointerup', (ev) => {
    if(ev.button === 2){
        exitAim();
    }
});

// ======= Network helpers: spawn / despawn / startGame (idem tu implementación previa) =======
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

    try { netSocket.emit && netSocket.emit("joinRoom", { room: currentRoom, name: currentName }); } catch(e){}

    netSocket.on("init", data=>{
        localPlayer.id = data.id || netSocket.id || data.socketId;
        console.log("INIT from server. my id:", localPlayer.id);
    });

    netSocket.on("currentPlayers", (list)=>{
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

    netSocket.on("updatePlayers", (playersObj)=>{
        const serverIds = new Set(Object.keys(playersObj || {}));
        for(const id of serverIds){
            if(id === localPlayer.id) continue;
            const state = playersObj[id];
            if(!remotePlayers[id]) spawnRemote(id, state);
            else {
                remotePlayers[id].position.set(state.x, state.y, state.z);
                if(state.rot !== undefined) remotePlayers[id].rotation.y = state.rot;
            }
        }
        for(const id in remotePlayers){
            if(!serverIds.has(id)) despawnRemote(id);
        }
    });

    netSocket.on("playerShoot", ({ id, origin, forward })=>{
        let o;
        if(Array.isArray(origin)) o = new BABYLON.Vector3(origin[0], origin[1], origin[2]);
        else if(origin && origin.x !== undefined) o = origin;
        else o = (remotePlayers[id] ? remotePlayers[id].position.clone() : new BABYLON.Vector3(0,1,0));

        let f;
        if(Array.isArray(forward)) f = new BABYLON.Vector3(forward[0], forward[1], forward[2]);
        else if(forward && forward.x !== undefined) f = forward;
        else f = new BABYLON.Vector3(0,0,1);

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
