// Builder system to handle builder mode functionality
import * as THREE from "three";
import { BLOCK_TYPES, BUILDER_SETTINGS, BLOCK_LIMITS, STORAGE_KEYS } from "../utils/config.js";
import { createElement, removeElement, saveBuilderState, loadSavedCourses, saveSavedCourses, convertBuilderStateToSavedCourse } from "../utils/helpers.js";
import { BlockData, BuildControls, CourseData, SavedCourse } from "../utils/types.js";
import { showNotification } from "../components/Overlay.js";

// Declare global window property for targeted block
declare global {
  interface Window {
    __targetedBlockForRemoval: THREE.Mesh | null;
  }
}

// Initialize the global property
window.__targetedBlockForRemoval = null;

/**
 * Updates builder camera movement based on controls
 */
export function updateBuilderCamera(
  camera: THREE.Camera, 
  buildControls: BuildControls, 
  deltaTime: number
): void {
  // console.log("Updating builder camera, controls:", buildControls);

  // Get camera direction and right vector based on camera rotation
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  direction.y = 0; // Keep movement horizontal
  direction.normalize();
  
  const right = new THREE.Vector3(1, 0, 0);
  right.applyQuaternion(camera.quaternion);
  right.y = 0; // Keep movement horizontal
  right.normalize();
  
  // Use the configured builder camera speed with sprint multiplier if active
  let moveSpeed = BUILDER_SETTINGS.CAMERA_SPEED;
  if (buildControls.sprint) {
    moveSpeed *= BUILDER_SETTINGS.SPRINT_MULTIPLIER;
  }
  
  let moved = false;
  
  // Handle keyboard movement
  if (buildControls.forward) {
    camera.position.addScaledVector(direction, moveSpeed);
    // console.log("Moving forward:", camera.position);
    moved = true;
  }
  if (buildControls.backward) {
    camera.position.addScaledVector(direction, -moveSpeed);
    // console.log("Moving backward:", camera.position);
    moved = true;
  }
  if (buildControls.left) {
    camera.position.addScaledVector(right, -moveSpeed);
    // console.log("Moving left:", camera.position);
    moved = true;
  }
  if (buildControls.right) {
    camera.position.addScaledVector(right, moveSpeed);
    // console.log("Moving right:", camera.position);
    moved = true;
  }
  if (buildControls.up) {
    camera.position.y += moveSpeed;
    // console.log("Moving up:", camera.position);
    moved = true;
  }
  if (buildControls.down) {
    camera.position.y -= moveSpeed;
    // console.log("Moving down:", camera.position);
    moved = true;
  }
  
  // Handle keyboard rotation
  if (buildControls.rotateLeft) {
    camera.rotation.y += BUILDER_SETTINGS.ROTATION_SPEED;
    // console.log("Rotating left:", camera.rotation);
    moved = true;
  }
  if (buildControls.rotateRight) {
    camera.rotation.y -= BUILDER_SETTINGS.ROTATION_SPEED;
    // console.log("Rotating right:", camera.rotation);
    moved = true;
  }
  
  // Keep camera level (no roll)
  camera.rotation.z = 0;
  
  // We no longer reset the camera.rotation.x here to allow mouse pitch control
  
  // if (moved) {
  //   console.log("Camera moved. New position:", camera.position, "New rotation:", camera.rotation);
  // }
}

/**
 * Creates a preview of the block to be placed
 */
export function createPlacementPreview(
  scene: THREE.Scene, 
  selectedBlockType: string
): THREE.Mesh {
  let geometry, material;

  switch(selectedBlockType) {
    case "start":
      geometry = new THREE.BoxGeometry(
        BLOCK_TYPES.START.size.width, 
        BLOCK_TYPES.START.size.height, 
        BLOCK_TYPES.START.size.depth
      );
      material = new THREE.MeshStandardMaterial({ 
        color: BLOCK_TYPES.START.color,
        transparent: true,
        opacity: 0.5
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
        transparent: true,
        opacity: 0.5
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
        transparent: true,
        opacity: 0.5
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
        transparent: true,
        opacity: 0.5
      });
  }

  const preview = new THREE.Mesh(geometry, material);
  preview.position.set(0, 0, -BUILDER_SETTINGS.PLACEMENT_PREVIEW_DISTANCE);
  preview.visible = false;
  preview.userData = { type: "preview", blockType: selectedBlockType };
  
  scene.add(preview);
  
  return preview;
}

/**
 * Updates the position of the placement preview based on camera position and direction
 */
