import * as THREE from "three";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let position = { x: 0, y: 0, z: 0 };
const speed = 0.1;
let isJumping = false;

function init() {
  console.log("Initializing Three.js scene...");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Black background
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const container = document.getElementById("game-container");
  if (container) {
    container.appendChild(renderer.domElement);
    console.log("Renderer appended to #game-container");
  } else {
    console.error("No #game-container found!");
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  console.log("Cube added to scene");

  camera.position.z = 5;
  camera.position.y = 5;
  camera.lookAt(0, 0, 0);

  window.addEventListener("keydown", (event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case "w":
        position.z -= speed;
        break;
      case "s":
        position.z += speed;
        break;
      case "a":
        position.x -= speed;
        break;
      case "d":
        position.x += speed;
        break;
      case " ":
        if (!isJumping) {
          isJumping = true;
          jump();
        }
        break;
    }
    updatePosition();
  });

  window.addEventListener("message", (event: MessageEvent) => {
    console.log("Received message:", event.data);
    if (event.data.type === "startGame") {
      animate();
      window.parent.postMessage({ type: "webViewReady" }, "*");
      console.log("Sent webViewReady message");
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate(); // Start immediately for testing
}

function updatePosition() {
  cube.position.set(position.x, position.y, position.z);
  window.parent.postMessage({ type: "positionUpdate", data: position }, "*");
}

function jump() {
  let jumpHeight = 0;
  const jumpInterval = setInterval(() => {
    if (jumpHeight < 1) {
      position.y += 0.1;
      jumpHeight += 0.1;
    } else if (jumpHeight < 2) {
      position.y -= 0.1;
      jumpHeight += 0.1;
    } else {
      position.y = 0;
      clearInterval(jumpInterval);
      isJumping = false;
    }
    updatePosition();
  }, 50);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

console.log("app.js loaded");
init();
