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
  const floorSize = 20; // Size of the central platform
  const platformGeometry = new THREE.BoxGeometry(
    floorSize,
    BLOCK_TYPES.PLATFORM.size.height,
    floorSize
  );
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: BLOCK_TYPES.PLATFORM.color,
    roughness: 0.7
  });
  
  const floorPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
  floorPlatform.position.set(0, 0, 0); // Centered at origin
  floorPlatform.receiveShadow = true;
  floorPlatform.castShadow = true;
  floorPlatform.userData = { type: 'platform' };
  
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
  startBlock.position.set(-floorSize/2 + 3, 1, 0); // Position at the left edge of the platform
  startBlock.receiveShadow = true;
  startBlock.castShadow = true;
  startBlock.userData = { type: 'start' };
  
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
  finishBlock.position.set(floorSize/2 - 3, 1, 0); // Position at the right edge of the platform
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
 * Creates a visible grid on the ground for more accurate block placement
 */
export function createBuilderGrid(scene: THREE.Scene, size: number): void {
  if (!BUILDER_SETTINGS.SHOW_GRID_LINES) return;
  
  // Remove any existing grid
  const existingGrid = scene.children.find(child => child.name === "BuilderGrid");
  if (existingGrid) {
    scene.remove(existingGrid);
  }
  
  // Create a grid helper
  const gridSize = Math.ceil(size / 2);
  const divisions = gridSize * 2; // One division per unit
  const gridHelper = new THREE.GridHelper(
    size, 
    divisions, 
    BUILDER_SETTINGS.GRID_COLOR, 
    BUILDER_SETTINGS.GRID_COLOR
  );
  gridHelper.position.y = 0.05; // Slightly above ground to avoid z-fighting
  gridHelper.material.opacity = BUILDER_SETTINGS.GRID_OPACITY;
  gridHelper.material.transparent = true;
  gridHelper.name = "BuilderGrid";
  
  scene.add(gridHelper);
  
  // Create axis helpers for better orientation
  const axisLength = 5;
  
  // X axis - red
  const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(axisLength, 0.1, 0)
  ]);
  const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
  const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
  xAxis.name = "BuilderGridXAxis";
  scene.add(xAxis);
  
  // Z axis - blue
  const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(0, 0.1, axisLength)
  ]);
  const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
  const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
  zAxis.name = "BuilderGridZAxis";
  scene.add(zAxis);
} 