export function updatePlacementPreview(
  camera: THREE.Camera,
  placementPreview: THREE.Mesh | null,
  intersectables: THREE.Mesh[]
): void {
  if (!placementPreview) return;
  
  // Get camera forward direction
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  
  // Cast ray from camera
  const raycaster = new THREE.Raycaster();
  raycaster.set(camera.position, direction);
  
  const intersects = raycaster.intersectObjects(intersectables);
  
  if (intersects.length > 0 && intersects[0].distance < BUILDER_SETTINGS.PLACEMENT_PREVIEW_DISTANCE) {
    // Position block at the intersection point, slightly offset in normal direction
    const intersectPoint = intersects[0].point;
    const normal = intersects[0].face?.normal || new THREE.Vector3(0, 1, 0);
    
    // Offset along the normal to place on top of surfaces
    const offset = BUILDER_SETTINGS.PLACEMENT_OFFSET; // Now configurable
    
    placementPreview.position.copy(intersectPoint).add(normal.multiplyScalar(offset));
    
    // Snap to grid with configurable size
    if (BUILDER_SETTINGS.PLACEMENT_GRID_SNAP) {
      const snapSize = BUILDER_SETTINGS.PLACEMENT_SNAP_SIZE;
      placementPreview.position.x = Math.round(placementPreview.position.x / snapSize) * snapSize;
      placementPreview.position.y = Math.round(placementPreview.position.y / snapSize) * snapSize;
      placementPreview.position.z = Math.round(placementPreview.position.z / snapSize) * snapSize;
    }
    
    // Update or create position indicator
    updatePositionIndicator(placementPreview);
    
    // Make preview visible
    placementPreview.visible = true;
  } else {
    // If no intersection, position preview far in front
    placementPreview.position.copy(camera.position).add(direction.multiplyScalar(10));
    
    if (BUILDER_SETTINGS.PLACEMENT_GRID_SNAP) {
      const snapSize = BUILDER_SETTINGS.PLACEMENT_SNAP_SIZE;
      placementPreview.position.x = Math.round(placementPreview.position.x / snapSize) * snapSize;
      placementPreview.position.y = Math.round(placementPreview.position.y / snapSize) * snapSize;
      placementPreview.position.z = Math.round(placementPreview.position.z / snapSize) * snapSize;
    }
    
    // Update position indicator
    updatePositionIndicator(placementPreview);
  }
}

/**
 * Creates or updates a position indicator text above the preview block
 */
function updatePositionIndicator(placementPreview: THREE.Mesh): void {
  // Remove existing indicator if present
  let posIndicator = placementPreview.children.find(
    child => child.userData?.type === 'positionIndicator'
  );
  
  if (posIndicator) {
    placementPreview.remove(posIndicator);
  }
  
  // Format coordinates to whole numbers for display
  const coords = {
    x: Math.round(placementPreview.position.x),
    y: Math.round(placementPreview.position.y),
    z: Math.round(placementPreview.position.z)
  };
  
  // Create text with coordinates
  const canvas = document.createElement('canvas');
  canvas.width = 350; // Wider canvas
  canvas.height = 128;
  
  const context = canvas.getContext('2d');
  if (!context) return;
  
  context.fillStyle = 'rgba(0, 0, 0, 0.7)'; // More opaque background
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add border
  context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  context.lineWidth = 2;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  
  context.font = 'bold 40px Arial'; // Larger text
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Draw text with coordinate values
  context.fillStyle = 'white';
  context.fillText(`X: ${coords.x}  Y: ${coords.y}  Z: ${coords.z}`, canvas.width/2, canvas.height/2);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  
  // Position the sprite above the block
  const height = (placementPreview.geometry as THREE.BoxGeometry).parameters.height || 1;
  sprite.position.set(0, height + 0.7, 0);
  sprite.scale.set(3, 1.5, 1); // Larger sprite
  
  // Mark as position indicator
  sprite.userData = { type: 'positionIndicator' };
  
  // Add to placement preview
  placementPreview.add(sprite);
}

/**
 * Place a building block at the preview position
 */
