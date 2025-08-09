// scripts/world.js
import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.155.0/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'https://unpkg.com/three@0.155.0/examples/jsm/objects/Water.js';

export async function createWorld(scene, onProgress) {
    const gltfLoader = new GLTFLoader();

    // 🌫 Niebla ligera
    scene.fog = new THREE.Fog(0xcce0ff, 100, 400);

    // 🌱 Textura procedural tipo "low poly grass"
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = grassCanvas.height = 64;
    const ctx = grassCanvas.getContext('2d');
    for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
            const shade = 100 + Math.floor(Math.random() * 80); // variación verde
            ctx.fillStyle = `rgb(${shade - 20},${shade},${shade - 40})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(50, 50);

    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, flatShading: true });
    const groundGeo = new THREE.PlaneGeometry(500, 500, 50, 50);
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    if (onProgress) onProgress(20);

    // 🌊 Agua animada
    const waterGeo = new THREE.CircleGeometry(50, 32);
    const water = new Water(waterGeo, {
        textureWidth: 256,
        textureHeight: 256,
        color: 0x4ab4d4,
        flowDirection: new THREE.Vector2(1, 0.5),
        scale: 0.5
    });
    water.rotation.x = -Math.PI / 2;
    water.position.set(50, 0.05, 50);
    scene.add(water);

    if (onProgress) onProgress(40);

    // 🌳 Árboles low poly procedurales
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });

    for (let i = 0; i < 20; i++) {
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 5, 6);
        const leavesGeo = new THREE.ConeGeometry(3, 6, 6);

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        const leaves = new THREE.Mesh(leavesGeo, treeMat);

        trunk.position.y = 2.5;
        leaves.position.y = 6;

        const treeGroup = new THREE.Group();
        treeGroup.add(trunk);
        treeGroup.add(leaves);

        treeGroup.position.set(
            Math.random() * 400 - 200,
            0,
            Math.random() * 400 - 200
        );

        scene.add(treeGroup);
    }

    if (onProgress) onProgress(70);

    // 🪨 Rocas low poly procedurales
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, flatShading: true });

    for (let i = 0; i < 15; i++) {
        const rockGeo = new THREE.DodecahedronGeometry(1.5 + Math.random(), 0);
        const rock = new THREE.Mesh(rockGeo, rockMat);

        rock.position.set(
            Math.random() * 400 - 200,
            0,
            Math.random() * 400 - 200
        );

        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        scene.add(rock);
    }

    if (onProgress) onProgress(100);
}
