import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { 
  PlayerState, 
  KeyState, 
  BuildControls, 
  TouchJoystick, 
  AnimationActions,
  BlockData
} from "./utils/types.js";
import { 
  CAMERA_SETTINGS, 
  PLAYER_SETTINGS, 
  STORAGE_KEYS,
  BLOCK_TYPES 
} from "./utils/config.js";
import { 
  isMobileDevice, 
  loadBuilderState, 
  removeElement, 
  saveBuilderState, 
  sendMessageToParent,
  resetBuilderLocalStorage
} from "./utils/helpers.js";
import { 
  setupLighting, 
  createGround, 
  createCityEnvironment, 
  setupCourseTemplate, 
  clearEnvironment 
} from "./systems/environment.js";
import { 
  loadPlayerCharacter, 
  updatePlayer, 
  updateCamera, 
  updatePlayerAnimation, 
  resetPlayerState, 
  sendPositionUpdate 
} from "./systems/player.js";
import { 
  updateBuilderCamera, 
  createPlacementPreview, 
  updatePlacementPreview, 
  placeBlock, 
  removeBlock, 
  saveCourse, 
  createBuilderUI, 
  createBuilderToolbar, 
  updateToolbarSelection, 
  createBuilderDebugUI 
} from "./systems/builder.js";
import { 
  setupEventListeners, 
  setupBuilderMouseHandlers, 
  resetAllControls 
} from "./systems/input.js";
import { 
  showOverlay, 
  hideOverlay, 
  getOverlayActive, 
  showNotification 
} from "./components/Overlay.js";
import { 
  createMobileControls, 
  setupMobileTouchHandlers, 
  updateKeyStatesFromJoystick, 
  setupMobileBuilderControls 
} from "./components/MobileControls.js";

// Game state
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let player: THREE.Object3D | null = null;
let mixer: THREE.AnimationMixer | null = null;
let actions: AnimationActions = {
  idle: null,
  running: null,
  jumping: null
};
let clock = new THREE.Clock();
let platforms: THREE.Mesh[] = [];
let gameStarted = false;
let isMobile = false;
let joystickPosition = { x: 0, y: 0 };
let touchJoystick: TouchJoystick = { active: false, startX: 0, startY: 0 };

// Builder mode state
let builderMode = false;
let buildingBlocks: THREE.Mesh[] = [];
let selectedBlockType = "platform"; // platform, start, finish
let courseTemplate = "medium"; // small, medium, large
let currentBuilderTool = "build"; // build, remove, camera
let buildControls: BuildControls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
  rotateLeft: false,
  rotateRight: false
};
let placementPreview: THREE.Mesh | null = null;
let isPlacingBlock = false;
let cameraRotationAngle = 0;

// Player state
let playerState: PlayerState = resetPlayerState();

// Input state
let keyState: KeyState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  rotateLeft: false,
  rotateRight: false
};

// Timer for periodically saving builder state
let saveStateTimer = 0;
const SAVE_STATE_INTERVAL = 10; // Save every 10 seconds

/**
 * Initialize the game
 */
