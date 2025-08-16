const socket = io();

// === UI para unirse a sala ===
let roomId = prompt("Ingresa ID de sala:");
let playerName = prompt("Tu nombre:");
socket.emit("joinRoom", { roomId, name: playerName });

let players = {};
let localId;

// === Cuando se actualizan jugadores ===
socket.on("updatePlayers", (srvPlayers) => {
  players = srvPlayers;

  // Si un nuevo jugador entra, crear su mesh si no existe
  for (let id in players) {
    if (!scene.getMeshByName("player_" + id)) {
      let pMesh = BABYLON.MeshBuilder.CreateBox("player_" + id, { size: 1 }, scene);
      pMesh.position.y = 0.5;

      let mat = new BABYLON.StandardMaterial("mat_" + id, scene);
      mat.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
      pMesh.material = mat;
    }
  }

  // Actualizar posiciones
  for (let id in players) {
    if (id !== socket.id) {
      let p = players[id];
      let mesh = scene.getMeshByName("player_" + id);
      if (mesh) {
        mesh.position.set(p.x, p.y, p.z);
        mesh.rotation.y = p.rotY || 0;
      }
    }
  }
});

// === Disparos recibidos ===
socket.on("playerShoot", ({ id, dir }) => {
  let shooter = scene.getMeshByName("player_" + id);
  if (shooter) {
    let bullet = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: 0.2 }, scene);
    bullet.position = shooter.position.clone();
    bullet.material = new BABYLON.StandardMaterial("bulletMat", scene);
    bullet.material.diffuseColor = new BABYLON.Color3(1, 0, 0);

    scene.onBeforeRenderObservable.add(() => {
      bullet.position.addInPlace(dir.scale(0.5));
    });
  }
});

// === Enviar movimientos al server ===
scene.onBeforeRenderObservable.add(() => {
  if (camera && roomId) {
    socket.emit("move", {
      roomId,
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rotY: camera.rotation.y,
    });
  }
});

// === Disparar con click ===
window.addEventListener("click", () => {
  let forward = camera.getDirection(BABYLON.Axis.Z);
  socket.emit("shoot", { roomId, dir: forward });
});
