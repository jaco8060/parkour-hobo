import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Game state
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let player: THREE.Object3D | null = null;
let mixer: THREE.AnimationMixer | null = null;
let actions = {
  idle: null as THREE.AnimationAction | null,
  running: null as THREE.AnimationAction | null,
  jumping: null as THREE.AnimationAction | null
};
let clock = new THREE.Clock();
let platforms: THREE.Mesh[] = [];
let gameStarted = false;
let isMobile = false;
let joystickPosition = { x: 0, y: 0 };
let touchJoystick = { active: false, startX: 0, startY: 0 };

// Builder mode state
let builderMode = false;
let buildingBlocks: THREE.Mesh[] = [];
let selectedBlockType = "platform"; // platform, start, finish
let courseTemplate = "medium"; // small, medium, large
let currentBuilderTool = "build"; // build, remove, camera
let rightClickRotating = false;
let buildControls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  rotateLeft: false,
  rotateRight: false
};
let buildCameraSpeed = 10;
let buildRotationSpeed = 2;
let placementPreview: THREE.Mesh | null = null;

// Player state
let playerState = {
  position: new THREE.Vector3(0, 1, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  rotation: new THREE.Euler(0, 0, 0),
  onGround: true,
  jumping: false,
  speed: 5,
  jumpPower: 10,
  gravity: 20,
  currentAnimation: "idle"
};

// Input state
let keyState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false
};

// Flag to track if we're placing blocks to avoid conflicts
let isPlacingBlock = false;

// Add these variables at the top with other state variables
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Add overlay state
let isOverlayActive = false;

// Initialize the game
function init() {
  console.log("Initializing Three.js scene...");
  
  // Detect if on mobile
  isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Light blue sky
  
  // Add fog for depth
  scene.fog = new THREE.Fog(0x87CEEB, 30, 100);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Add to container
  const container = document.getElementById("game-container");
  if (container) {
    container.appendChild(renderer.domElement);
    console.log("Renderer appended to #game-container");
    
    // Add focus/blur handlers
    window.addEventListener("blur", showOverlay);
    container.addEventListener("mouseleave", showOverlay);
    
    // Show initial overlay
    showOverlay();
  } else {
    console.error("No #game-container found!");
    return;
  }
  
  // Lighting
  setupLighting();
  
  // Create ground
  createGround();
  
  // Don't create city environment if we're going straight to builder mode
  if (!window.location.search.includes('builder=true')) {
    createCityEnvironment();
  }
  
  // Load player character
  loadPlayerCharacter();
  
  // Set up event listeners
  setupEventListeners();
  
  // Create mobile controls if on mobile
  if (isMobile) {
    createMobileControls();
  }
  
  // Start animation loop
  animate();
  
  // Send ready message
  window.parent.postMessage({ type: "webViewReady" }, "*");
  console.log("Sent webViewReady message");
  
  // Start in builder mode directly
  console.log("Starting in builder mode");
  enterBuilderMode("medium");
}

function setupLighting() {
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

function createGround() {
  // Create ground plane
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x333333, 
    roughness: 0.8, 
    metalness: 0.2 
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);
}

function createCityEnvironment() {
  // Create a simple city environment with buildings and platforms
  
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
  createParkourPlatforms();
}

function createParkourPlatforms() {
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
}

function loadPlayerCharacter() {
  // For now, use a placeholder box for the player character
  const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
  const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.position.set(0, 1, 0);
  player.castShadow = true;
  scene.add(player);
  
  // TODO: Replace with actual character model loading:
  // const loader = new GLTFLoader();
  // loader.load(
  //   'character.glb',
  //   function (gltf) {
  //     player = gltf.scene;
  //     player.position.set(0, 1, 0);
  //     player.castShadow = true;
  //     scene.add(player);
  //     
  //     // Animation setup
  //     mixer = new THREE.AnimationMixer(player);
  //     actions.idle = mixer.clipAction(gltf.animations[0]);
  //     actions.running = mixer.clipAction(gltf.animations[1]);
  //     actions.jumping = mixer.clipAction(gltf.animations[2]);
  //     
  //     // Start with idle animation
  //     actions.idle.play();
  //   },
  //   undefined,
  //   function (error) {
  //     console.error('Error loading character model:', error);
  //   }
  // );
  
  // Send initial position
  sendPositionUpdate();
}

function setupEventListeners() {
  console.log("Setting up global event listeners");
  
  // Keyboard controls
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  
  // Window resize
  window.addEventListener("resize", handleResize);
  
  // Focus/blur handlers
  window.addEventListener("blur", () => {
    showOverlay();
    resetAllControls();
  });
  
  // Handle mouse leaving the window
  document.addEventListener("mouseleave", () => {
    showOverlay();
    resetAllControls();
  });
  
  // Touch controls for mobile
  if (isMobile) {
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      gameContainer.addEventListener("touchstart", handleTouchStart);
      gameContainer.addEventListener("touchmove", handleTouchMove);
      gameContainer.addEventListener("touchend", handleTouchEnd);
    }
  }
  
  // Message from parent
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.data.type === "startGame") {
      gameStarted = true;
      builderMode = false; // Exit builder mode
      console.log("Game started");
      
      // Show player
      if (player) player.visible = true;
      
      // Remove builder UI
      const builderUI = document.getElementById("builder-ui");
      if (builderUI) builderUI.remove();
      
      const builderToolbar = document.getElementById("builder-toolbar");
      if (builderToolbar) builderToolbar.remove();
      
    } else if (event.data.type === "startBuilder") {
      const template = event.data.data?.template || "medium";
      localStorage.setItem('builderTemplate', template);
      enterBuilderMode(template);
      console.log("Builder mode started with template:", template);
    }
  });
  
  // Save builder state periodically
  setInterval(() => {
    if (builderMode) {
      saveBuilderState();
    }
  }, 30000); // Save every 30 seconds
}

