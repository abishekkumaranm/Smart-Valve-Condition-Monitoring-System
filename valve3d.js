import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

const container = document.getElementById("valve3d");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
75,
container.clientWidth / container.clientHeight,
0.1,
1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x0b1220);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

camera.position.set(0, 1, 4);

const loader = new GLTFLoader();

let valveModel = null;
let rotationSpeed = 0.01;

loader.load(
"./assets/valve.glb",

function (gltf) {

console.log("Valve model loaded successfully");

valveModel = gltf.scene;
valveModel.scale.set(1.5,1.5,1.5);

scene.add(valveModel);

},

undefined,

function (error) {

console.error("Model loading error:", error);

}
);

function animate() {

requestAnimationFrame(animate);

if (valveModel) {
valveModel.rotation.y += rotationSpeed;
}

renderer.render(scene, camera);

}

animate();

/* Digital Twin update */

window.updateValve3D = function (health) {

if (!valveModel) return;

let color = 0x00e676;

if (health > 80) {
color = 0x00e676;
rotationSpeed = 0.01;
}
else if (health > 60) {
color = 0xffd600;
rotationSpeed = 0.02;
}
else if (health > 40) {
color = 0xff9800;
rotationSpeed = 0.04;
}
else {
color = 0xff1744;
rotationSpeed = 0.08;
}

valveModel.traverse((child) => {
if (child.isMesh) {
child.material.color.setHex(color);
}
});

};