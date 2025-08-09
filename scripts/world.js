// scripts/world.js
import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.155.0/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'https://unpkg.com/three@0.155.0/examples/jsm/objects/Water.js';

export async function createWorld(scene, onProgress) {
    const loader = new THREE.TextureLoader();
    const gltfLoader = new GLTFLoader();

    // 🌫 Niebla ligera
    scene.fog = new THREE.Fog(0xdfeee0, 100, 300);

    // 🌱 Textura de pasto
    const grassTex = loader.load('./assets/textures/grass_diffuse.jpg');
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(50, 50);

    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex });
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    if (onProgress) onProgress(20);

    // 🌊 Agua animada
    const waterGeo = new THREE.CircleGeometry(50, 64);
    const water = new Water(waterGeo, {
        textureWidth: 512,
        textureHeight: 512,
        color: 0x001e0f,
        flowDirection: new THREE.Vector2(1, 1),
        scale: 1
    });
    water.rotation.x = -Math.PI / 2;
    water.position.set(50, 0.05, 50);
    scene.add(water);

    if (onProgress) onProgress(40);

    // 🌳 Árboles procedurales
    const treeModel = await gltfLoader.loadAsync('./assets/models/tree.glb');
    for (let i = 0; i < 20; i++) {
        const tree = treeModel.scene.clone();
        tree.position.set(
            Math.random() * 400 - 200,
            0,
            Math.random() * 400 - 200
        );
        tree.scale.setScalar(5 + Math.random() * 3);
        tree.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });
        scene.add(tree);
    }

    if (onProgress) onProgress(70);

    // 🪨 Rocas procedurales
    const rockModel = await gltfLoader.loadAsync('./assets/models/rock.glb');
    for (let i = 0; i < 15; i++) {
        const rock = rockModel.scene.clone();
        rock.position.set(
            Math.random() * 400 - 200,
            0,
            Math.random() * 400 - 200
        );
        rock.scale.setScalar(2 + Math.random() * 2);
        rock.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });
        scene.add(rock);
    }

    if (onProgress) onProgress(100);
}