function handleKeyDown(event: KeyboardEvent) {
  console.log(`Key pressed: ${event.key}, Builder mode: ${builderMode}, Game started: ${gameStarted}, Overlay active: ${isOverlayActive}`);
  
  // Ignore key events when overlay is active
  if (isOverlayActive) return;
  
  // Handle 'B' key for mode switching
  if (event.key.toLowerCase() === 'b') {
    console.log("B key pressed - attempting to toggle modes");
    if (builderMode) {
      console.log("Exiting builder mode");
      exitBuilderMode();
    } else {
      console.log("Entering builder mode");
      const lastTemplate = localStorage.getItem('builderTemplate') || "medium";
      enterBuilderMode(lastTemplate);
    }
    return;
  }

  if (!builderMode) {
    // Regular game controls
    switch (event.key.toLowerCase()) {
      case "w": keyState.forward = true; break;
      case "s": keyState.backward = true; break;
      case "a": keyState.left = true; break;
      case "d": keyState.right = true; break;
      case " ": keyState.jump = true; break;
    }
    return;
  }
  
  // Prevent default behavior for builder mode keys
  event.preventDefault();
  
  // Builder mode controls
  const key = event.key.toLowerCase();
  let controlChanged = false;
  
  switch(key) {
      case "w":
      if (!buildControls.forward) {
        buildControls.forward = true;
        controlChanged = true;
      }
        break;
      case "s":
      if (!buildControls.backward) {
        buildControls.backward = true;
        controlChanged = true;
      }
        break;
      case "a":
      if (!buildControls.left) {
        buildControls.left = true;
        controlChanged = true;
      }
        break;
      case "d":
      if (!buildControls.right) {
        buildControls.right = true;
        controlChanged = true;
      }
        break;
    case "q":
      if (!buildControls.up) {
        buildControls.up = true;
        controlChanged = true;
        }
        break;
    case "e":
      if (!buildControls.down) {
        buildControls.down = true;
        controlChanged = true;
      }
      break;
    case "arrowleft":
      if (!buildControls.rotateLeft) {
        buildControls.rotateLeft = true;
        controlChanged = true;
      }
      break;
    case "arrowright":
      if (!buildControls.rotateRight) {
        buildControls.rotateRight = true;
        controlChanged = true;
      }
      break;
  }
  
  // Only log if a control actually changed
  if (controlChanged) {
    console.log(`Key pressed: ${key}, Controls:`, {...buildControls});
  }
}

function handleKeyUp(event: KeyboardEvent) {
  // Ignore key events when overlay is active
  if (isOverlayActive) return;
  
  if (!builderMode) {
    // Regular game controls
    switch (event.key.toLowerCase()) {
      case "w": keyState.forward = false; break;
      case "s": keyState.backward = false; break;
      case "a": keyState.left = false; break;
      case "d": keyState.right = false; break;
      case " ": keyState.jump = false; break;
    }
    return;
  }
  
  // Prevent default behavior for builder mode keys
  event.preventDefault();
  
  // Builder mode controls
  const key = event.key.toLowerCase();
  let controlChanged = false;
  
  switch(key) {
    case "w":
      if (buildControls.forward) {
        buildControls.forward = false;
        controlChanged = true;
      }
      break;
    case "s":
      if (buildControls.backward) {
        buildControls.backward = false;
        controlChanged = true;
      }
      break;
    case "a":
      if (buildControls.left) {
        buildControls.left = false;
        controlChanged = true;
      }
      break;
    case "d":
      if (buildControls.right) {
        buildControls.right = false;
        controlChanged = true;
      }
      break;
    case "q":
      if (buildControls.up) {
        buildControls.up = false;
        controlChanged = true;
      }
      break;
    case "e":
      if (buildControls.down) {
        buildControls.down = false;
        controlChanged = true;
      }
      break;
    case "arrowleft":
      if (buildControls.rotateLeft) {
        buildControls.rotateLeft = false;
        controlChanged = true;
      }
      break;
    case "arrowright":
      if (buildControls.rotateRight) {
        buildControls.rotateRight = false;
        controlChanged = true;
      }
      break;
  }
  
  // Only log if a control actually changed
  if (controlChanged) {
    console.log(`Key released: ${key}, Controls:`, {...buildControls});
  }
}

function handleResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function createMobileControls() {
  // Create joystick
  const joystickElement = document.createElement("div");
  joystickElement.id = "joystick";
  joystickElement.style.position = "absolute";
  joystickElement.style.left = "100px";
  joystickElement.style.bottom = "100px";
  joystickElement.style.width = "100px";
  joystickElement.style.height = "100px";
  joystickElement.style.borderRadius = "50%";
  joystickElement.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
  joystickElement.style.border = "2px solid white";
  joystickElement.style.touchAction = "none";
  
  // Create joystick knob
  const knobElement = document.createElement("div");
  knobElement.id = "joystick-knob";
  knobElement.style.position = "absolute";
  knobElement.style.left = "35px";
  knobElement.style.top = "35px";
  knobElement.style.width = "30px";
  knobElement.style.height = "30px";
  knobElement.style.borderRadius = "50%";
  knobElement.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
  joystickElement.appendChild(knobElement);
  
  // Create jump button
  const jumpButton = document.createElement("div");
  jumpButton.id = "jump-button";
  jumpButton.style.position = "absolute";
  jumpButton.style.right = "100px";
  jumpButton.style.bottom = "100px";
  jumpButton.style.width = "80px";
  jumpButton.style.height = "80px";
  jumpButton.style.borderRadius = "50%";
  jumpButton.style.backgroundColor = "rgba(255, 80, 80, 0.7)";
  jumpButton.style.border = "2px solid white";
  jumpButton.style.display = "flex";
  jumpButton.style.justifyContent = "center";
  jumpButton.style.alignItems = "center";
  jumpButton.style.color = "white";
  jumpButton.style.fontWeight = "bold";
  jumpButton.style.fontSize = "18px";
  jumpButton.innerText = "JUMP";
  jumpButton.style.touchAction = "none";
  
  // Add touch events to jump button
  jumpButton.addEventListener("touchstart", () => {
    keyState.jump = true;
  });
  
  jumpButton.addEventListener("touchend", () => {
    keyState.jump = false;
  });
  
  // Add elements to DOM
  const container = document.getElementById("game-container");
  if (container) {
    container.appendChild(joystickElement);
    container.appendChild(jumpButton);
  }
}

function handleTouchStart(event: TouchEvent) {
  // Check if touch is in the joystick area
  const touch = event.touches[0];
  const joystick = document.getElementById("joystick");
  
  if (joystick) {
    const joystickRect = joystick.getBoundingClientRect();
    
    // If touch is within joystick area
    if (
      touch.clientX >= joystickRect.left &&
      touch.clientX <= joystickRect.right &&
      touch.clientY >= joystickRect.top &&
      touch.clientY <= joystickRect.bottom
    ) {
      touchJoystick.active = true;
      touchJoystick.startX = joystickRect.left + joystickRect.width / 2;
      touchJoystick.startY = joystickRect.top + joystickRect.height / 2;
      updateJoystickPosition(touch.clientX, touch.clientY);
    }
  }
}

