// Environment system for handling scene setup, lighting, and environment objects
import * as THREE from "three";
import { ENVIRONMENT_SETTINGS, TEMPLATE_SIZES, BUILDER_SETTINGS, BLOCK_TYPES } from "../utils/config.js";

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
 * Sets up the course template with starter blocks
 */
export function setupCourseTemplate(scene: THREE.Scene, templateSize: string = "medium"): THREE.Mesh[] {
  console.log("Setting up course template:", templateSize);
  
  const blocks: THREE.Mesh[] = [];
  let templateSizeValue: number;
  
  // Set template size based on input
  switch (templateSize) {
    case "small":
      templateSizeValue = TEMPLATE_SIZES.SMALL;
      break;
    case "large":
      templateSizeValue = TEMPLATE_SIZES.LARGE;
      break;
    case "medium":
    default:
      templateSizeValue = TEMPLATE_SIZES.MEDIUM;
  }
  
  // Create a flat floor platform in the center
  const floorGeometry = new THREE.BoxGeometry(
    BLOCK_TYPES.FLOOR_PLATFORM.size.width,
    BLOCK_TYPES.FLOOR_PLATFORM.size.height,
    BLOCK_TYPES.FLOOR_PLATFORM.size.depth
  );
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: BLOCK_TYPES.FLOOR_PLATFORM.color,
    roughness: 0.7
  });
  
  const floorPlatform = new THREE.Mesh(floorGeometry, floorMaterial);
  floorPlatform.position.set(0, 0, 0); // Centered at origin
  floorPlatform.receiveShadow = true;
  floorPlatform.castShadow = true;
  floorPlatform.userData = { type: 'floor' };
  
  scene.add(floorPlatform);
  blocks.push(floorPlatform);
  
  // Add a start block at one end of the platform
  const startGeometry = new THREE.BoxGeometry(
    BLOCK_TYPES.START.size.width,
    BLOCK_TYPES.START.size.height,
    BLOCK_TYPES.START.size.depth
  );
  const startMaterial = new THREE.MeshStandardMaterial({
    color: BLOCK_TYPES.START.color,
    roughness: 0.7
  });
  
  const startBlock = new THREE.Mesh(startGeometry, startMaterial);
  startBlock.position.set(-BLOCK_TYPES.FLOOR_PLATFORM.size.width/2 + 3, 1, 0); // Position at the left edge of the platform
  startBlock.receiveShadow = true;
  startBlock.castShadow = true;
  startBlock.userData = { type: 'start' };
  
  // Add direction arrow to start block
  const arrowGeometry = new THREE.ConeGeometry(0.5, 1, 8);
  const arrowMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.3
  });
  const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
  
  // Position the arrow on top of the block pointing in the positive Z direction
  const blockHeight = (startBlock.geometry as THREE.BoxGeometry).parameters.height;
  arrow.position.set(0, blockHeight/2 + 0.5, 0);
  arrow.rotation.x = -Math.PI / 2; // Point along Z-axis
  
  // Add metadata to identify it
  arrow.userData = { type: 'directionArrow' };
  
  // Add to block
  startBlock.add(arrow);
  
  scene.add(startBlock);
  blocks.push(startBlock);
  
  // Add a finish block at the other end
  const finishGeometry = new THREE.BoxGeometry(
    BLOCK_TYPES.FINISH.size.width,
    BLOCK_TYPES.FINISH.size.height,
    BLOCK_TYPES.FINISH.size.depth
  );
  const finishMaterial = new THREE.MeshStandardMaterial({
    color: BLOCK_TYPES.FINISH.color,
    roughness: 0.7
  });
  
  const finishBlock = new THREE.Mesh(finishGeometry, finishMaterial);
  finishBlock.position.set(BLOCK_TYPES.FLOOR_PLATFORM.size.width/2 - 3, 1, 0); // Position at the right edge of the platform
  finishBlock.receiveShadow = true;
  finishBlock.castShadow = true;
  finishBlock.userData = { type: 'finish' };
  
  scene.add(finishBlock);
  blocks.push(finishBlock);
  
  return blocks;
}

/**
 * Get recommended camera position for a new course template
 */
export function getInitialCameraPosition(templateSize: string): { 
  position: THREE.Vector3, 
  rotation: THREE.Euler 
} {
  return {
    position: new THREE.Vector3(0, 15, 25),  // Higher and further back for better overview
    rotation: new THREE.Euler(-0.5, 0, 0)    // Tilted down more to see the whole platform
  };
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

/**
 * Creates a visible grid on the ground for more accurate block placement - DISABLED
 */
export function createBuilderGrid(scene: THREE.Scene, size: number): void {
  console.log("Builder grid creation disabled");
  // Function disabled
  return;
} 