export function placeBlock(
  scene: THREE.Scene,
  placementPreview: THREE.Mesh | null,
  selectedBlockType: string,
  buildingBlocks: THREE.Mesh[],
  platforms: THREE.Mesh[]
): void {
  if (!placementPreview) return;
  
  // Get the game container for notifications
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Check block limits
  let blockLimit;
  const courseTemplate = localStorage.getItem(STORAGE_KEYS.BUILDER_TEMPLATE) || "medium";
  
  switch(courseTemplate.toLowerCase()) {
    case "small": blockLimit = BLOCK_LIMITS.SMALL; break;
    case "large": blockLimit = BLOCK_LIMITS.LARGE; break;
    case "medium":
    default: blockLimit = BLOCK_LIMITS.MEDIUM;
  }
  
  // Check if we've reached the block limit
  if (buildingBlocks.length >= blockLimit) {
    import('../components/Overlay.js').then(overlayModule => {
      overlayModule.showNotification(`Block limit reached (${blockLimit})!`, 3000);
    });
    return;
  }
  
  // Check for start/finish block limits
  const startBlocks = buildingBlocks.filter(b => b.userData?.type === 'start').length;
  const finishBlocks = buildingBlocks.filter(b => b.userData?.type === 'finish').length;
  
  if (selectedBlockType === 'start' && startBlocks >= 1) {
    import('../components/Overlay.js').then(overlayModule => {
      overlayModule.showNotification("Only one Start block allowed!", 3000);
    });
    return;
  }
  
  if (selectedBlockType === 'finish' && finishBlocks >= 1) {
    import('../components/Overlay.js').then(overlayModule => {
      overlayModule.showNotification("Only one Finish block allowed!", 3000);
    });
    return;
  }
  
  // Check if there's already a block at this position (within a small distance)
  const position = placementPreview.position.clone();
  const existingBlockIndex = buildingBlocks.findIndex(block => 
    block.position.distanceTo(position) < 0.1
  );
  
  if (existingBlockIndex !== -1) {
    console.log("BLOCK DEBUG - Block already exists at this position, not placing another one");
    return;
  }
  
  let geometry, material;
  
  switch(selectedBlockType) {
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
  block.position.copy(placementPreview.position);
  block.userData = { type: selectedBlockType };
  block.castShadow = true;
  block.receiveShadow = true;
  
  // Add direction arrow to start block
  if (selectedBlockType === "start") {
    // Create arrow geometry
    const arrowGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // Position the arrow on top of the block pointing in the positive Z direction
    const blockHeight = (block.geometry as THREE.BoxGeometry).parameters.height;
    arrow.position.set(0, blockHeight/2 + 0.5, 0);
    arrow.rotation.x = -Math.PI / 2; // Point along Z-axis
    
    // Add metadata to identify it
    arrow.userData = { type: 'directionArrow' };
    
    // Add to block
    block.add(arrow);
  }
  
  scene.add(block);
  buildingBlocks.push(block);
  
  // Only add to platforms if it's not already there
  // (buildingBlocks is for the builder UI, platforms is for collision detection)
  if (!platforms.includes(block)) {
    platforms.push(block);
  }
  
  // After successfully placing the block, update the block counter
  updateBlockCounter(buildingBlocks, courseTemplate, container);
}

/**
 * Highlights the block that is currently targeted for removal
 */
export function highlightBlockForRemoval(
  camera: THREE.Camera,
  blocks: THREE.Mesh[],
  maxDistance: number
): THREE.Mesh | null {
  // Reset all previously highlighted blocks
  blocks.forEach(block => {
    if (block.userData.originalMaterial) {
      block.material = block.userData.originalMaterial;
      delete block.userData.originalMaterial;
    }
    
    // Remove any outline effect and cancel animation
    const outline = block.children.find(child => child.userData?.type === 'outline');
    if (outline) {
      // Cancel any ongoing animation
      if (outline.userData && outline.userData.animationFrameId) {
        cancelAnimationFrame(outline.userData.animationFrameId);
      }
      block.remove(outline);
    }
  });
  
  // Get camera forward direction
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  
  // Cast ray from camera
  const raycaster = new THREE.Raycaster();
  raycaster.set(camera.position, direction);
  
  const intersects = raycaster.intersectObjects(blocks);
  
  if (intersects.length > 0 && intersects[0].distance < maxDistance) {
    const selectedBlock = intersects[0].object as THREE.Mesh;
    
    // Store original material if not already stored
    if (!selectedBlock.userData.originalMaterial) {
      selectedBlock.userData.originalMaterial = selectedBlock.material;
      
      // Create highlight material - much brighter and more visible
      const highlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
      });
      
      // Apply highlight material
      selectedBlock.material = highlightMaterial;
      
      // Add a pulsing outline effect to make it more visible
      createBlockOutline(selectedBlock);
    }
    
    // Store the block reference for removal
    window.__targetedBlockForRemoval = selectedBlock;
    
    return selectedBlock;
  }
  
  // No block targeted
  window.__targetedBlockForRemoval = null;
  return null;
}

/**
 * Creates a visible outline effect around a block
 */
function createBlockOutline(block: THREE.Mesh): void {
  // Get the geometry parameters
  const geometry = block.geometry as THREE.BoxGeometry;
  const width = geometry.parameters.width;
  const height = geometry.parameters.height;
  const depth = geometry.parameters.depth;
  
  // Create slightly larger box for outline
  const outlineGeometry = new THREE.BoxGeometry(
    width + 0.05, 
    height + 0.05, 
    depth + 0.05
  );
  
  // Create outline material
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.8
  });
  
  // Create outline mesh
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.userData = { type: 'outline' };
  
  // Add to block
  block.add(outline);
  
  // Create and store the animation function on the outline object
  const startTime = Date.now();
  
  // Define the animation function
  function pulseOutline() {
    if (!block.parent) {
      // Block has been removed, stop animation
      return;
    }
    
    // Calculate scale based on time
    const elapsedTime = (Date.now() - startTime) / 1000;
    const scale = 1 + 0.1 * Math.sin(elapsedTime * 5);
    
    // Apply scale to outline
    outline.scale.set(scale, scale, scale);
    
    // Use outline's userData to store the animation frame ID for later cancellation
    outline.userData.animationFrameId = requestAnimationFrame(pulseOutline);
  }
  
  // Start the animation
  pulseOutline();
}

/**
 * Remove the currently highlighted block
 */
export function removeBlock(
  scene: THREE.Scene,
  buildingBlocks: THREE.Mesh[],
  platforms: THREE.Mesh[]
): void {
  // Only allow block removal in builder mode
  const isBuilderMode = localStorage.getItem('lastMode') === 'builder';
  if (!isBuilderMode) {
    console.log("Cannot remove blocks when not in builder mode");
    return;
  }
  
  console.log("BLOCK DEBUG - Remove - Building blocks before:", buildingBlocks.length);
  console.log("BLOCK DEBUG - Remove - Platforms before:", platforms.length);
  
  // Get the currently highlighted block from the global reference
  const blockToRemove = window.__targetedBlockForRemoval as THREE.Mesh | null;
  
  if (!blockToRemove) {
    console.log("No block targeted for removal");
    return;
  }
  
  // Find the block in our arrays
  const blockIndex = buildingBlocks.indexOf(blockToRemove);
  
  if (blockIndex !== -1) {
    // Cancel any animations before removing
    const outline = blockToRemove.children.find(child => child.userData?.type === 'outline');
    if (outline && outline.userData && outline.userData.animationFrameId) {
      cancelAnimationFrame(outline.userData.animationFrameId);
    }
    
    // Remove from scene
    scene.remove(blockToRemove);
    
    // Remove from building blocks array
    buildingBlocks.splice(blockIndex, 1);
    
    // Also remove from platforms array if it exists there
    const platformIndex = platforms.indexOf(blockToRemove);
    if (platformIndex !== -1) {
      platforms.splice(platformIndex, 1);
    }
    
    // Update the block counter
    const container = document.getElementById("game-container");
    if (container) {
      const courseTemplate = localStorage.getItem(STORAGE_KEYS.BUILDER_TEMPLATE) || "medium";
      updateBlockCounter(buildingBlocks, courseTemplate, container);
    }
    
    // Clear the targeted block reference
    window.__targetedBlockForRemoval = null;
  } else {
    console.log("Block to remove not found in building blocks array");
  }
}