function handleTouchMove(event: TouchEvent) {
  if (touchJoystick.active) {
    event.preventDefault();
    const touch = event.touches[0];
    updateJoystickPosition(touch.clientX, touch.clientY);
  }
}

function handleTouchEnd() {
  if (touchJoystick.active) {
    touchJoystick.active = false;
    joystickPosition = { x: 0, y: 0 };
    
    // Reset joystick knob position
    const knob = document.getElementById("joystick-knob");
    if (knob) {
      knob.style.left = "35px";
      knob.style.top = "35px";
    }
    
    // Reset key states
    keyState.forward = false;
    keyState.backward = false;
    keyState.left = false;
    keyState.right = false;
  }
}

function updateJoystickPosition(touchX: number, touchY: number) {
  // Calculate joystick position
  const deltaX = touchX - touchJoystick.startX;
  const deltaY = touchY - touchJoystick.startY;
  const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 50);
  const angle = Math.atan2(deltaY, deltaX);
  
  // Normalize to -1 to 1 range
  joystickPosition.x = Math.cos(angle) * (distance / 50);
  joystickPosition.y = Math.sin(angle) * (distance / 50);
  
  // Update visual joystick
  const knob = document.getElementById("joystick-knob");
  if (knob) {
    knob.style.left = 35 + joystickPosition.x * 35 + "px";
    knob.style.top = 35 + joystickPosition.y * 35 + "px";
  }
  
  // Convert joystick position to key states
  keyState.forward = joystickPosition.y < -0.3;
  keyState.backward = joystickPosition.y > 0.3;
  keyState.left = joystickPosition.x < -0.3;
  keyState.right = joystickPosition.x > 0.3;
}

function updatePlayer(deltaTime: number) {
  if (!player) return;
  
  // Movement direction based on input
  const moveDirection = new THREE.Vector3(0, 0, 0);
  
  // Get camera direction for movement relative to camera
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();
  
  // Calculate right vector
  const right = new THREE.Vector3();
  right.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();
  
  // Apply input
  if (keyState.forward) {
    moveDirection.add(cameraDirection);
  }
  if (keyState.backward) {
    moveDirection.sub(cameraDirection);
  }
  if (keyState.left) {
    moveDirection.add(right);
  }
  if (keyState.right) {
    moveDirection.sub(right);
  }
  
  // Normalize movement direction if not zero
  if (moveDirection.lengthSq() > 0) {
    moveDirection.normalize();
    
    // Rotate player to face movement direction
    if (moveDirection.length() > 0) {
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      player.rotation.y = targetRotation;
    }
    
    // Apply movement speed
    moveDirection.multiplyScalar(playerState.speed * deltaTime);
    
    // Update position with horizontal movement
    player.position.x += moveDirection.x;
    player.position.z += moveDirection.z;
  }
  
  // Apply gravity
  playerState.velocity.y -= playerState.gravity * deltaTime;
  
  // Apply jump if on ground
  if (keyState.jump && playerState.onGround) {
    playerState.velocity.y = playerState.jumpPower;
    playerState.onGround = false;
    playerState.jumping = true;
  }
  
  // Apply vertical velocity
  player.position.y += playerState.velocity.y * deltaTime;
  
  // Check ground collision
  const raycaster = new THREE.Raycaster();
  raycaster.set(
    new THREE.Vector3(player.position.x, player.position.y, player.position.z),
    new THREE.Vector3(0, -1, 0)
  );
  
  // Check for collisions with the ground and platforms
  const intersects = raycaster.intersectObjects([...platforms, scene.children.find(child => 
    child instanceof THREE.Mesh && child.rotation.x === -Math.PI / 2)!]
  );
  
  // If the player is very close to the ground or platform, consider them on the ground
  if (intersects.length > 0 && intersects[0].distance < 1.1) {
    playerState.velocity.y = 0;
    player.position.y = intersects[0].point.y + 1;
    playerState.onGround = true;
    playerState.jumping = false;
    } else {
    playerState.onGround = false;
  }
  
  // Prevent falling below the ground
  if (player.position.y < 1) {
    player.position.y = 1;
    playerState.velocity.y = 0;
    playerState.onGround = true;
    playerState.jumping = false;
  }
  
  // Update camera to follow player
  updateCamera();
  
  // Update animations
  updatePlayerAnimation();
  
  // Send position update to parent
  sendPositionUpdate();
}

function updateCamera() {
  if (!player) return;
  
  // Position camera behind player
  const idealOffset = new THREE.Vector3(-5, 5, -5);
  idealOffset.applyQuaternion(player.quaternion);
  idealOffset.add(player.position);
  
  // Smoothly move camera to follow player
  camera.position.lerp(idealOffset, 0.1);
  
  // Look at player
  camera.lookAt(player.position);
}

function updatePlayerAnimation() {
  if (!mixer || !actions.idle || !actions.running || !actions.jumping) return;
  
  let newAnimation = "idle";
  
  if (playerState.jumping) {
    newAnimation = "jumping";
  } else if (keyState.forward || keyState.backward || keyState.left || keyState.right) {
    newAnimation = "running";
  }
  
  // Change animation if needed
  if (newAnimation !== playerState.currentAnimation) {
    // Fade out current animation
    const current = getActionByName(playerState.currentAnimation);
    if (current) {
      current.fadeOut(0.2);
    }
    
    // Fade in new animation
    const next = getActionByName(newAnimation);
    if (next) {
      next.reset().fadeIn(0.2).play();
    }
    
    playerState.currentAnimation = newAnimation;
  }
}

function getActionByName(name: string): THREE.AnimationAction | null {
  switch (name) {
    case "idle": return actions.idle;
    case "running": return actions.running;
    case "jumping": return actions.jumping;
    default: return null;
  }
}

function sendPositionUpdate() {
  if (!player) return;
  
  window.parent.postMessage({
    type: "positionUpdate",
    data: {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      onGround: playerState.onGround,
      animation: playerState.currentAnimation
    }
  }, "*");
}

