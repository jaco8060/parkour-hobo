// Builder system to handle builder mode functionality
import * as THREE from "three";
import { BLOCK_TYPES, BUILDER_SETTINGS } from "../utils/config.js";
import { createElement, removeElement, sendMessageToParent, saveBuilderState } from "../utils/helpers.js";
import { BlockData, BuildControls, CourseData } from "../utils/types.js";

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
  
  // Use the configured builder camera speed
  const moveSpeed = BUILDER_SETTINGS.CAMERA_SPEED;
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
  
  console.log("BLOCK DEBUG - Building blocks array before:", buildingBlocks.length);
  console.log("BLOCK DEBUG - Platforms array before:", platforms.length);
  
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
  
  scene.add(block);
  buildingBlocks.push(block);
  
  // Only add to platforms if it's not already there
  // (buildingBlocks is for the builder UI, platforms is for collision detection)
  if (!platforms.includes(block)) {
    platforms.push(block);
  }
  
  console.log("BLOCK DEBUG - Building blocks array after:", buildingBlocks.length);
  console.log("BLOCK DEBUG - Platforms array after:", platforms.length);
  console.log("BLOCK DEBUG - Arrays are same object?", buildingBlocks === platforms);
  
  // console.log(`Placed ${selectedBlockType} block at position:`, block.position);
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
    
    // Remove any outline effect
    const outline = block.children.find(child => child.userData?.type === 'outline');
    if (outline) {
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
  
  // Create pulse animation
  const startTime = Date.now();
  function pulseOutline() {
    if (!block.parent) {
      // Block has been removed, stop animation
      return;
    }
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    const scale = 1 + 0.1 * Math.sin(elapsedTime * 5);
    
    outline.scale.set(scale, scale, scale);
    requestAnimationFrame(pulseOutline);
  }
  
  // Start pulse animation
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
    // Remove from scene
    scene.remove(blockToRemove);
    
    // Remove from building blocks array
    buildingBlocks.splice(blockIndex, 1);
    
    // Also remove from platforms array if it exists there
    const platformIndex = platforms.indexOf(blockToRemove);
    if (platformIndex !== -1) {
      platforms.splice(platformIndex, 1);
    }
    
    console.log("BLOCK DEBUG - Remove - Building blocks after:", buildingBlocks.length);
    console.log("BLOCK DEBUG - Remove - Platforms after:", platforms.length);
    
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
  
  // Send message to parent
  sendMessageToParent("courseCreated", courseData);
  console.log("Course saved:", courseData);
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
      maxWidth: "250px"
    }
  );
  
  // Title
  const title = createElement("h2", 
    {},
    {
      margin: "0 0 10px 0",
      textAlign: "center"
    },
    "Course Builder"
  );
  builderUI.appendChild(title);
  
  // Block type selection
  const blockTypeLabel = createElement("div", 
    {},
    { fontWeight: "bold" },
    "Block Type:"
  );
  builderUI.appendChild(blockTypeLabel);
  
  const blockTypeSelector = createElement("div", 
    {},
    {
      display: "flex",
      gap: "5px",
      marginBottom: "10px"
    }
  );
  
  // Create button factory
  const createBlockButton = (text: string, type: string, color: string) => {
    const colorIndicator = createElement("div", 
      {},
      {
        width: "10px",
        height: "10px",
        backgroundColor: color,
        display: "inline-block",
        marginRight: "5px",
        borderRadius: "2px"
      }
    );
    
    const button = createElement("button", 
      { class: "block-button" },
      {
        padding: "8px",
        backgroundColor: type === selectedBlockType ? "#4CAF50" : "#f1f1f1",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        color: type === selectedBlockType ? "white" : "black",
        flex: "1"
      },
      text
    );
    
    button.prepend(colorIndicator);
    
    button.addEventListener("click", () => {
      onBlockTypeChange(type);
      
      // Update button styles
      Array.from(blockTypeSelector.children).forEach(child => {
        (child as HTMLElement).style.backgroundColor = "#f1f1f1";
        (child as HTMLElement).style.color = "black";
      });
      button.style.backgroundColor = "#4CAF50";
      button.style.color = "white";
    });
    
    return button;
  };
  
  blockTypeSelector.appendChild(createBlockButton("Platform", "platform", "#cccccc"));
  blockTypeSelector.appendChild(createBlockButton("Start", "start", "#00ff00"));
  blockTypeSelector.appendChild(createBlockButton("Finish", "finish", "#0000ff"));
  
  builderUI.appendChild(blockTypeSelector);
  
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
  
  // Grid size selector
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
  );
  
  [0.25, 0.5, 1, 2].forEach(size => {
    const option = createElement("option", 
      { value: size.toString() },
      {},
      size.toString()
    );
    if (size === BUILDER_SETTINGS.PLACEMENT_SNAP_SIZE) {
      option.setAttribute("selected", "selected");
    }
    gridSizeSelect.appendChild(option);
  });
  
  gridSizeSelect.addEventListener("change", (e) => {
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
      Array.from(gridSizeSelect.options).forEach(option => {
        if (parseFloat(option.value) === value) {
          option.selected = true;
        }
      });
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
  saveButton.addEventListener("click", saveFn);
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
  
  // Reset localStorage button
  const resetButton = createElement("button", 
    {},
    {
      padding: "8px",
      backgroundColor: "#f44336",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "0.9em"
    },
    "Reset Storage"
  );
  
  resetButton.addEventListener("click", () => {
    if (confirm("This will reset all saved builder data. Continue?")) {
      try {
        // Import not available here, so access through window
        if (typeof (window as any).resetBuilderLocalStorage === 'function') {
          (window as any).resetBuilderLocalStorage();
        } else {
          localStorage.removeItem('builderState');
          localStorage.removeItem('builderTemplate');
          localStorage.removeItem('lastMode');
          localStorage.removeItem('gridSnap');
          localStorage.removeItem('gridSize');
        }
        alert("Storage reset successful. Refresh the page to see changes.");
      } catch (error) {
        console.error("Failed to reset localStorage:", error);
        alert("Failed to reset storage. Error: " + error);
      }
    }
  });
  buttonGroup.appendChild(resetButton);
  
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
    <p style="margin: 2px 0">Use toolbar for tools</p>
    <p style="margin: 2px 0; color: #ffeb3b">Need start and finish blocks!</p>
    `
  );
  builderUI.appendChild(instructions);
  
  // Block counter - Create it once and populate
  const counterContainer = createElement("div", 
    { id: "block-counter" },
    {
      marginTop: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: "5px",
      borderRadius: "4px"
    }
  );
  
  // Add counter container to UI before populating (ensuring it exists)
  builderUI.appendChild(counterContainer);
  
  // Function to update counter with current values
  const updateBlockCounter = () => {
    if (!counterContainer) return;
    
    // Get current counts (at the moment of update)
    const totalBlocks = buildingBlocks.length;
    const startBlocks = buildingBlocks.filter(b => b.userData && b.userData.type === 'start').length;
    const finishBlocks = buildingBlocks.filter(b => b.userData && b.userData.type === 'finish').length;
    
    counterContainer.innerHTML = `
      <p style="margin: 0">Blocks placed: ${totalBlocks}</p>
      <p style="margin: 0">Start blocks: ${startBlocks}</p>
      <p style="margin: 0">Finish blocks: ${finishBlocks}</p>
    `;
  };
  
  // Initial update
  updateBlockCounter();
  
  // Add UI to game container
  container.appendChild(builderUI);
  
  // Update block counter periodically with a more stable approach
  let lastTotalBlocks = -1; // Initialize with invalid value to force first update
  
  const counterInterval = setInterval(() => {
    // Only update when actual changes happen to avoid visual flickering
    if (buildingBlocks.length !== lastTotalBlocks) {
      lastTotalBlocks = buildingBlocks.length;
      updateBlockCounter();
    }
  }, 500); // Reduce update frequency to avoid performance issues
  
  // Clean up the interval when the UI is removed
  const cleanup = () => {
    clearInterval(counterInterval);
  };
  
  // Store the cleanup function on the window for later reference
  (window as any).__blockCounterCleanup = cleanup;
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
    
    button.addEventListener("click", () => {
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

/**
 * Create debug UI for builder mode
 */
export function createBuilderDebugUI(
  buildControls: BuildControls
): void {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  const debugUI = createElement("div", 
    { id: "builder-debug" },
    {
      position: "absolute",
      top: "10px",
      right: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "10px",
      borderRadius: "5px",
      fontFamily: "monospace",
      zIndex: "1000",
      maxWidth: "180px"
    }
  );
  
  container.appendChild(debugUI);
  
  // Update debug info every 100ms
  const updateInterval = setInterval(() => {
    const debugElement = document.getElementById("builder-debug");
    if (!debugElement) {
      clearInterval(updateInterval);
      return;
    }
    
    debugElement.innerHTML = `
      <div style="font-weight:bold;">Builder Controls:</div>
      <div>W (Forward): ${buildControls.forward}</div>
      <div>S (Back): ${buildControls.backward}</div>
      <div>A (Left): ${buildControls.left}</div>
      <div>D (Right): ${buildControls.right}</div>
      <div>Q (Up): ${buildControls.up}</div>
      <div>E (Down): ${buildControls.down}</div>
      <div>← (Rotate L): ${buildControls.rotateLeft}</div>
      <div>→ (Rotate R): ${buildControls.rotateRight}</div>
    `;
  }, 100);
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