import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  PlayerState, 
  KeyState,
  BuildControls,
  TouchJoystick, 
  AnimationActions,
  BlockData,
  BuilderState,
  SavedCourse
} from "./utils/types.js";
import { 
  CAMERA_SETTINGS, 
  PLAYER_SETTINGS, 
  STORAGE_KEYS,
  BLOCK_TYPES,
  TEMPLATE_SIZES,
  BUILDER_SETTINGS
} from "./utils/config.js";
import { 
  isMobileDevice, 
  loadBuilderState, 
  removeElement, 
  saveBuilderState, 
  resetBuilderLocalStorage,
  saveSavedCourses,
  loadSavedCourses,
  clearBuilderState
} from "./utils/helpers.js";
import { 
  setupLighting, 
  createGround, 
  setupCourseTemplate, 
  clearEnvironment,
  getInitialCameraPosition
} from "./systems/environment.js";
import { 
  loadPlayerCharacter, 
  updatePlayer, 
  updateCamera, 
  updatePlayerAnimation, 
  resetPlayerState
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
  createBuilderDebugUI,
  createCrosshair,
  updateCrosshair,
  highlightBlockForRemoval,
  saveCurrentCourse,
  updateBlockCounter
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
  showNotification,
  showModal
} from "./components/Overlay.js";
import { 
  createMobileControls, 
  setupMobileTouchHandlers, 
  updateKeyStatesFromJoystick, 
  setupMobileBuilderControls 
} from "./components/MobileControls.js";
import { showMainMenu } from "./menu.js";

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
  rotateRight: false,
  sprint: false
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
  rotateRight: false,
  sprint: false
};

// Timer for periodically saving builder state
let saveStateTimer = 0;
const SAVE_STATE_INTERVAL = 10; // Save every 10 seconds

// Add a new variable to track whether the game was initialized in play-only mode
let playOnlyMode = false;

// Make them globally accessible for resetting by the modal
(window as any).__gameKeyState = keyState;
(window as any).__gameBuildControls = buildControls;

/**
 * Initialize the game
 */
function init() {
  console.log("Initializing Three.js scene...");
  
  // Clear any stale highlighted block reference
  window.__targetedBlockForRemoval = null;
  
  // Check URL parameters to determine initial mode
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode');
  const courseId = urlParams.get('courseId');
  const skipMenu = urlParams.get('skipMenu') === 'true';
  
  // Setup basic scene
  initBasicScene();
  
  // Decide what to show first
  if (initialMode === 'play' && courseId) {
    // Initialize in play-only mode
    playOnlyMode = true;
    localStorage.setItem(STORAGE_KEYS.LAST_MODE, 'player');
    console.log("Initializing in play-only mode with course ID:", courseId);
    initGameplay();
  } else if (initialMode === 'build' && skipMenu) {
    // Initialize in builder mode directly
    playOnlyMode = false;
    localStorage.setItem(STORAGE_KEYS.LAST_MODE, 'builder');
    const templateSize = urlParams.get('template') || localStorage.getItem(STORAGE_KEYS.BUILDER_TEMPLATE) || "medium";
    localStorage.setItem(STORAGE_KEYS.BUILDER_TEMPLATE, templateSize);
    console.log("Initializing in builder mode with template:", templateSize);
    enterBuilderMode(templateSize);
  } else {
    // Show the pixelated menu
    import('./menu.js').then(menuModule => {
      menuModule.showMainMenu(
        // Load course callback
        (course) => {
          console.log("Loading course:", course.name);
          document.getElementById("pixelated-menu")?.remove();
          enterBuilderMode(course.template, course);
        },
        // Create new course callback
        (template) => {
          console.log("Creating new course with template:", template);
          document.getElementById("pixelated-menu")?.remove();
          clearBuilderState(); // This was the missing function call
          localStorage.removeItem(STORAGE_KEYS.BUILDER_STATE);
          enterBuilderMode(template);
        }
      );
    });
  }
  
  // Start animation loop (always runs even with menu showing)
  animate();
  
}

/**
 * Initialize the basic scene and renderer
 */
function initBasicScene() {
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
    
    // Setup event listeners
    setupEventListeners(
      keyState,
      buildControls,
      builderMode,
      gameStarted,
      () => showOverlay(() => resetAllControls(keyState, buildControls), builderMode),
      () => resetAllControls(keyState, buildControls),
      toggleGameMode,
      handleResize,
      playOnlyMode
    );
  } else {
    console.error("No #game-container found!");
  }
  
  // Set up basic lighting
  setupLighting(scene);
}