/**
 * Save course data to send to parent
 */
export function saveCourse(
  buildingBlocks: THREE.Mesh[],
  courseTemplate: string
): void {
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
  
}

/**
 * Creates the builder UI elements
 */
export function createBuilderUI(
  selectedBlockType: string, 
  buildingBlocks: THREE.Mesh[],
  exitBuilderModeFn: () => void,
  saveFn: () => void,
  onBlockTypeChange: (type: string) => void
): void {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Remove existing UI elements if any
  removeElement("builder-ui");
  
  // Create UI container
  const builderUI = createElement("div", 
    { id: "builder-ui" },
    {
      position: "absolute",
      top: "80px",
      left: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "15px",
      borderRadius: "8px",
      zIndex: "100",
      maxWidth: "300px"
    }
  );
  
  // Title
  const title = createElement("h2", 
    {},
    {
      margin: "0 0 10px 0",
      textAlign: "center",
      fontFamily: "'Press Start 2P'",
    },
    "Course Builder"
  );
  builderUI.appendChild(title);
  
  // Block type selection section
  const blockTypeLabel = createElement("div", 
    {},
    { fontWeight: "bold", marginBottom: "5px" },
    "Block Type:"
  );
  builderUI.appendChild(blockTypeLabel);
  
  // Add search bar
  const searchContainer = createElement("div",
    {},
    {
      marginBottom: "10px",
      display: "flex",
      width: "100%"
    }
  );
  
  const searchInput = createElement("input",
    { type: "text", placeholder: "Search blocks...", id: "block-search" },
    {
      padding: "5px",
      width: "100%",
      backgroundColor: "#333",
      color: "white",
      border: "1px solid #555",
      borderRadius: "4px"
    }
  ) as HTMLInputElement;
  
  // Prevent propagation on input field interactions to fix focus issues
  searchInput.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  searchInput.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  searchInput.addEventListener("focus", (e) => {
    e.stopPropagation();
  });

  // Also prevent propagation on keydown/keyup to avoid interference with game controls
  searchInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
  });

  searchInput.addEventListener("keyup", (e) => {
    e.stopPropagation();
  });

  searchContainer.appendChild(searchInput);
  builderUI.appendChild(searchContainer);
  
  // Create scrollable block type container
  const blockTypeScrollContainer = createElement("div",
    { id: "block-type-container" },
    {
      maxHeight: "200px",
      overflowY: "auto",
      overflowX: "hidden",
      marginBottom: "15px",
      padding: "5px",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      borderRadius: "4px",
      border: "1px solid #555"
    }
  );
  
  // Define all available block types
  const blockTypes = [
    { id: "platform", name: "Platform", color: "#cccccc" },
    { id: "floor", name: "Floor", color: "#dddddd" },
    { id: "start", name: "Start", color: "#00ff00" },
    { id: "finish", name: "Finish", color: "#0000ff" }
    // Add more block types here as needed
  ];
  
  // Create button factory
  const createBlockButton = (text: string, type: string, color: string) => {
    const button = createElement("div", 
      { class: "block-button", 'data-block-type': type },
      {
        padding: "8px",
        backgroundColor: type === selectedBlockType ? "#4CAF50" : "#222",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        color: type === selectedBlockType ? "white" : "#eee",
        marginBottom: "5px",
        display: "flex",
        alignItems: "center"
      }
    );
    
    const colorIndicator = createElement("div", 
      {},
      {
        width: "15px",
        height: "15px",
        backgroundColor: color,
        display: "inline-block",
        marginRight: "10px",
        borderRadius: "3px"
      }
    );
    
    button.appendChild(colorIndicator);
    button.appendChild(document.createTextNode(text));
    
    button.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent click from bubbling
      
      // Don't allow selecting disabled buttons
      if (button.hasAttribute('disabled')) {
        return;
      }
      
      onBlockTypeChange(type);
      
      // Update button styles
      Array.from(blockTypeScrollContainer.children).forEach(child => {
        (child as HTMLElement).style.backgroundColor = "#222";
        (child as HTMLElement).style.color = "#eee";
      });
      button.style.backgroundColor = "#4CAF50";
      button.style.color = "white";
    });
    
    return button;
  };
  
  // Add all block type buttons to scroll container
  blockTypes.forEach(blockType => {
    blockTypeScrollContainer.appendChild(
      createBlockButton(blockType.name, blockType.id, blockType.color)
    );
  });
  
  builderUI.appendChild(blockTypeScrollContainer);
  
  // Add search functionality
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    Array.from(blockTypeScrollContainer.children).forEach(child => {
      const button = child as HTMLElement;
      const blockType = button.getAttribute('data-block-type');
      const blockName = blockTypes.find(b => b.id === blockType)?.name.toLowerCase() || "";
      
      if (blockName.includes(searchTerm) || !searchTerm) {
        button.style.display = "flex";
      } else {
        button.style.display = "none";
      }
    });
  });
  
  // Create button group for all action buttons
  const buttonGroup = createElement("div",
    { class: "button-group" },
    {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginBottom: "10px"
    }
  );
  
  // Add placement options
  const placementOptionsContainer = createElement("div",
    { class: "placement-options" },
    {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: "10px 13px",
      borderRadius: "4px",
      marginBottom: "10px"
    }
  );
  
  const placementHeader = createElement("div",
    {},
    { fontWeight: "bold", marginBottom: "5px" },
    "Placement Options:"
  );
  placementOptionsContainer.appendChild(placementHeader);
  
  // Grid snap toggle
  const gridSnapContainer = createElement("div",
    {},
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "5px"
    }
  );
  
  const gridSnapLabel = createElement("label",
    { for: "grid-snap-toggle" },
    {},
    "Grid Snap:"
  );
  
  const gridSnapToggle = createElement("input",
    { 
      type: "checkbox",
      id: "grid-snap-toggle",
      checked: BUILDER_SETTINGS.PLACEMENT_GRID_SNAP ? "checked" : ""
    }
  );
  
  gridSnapToggle.addEventListener("change", (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    BUILDER_SETTINGS.PLACEMENT_GRID_SNAP = isChecked;
    
    // Save in local storage
    localStorage.setItem('gridSnap', isChecked ? 'true' : 'false');
  });
  
  gridSnapContainer.appendChild(gridSnapLabel);
  gridSnapContainer.appendChild(gridSnapToggle);
  placementOptionsContainer.appendChild(gridSnapContainer);
  
  // Grid size selector - FIX FOR DROPDOWN CLOSING TOO FAST
  const gridSizeContainer = createElement("div",
    {},
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "5px"
    }
  );
  
  const gridSizeLabel = createElement("label",
    { for: "grid-size-select" },
    {},
    "Grid Size:"
  );
  
  const gridSizeSelect = createElement("select",
    { id: "grid-size-select" },
    { width: "80px" }
  ) as HTMLSelectElement;
  
  // Stop propagation on all select interactions to fix dropdown closing issue
  gridSizeSelect.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  
  gridSizeSelect.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  gridSizeSelect.addEventListener("focus", (e) => {
    e.stopPropagation();
  });
  
  [0.25, 0.5, 1, 2].forEach(size => {
    const option = createElement("option", 
      { value: size.toString() },
      {},
      size.toString()
    ) as HTMLOptionElement;
    
    if (size === BUILDER_SETTINGS.PLACEMENT_SNAP_SIZE) {
      option.selected = true;
    }
    gridSizeSelect.appendChild(option);
  });
  
  gridSizeSelect.addEventListener("change", (e) => {
    e.stopPropagation(); // Stop propagation to prevent issues
    const value = parseFloat((e.target as HTMLSelectElement).value);
    BUILDER_SETTINGS.PLACEMENT_SNAP_SIZE = value;
    
    // Save in local storage
    localStorage.setItem('gridSize', value.toString());
  });
  
  gridSizeContainer.appendChild(gridSizeLabel);
  gridSizeContainer.appendChild(gridSizeSelect);
  placementOptionsContainer.appendChild(gridSizeContainer);
  
  // Load options from localStorage if available
  const savedGridSnap = localStorage.getItem('gridSnap');
  if (savedGridSnap !== null) {
    const isChecked = savedGridSnap === 'true';
    BUILDER_SETTINGS.PLACEMENT_GRID_SNAP = isChecked;
    gridSnapToggle.checked = isChecked;
  }
  
  const savedGridSize = localStorage.getItem('gridSize');
  if (savedGridSize !== null) {
    const value = parseFloat(savedGridSize);
    if (!isNaN(value)) {
      BUILDER_SETTINGS.PLACEMENT_SNAP_SIZE = value;
      for (let i = 0; i < gridSizeSelect.options.length; i++) {
        if (parseFloat(gridSizeSelect.options[i].value) === value) {
          gridSizeSelect.options[i].selected = true;
          break;
        }
      }
    }
  }
  
  builderUI.appendChild(placementOptionsContainer);
  
  // Save course button
  const saveButton = createElement("button", 
    { class: "save-button" },
    {
      padding: "10px",
      backgroundColor: "#2196F3",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer"
    },
    "Save Course"
  );
  saveButton.addEventListener("click", () => {
    import('../components/Overlay.js').then(overlayModule => {
      // Show the modal with pixelated form styling but cleaner background
      overlayModule.showModal("Save Course", `
        <div style="display: flex; flex-direction: column; gap: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.5); border-radius: 8px; border: 2px solid #4CAF50;">
          <label for="course-name" style="margin-bottom: 5px; display: block; color: white; text-shadow: 2px 2px 0 #000;">Course Name:</label>
          <input type="text" id="course-name" style="padding: 12px; font-size: 16px; border: 2px solid #4CAF50; background: #333; color: white; border-radius: 4px; font-family: 'Press Start 2P', monospace;" 
                placeholder="My Awesome Course"/>
          <div style="display: flex; justify-content: space-between; margin-top: 15px;">
            <button id="save-course-btn" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: 'Press Start 2P', monospace; box-shadow: 3px 3px 0 #333; transition: transform 0.1s;">Save Course</button>
            <button id="close-modal-btn" style="padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: 'Press Start 2P', monospace; box-shadow: 3px 3px 0 #333; transition: transform 0.1s;">Close</button>
          </div>
          <p style="color: #aaa; font-size: 10px; margin-top: 10px; text-align: center;">Press ESC to cancel</p>
        </div>
      `, false, false);
      
      // Add event listeners for the save button and input field with hover effects
      setTimeout(() => {
        const input = document.getElementById("course-name") as HTMLInputElement;
        const saveBtn = document.getElementById("save-course-btn");
        const closeBtn = document.getElementById("close-modal-btn");
        
        if (input) {
          // Make sure the input is focused
          input.focus();
          
          // Submit on Enter key
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              
              const courseName = input.value.trim();
              if (courseName) {
                saveCurrentCourse(courseName, buildingBlocks, selectedBlockType);
                // Modal will be closed by the saveCurrentCourse function
              } else {
                overlayModule.showNotification("Please enter a course name", 3000);
              }
            }
          });
        }
        
        if (saveBtn) {
          // Add hover effects
          saveBtn.addEventListener("mouseover", () => {
            (saveBtn as HTMLElement).style.transform = "scale(1.05)";
          });
          
          saveBtn.addEventListener("mouseout", () => {
            (saveBtn as HTMLElement).style.transform = "scale(1)";
          });
          
          saveBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            
            const courseNameInput = document.getElementById("course-name") as HTMLInputElement;
            const courseName = courseNameInput?.value?.trim() || "";
            
            if (courseName) {
              saveCurrentCourse(courseName, buildingBlocks, selectedBlockType);
              // Modal will be closed by the saveCurrentCourse function
            } else {
              overlayModule.showNotification("Please enter a course name", 3000);
              
              // Re-focus the input
              setTimeout(() => {
                courseNameInput?.focus();
              }, 100);
            }
          });
        }
        
        if (closeBtn) {
          // Add hover effects
          closeBtn.addEventListener("mouseover", () => {
            (closeBtn as HTMLElement).style.transform = "scale(1.05)";
          });
          
          closeBtn.addEventListener("mouseout", () => {
            (closeBtn as HTMLElement).style.transform = "scale(1)";
          });
          
          closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            
            // Close the modal using the global function
            if ((window as any).__closeCurrentModal) {
              (window as any).__closeCurrentModal();
            } else if (overlayModule.closeModal) {
              // Use the exported function if available
              overlayModule.closeModal();
            } else {
              // Fallback
              const modalOverlay = document.getElementById("modal-overlay");
              if (modalOverlay) {
                modalOverlay.remove();
              }
            }
            
            // Ensure focus is restored to the game container
            const gameContainer = document.getElementById("game-container");
            if (gameContainer) {
              gameContainer.focus();
            }
          });
        }
      }, 100);
    });
  });
  buttonGroup.appendChild(saveButton);
  
  // Exit builder button
  const exitButton = createElement("button", 
    {},
    {
      padding: "8px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer"
    },
    "Enter Player Mode (B)"
  );
  exitButton.addEventListener("click", exitBuilderModeFn);
  buttonGroup.appendChild(exitButton);

  
  builderUI.appendChild(buttonGroup);
  
  // Instructions
  const instructions = createElement("div", 
    { class: "control-instructions" },
    {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: "10px",
      borderRadius: "4px",
      maxWidth: "220px"
    },
    `
    <h3 style="margin: 0 0 5px 0">Builder Controls:</h3>
    <p style="margin: 2px 0">WASD - Move horizontally</p>
    <p style="margin: 2px 0">Q/E - Move up/down</p>
    <p style="margin: 2px 0">Arrow Left/Right - Rotate camera</p>
    <p style="margin: 2px 0">Right-click + drag - Look around</p>
    <p style="margin: 2px 0">Left Click - Place block</p>
    <p style="margin: 2px 0">Shift - Sprint (move faster)</p>
    <p style="margin: 2px 0">Use toolbar for tools</p>
    <p style="margin: 2px 0; color:rgb(224, 174, 47)">Bress B to toggle between player and build mode!</p>
    <p style="margin: 2px 0; color: #ffeb3b">Need start and finish blocks!</p>
    
    `
  );
  builderUI.appendChild(instructions);
  
  // Block counter - Create it once and populate
  const courseTemplate = localStorage.getItem(STORAGE_KEYS.BUILDER_TEMPLATE) || "medium";
  updateBlockCounter(buildingBlocks, courseTemplate, container);
  
  // Add UI to game container
  container.appendChild(builderUI);
}