function init() {
  console.log("Initializing Three.js scene...");
  
  // Check if last mode was builder mode
  const lastMode = localStorage.getItem(STORAGE_KEYS.LAST_MODE);
  console.log("Last mode from localStorage:", lastMode);
  
  // Detect if on mobile
  isMobile = isMobileDevice();
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Light blue sky
  
  // Add fog for depth
  scene.fog = new THREE.Fog(0x87CEEB, 30, 100);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(
    CAMERA_SETTINGS.FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_SETTINGS.NEAR,
    CAMERA_SETTINGS.FAR
  );
  camera.position.copy(CAMERA_SETTINGS.DEFAULT_POSITION);
  
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
    window.addEventListener("blur", () => showOverlay(() => resetAllControls(keyState, buildControls)));
    container.addEventListener("mouseleave", () => showOverlay(() => resetAllControls(keyState, buildControls)));
    
    // Show initial overlay
    showOverlay(() => resetAllControls(keyState, buildControls));
  } else {
    console.error("No #game-container found!");
    return;
  }
  
  // Lighting
  setupLighting(scene);
  
  // Create ground
  createGround(scene);
  
  // Don't create city environment if we're going straight to builder mode
  if (!window.location.search.includes('builder=true') && lastMode !== 'builder') {
    createCityEnvironment(scene);
  }
  
  // Load player character
  loadPlayerCharacter(scene, (p: THREE.Object3D, m: THREE.AnimationMixer, a: AnimationActions) => {
    player = p;
    mixer = m;
    actions = a;
  });
  
  // Set up event listeners
  setupEventListeners(
    keyState,
    buildControls,
    builderMode,
    gameStarted,
    () => showOverlay(() => resetAllControls(keyState, buildControls)),
    () => resetAllControls(keyState, buildControls),
    toggleGameMode,
    handleResize
  );
  
  // Create mobile controls if on mobile
  if (isMobile) {
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      createMobileControls(gameContainer, keyState, touchJoystick);
      setupMobileTouchHandlers(gameContainer, keyState, touchJoystick, joystickPosition);
    }
  }
  
  // Start animation loop
  animate();
  
  // Send ready message
  sendMessageToParent("webViewReady");
  console.log("Sent webViewReady message");
  
  // Start in builder mode if URL parameter or last mode was builder
  if (window.location.search.includes('builder=true') || lastMode === 'builder') {
    const template = localStorage.getItem(STORAGE_KEYS.BUILDER_TEMPLATE) || "medium";
    console.log("Starting in builder mode with template:", template);
    enterBuilderMode(template);
  } else {
    console.log("Starting in player mode");
    gameStarted = true;
  }
}

/**
 * Animation loop with added save functionality
 */
function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = Math.min(clock.getDelta(), 0.1);
  
  // Update save timer
  saveStateTimer += deltaTime;
  
  // Check current mode from localStorage to ensure consistency
  const storedMode = localStorage.getItem(STORAGE_KEYS.LAST_MODE);
  const effectiveBuilderMode = builderMode || storedMode === 'builder';
  
  // If builder mode state is inconsistent, fix it
  if (effectiveBuilderMode !== builderMode) {
    console.log(`Fixing inconsistent builder mode: variable=${builderMode}, localStorage=${storedMode}, using=${effectiveBuilderMode}`);
    
    // If there's a severe inconsistency, reset localStorage
    if (builderMode === false && storedMode === 'builder') {
      console.warn("Severe state inconsistency detected; resetting localStorage");
      resetBuilderLocalStorage();
    }
    
    builderMode = effectiveBuilderMode;
  }
  
  // Periodically save builder state
  if (builderMode && saveStateTimer >= SAVE_STATE_INTERVAL) {
    saveStateTimer = 0;
    saveBuilderState(
      builderMode,
      courseTemplate,
      camera,
      currentBuilderTool,
      selectedBlockType,
      buildingBlocks
    );
  }
  
  if (builderMode) {
    // Update builder camera movement
    updateBuilderCamera(camera, buildControls, deltaTime);
    
    // Update placement preview position
    if (placementPreview) {
      const allObjects = [];
      
      // Add building blocks to intersectables (for preview placement)
      buildingBlocks.forEach(block => {
        allObjects.push(block);
      });
      
      // Add any platforms that aren't already in buildingBlocks (from environment)
      platforms.forEach(platform => {
        // Only add if it's not already in our list (avoid duplicates)
        if (!buildingBlocks.includes(platform)) {
          allObjects.push(platform);
        }
      });
      
      // Add ground if it exists
      const ground = scene.children.find(child => 
        child instanceof THREE.Mesh && child.name === "Ground");
      if (ground && ground instanceof THREE.Mesh) {
        allObjects.push(ground);
      }
      
      updatePlacementPreview(camera, placementPreview, allObjects);
      
      // Make sure visibility matches the current tool
      placementPreview.visible = currentBuilderTool === "build";
    }
  } else if (gameStarted && player) {
    // Regular game update
    updatePlayer(
      deltaTime,
      player,
      playerState,
      keyState,
      platforms,
      scene,
      camera,
      cameraRotationAngle,
      () => updateCamera(camera, player as THREE.Object3D, cameraRotationAngle)
    );
    
    // Update camera rotation based on input
    if (keyState.rotateLeft) {
      cameraRotationAngle += CAMERA_SETTINGS.ROTATION_SPEED * deltaTime;
    }
    if (keyState.rotateRight) {
      cameraRotationAngle -= CAMERA_SETTINGS.ROTATION_SPEED * deltaTime;
    }
    
    // Update animation mixer
    if (mixer) {
      mixer.update(deltaTime);
    }
    
    // Update animations based on state
    updatePlayerAnimation(mixer, actions, playerState, keyState);
    
    // Update mobile control states
    if (isMobile) {
      updateKeyStatesFromJoystick(joystickPosition, keyState);
    }
  }
  
  // Render scene
  renderer.render(scene, camera);
}