function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min(clock.getDelta(), 0.1);
  
  if (builderMode) {
    // Update builder camera movement
    updateBuilderCamera(deltaTime);
    
    // Update placement preview position
    updatePlacementPreview();
  } else if (gameStarted && player) {
    // Regular game update
    updatePlayer(deltaTime);
  }
  
  // Update animation mixer
  if (mixer) {
    mixer.update(deltaTime);
  }
  
  // Render scene
  renderer.render(scene, camera);
}

// Update the builder camera movement function
function updateBuilderCamera(deltaTime: number) {
  if (!builderMode) return;
  
  // Get camera direction and right vector based on camera rotation
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  direction.y = 0; // Keep movement horizontal
  direction.normalize();
  
  const right = new THREE.Vector3(1, 0, 0);
  right.applyQuaternion(camera.quaternion);
  right.y = 0; // Keep movement horizontal
  right.normalize();
  
  const moveSpeed = 0.75; // Keep increased speed
  let moved = false;
  
  // Handle keyboard movement
  if (buildControls.forward) {
    camera.position.addScaledVector(direction, moveSpeed);
    moved = true;
  }
  if (buildControls.backward) {
    camera.position.addScaledVector(direction, -moveSpeed);
    moved = true;
  }
  if (buildControls.left) {
    camera.position.addScaledVector(right, -moveSpeed);
    moved = true;
  }
  if (buildControls.right) {
    camera.position.addScaledVector(right, moveSpeed);
    moved = true;
  }
  if (buildControls.up) {
    camera.position.y += moveSpeed;
    moved = true;
  }
  if (buildControls.down) {
    camera.position.y -= moveSpeed;
    moved = true;
  }
  
  // Handle keyboard rotation
  if (buildControls.rotateLeft) {
    camera.rotation.y += 0.05;
    moved = true;
  }
  if (buildControls.rotateRight) {
    camera.rotation.y -= 0.05;
    moved = true;
  }
  
  // Ensure camera maintains proper orientation
  camera.rotation.x = -0.3; // Keep slight downward angle
  camera.rotation.z = 0;    // Keep level
}

// Update the enter builder mode function
function enterBuilderMode(templateSize: string = "medium") {
  console.log("Entering builder mode with template:", templateSize);
  builderMode = true;
  gameStarted = false;
  courseTemplate = templateSize;

  // Hide player
  if (player) {
    player.visible = false;
  }

  // Reset all controls
  buildControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateLeft: false,
    rotateRight: false
  };
  
  // Setup UI and event listeners
  setupBuilderUI();
  setupBuilderEventListeners();
  createBuilderDebugUI();
  createBuilderToolbar();
  
  // Initialize builder state
  currentBuilderTool = "build";
  selectedBlockType = "platform";
  createPlacementPreview();
  
  // Save initial builder state
  saveBuilderState();
  
  console.log("Builder mode entered successfully");
}

// Function to clear existing blocks
function clearExistingBlocks() {
  // Remove existing building blocks
  buildingBlocks.forEach(block => {
    scene.remove(block);
  });
  buildingBlocks = [];
  
  // Remove existing platforms (except ground)
  platforms = platforms.filter(platform => {
    if (platform.position.y < 0.5) {
      return true; // Keep ground platforms
    }
    scene.remove(platform);
    return false;
  });
}

// Setup event listeners specifically for builder mode
function setupBuilderEventListeners() {
  // Keyboard events should be on document
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  
  // Mouse events should be on the game container
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Set camera's euler order to YXZ to prevent gimbal lock and maintain proper rotation
  camera.rotation.order = "YXZ";
  
  // Left click to place blocks
  container.addEventListener('click', (event) => {
    // Only place blocks if we're in build mode with the build tool selected
    if (builderMode && currentBuilderTool === "build" && !isMouseDown) {
      placeBlock();
    }
    // If we're in remove mode, remove blocks on left click
    else if (builderMode && currentBuilderTool === "remove" && !isMouseDown) {
      removeBlock();
    }
  });
  
  // Mouse controls for camera rotation
  container.addEventListener('mousedown', (event) => {
    if (event.button === 2) { // Right click
      isMouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      event.preventDefault();
    }
  });
  
  container.addEventListener('mousemove', (event) => {
    if (!isMouseDown) return;
    
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    
    // Rotate horizontally (yaw)
    camera.rotation.y -= deltaX * 0.005;
    
    // Rotate vertically (pitch) with limits
    const newPitch = camera.rotation.x - deltaY * 0.005;
    camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, newPitch)); // Limit to about 60 degrees up/down
    
    // Keep camera level (no roll)
    camera.rotation.z = 0;
    
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    event.preventDefault();
  });
  
  container.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      isMouseDown = false;
      event.preventDefault();
    }
  });
  
  // Prevent context menu on right click
  container.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

// Create a toolbar UI at the bottom of the screen
function createBuilderToolbar() {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Remove existing toolbar if any
  const existingToolbar = document.getElementById("builder-toolbar");
  if (existingToolbar) {
    existingToolbar.remove();
  }
  
  // Create toolbar container
  const toolbar = document.createElement("div");
  toolbar.id = "builder-toolbar";
  toolbar.style.position = "absolute";
  toolbar.style.bottom = "20px";
  toolbar.style.left = "50%";
  toolbar.style.transform = "translateX(-50%)";
  toolbar.style.display = "flex";
  toolbar.style.gap = "10px";
  toolbar.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  toolbar.style.padding = "10px";
  toolbar.style.borderRadius = "10px";
  toolbar.style.zIndex = "1000";
  
  // Create tool buttons
  const tools = [
    { id: "build", icon: "🧱", label: "Build" },
    { id: "remove", icon: "🗑️", label: "Remove" },
    { id: "camera", icon: "🎥", label: "Camera" }
  ];
  
  tools.forEach(tool => {
    const button = document.createElement("button");
    button.id = `tool-${tool.id}`;
    button.innerHTML = `<div style="font-size: 24px">${tool.icon}</div><div>${tool.label}</div>`;
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.backgroundColor = currentBuilderTool === tool.id ? "#4CAF50" : "#333";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "10px 15px";
    button.style.cursor = "pointer";
    button.style.width = "80px";
    button.style.height = "80px";
    
    button.addEventListener("click", () => {
      currentBuilderTool = tool.id;
      updateToolbarSelection();
      
      // Show/hide placement preview based on tool
      if (placementPreview) {
        placementPreview.visible = tool.id === "build";
      }
      
      // Save state when tool changes
      saveBuilderState();
    });
    
    toolbar.appendChild(button);
  });
  
  // Add toolbar to container
  container.appendChild(toolbar);
}