/**
 * Creates a toolbar for builder mode
 */
export function createBuilderToolbar(
  currentBuilderTool: string,
  onToolChange: (tool: string) => void
): void {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Remove existing toolbar if any
  removeElement("builder-toolbar");
  
  // Create toolbar container
  const toolbar = createElement("div", 
    { id: "builder-toolbar" },
    {
      position: "absolute",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: "10px",
      borderRadius: "10px",
      zIndex: "1000"
    }
  );
  
  // Create tool buttons
  const tools = [
    { id: "build", icon: "🧱", label: "Build" },
    { id: "remove", icon: "🗑️", label: "Remove" },
    { id: "rotate", icon: "🔄", label: "Rotate" },
    { id: "camera", icon: "🎥", label: "Camera" }
  ];
  
  tools.forEach(tool => {
    const button = createElement("button", 
      { id: `tool-${tool.id}` },
      {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: currentBuilderTool === tool.id ? "#4CAF50" : "#333",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "10px 15px",
        cursor: "pointer",
        width: "80px",
        height: "80px"
      },
      `<div style="font-size: 24px">${tool.icon}</div><div>${tool.label}</div>`
    );
    
    button.addEventListener("click", (event) => {
      // Prevent the event from bubbling up to the container's click handler
      event.stopPropagation();
      
      // Prevent accidental block placement by temporarily disabling the click handler
      const containerElement = document.getElementById("game-container");
      if (containerElement) {
        // Add a class to the container to mark it as recently clicked
        containerElement.classList.add("recent-tool-click");
        
        // Remove the class after a short delay
        setTimeout(() => {
          containerElement.classList.remove("recent-tool-click");
        }, 250);
      }
      
      // Call the tool change callback
      onToolChange(tool.id);
    });
    
    toolbar.appendChild(button);
  });
  
  // Add toolbar to container
  container.appendChild(toolbar);
}