/**
 * Handle window resize
 */
function handleResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * Toggle between player and builder modes
 */
function toggleGameMode() {
  const previousMode = builderMode ? 'builder' : 'player';
  console.log(`Toggling game mode. Previous mode: ${previousMode}`);
  
  if (builderMode) {
    console.log("Exiting builder mode...");
    exitBuilderMode();
  } else {
    console.log("Entering builder mode...");
    const lastTemplate = localStorage.getItem(STORAGE_KEYS.BUILDER_TEMPLATE) || "medium";
    enterBuilderMode(lastTemplate);
  }
  
  const newMode = builderMode ? 'builder' : 'player';
  // Double-check mode switch was successful
  // console.log(`Mode after toggle: ${newMode} (changed from ${previousMode})`);
  // console.log(`localStorage mode: ${localStorage.getItem(STORAGE_KEYS.LAST_MODE)}`);
  
  // Check if toggle was effective
  if (previousMode === newMode) {
    console.error("Mode did not toggle correctly! Forcing update...");
    
    // Force mode change
    if (newMode === 'player') {
      builderMode = true;
      exitBuilderMode();
    } else {
      builderMode = false;
      enterBuilderMode();
    }
    
    console.log(`Forced mode change, now: ${builderMode ? 'builder' : 'player'}`);
  }
}

/**
 * Enter builder mode
 */
