// Input system to handle keyboard and mouse events
import * as THREE from "three";
import { KeyState, BuildControls } from "../utils/types.js";
import { getOverlayActive } from "../components/Overlay.js";
import { sendMessageToParent, saveBuilderState } from "../utils/helpers.js";

/**
 * Set up all event listeners for the application
 */
export function setupEventListeners(
  keyState: KeyState,
  buildControls: BuildControls,
  builderMode: boolean,
  gameStarted: boolean,
  pauseCallback: () => void,
  resetCallback: () => void,
  toggleGameModeCallback: () => void,
  resizeCallback: () => void,
  playOnlyMode: boolean = false
): void {
  console.log("Setting up global event listeners");
  
  // Keyboard controls
  document.addEventListener("keydown", (event) => {
    handleKeyDown(
      event,
      keyState,
      buildControls,
      builderMode,
      gameStarted,
      pauseCallback,
      resetCallback,
      toggleGameModeCallback,
      playOnlyMode
    );
  });
  
  document.addEventListener("keyup", (event) => {
    handleKeyUp(event, keyState, buildControls, builderMode);
  });
  
  // Window resize
  window.addEventListener("resize", resizeCallback);
  
  // Focus/blur handlers
  window.addEventListener("blur", () => {
    pauseCallback();
    resetCallback();
  });
  
  // Handle mouse leaving the window
  document.addEventListener("mouseleave", () => {
    pauseCallback();
    resetCallback();
  });
  
  // Message from parent
  window.addEventListener("message", (event: MessageEvent) => {
    handleParentMessage(event, gameStarted, builderMode);
  });
  
  // We can't directly save builder state here as we don't have access to all required variables
  // App.ts will handle the periodic saving of builder state
}

/**
 * Handles keydown events
 */
export function handleKeyDown(
  event: KeyboardEvent,
  keyState: KeyState,
  buildControls: BuildControls,
  builderMode: boolean,
  gameStarted: boolean,
  pauseCallback: () => void,
  resetCallback: () => void,
  toggleGameModeCallback: () => void,
  playOnlyMode: boolean = false
): void {
  // Get the current builder mode from localStorage in case the builderMode parameter is not updated
  const storedMode = localStorage.getItem('lastMode');
  const isInBuilderMode = builderMode || storedMode === 'builder';
  
  // console.log(`Key pressed: ${event.key}, Parameter builderMode: ${builderMode}, localStorage mode: ${storedMode}, Effective mode: ${isInBuilderMode}`);
  
  // Ignore key events when overlay is active
  if (getOverlayActive()) {
    // console.log("Overlay active, ignoring key press:", event.key);
    return;
  }
  
  // Handle 'B' key for mode switching - disabled in play-only mode
  if (event.key.toLowerCase() === 'b' && !playOnlyMode) {
    console.log(`B key pressed - toggling modes. Current mode: ${isInBuilderMode ? 'builder' : 'player'}`);
    // console.log(`Current state in localStorage: ${localStorage.getItem('lastMode') || 'not set'}`);
    
    // Call the mode toggle function
    toggleGameModeCallback();
    
    // Log the mode after toggling (though this won't reflect the change yet)
    // console.log(`Mode after toggle function called: ${builderMode ? 'builder' : 'player'}`);
    
    // Prevent default browser behavior
    event.preventDefault();
    return;
  }

  // Handle sprint key (Shift) for both modes
  if (event.key === 'Shift') {
    if (isInBuilderMode) {
      buildControls.sprint = true;
    } else {
      keyState.sprint = true;
    }
    event.preventDefault();
    return;
  }

  if (!isInBuilderMode) {
    // Regular game controls
    switch (event.key.toLowerCase()) {
      case "w": keyState.forward = true; event.preventDefault(); break;
      case "s": keyState.backward = true; event.preventDefault(); break;
      case "a": keyState.rotateLeft = true; event.preventDefault(); break;
      case "d": keyState.rotateRight = true; event.preventDefault(); break;
      case " ": keyState.jump = true; event.preventDefault(); break;
    }
    return;
  }
  
  // Log builder mode key presses for debugging
  // console.log(`Builder mode key pressed: ${event.key}, isInBuilderMode: ${isInBuilderMode}, Controls:`, {...buildControls});
  
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
  // if (controlChanged) {
  //   console.log(`Key pressed: ${key}, Updated controls:`, {...buildControls});
  // }
}

/**
 * Handles keyup events
 */