/**
 * Update toolbar button selection
 */
export function updateToolbarSelection(
  currentBuilderTool: string
): void {
  const tools = ["build", "remove", "rotate", "camera"];
  
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
      case "rotate":
        container.style.cursor = "move";
        break;
      case "camera":
        container.style.cursor = "move";
        break;
      default:
        container.style.cursor = "default";
    }
  }
}

/**
 * Create a crosshair in the center of the screen for build mode
 */
export function createCrosshair(): void {
  // Remove existing crosshair if any
  removeElement("builder-crosshair");
  
  const container = document.getElementById("game-container");
  if (!container) return;
  
  const crosshair = createElement("div", 
    { id: "builder-crosshair" },
    {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "20px",
      height: "20px",
      pointerEvents: "none",
      zIndex: "1000"
    }
  );
  
  // Create the crosshair lines
  const horizontalLine = createElement("div", 
    {},
    {
      position: "absolute",
      top: "50%",
      left: "0",
      width: "100%",
      height: "2px",
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      transform: "translateY(-50%)"
    }
  );
  
  const verticalLine = createElement("div", 
    {},
    {
      position: "absolute",
      top: "0",
      left: "50%",
      width: "2px",
      height: "100%",
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      transform: "translateX(-50%)"
    }
  );
  
  const centerDot = createElement("div", 
    {},
    {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: "4px",
      height: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderRadius: "50%",
      transform: "translate(-50%, -50%)"
    }
  );
  
  crosshair.appendChild(horizontalLine);
  crosshair.appendChild(verticalLine);
  crosshair.appendChild(centerDot);
  
  container.appendChild(crosshair);
}