function enterBuilderMode(templateSize: string = "medium") {
  console.log("Entering builder mode with template:", templateSize);
  builderMode = true;
  gameStarted = false;
  courseTemplate = templateSize;

  // Immediately update the localStorage with the current mode
  localStorage.setItem(STORAGE_KEYS.LAST_MODE, 'builder');
  localStorage.setItem(STORAGE_KEYS.BUILDER_TEMPLATE, templateSize);

  // Hide player
  if (player) {
    player.visible = false;
  }

  // Reset all controls
  resetAllControls(keyState, buildControls);
  
  // Clear existing environment
  clearEnvironment(scene);
  
  // Create ground
  createGround(scene);
  
  // Clear out existing blocks
  console.log("STORAGE DEBUG - Clearing existing building blocks, current count:", buildingBlocks.length);
  console.log("STORAGE DEBUG - Platforms array length before clearing:", platforms.length);
  buildingBlocks = [];
  platforms = [];
  console.log("STORAGE DEBUG - Platforms array length after clearing:", platforms.length);
  
  // Try to load existing builder state first
  const savedState = loadBuilderState();
  
  if (savedState && savedState.blocks && savedState.blocks.length > 0) {
    console.log("STORAGE DEBUG - Loading previous builder state with", savedState.blocks.length, "blocks");
    
    // Recreate blocks from saved state (buildingBlocks already cleared above)
    savedState.blocks.forEach((blockData: BlockData, index) => {
      console.log(`STORAGE DEBUG - Loading block ${index} of type: ${blockData.type} at position:`, blockData.position);
      let geometry, material;
      
      switch(blockData.type) {
        case "start":
          geometry = new THREE.BoxGeometry(
            BLOCK_TYPES.START.size.width, 
            BLOCK_TYPES.START.size.height, 
            BLOCK_TYPES.START.size.depth
          );
          material = new THREE.MeshStandardMaterial({ 
            color: BLOCK_TYPES.START.color,
            roughness: 0.7
          });
          break;
        case "finish":
          geometry = new THREE.BoxGeometry(
            BLOCK_TYPES.FINISH.size.width, 
            BLOCK_TYPES.FINISH.size.height, 
            BLOCK_TYPES.FINISH.size.depth
          );
          material = new THREE.MeshStandardMaterial({ 
            color: BLOCK_TYPES.FINISH.color,
            roughness: 0.7
          });
          break;
        case "platform":
        default:
          geometry = new THREE.BoxGeometry(
            BLOCK_TYPES.PLATFORM.size.width, 
            BLOCK_TYPES.PLATFORM.size.height, 
            BLOCK_TYPES.PLATFORM.size.depth
          );
          material = new THREE.MeshStandardMaterial({ 
            color: BLOCK_TYPES.PLATFORM.color,
            roughness: 0.7
          });
      }
      
      const block = new THREE.Mesh(geometry, material);
      block.position.set(blockData.position.x, blockData.position.y, blockData.position.z);
      block.userData = { type: blockData.type };
      block.castShadow = true;
      block.receiveShadow = true;
      
      scene.add(block);
      buildingBlocks.push(block);
      
      // Add to platforms for collision detection
      if (!platforms.includes(block)) {
        platforms.push(block);
      }
    });
    
    // Restore camera position if saved
    if (savedState.cameraPosition) {
      camera.position.set(
        savedState.cameraPosition.x,
        savedState.cameraPosition.y,
        savedState.cameraPosition.z
      );
    } else {
      camera.position.set(0, 10, 20);
    }
    
    // Restore camera rotation if saved
    if (savedState.cameraRotation) {
      camera.rotation.set(
        savedState.cameraRotation.x,
        savedState.cameraRotation.y,
        savedState.cameraRotation.z
      );
    } else {
      camera.rotation.set(-0.3, 0, 0);
    }
    
    // Restore tool and block type
    if (savedState.selectedTool) {
      currentBuilderTool = savedState.selectedTool;
    }
    
    if (savedState.selectedBlockType) {
      selectedBlockType = savedState.selectedBlockType;
    }
    
  } else {
    // Setup a new course template if no saved state exists
    console.log("No saved builder state found, creating new template");
    buildingBlocks = setupCourseTemplate(scene, templateSize);
    
    // Set initial camera position and rotation
    camera.position.set(0, 10, 20);
    camera.rotation.set(-0.3, 0, 0);
  }
  
  // Always ensure camera rotation order is set correctly
  camera.rotation.order = "YXZ"; // Set rotation order to prevent gimbal lock
  
  // Setup UI and event listeners
  const container = document.getElementById("game-container");
  if (container) {
    createBuilderUI(
      selectedBlockType,
      buildingBlocks,
      exitBuilderMode,
      () => saveCourse(buildingBlocks, courseTemplate),
      (blockType: string) => {
        selectedBlockType = blockType;
        if (placementPreview) {
          scene.remove(placementPreview);
        }
        placementPreview = createPlacementPreview(scene, selectedBlockType);
        
        // Switch to build tool when changing block type
        currentBuilderTool = "build";
        updateToolbarSelection(currentBuilderTool);
        
        // Save state
        saveBuilderState(
          builderMode,
          courseTemplate,
          camera,
          currentBuilderTool,
          selectedBlockType,
          buildingBlocks
        );
      }
    );
    
    createBuilderToolbar(
      currentBuilderTool,
      (tool: string) => {
        currentBuilderTool = tool;
        updateToolbarSelection(currentBuilderTool);
        
        // Show/hide placement preview based on tool
        if (placementPreview) {
          placementPreview.visible = tool === "build";
        }
        
        // Save state when tool changes
        saveBuilderState(
          builderMode,
          courseTemplate,
          camera,
          currentBuilderTool,
          selectedBlockType,
          buildingBlocks
        );
      }
    );
    
    createBuilderDebugUI(buildControls);
    
    // Setup mouse handlers
    setupBuilderMouseHandlers(
      container,
      camera,
      () => {
        // Update placement preview on mouse move, always run regardless of tool mode
        if (placementPreview) {
          // Important: Use spread operator to create a new array instead of referring to the same objects
          // This ensures we don't accidentally have duplicate blocks in our intersectables list
          const allObjects = [];
          
          // Add building blocks to intersectables (for preview placement)
          buildingBlocks.forEach(block => {
            allObjects.push(block);
          });
          
          // Add any platforms that aren't already in buildingBlocks (from environment)
          platforms.forEach(platform => {
            // Only add if it's not already in our list (avoid duplicates)
            if (!buildingBlocks.includes(platform)) {
              allObjects.push(platform);
            }
          });
          
          // Add ground if it exists
          const ground = scene.children.find(child => 
            child instanceof THREE.Mesh && child.name === "Ground");
          if (ground && ground instanceof THREE.Mesh) {
            allObjects.push(ground);
          }
          
          updatePlacementPreview(camera, placementPreview, allObjects);
          
          // Make sure visibility matches the current tool
          placementPreview.visible = currentBuilderTool === "build";
        }
      },
      () => {
        // Place block function - only execute if in build mode
        if (currentBuilderTool === "build" && !isPlacingBlock) {
          console.log("BLOCK COUNTER DEBUG - Before placing block:", buildingBlocks.length);
          isPlacingBlock = true;
          
          if (!placementPreview) {
            console.error("Placement preview is null when trying to place block");
            isPlacingBlock = false;
            return;
          }
          
          // Make sure the preview is visible
          if (!placementPreview.visible) {
            placementPreview.visible = true;
          }
          
          placeBlock(scene, placementPreview, selectedBlockType, buildingBlocks, platforms);
          console.log("BLOCK COUNTER DEBUG - After placing block:", buildingBlocks.length);
          console.log("BLOCK COUNTER DEBUG - Platforms array length:", platforms.length);
          isPlacingBlock = false;
        } else {
          // console.log("Not placing block. Tool:", currentBuilderTool, "isPlacingBlock:", isPlacingBlock);
        }
      },
      () => {
        // Remove block function - only execute if in remove mode
        if (currentBuilderTool === "remove" && !isPlacingBlock) {
          // console.log("Attempting to remove block");
          isPlacingBlock = true;
          removeBlock(scene, placementPreview, buildingBlocks, platforms);
          // console.log("Block removed, remaining blocks:", buildingBlocks.length);
          isPlacingBlock = false;
        } else {
          // console.log("Not removing block. Tool:", currentBuilderTool, "isPlacingBlock:", isPlacingBlock);
        }
      }
    );
    
    // Add mobile controls if on mobile
    if (isMobile) {
      setupMobileBuilderControls(container, buildControls);
    }
  }
  
  // Create placement preview
  if (placementPreview) {
    scene.remove(placementPreview);
  }
  placementPreview = createPlacementPreview(scene, selectedBlockType);
  
  // Save initial builder state
  saveBuilderState(
    builderMode,
    courseTemplate,
    camera,
    currentBuilderTool,
    selectedBlockType,
    buildingBlocks
  );
  
  console.log("Builder mode entered successfully");
  
  // Show notification
  showNotification("Builder Mode Activated", 3000);
}