// Update toolbar button selection
function updateToolbarSelection() {
  const tools = ["build", "remove", "camera"];
  
  tools.forEach(tool => {
    const button = document.getElementById(`tool-${tool}`);
    if (button) {
      button.style.backgroundColor = currentBuilderTool === tool ? "#4CAF50" : "#333";
    }
  });
  
  // Update cursor style based on selected tool
  const container = document.getElementById("game-container");
  if (container) {
    switch(currentBuilderTool) {
      case "build":
        container.style.cursor = "cell";
        break;
      case "remove":
        container.style.cursor = "not-allowed";
        break;
      case "camera":
        container.style.cursor = "move";
        break;
      default:
        container.style.cursor = "default";
    }
  }
}

// Function to set up course template
function setupCourseTemplate(template: string) {
  // Clear any existing environment
  clearEnvironment();
  
  // Create a ground plane
  createGround();
  
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
  
  // Create start and finish platforms
  let size;
  switch(template) {
    case "small":
      size = 50;
      break;
    case "large":
      size = 150;
      break;
    case "medium":
    default:
      size = 100;
  }
  
  // Add visual boundaries to show template size
  addTemplateBoundaryMarkers(size);
  
  // Start platform (green)
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
  
  // Finish platform (blue)
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
}

// Add a new function to clear the environment
function clearEnvironment() {
  // Remove objects from the scene that aren't essential
  const objectsToKeep = ["Ground", "Light"];
  
  const objectsToRemove: THREE.Mesh[] = [];
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh && !objectsToKeep.includes(child.name)) {
      objectsToRemove.push(child);
    }
  });
  
  objectsToRemove.forEach(obj => {
    scene.remove(obj);
  });
}

// Add a new function to create boundary markers to visualize template size
function addTemplateBoundaryMarkers(size: number) {
  // Create corner markers to show template boundaries
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

// Create a preview of the block to be placed
function createPlacementPreview() {
  // Remove existing preview if any
  if (placementPreview) {
    scene.remove(placementPreview);
    placementPreview = null;
  }
  
  let geometry, material;
  
  switch(selectedBlockType) {
    case "start":
      geometry = new THREE.BoxGeometry(5, 1, 5);
      material = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5
      });
      break;
    case "finish":
      geometry = new THREE.BoxGeometry(5, 1, 5);
      material = new THREE.MeshStandardMaterial({ 
        color: 0x0000ff,
        transparent: true,
        opacity: 0.5
      });
      break;
    case "platform":
    default:
      geometry = new THREE.BoxGeometry(3, 1, 3);
      material = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5
      });
  }
  
  placementPreview = new THREE.Mesh(geometry, material);
  scene.add(placementPreview);
  updatePlacementPreview();
}

// Update the position of the placement preview based on camera position and direction
function updatePlacementPreview() {
  if (!placementPreview) return;
  
  // Get camera forward direction
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  
  // Cast ray from camera
  const raycaster = new THREE.Raycaster();
  raycaster.set(camera.position, direction);
  
  // Check for intersections with existing blocks and ground
  const intersectables = [...buildingBlocks, ...platforms];
  
  // Add ground to intersectables
  const ground = scene.children.find(child => 
    child instanceof THREE.Mesh && child.rotation.x === -Math.PI / 2);
  if (ground) intersectables.push(ground as THREE.Mesh);
  
  const intersects = raycaster.intersectObjects(intersectables);
  
  if (intersects.length > 0 && intersects[0].distance < 20) {
    // Position block at the intersection point, slightly offset in normal direction
    const intersectPoint = intersects[0].point;
    const normal = intersects[0].face?.normal || new THREE.Vector3(0, 1, 0);
    
    // Offset along the normal to place on top of surfaces
    const offset = 0.5; // Half the block height
    
    placementPreview.position.copy(intersectPoint).add(normal.multiplyScalar(offset));
    
    // Snap to grid
    placementPreview.position.x = Math.round(placementPreview.position.x);
    placementPreview.position.y = Math.round(placementPreview.position.y);
    placementPreview.position.z = Math.round(placementPreview.position.z);
    
    // Make preview visible
    placementPreview.visible = true;
  } else {
    // If no intersection, position preview far in front
    placementPreview.position.copy(camera.position).add(direction.multiplyScalar(10));
    placementPreview.position.x = Math.round(placementPreview.position.x);
    placementPreview.position.y = Math.round(placementPreview.position.y);
    placementPreview.position.z = Math.round(placementPreview.position.z);
  }
}

// Place a building block at the preview position
function placeBlock() {
  if (!placementPreview) return;
  
  let geometry, material;
  
  switch(selectedBlockType) {
    case "start":
      geometry = new THREE.BoxGeometry(5, 1, 5);
      material = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        roughness: 0.7
      });
      break;
    case "finish":
      geometry = new THREE.BoxGeometry(5, 1, 5);
      material = new THREE.MeshStandardMaterial({ 
        color: 0x0000ff,
        roughness: 0.7
      });
      break;
    case "platform":
    default:
      geometry = new THREE.BoxGeometry(3, 1, 3);
      material = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.7
      });
  }
  
  const block = new THREE.Mesh(geometry, material);
  block.position.copy(placementPreview.position);
  block.userData = { type: selectedBlockType };
  block.castShadow = true;
  block.receiveShadow = true;
  
  scene.add(block);
  buildingBlocks.push(block);
  platforms.push(block);
  
  console.log(`Placed ${selectedBlockType} block at position: `, block.position);
}