/**
 * Initialize the gameplay elements
 */
function initGameplay() {
  // Load player character
  loadPlayerCharacter(scene, (p: THREE.Object3D, m: THREE.AnimationMixer, a: AnimationActions) => {
    player = p;
    mixer = m;
    actions = a;
    
    // Hide player in builder mode, show in player mode
    player.visible = localStorage.getItem(STORAGE_KEYS.LAST_MODE) !== 'builder';
  });
  
  // Set game started flag
  gameStarted = true;
  builderMode = false;
  
  // Show initial overlay with instructions
  showOverlay(() => resetAllControls(keyState, buildControls), builderMode);
  
  // Create mobile controls if on mobile
  if (isMobile) {
    const gameContainer = document.getElementById("game-container");
    if (gameContainer) {
      createMobileControls(gameContainer, keyState, touchJoystick);
      setupMobileTouchHandlers(gameContainer, keyState, touchJoystick, joystickPosition);
    }
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
    // Update builder camera based on controls
    updateBuilderCamera(camera, buildControls, deltaTime);
    
    // Update placement preview if in build mode
    if (placementPreview && currentBuilderTool === "build") {
      // Create a list of all objects that can be interacted with
      const allObjects: THREE.Mesh[] = [];
      
      // Add building blocks as potential targets
      allObjects.push(...buildingBlocks);
      
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
    
    // If in remove mode, highlight the block being targeted
    if (currentBuilderTool === "remove") {
      highlightBlockForRemoval(camera, buildingBlocks, BUILDER_SETTINGS.REMOVAL_RANGE);
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
    } else if (player.userData?.isPlaceholder) {
      // Animate placeholder character
      animatePlaceholderPlayer(player, playerState, keyState, deltaTime);
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
 * Animates the placeholder player with basic movements
 */
function animatePlaceholderPlayer(
  player: THREE.Object3D, 
  playerState: PlayerState,
  keyState: KeyState,
  deltaTime: number
): void {
  // Check if this is a placeholder player
  if (!player.userData?.isPlaceholder) return;
  
  const isMoving = keyState.forward || keyState.backward || keyState.left || keyState.right;
  const isJumping = playerState.jumping;
  
  // Get the parts of the player
  const arms = player.children.filter(child => 
    child.position.y === 0.75 && (child.position.x === -0.65 || child.position.x === 0.65));
  const legs = player.children.filter(child => 
    child.position.y === -0.25 && (child.position.x === -0.3 || child.position.x === 0.3));
  
  if (isMoving) {
    // Animate arms and legs while moving
    const speed = 5; // Animation speed
    const time = performance.now() * 0.001;
    
    arms.forEach((arm, index) => {
      // Swing arms in opposite directions
      arm.rotation.x = Math.sin(time * speed + (index * Math.PI)) * 0.5;
    });
    
    legs.forEach((leg, index) => {
      // Swing legs in opposite directions
      leg.rotation.x = Math.sin(time * speed + (index * Math.PI)) * 0.5;
    });
  } else {
    // Reset animation when idle
    [...arms, ...legs].forEach(limb => {
      // Smoothly return to neutral position
      limb.rotation.x = limb.rotation.x * 0.9;
    });
  }
  
  if (isJumping) {
    // Special jump animation
    arms.forEach(arm => {
      // Raise arms when jumping
      arm.rotation.x = -0.5;
    });
  }
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
function enterBuilderMode(templateSize: string = "medium", courseData?: SavedCourse): void {
  console.log("Entering builder mode with template:", templateSize, courseData ? `and course: ${courseData.name}` : "");
  builderMode = true;
  gameStarted = false;
  courseTemplate = courseData ? courseData.template : templateSize;

  // Immediately update the localStorage with the current mode
  localStorage.setItem(STORAGE_KEYS.LAST_MODE, 'builder');
  localStorage.setItem(STORAGE_KEYS.BUILDER_TEMPLATE, courseTemplate);

  // Hide player
  if (player) {
    player.visible = false;
  }

  // Reset all controls
  resetAllControls(keyState, buildControls);
  
  // Clear existing environment
  clearEnvironment(scene);
  
  // Clear out existing blocks
  buildingBlocks = [];
  platforms = [];
  
  // Find the template size
  let templateSizeValue = TEMPLATE_SIZES.MEDIUM;
  switch(courseTemplate) {
    case "small": templateSizeValue = TEMPLATE_SIZES.SMALL; break;
    case "large": templateSizeValue = TEMPLATE_SIZES.LARGE; break;
  }
  
  // Loading approach depends on whether we have a saved course or need to use local storage
  if (courseData) {
    console.log("STORAGE DEBUG - Loading course from provided data with", courseData.blocks.length, "blocks");
    
    // Create blocks from course data
    courseData.blocks.forEach((blockData, index) => {
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
        case "floor":
          geometry = new THREE.BoxGeometry(
            BLOCK_TYPES.FLOOR_PLATFORM.size.width, 
            BLOCK_TYPES.FLOOR_PLATFORM.size.height, 
            BLOCK_TYPES.FLOOR_PLATFORM.size.depth
          );
          material = new THREE.MeshStandardMaterial({ 
            color: BLOCK_TYPES.FLOOR_PLATFORM.color,
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
    
    // Set camera to view course
    const initialCameraSetup = getInitialCameraPosition(courseTemplate);
    camera.position.copy(initialCameraSetup.position);
    camera.rotation.copy(initialCameraSetup.rotation);
  } else {
    // Check for saved state in localStorage
    const savedState = loadBuilderState();
    
    if (savedState && savedState.blocks && savedState.blocks.length > 0) {
      console.log("STORAGE DEBUG - Loading previous builder state with", savedState.blocks.length, "blocks");
      
      // Recreate blocks from saved state (buildingBlocks already cleared above)
      savedState.blocks.forEach((blockData: BlockData, index: number) => {
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
          case "floor":
            geometry = new THREE.BoxGeometry(
              BLOCK_TYPES.FLOOR_PLATFORM.size.width, 
              BLOCK_TYPES.FLOOR_PLATFORM.size.height, 
              BLOCK_TYPES.FLOOR_PLATFORM.size.depth
            );
            material = new THREE.MeshStandardMaterial({ 
              color: BLOCK_TYPES.FLOOR_PLATFORM.color,
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
      
      // Add all building blocks to platforms for collision detection
      buildingBlocks.forEach(block => {
        if (!platforms.includes(block)) {
          platforms.push(block);
        }
      });
      
      // Set better initial camera position for viewing the template
      const initialCameraSetup = getInitialCameraPosition(templateSize);
      camera.position.copy(initialCameraSetup.position);
      camera.rotation.copy(initialCameraSetup.rotation);
    }
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
      // Update save button to show course name prompt
      () => {
        showModal("Save Course", `
          <div style="display: flex; flex-direction: column; gap: 15px; padding: 10px;">
            <label for="course-name" style="margin-bottom: 5px; display: block;">Course Name:</label>
            <input type="text" id="course-name" style="padding: 8px; font-size: 16px; border: 1px solid #444; background: #333; color: white;" 
                   placeholder="My Awesome Course" value="${courseData ? courseData.name : ''}"/>
          </div>
        `, 
        () => {
          const courseNameInput = document.getElementById("course-name") as HTMLInputElement;
          const courseName = courseNameInput?.value?.trim() || "";
          
          if (courseName) {
            saveCurrentCourse(courseName, buildingBlocks, courseTemplate);
          } else {
            showNotification("Please enter a course name", 3000);
            return false; // Prevent modal from closing
          }
          return true; // Allow modal to close
        });
      },
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
        // If switching away from remove tool, clear any highlighted blocks
        if (currentBuilderTool === "remove" && tool !== "remove") {
          // Reset all previously highlighted blocks
          buildingBlocks.forEach(block => {
            if (block.userData.originalMaterial) {
              block.material = block.userData.originalMaterial;
              delete block.userData.originalMaterial;
            }
            
            // Remove any outline effect
            const outline = block.children.find(child => child.userData?.type === 'outline');
            if (outline) {
              block.remove(outline);
            }
          });
          
          // Clear the targeted block reference
          window.__targetedBlockForRemoval = null;
        }
        
        currentBuilderTool = tool;
        updateToolbarSelection(currentBuilderTool);
        
        // Show/hide placement preview based on tool
        if (placementPreview) {
          placementPreview.visible = tool === "build";
        }
        
        // Update crosshair appearance based on tool
        updateCrosshair(tool);
        
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
    
    // Create crosshair for build/remove modes
    createCrosshair();
    updateCrosshair(currentBuilderTool);
    
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
          removeBlock(scene, buildingBlocks, platforms);
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
  
  // Initialize block counter
  if (container) {
    // Get the right template size
    const actualTemplate = courseData ? courseData.template : templateSize;
    import('./systems/builder.js').then(builderModule => {
      builderModule.updateBlockCounter(buildingBlocks, actualTemplate, container);
    });
  }
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
  
  // Clear any highlighted blocks from the remove tool
  buildingBlocks.forEach(block => {
    if (block.userData.originalMaterial) {
      block.material = block.userData.originalMaterial;
      delete block.userData.originalMaterial;
    }
    
    // Remove any outline effect and cancel animations
    const outline = block.children.find(child => child.userData?.type === 'outline');
    if (outline) {
      // Cancel any ongoing animation
      if (outline.userData && outline.userData.animationFrameId) {
        cancelAnimationFrame(outline.userData.animationFrameId);
      }
      block.remove(outline);
    }
  });
  
  // Clear the global targeted block reference
  window.__targetedBlockForRemoval = null;
  
  builderMode = false;
  gameStarted = true;
  
  // Immediately update the localStorage with the current mode
  localStorage.setItem(STORAGE_KEYS.LAST_MODE, 'player');
  
  // Remove builder UI elements
  removeElement("builder-ui");
  removeElement("builder-toolbar");
  removeElement("builder-debug");
  removeElement("movement-pad");
  removeElement("builder-crosshair");
  
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
  
  // Check if player exists and make it visible
  if (player) {
    player.visible = true;
    player.position.set(0, 1, 0);
  } else {
    // If no player exists yet, create a placeholder player
    console.log("No player found, creating placeholder character");
    import('./systems/player.js').then(playerModule => {
      player = playerModule.createPlaceholderPlayer(scene);
      mixer = null;
      actions = {
        idle: null,
        running: null,
        jumping: null
      };
    }).catch(error => {
      console.error("Failed to create placeholder player:", error);
    });
  }
  
  // Reset camera
  camera.position.copy(CAMERA_SETTINGS.DEFAULT_POSITION);
  camera.rotation.copy(CAMERA_SETTINGS.DEFAULT_ROTATION);
  
  console.log("Builder mode exited successfully, now in player mode");
  
  // Show notification
  showNotification("Player Mode Activated", 3000);
}

/**
 * Handle received course data
 */
function handleCourseData(courseData: any): void {
  console.log("Received course data:", courseData);
  
  // Clear any highlighted blocks
  window.__targetedBlockForRemoval = null;
  
  // Clear existing environment
  clearEnvironment(scene);
  
  // Create ground
  createGround(scene);
  
  // Clear existing blocks
  buildingBlocks = [];
  platforms = [];
  
  // Create blocks from course data
  if (courseData && courseData.blocks && Array.isArray(courseData.blocks)) {
    courseData.blocks.forEach((blockData: BlockData, index: number) => {
      console.log(`Loading course block ${index} of type: ${blockData.type}`);
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
        case "floor":
          geometry = new THREE.BoxGeometry(
            BLOCK_TYPES.FLOOR_PLATFORM.size.width, 
            BLOCK_TYPES.FLOOR_PLATFORM.size.height, 
            BLOCK_TYPES.FLOOR_PLATFORM.size.depth
          );
          material = new THREE.MeshStandardMaterial({ 
            color: BLOCK_TYPES.FLOOR_PLATFORM.color,
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
      platforms.push(block);
    });
    
    // If there's a start position, place player there
    if (courseData.startPosition) {
      if (player) {
        player.position.set(
          courseData.startPosition.x,
          courseData.startPosition.y,
          courseData.startPosition.z
        );
        player.visible = true;
      }
      
      // Update player state
      playerState.position.set(
        courseData.startPosition.x,
        courseData.startPosition.y,
        courseData.startPosition.z
      );
    }
    
    // Set game as started
    gameStarted = true;
    builderMode = false;
    
    // Show notification
    showNotification("Course loaded! Ready to play!", 3000);
  } else {
    console.error("Invalid course data received");
    showNotification("Error loading course", 3000);
  }
}

// Initialize the game
console.log("app.js loaded");
init();