/**
 * Exit builder mode
 */
function exitBuilderMode() {
  console.log("Exiting builder mode");
  
  // Save current builder state before exiting
  saveBuilderState(
    true, // Still true at this point
    courseTemplate,
    camera,
    currentBuilderTool,
    selectedBlockType,
    buildingBlocks
  );
  
  builderMode = false;
  gameStarted = true;
  
  // Immediately update the localStorage with the current mode
  localStorage.setItem(STORAGE_KEYS.LAST_MODE, 'player');
  
  // Remove builder UI elements
  removeElement("builder-ui");
  removeElement("builder-toolbar");
  removeElement("builder-debug");
  removeElement("movement-pad");
  
  // Remove placement preview
  if (placementPreview) {
    scene.remove(placementPreview);
    placementPreview = null;
  }
  
  // Reset all controls
  resetAllControls(keyState, buildControls);
  
  // Reset player state
  playerState = resetPlayerState();
  
  // Reset cursor style
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.style.cursor = "default";
  }
  
  // Show and position player
  if (player) {
    player.visible = true;
    player.position.set(0, 1, 0);
  }
  
  // Reset camera
  camera.position.copy(CAMERA_SETTINGS.DEFAULT_POSITION);
  camera.rotation.copy(CAMERA_SETTINGS.DEFAULT_ROTATION);
  
  console.log("Builder mode exited successfully, now in player mode");
  
  // Show notification
  showNotification("Player Mode Activated", 3000);
}

// Initialize the game
console.log("app.js loaded");
init();