// Remove closest block to the preview
function removeBlock() {
  if (!placementPreview) return;
  
  // Find the closest block
  let closestIndex = -1;
  let minDistance = Infinity;
  
  for (let i = 0; i < buildingBlocks.length; i++) {
    const block = buildingBlocks[i];
    if (placementPreview) {
      const distance = block.position.distanceTo(placementPreview.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
  }
  
  // Remove the block if it's close enough (within 5 units)
  if (closestIndex !== -1 && minDistance < 5) {
    const blockToRemove = buildingBlocks[closestIndex];
    scene.remove(blockToRemove);
    
    // Remove from building blocks array
    buildingBlocks.splice(closestIndex, 1);
    
    // Also remove from platforms array if it exists there
    const platformIndex = platforms.indexOf(blockToRemove);
    if (platformIndex !== -1) {
      platforms.splice(platformIndex, 1);
    }
    
    console.log(`Removed block at position: ${blockToRemove.position.x}, ${blockToRemove.position.y}, ${blockToRemove.position.z}`);
  }
}

// Setup UI elements for builder mode
function setupBuilderUI() {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Remove existing UI elements if any
  const existingUI = document.getElementById("builder-ui");
  if (existingUI) {
    existingUI.remove();
  }
  
  // Create UI container - moved to left side with better spacing
  const builderUI = document.createElement("div");
  builderUI.id = "builder-ui";
  builderUI.style.position = "absolute";
  builderUI.style.top = "80px"; // Moved down to avoid overlap with debug UI
  builderUI.style.left = "10px";
  builderUI.style.display = "flex";
  builderUI.style.flexDirection = "column";
  builderUI.style.gap = "10px";
  builderUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  builderUI.style.color = "white";
  builderUI.style.padding = "15px";
  builderUI.style.borderRadius = "8px";
  builderUI.style.zIndex = "100";
  builderUI.style.maxWidth = "250px"; // Limit width
  
  // Title
  const title = document.createElement("h2");
  title.textContent = "Course Builder";
  title.style.margin = "0 0 10px 0";
  title.style.textAlign = "center";
  builderUI.appendChild(title);
  
  // Block type selection
  const blockTypeLabel = document.createElement("div");
  blockTypeLabel.textContent = "Block Type:";
  blockTypeLabel.style.fontWeight = "bold";
  builderUI.appendChild(blockTypeLabel);
  
  const blockTypeSelector = document.createElement("div");
  blockTypeSelector.style.display = "flex";
  blockTypeSelector.style.gap = "5px";
  blockTypeSelector.style.marginBottom = "10px";
  
  const createButton = (text: string, type: string, color: string) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = "block-button";
    button.style.padding = "8px";
    button.style.backgroundColor = type === selectedBlockType ? "#4CAF50" : "#f1f1f1";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.color = type === selectedBlockType ? "white" : "black";
    button.style.flex = "1";
    
    // Add a color indicator
    const colorIndicator = document.createElement("div");
    colorIndicator.style.width = "10px";
    colorIndicator.style.height = "10px";
    colorIndicator.style.backgroundColor = color;
    colorIndicator.style.display = "inline-block";
    colorIndicator.style.marginRight = "5px";
    colorIndicator.style.borderRadius = "2px";
    button.prepend(colorIndicator);
    
    button.addEventListener("click", () => {
      selectedBlockType = type;
      createPlacementPreview();
      
      // Switch to build tool when changing block type
      currentBuilderTool = "build";
      updateToolbarSelection();
      
      // Update button styles
      Array.from(blockTypeSelector.children).forEach(child => {
        (child as HTMLElement).style.backgroundColor = "#f1f1f1";
        (child as HTMLElement).style.color = "black";
      });
      button.style.backgroundColor = "#4CAF50";
      button.style.color = "white";
      
      // Save state
      saveBuilderState();
    });
    
    return button;
  };
  
  blockTypeSelector.appendChild(createButton("Platform", "platform", "#cccccc"));
  blockTypeSelector.appendChild(createButton("Start", "start", "#00ff00"));
  blockTypeSelector.appendChild(createButton("Finish", "finish", "#0000ff"));
  
  builderUI.appendChild(blockTypeSelector);
  
  // Save course button
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save Course";
  saveButton.className = "save-button";
  saveButton.style.padding = "10px";
  saveButton.style.backgroundColor = "#2196F3";
  saveButton.style.marginBottom = "10px";
  saveButton.addEventListener("click", saveCourse);
  
  builderUI.appendChild(saveButton);
  
  // Exit builder button
  const exitButton = document.createElement("button");
  exitButton.textContent = "Enter Player Mode (B)";
  exitButton.style.padding = "8px";
  exitButton.style.backgroundColor = "#4CAF50";
  exitButton.style.color = "white";
  exitButton.style.border = "none";
  exitButton.style.borderRadius = "4px";
  exitButton.style.cursor = "pointer";
  exitButton.style.marginBottom = "10px";
  exitButton.addEventListener("click", exitBuilderMode);
  
  builderUI.appendChild(exitButton);
  
  // Instructions - Updated to include arrows for rotation
  const instructions = document.createElement("div");
  instructions.className = "control-instructions";
  instructions.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  instructions.style.padding = "10px";
  instructions.style.borderRadius = "4px";
  instructions.style.maxWidth = "220px";
  instructions.innerHTML = `
    <h3 style="margin: 0 0 5px 0">Builder Controls:</h3>
    <p style="margin: 2px 0">WASD - Move horizontally</p>
    <p style="margin: 2px 0">Q/E - Move up/down</p>
    <p style="margin: 2px 0">Arrow Left/Right - Rotate camera</p>
    <p style="margin: 2px 0">Right-click + drag - Look around</p>
    <p style="margin: 2px 0">Left Click - Place block</p>
    <p style="margin: 2px 0">Use toolbar for tools</p>
    <p style="margin: 2px 0; color: #ffeb3b">Need start and finish blocks!</p>
  `;
  
  builderUI.appendChild(instructions);
  
  // Block counter
  const counterContainer = document.createElement("div");
  counterContainer.id = "block-counter";
  counterContainer.style.marginTop = "10px";
  counterContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  counterContainer.style.padding = "5px";
  counterContainer.style.borderRadius = "4px";
  counterContainer.innerHTML = `
    <p style="margin: 0">Blocks placed: ${buildingBlocks.length}</p>
    <p style="margin: 0">Start blocks: ${buildingBlocks.filter(b => b.userData.type === 'start').length}</p>
    <p style="margin: 0">Finish blocks: ${buildingBlocks.filter(b => b.userData.type === 'finish').length}</p>
  `;
  
  builderUI.appendChild(counterContainer);
  
  // Add UI to game container
  container.appendChild(builderUI);
  
  // Update block counter periodically
  setInterval(() => {
    const counter = document.getElementById("block-counter");
    if (counter && builderMode) {
      counter.innerHTML = `
        <p style="margin: 0">Blocks placed: ${buildingBlocks.length}</p>
        <p style="margin: 0">Start blocks: ${buildingBlocks.filter(b => b.userData.type === 'start').length}</p>
        <p style="margin: 0">Finish blocks: ${buildingBlocks.filter(b => b.userData.type === 'finish').length}</p>
      `;
    }
  }, 1000);
  
  // Add mobile controls if on mobile
  if (isMobile) {
    setupMobileBuilderControls();
  }
}

// Setup mobile builder controls
function setupMobileBuilderControls() {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Create movement pad
  const movementPad = document.createElement("div");
  movementPad.id = "movement-pad";
  movementPad.style.position = "absolute";
  movementPad.style.bottom = "100px";
  movementPad.style.left = "50px";
  movementPad.style.width = "150px";
  movementPad.style.height = "150px";
  movementPad.style.display = "grid";
  movementPad.style.gridTemplateColumns = "1fr 1fr 1fr";
  movementPad.style.gridTemplateRows = "1fr 1fr 1fr";
  
  // Create direction buttons
  const directions = [
    { text: "↖", x: -1, y: 0, z: -1 },
    { text: "↑", x: 0, y: 0, z: -1 },
    { text: "↗", x: 1, y: 0, z: -1 },
    { text: "←", x: -1, y: 0, z: 0 },
    { text: "•", x: 0, y: 0, z: 0 },
    { text: "→", x: 1, y: 0, z: 0 },
    { text: "↙", x: -1, y: 0, z: 1 },
    { text: "↓", x: 0, y: 0, z: 1 },
    { text: "↘", x: 1, y: 0, z: 1 }
  ];
  
  directions.forEach(dir => {
    const button = document.createElement("button");
    button.textContent = dir.text;
    button.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
    button.style.border = "1px solid white";
    button.style.color = "white";
    button.style.fontSize = "20px";
    button.style.display = "flex";
    button.style.justifyContent = "center";
    button.style.alignItems = "center";
    
    button.addEventListener("touchstart", () => {
      if (dir.x < 0) buildControls.left = true;
      if (dir.x > 0) buildControls.right = true;
      if (dir.z < 0) buildControls.forward = true;
      if (dir.z > 0) buildControls.backward = true;
    });
    
    button.addEventListener("touchend", () => {
      if (dir.x < 0) buildControls.left = false;
      if (dir.x > 0) buildControls.right = false;
      if (dir.z < 0) buildControls.forward = false;
      if (dir.z > 0) buildControls.backward = false;
    });
    
    movementPad.appendChild(button);
  });
  
  // Vertical movement buttons
  const upButton = document.createElement("button");
  upButton.textContent = "Up";
  upButton.style.position = "absolute";
  upButton.style.right = "50px";
  upButton.style.bottom = "150px";
  upButton.style.width = "60px";
  upButton.style.height = "60px";
  upButton.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
  upButton.style.border = "1px solid white";
  upButton.style.borderRadius = "50%";
  upButton.style.color = "white";
  
  upButton.addEventListener("touchstart", () => {
    buildControls.up = true;
  });
  
  upButton.addEventListener("touchend", () => {
    buildControls.up = false;
  });
  
  const downButton = document.createElement("button");
  downButton.textContent = "Down";
  downButton.style.position = "absolute";
  downButton.style.right = "50px";
  downButton.style.bottom = "80px";
  downButton.style.width = "60px";
  downButton.style.height = "60px";
  downButton.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
  downButton.style.border = "1px solid white";
  downButton.style.borderRadius = "50%";
  downButton.style.color = "white";
  
  downButton.addEventListener("touchstart", () => {
    buildControls.down = true;
  });
  
  downButton.addEventListener("touchend", () => {
    buildControls.down = false;
  });
  
  // Rotation buttons
  const rotateLeftButton = document.createElement("button");
  rotateLeftButton.textContent = "⟲";
  rotateLeftButton.style.position = "absolute";
  rotateLeftButton.style.right = "120px";
  rotateLeftButton.style.bottom = "115px";
  rotateLeftButton.style.width = "60px";
  rotateLeftButton.style.height = "60px";
  rotateLeftButton.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
  rotateLeftButton.style.border = "1px solid white";
  rotateLeftButton.style.borderRadius = "50%";
  rotateLeftButton.style.color = "white";
  rotateLeftButton.style.fontSize = "24px";
  
  rotateLeftButton.addEventListener("touchstart", () => {
    buildControls.rotateLeft = true;
  });
  
  rotateLeftButton.addEventListener("touchend", () => {
    buildControls.rotateLeft = false;
  });
  
  const rotateRightButton = document.createElement("button");
  rotateRightButton.textContent = "⟳";
  rotateRightButton.style.position = "absolute";
  rotateRightButton.style.right = "190px";
  rotateRightButton.style.bottom = "115px";
  rotateRightButton.style.width = "60px";
  rotateRightButton.style.height = "60px";
  rotateRightButton.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
  rotateRightButton.style.border = "1px solid white";
  rotateRightButton.style.borderRadius = "50%";
  rotateRightButton.style.color = "white";
  rotateRightButton.style.fontSize = "24px";
  
  rotateRightButton.addEventListener("touchstart", () => {
    buildControls.rotateRight = true;
  });
  
  rotateRightButton.addEventListener("touchend", () => {
    buildControls.rotateRight = false;
  });
  
  // Add all controls to container
  container.appendChild(movementPad);
  container.appendChild(upButton);
  container.appendChild(downButton);
  container.appendChild(rotateLeftButton);
  container.appendChild(rotateRightButton);
}

// Send course data to parent
function saveCourse() {
  if (!builderMode) return;
  
  // Convert building blocks to serializable format
  const blocks = buildingBlocks.map(block => ({
    position: {
      x: block.position.x,
      y: block.position.y,
      z: block.position.z
    },
    type: block.userData.type,
    size: block.geometry.type.includes("Box") ? 
      (block.geometry as THREE.BoxGeometry).parameters : 
      { width: 3, height: 1, depth: 3 }
  }));
  
  // Find start and finish positions
  const startBlock = buildingBlocks.find(block => block.userData.type === "start");
  const finishBlock = buildingBlocks.find(block => block.userData.type === "finish");
  
  if (!startBlock || !finishBlock) {
    console.error("Course must have start and finish blocks");
    return;
  }
  
  const courseData = {
    template: courseTemplate,
    blocks,
    startPosition: {
      x: startBlock.position.x,
      y: startBlock.position.y + 1, // Player spawns above the start block
      z: startBlock.position.z
    },
    finishPosition: {
      x: finishBlock.position.x,
      y: finishBlock.position.y,
      z: finishBlock.position.z
    }
  };
  
  // Send message to parent
  window.parent.postMessage({
    type: "courseCreated",
    data: courseData
  }, "*");
  
  console.log("Course saved:", courseData);
  exitBuilderMode();
}

// Exit builder mode
function exitBuilderMode() {
  console.log("Exiting builder mode");
  builderMode = false;
  gameStarted = true;
  
  // Remove builder UI elements
  const builderUI = document.getElementById("builder-ui");
  if (builderUI) {
    builderUI.remove();
  }
  
  const builderToolbar = document.getElementById("builder-toolbar");
  if (builderToolbar) {
    builderToolbar.remove();
  }
  
  // Remove placement preview
  if (placementPreview) {
    scene.remove(placementPreview);
    placementPreview = null;
  }
  
  // Reset all controls
  resetAllControls();
  
  // Reset player state
  playerState = {
    position: new THREE.Vector3(0, 1, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    onGround: true,
    jumping: false,
    speed: 5,
    jumpPower: 10,
    gravity: 20,
    currentAnimation: "idle"
  };
  
  // Reset cursor style
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.style.cursor = "default";
  }
  
  // Remove debug UI
  const debugUI = document.getElementById("builder-debug");
  if (debugUI) {
    debugUI.remove();
  }
  
  // Show and position player
  if (player) {
    player.visible = true;
    player.position.set(0, 1, 0);
  }
  
  // Reset camera
  camera.position.set(0, 5, 10);
  camera.rotation.set(-0.3, 0, 0);
  
  // Save state before exiting
  localStorage.setItem('lastMode', 'player');
  console.log("Builder mode exited successfully");
}

// Function to save builder state to localStorage
function saveBuilderState() {
  if (!builderMode) return;
  
  const state = {
    isBuilderMode: builderMode,
    template: courseTemplate,
    cameraPosition: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    cameraRotation: {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z
    },
    selectedTool: currentBuilderTool,
    selectedBlockType: selectedBlockType
  };
  
  localStorage.setItem('builderState', JSON.stringify(state));
  localStorage.setItem('builderTemplate', courseTemplate);
}

// Function to load builder state from localStorage
function loadBuilderState() {
  const stateStr = localStorage.getItem('builderState');
  if (stateStr) {
    try {
      const state = JSON.parse(stateStr);
      
      if (state.isBuilderMode) {
        // Enter builder mode with saved template
        enterBuilderMode(state.template || "medium");
        
        // Restore camera position 
        if (state.cameraPosition) {
          camera.position.set(
            state.cameraPosition.x,
            state.cameraPosition.y,
            state.cameraPosition.z
          );
        }
        
        // Restore only horizontal rotation (y-axis), ignore x and z rotations
        if (state.cameraRotation) {
          camera.rotation.set(
            0, // Force x rotation to 0 (horizontal view)
            state.cameraRotation.y,
            0  // Force z rotation to 0
          );
        }
        
        // Restore tool selection
        if (state.selectedTool) {
          currentBuilderTool = state.selectedTool;
          updateToolbarSelection();
        }
        
        // Restore block type selection
        if (state.selectedBlockType) {
          selectedBlockType = state.selectedBlockType;
          createPlacementPreview();
        }
        
        console.log("Builder state restored from localStorage");
      }
    } catch (error) {
      console.error("Error loading builder state:", error);
      
      // Clear corrupted state and start fresh
      localStorage.removeItem('builderState');
      localStorage.removeItem('builderTemplate');
    }
  }
}

// Update the debug UI to include rotation controls
function createBuilderDebugUI() {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  const debugUI = document.createElement("div");
  debugUI.id = "builder-debug";
  debugUI.style.position = "absolute";
  debugUI.style.top = "10px";
  debugUI.style.right = "10px";
  debugUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  debugUI.style.color = "white";
  debugUI.style.padding = "10px";
  debugUI.style.borderRadius = "5px";
  debugUI.style.fontFamily = "monospace";
  debugUI.style.zIndex = "1000";
  debugUI.style.maxWidth = "180px";
  
  container.appendChild(debugUI);
  
  // Update debug info every 100ms
  setInterval(() => {
    if (!builderMode) {
      debugUI.remove();
      return;
    }
    
    debugUI.innerHTML = `
      <div style="font-weight:bold;">Builder Controls:</div>
      <div>W (Forward): ${buildControls.forward}</div>
      <div>S (Back): ${buildControls.backward}</div>
      <div>A (Left): ${buildControls.left}</div>
      <div>D (Right): ${buildControls.right}</div>
      <div>Q (Up): ${buildControls.up}</div>
      <div>E (Down): ${buildControls.down}</div>
      <div>← (Rotate L): ${buildControls.rotateLeft}</div>
      <div>→ (Rotate R): ${buildControls.rotateRight}</div>
      <div style="margin-top:5px;font-size:11px;">Pos: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}</div>
    `;
  }, 100);
}

// Create and show the overlay
function showOverlay() {
  if (isOverlayActive) return;
  
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Reset all controls when overlay is shown
  resetAllControls();
  
  const overlay = document.createElement("div");
  overlay.id = "game-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";
  overlay.style.cursor = "pointer";
  
  const message = document.createElement("div");
  message.textContent = "Click to play";
  message.style.color = "white";
  message.style.fontSize = "24px";
  message.style.fontFamily = "Arial, sans-serif";
  message.style.padding = "20px";
  message.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  message.style.borderRadius = "10px";
  message.style.border = "2px solid white";
  
  overlay.appendChild(message);
  container.appendChild(overlay);
  isOverlayActive = true;
  
  // Add click handler to remove overlay
  overlay.addEventListener("click", hideOverlay);
}

// Hide the overlay and resume game
function hideOverlay() {
  const overlay = document.getElementById("game-overlay");
  if (overlay) {
    overlay.remove();
    isOverlayActive = false;
  }
}

// Add this function to reset all controls
function resetAllControls() {
  // Reset builder controls
  buildControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateLeft: false,
    rotateRight: false
  };
  
  // Reset game controls
  keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  };
  
  // Reset mouse state
  isMouseDown = false;
}

// Initialize the game
console.log("app.js loaded");
init();