export function handleKeyUp(
  event: KeyboardEvent,
  keyState: KeyState,
  buildControls: BuildControls,
  builderMode: boolean
): void {
  // Get the current builder mode from localStorage in case the builderMode parameter is not updated
  const storedMode = localStorage.getItem('lastMode');
  const isInBuilderMode = builderMode || storedMode === 'builder';
  
  // Ignore key events when overlay is active
  if (getOverlayActive()) return;
  
  // Handle sprint key (Shift) for both modes
  if (event.key === 'Shift') {
    if (isInBuilderMode) {
      buildControls.sprint = false;
    } else {
      keyState.sprint = false;
    }
    return;
  }
  
  if (!isInBuilderMode) {
    // Regular game controls
    switch (event.key.toLowerCase()) {
      case "w": keyState.forward = false; break;
      case "s": keyState.backward = false; break;
      case "a": keyState.rotateLeft = false; break;
      case "d": keyState.rotateRight = false; break;
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
  // if (controlChanged) {
  //   console.log(`Key released: ${key}, Updated controls:`, {...buildControls});
  // }
}

/**
 * Handles messages from parent window
 */
export function handleParentMessage(
  event: MessageEvent,
  gameStarted: boolean,
  builderMode: boolean
): void {
  if (event.data.type === "startGame") {
    gameStarted = true;
    builderMode = false; // Exit builder mode
    console.log("Game started");
    
    // Send message to parent
    sendMessageToParent("gameStarted");
  } else if (event.data.type === "startBuilder") {
    const template = event.data.data?.template || "medium";
    localStorage.setItem('builderTemplate', template);
    console.log("Builder mode started with template:", template);
    
    // Send message to parent 
    sendMessageToParent("builderStarted");
  }
}

/**
 * Sets up mouse handlers for builder mode
 */
export function setupBuilderMouseHandlers(
  container: HTMLElement,
  camera: THREE.Camera,
  placementPreviewFn: () => void,
  placeBlockFn: () => void,
  removeBlockFn: () => void
): void {
  let isRightMouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let dragDistance = 0; // Track drag distance to distinguish clicks from drags
  let isRecentToolClick = false; // Flag to track recent toolbar clicks
  
  // Set camera's euler order to YXZ to prevent gimbal lock and maintain proper rotation
  camera.rotation.order = "YXZ";
  
  // Left click to place or remove blocks
  container.addEventListener('click', (event) => {
    // Only process clicks if we're in builder mode
    const isBuilderMode = localStorage.getItem('lastMode') === 'builder';
    if (!isBuilderMode) return;
    
    // Check if click is on the toolbar or UI elements
    const target = event.target as HTMLElement;
    const isToolbarClick = target.closest('#builder-toolbar') !== null;
    const isUIClick = target.closest('#builder-ui') !== null;
    
    // Also check if there was a recent tool click by checking for the recent-tool-click class
    const hasRecentToolClick = container.classList.contains("recent-tool-click");
    
    // Don't place blocks if clicking on UI elements or right after a tool change
    if (isToolbarClick || isUIClick || hasRecentToolClick) {
      isRecentToolClick = true;
      // Clear the flag after a short delay to prevent accidental placements
      setTimeout(() => {
        isRecentToolClick = false;
      }, 250);
      return;
    }
    
    // Prevent block placement if it's a recent tool click or during right-click drag
    if (event.button === 0 && !isRightMouseDown && !isRecentToolClick) {
      placeBlockFn();
      removeBlockFn();
    }
  });
  
  // Mouse controls for camera rotation - only track right mouse button
  container.addEventListener('mousedown', (event) => {
    // Check if click is on toolbar or UI
    const target = event.target as HTMLElement;
    const isToolbarClick = target.closest('#builder-toolbar') !== null;
    const isUIClick = target.closest('#builder-ui') !== null;
    
    // Don't handle camera rotation if clicking UI elements
    if (isToolbarClick || isUIClick) {
      return;
    }
    
    if (event.button === 2) { // Right click
      isRightMouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      dragDistance = 0;
      
      // Change cursor to indicate camera control
      container.style.cursor = 'grabbing';
      
      event.preventDefault();
    }
  });
  
  container.addEventListener('mousemove', (event) => {
    // Always update placement preview on mouse move
    placementPreviewFn();
    
    // Only handle camera rotation if right mouse button is down
    if (!isRightMouseDown) return;
    
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    
    // Update drag distance
    dragDistance += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Adjust sensitivity based on camera height
    const heightFactor = Math.max(0.5, Math.min(2.0, camera.position.y / 10));
    const sensitivity = 0.005 * heightFactor;
    
    // Rotate horizontally (yaw)
    camera.rotation.y -= deltaX * sensitivity;
    
    // Rotate vertically (pitch) with limits
    const newPitch = camera.rotation.x - deltaY * sensitivity;
    camera.rotation.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, newPitch)); // Limit to ~90 degrees up/down
    
    // Keep camera level (no roll)
    camera.rotation.z = 0;
    
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    event.preventDefault();
  });
  
  container.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
      isRightMouseDown = false;
      
      // Reset cursor
      if (container.style.cursor === 'grabbing') {
        container.style.cursor = 'default';
      }
      
      event.preventDefault();
    }
  });
  
  // Also handle mouse leave to prevent "stuck" rotation
  container.addEventListener('mouseleave', () => {
    if (isRightMouseDown) {
      isRightMouseDown = false;
      container.style.cursor = 'default';
    }
  });
  
  // Prevent context menu on right click
  container.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

/**
 * Reset all input controls
 */
export function resetAllControls(
  keyState: KeyState,
  buildControls: BuildControls
): void {
  // Reset builder controls
  buildControls.forward = false;
  buildControls.backward = false;
  buildControls.left = false;
  buildControls.right = false;
  buildControls.up = false;
  buildControls.down = false;
  buildControls.rotateLeft = false;
  buildControls.rotateRight = false;
  buildControls.sprint = false;
  
  // Reset game controls
  keyState.forward = false;
  keyState.backward = false;
  keyState.left = false;
  keyState.right = false;
  keyState.jump = false;
  keyState.rotateLeft = false;
  keyState.rotateRight = false;
  keyState.sprint = false;
} 