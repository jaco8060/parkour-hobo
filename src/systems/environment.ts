// Environment system for handling scene setup, lighting, and environment objects
import * as THREE from "three";
import { ENVIRONMENT_SETTINGS, TEMPLATE_SIZES } from "../utils/config.js";

/**
 * Sets up basic scene lighting
 */
export function setupLighting(scene: THREE.Scene): void {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  // Directional light (sunlight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  scene.add(directionalLight);
}

/**
 * Creates the ground plane
 */
export function createGround(scene: THREE.Scene): THREE.Mesh {
  const size = ENVIRONMENT_SETTINGS.GROUND_SIZE;
  const groundGeometry = new THREE.PlaneGeometry(size, size);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: ENVIRONMENT_SETTINGS.GROUND_COLOR, 
    roughness: 0.8, 
    metalness: 0.2 
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  ground.name = "Ground";
  scene.add(ground);
  
  return ground;
}

/**
 * Creates a city environment with random buildings
 */
export function createCityEnvironment(scene: THREE.Scene): void {
  // Create some buildings
  for (let i = 0; i < 20; i++) {
    const width = 5 + Math.random() * 10;
    const height = 10 + Math.random() * 40;
    const depth = 5 + Math.random() * 10;
    
    const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.3 + Math.random() * 0.5, 0.3 + Math.random() * 0.5, 0.3 + Math.random() * 0.5),
      roughness: 0.7,
      metalness: 0.2
    });
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(
      -50 + Math.random() * 100,
      height / 2,
      -50 + Math.random() * 100
    );
    
    // Don't place buildings too close to the spawn point
    if (building.position.distanceTo(new THREE.Vector3(0, 0, 0)) > 10) {
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
    }
  }
  
  // Create parkour platforms
  createParkourPlatforms(scene);
}

/**
 * Creates parkour platforms for the city environment
 */
export function createParkourPlatforms(scene: THREE.Scene): THREE.Mesh[] {
  const platforms: THREE.Mesh[] = [];
  
  // Create platforms for parkour
  const platformPositions = [
    { x: 5, y: 1, z: 5, type: "garbage" },
    { x: 8, y: 2, z: 10, type: "garbage" },
    { x: 12, y: 3, z: 15, type: "rooftop" },
    { x: 15, y: 4, z: 12, type: "rooftop" },
    { x: 18, y: 5, z: 8, type: "rooftop" },
    { x: 20, y: 6, z: 4, type: "garbage" },
    { x: 16, y: 3, z: 0, type: "garbage" },
    { x: 10, y: 2, z: -5, type: "rooftop" },
    { x: 5, y: 1, z: -10, type: "garbage" },
    { x: -5, y: 1, z: -5, type: "garbage" },
    { x: -10, y: 2, z: 0, type: "rooftop" },
    { x: -15, y: 3, z: 5, type: "garbage" },
    { x: -10, y: 4, z: 10, type: "rooftop" },
    { x: -5, y: 5, z: 15, type: "rooftop" }
  ];
  
  platformPositions.forEach(platform => {
    let geometry, material;
    
    if (platform.type === "garbage") {
      // Garbage bag platform
      geometry = new THREE.BoxGeometry(3, 1, 3);
      material = new THREE.MeshStandardMaterial({ 
        color: 0x2c3e50, 
        roughness: 0.9,
        metalness: 0.1
      });
    } else {
      // Rooftop platform
      geometry = new THREE.BoxGeometry(4, 0.5, 4);
      material = new THREE.MeshStandardMaterial({ 
        color: 0x95a5a6, 
        roughness: 0.7,
        metalness: 0.3
      });
    }
    
    const platformMesh = new THREE.Mesh(geometry, material);
    platformMesh.position.set(platform.x, platform.y, platform.z);
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;
    scene.add(platformMesh);
    platforms.push(platformMesh);
  });
  
  return platforms;
}

/**
 * Creates the course template with start and finish platforms
 */