/**
 * Updates the crosshair based on the selected tool
 */
export function updateCrosshair(tool: string): void {
  const crosshair = document.getElementById("builder-crosshair");
  if (!crosshair) return;
  
  // Update crosshair appearance based on tool
  switch (tool) {
    case "build":
      crosshair.style.display = "block";
      Array.from(crosshair.children).forEach(child => {
        (child as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.8)";
      });
      break;
    case "remove":
      crosshair.style.display = "block";
      Array.from(crosshair.children).forEach(child => {
        (child as HTMLElement).style.backgroundColor = "rgba(255, 0, 0, 0.8)";
      });
      break;
    case "camera":
      crosshair.style.display = "none";
      break;
  }
}

/**
 * Save the current course with a name
 */
export function saveCurrentCourse(
  courseName: string, 
  buildingBlocks: THREE.Mesh[], 
  courseTemplate: string
): void {
  const courseData = convertBuilderStateToSavedCourse(courseName, buildingBlocks, courseTemplate);
  
  if (!courseData) {
    showNotification("Course must have start and finish blocks", 3000);
    return;
  }
  
  const savedCourses = loadSavedCourses();
  const existingIndex = savedCourses.findIndex(course => course.name === courseName);
  
  if (existingIndex !== -1) {
    savedCourses[existingIndex] = courseData; // Overwrite if name exists
  } else {
    savedCourses.push(courseData); // Add new course
  }
  
  saveSavedCourses(savedCourses);
  
  // Show notification
  showNotification(`Course "${courseName}" saved successfully!`, 3000);
  
  // Close the modal after saving successfully
  // Use the global closeModal function if available
  if ((window as any).__closeCurrentModal) {
    (window as any).__closeCurrentModal();
  } else {
    // Fallback to removing the modal directly
    removeElement("modal-overlay");
  }
}

/**
 * Updates the block counter UI
 */