export function setupCourseTemplate(scene: THREE.Scene, templateType: string): THREE.Mesh[] {
  let size: number;
  
  console.log("TEMPLATE DEBUG - Setting up course template:", templateType);
  
  switch(templateType) {
    case "small":
      size = TEMPLATE_SIZES.SMALL;
      break;
    case "large":
      size = TEMPLATE_SIZES.LARGE;
      break;
    case "medium":
    default:
      size = TEMPLATE_SIZES.MEDIUM;
  }
  
  const buildingBlocks: THREE.Mesh[] = [];
  console.log("TEMPLATE DEBUG - Building blocks array created, length:", buildingBlocks.length);
  
  // Create start platform (green)
  const startGeometry = new THREE.BoxGeometry(5, 1, 5);
  const startMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00,
    roughness: 0.7
  });
  const startPlatform = new THREE.Mesh(startGeometry, startMaterial);
  startPlatform.position.set(-size/4, 1, -size/4);
  startPlatform.userData = { type: "start" };
  scene.add(startPlatform);
  buildingBlocks.push(startPlatform);
  console.log("TEMPLATE DEBUG - Added start platform, blocks length:", buildingBlocks.length);
  
  // Create finish platform (blue)
  const finishGeometry = new THREE.BoxGeometry(5, 1, 5);
  const finishMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0000ff,
    roughness: 0.7
  });
  const finishPlatform = new THREE.Mesh(finishGeometry, finishMaterial);
  finishPlatform.position.set(size/4, 1, size/4);
  finishPlatform.userData = { type: "finish" };
  scene.add(finishPlatform);
  buildingBlocks.push(finishPlatform);
  console.log("TEMPLATE DEBUG - Added finish platform, blocks length:", buildingBlocks.length);
  
  // Add visual boundaries
  addTemplateBoundaryMarkers(scene, size);
  
  // Create killzone (red plane below)
  const killzoneGeometry = new THREE.PlaneGeometry(400, 400);
  const killzoneMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, 
    transparent: true,
    opacity: 0.3
  });
  const killzone = new THREE.Mesh(killzoneGeometry, killzoneMaterial);
  killzone.rotation.x = -Math.PI / 2;
  killzone.position.y = -10;
  scene.add(killzone);
  
  console.log("TEMPLATE DEBUG - Final building blocks array length:", buildingBlocks.length);
  return buildingBlocks;
}

/**
 * Adds boundary markers to visualize template size
 */
export function addTemplateBoundaryMarkers(scene: THREE.Scene, size: number): void {
  // Create corner markers
  const cornerSize = 2;
  const cornerHeight = 10;
  const cornerGeometry = new THREE.BoxGeometry(cornerSize, cornerHeight, cornerSize);
  const cornerMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
  
  // Create corners at the template boundaries
  const halfSize = size / 2;
  const corners = [
    { x: -halfSize, z: -halfSize },
    { x: halfSize, z: -halfSize },
    { x: -halfSize, z: halfSize },
    { x: halfSize, z: halfSize }
  ];
  
  corners.forEach(corner => {
    const cornerMarker = new THREE.Mesh(cornerGeometry, cornerMaterial);
    cornerMarker.position.set(corner.x, cornerHeight/2, corner.z);
    cornerMarker.castShadow = true;
    cornerMarker.userData = { type: "boundary" };
    scene.add(cornerMarker);
  });
  
  // Add grid lines to show size
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
  
  // Create horizontal grid lines
  for (let i = -halfSize; i <= halfSize; i += 10) {
    const points = [
      new THREE.Vector3(-halfSize, 0.1, i),
      new THREE.Vector3(halfSize, 0.1, i)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, gridMaterial);
    scene.add(line);
  }
  
  // Create vertical grid lines
  for (let i = -halfSize; i <= halfSize; i += 10) {
    const points = [
      new THREE.Vector3(i, 0.1, -halfSize),
      new THREE.Vector3(i, 0.1, halfSize)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, gridMaterial);
    scene.add(line);
  }
}

/**
 * Clears non-essential objects from the scene
 */
export function clearEnvironment(scene: THREE.Scene): void {
  const objectsToKeep = ["Ground", "Light"];
  console.log("ENV DEBUG - Clearing environment, objects before:", scene.children.length);
  
  const objectsToRemove: THREE.Object3D[] = [];
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh && !objectsToKeep.includes(child.name)) {
      objectsToRemove.push(child);
    }
  });
  
  console.log("ENV DEBUG - Objects to remove:", objectsToRemove.length);
  
  objectsToRemove.forEach(obj => {
    scene.remove(obj);
  });
  
  console.log("ENV DEBUG - Scene objects after clearing:", scene.children.length);
} 