function updateBlockCounter(
  buildingBlocks: THREE.Mesh[],
  courseTemplate: string,
  container: HTMLElement
): void {
  // Find or create the counter container
  let counterContainer = document.getElementById("block-counter");
  if (!counterContainer) {
    counterContainer = createElement("div", 
      { id: "block-counter" },
      {
        position: "fixed",
        top: "10px",
        right: "10px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: "10px",
        borderRadius: "5px",
        color: "white",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "12px",
        zIndex: "9999",
        border: "2px solid #4CAF50",
        pointerEvents: "none",
        minWidth: "200px",
        whiteSpace: "nowrap"
      }
    );
    
    // Append to body instead of the game container to prevent accidental removal
    document.body.appendChild(counterContainer);
  }
  
  // Get block counts
  const totalBlocks = buildingBlocks.length;
  const startBlocks = buildingBlocks.filter(b => b.userData?.type === 'start').length;
  const finishBlocks = buildingBlocks.filter(b => b.userData?.type === 'finish').length;
  
  // Get maximum limit based on template size
  let blockLimit;
  switch(courseTemplate.toLowerCase()) {
    case "small": blockLimit = BLOCK_LIMITS.SMALL; break;
    case "large": blockLimit = BLOCK_LIMITS.LARGE; break;
    case "medium":
    default: blockLimit = BLOCK_LIMITS.MEDIUM;
  }
  
  // Calculate percentage of limit used
  const percentUsed = Math.min(100, Math.round((totalBlocks / blockLimit) * 100));
  
  // Determine progress bar color based on usage
  let progressColor = "#4CAF50"; // Green
  if (percentUsed > 90) progressColor = "#ff0000"; // Red
  else if (percentUsed > 75) progressColor = "#ff9900"; // Orange
  else if (percentUsed > 50) progressColor = "#ffff00"; // Yellow
  
  // Create the HTML with improved layout - using 60% for labels to accommodate larger numbers
  counterContainer.innerHTML = `
    <div style="margin-bottom: 8px; text-align: center; font-weight: bold;">Block Counter</div>
    <div style="margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
      <span style="display: inline-block; width: 60%;">Total Blocks:</span>
      <span style="font-weight: bold; color: ${percentUsed > 90 ? '#ff0000' : 'white'}; text-align: right;">
        ${totalBlocks}/${blockLimit}
      </span>
    </div>
    <div style="margin-bottom: 8px; height: 10px; background-color: #333; border-radius: 5px; overflow: hidden;">
      <div style="height: 100%; width: ${percentUsed}%; background-color: ${progressColor};"></div>
    </div>
    <div style="margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center;">
      <span style="display: inline-block; width: 60%;">Start Blocks:</span>
      <span style="${startBlocks === 1 ? 'color: #4CAF50;' : 'color: #ff9900;'} font-weight: bold; text-align: right;">
        ${startBlocks} / 1
      </span>
    </div>
    <div style="margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center;">
      <span style="display: inline-block; width: 60%;">Finish Blocks:</span>
      <span style="${finishBlocks === 1 ? 'color: #4CAF50;' : 'color: #ff9900;'} font-weight: bold; text-align: right;">
        ${finishBlocks} / 1
      </span>
    </div>
  `;
  
  // Update the start/finish block button states in the UI
  updateBlockTypeButtons(startBlocks, finishBlocks);
}

/**
 * Updates block type buttons based on start/finish counts
 */
function updateBlockTypeButtons(startBlocks: number, finishBlocks: number): void {
  const blockButtons = document.querySelectorAll('.block-button');
  
  blockButtons.forEach(button => {
    const buttonEl = button as HTMLElement;
    const type = buttonEl.getAttribute('data-block-type');
    
    if (type === 'start' && startBlocks >= 1) {
      buttonEl.style.opacity = '0.5';
      buttonEl.style.cursor = 'not-allowed';
      buttonEl.setAttribute('disabled', 'true');
    } else if (type === 'finish' && finishBlocks >= 1) {
      buttonEl.style.opacity = '0.5';
      buttonEl.style.cursor = 'not-allowed';
      buttonEl.setAttribute('disabled', 'true');
    } else {
      buttonEl.style.opacity = '1';
      buttonEl.style.cursor = 'pointer';
      buttonEl.removeAttribute('disabled');
    }
  });
}

/**
 * Highlights the block that is currently targeted for rotation
 */
export function highlightBlockForRotation(
  camera: THREE.Camera,
  blocks: THREE.Mesh[],
  maxDistance: number
): THREE.Mesh | null {
  // Reset all previously highlighted rotation blocks
  blocks.forEach(block => {
    if (block.userData.rotationHighlighted) {
      // Remove rotation indicator if it exists
      const rotationIndicator = block.children.find(child => child.userData?.type === 'rotationIndicator');
      if (rotationIndicator) {
        block.remove(rotationIndicator);
      }
      delete block.userData.rotationHighlighted;
    }
  });
  
  // Get camera forward direction
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  
  // Cast ray from camera
  const raycaster = new THREE.Raycaster();
  raycaster.set(camera.position, direction);
  
  const intersects = raycaster.intersectObjects(blocks);
  
  if (intersects.length > 0 && intersects[0].distance < maxDistance) {
    const selectedBlock = intersects[0].object as THREE.Mesh;
    
    // Mark the block as highlighted for rotation
    selectedBlock.userData.rotationHighlighted = true;
    
    // Create a rotation indicator
    const geometry = new THREE.RingGeometry(1, 1.2, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00aaff, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.userData = { type: 'rotationIndicator' };
    
    // Position the indicator on top of the block
    const blockHeight = (selectedBlock.geometry as THREE.BoxGeometry).parameters.height || 1;
    indicator.position.set(0, blockHeight/2 + 0.1, 0);
    indicator.rotation.x = Math.PI / 2; // Lay flat on top of block
    
    // Add to block
    selectedBlock.add(indicator);
    
    // Create rotating animation for the indicator
    const startTime = Date.now();
    function animateRotation() {
      if (!selectedBlock.parent) {
        // Block has been removed, stop animation
        return;
      }
      
      // Rotate indicator
      const elapsed = (Date.now() - startTime) / 1000;
      indicator.rotation.z = elapsed * 2; // Rotate 2 radians per second
      
      indicator.userData.animationFrameId = requestAnimationFrame(animateRotation);
    }
    
    // Start animation
    animateRotation();
    
    return selectedBlock;
  }
  
  return null;
}

/**
 * Rotates a block based on mouse movement
 */
export function rotateBlock(
  block: THREE.Mesh,
  deltaX: number,
  deltaY: number
): void {
  if (!block) return;
  
  // Define rotation sensitivity
  const sensitivity = 0.01;
  
  // Apply rotation based on mouse movement (only Y rotation for simplicity)
  block.rotation.y += deltaX * sensitivity;
  
  // Save the block's state in local storage
}

export { updateBlockCounter }; 