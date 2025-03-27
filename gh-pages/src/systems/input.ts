// Input system to handle keyboard and mouse events
import * as THREE from "three";
import { KeyState, BuildControls } from "../utils/types.js";
import { getOverlayActive } from "../components/Overlay.js";
import { saveBuilderState } from "../utils/helpers.js";

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
  
  // Prevent context menu (right-click) globally
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    return false;
  }, true);
  
  // Also prevent context menu on body and game-container for redundancy
  document.body.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    return false;
  }, true);
  
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      return false;
    }, true);
  }
  
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
  // Skip input handling if a modal is open
  if (document.getElementById("modal-overlay")) {
    return;
  }
  
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
  // Skip input handling if a modal is open
  if (document.getElementById("modal-overlay")) {
    return;
  }
  
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
    

  } else if (event.data.type === "startBuilder") {
    const template = event.data.data?.template || "medium";
    localStorage.setItem('builderTemplate', template);
    console.log("Builder mode started with template:", template);

  }
}

// Store references to event listeners so we can remove them later
let builderMouseHandlers = {
  click: null as ((e: MouseEvent) => void) | null,
  mousedown: null as ((e: MouseEvent) => void) | null,
  mousemove: null as ((e: MouseEvent) => void) | null,
  mouseup: null as ((e: MouseEvent) => void) | null,
  mouseleave: null as ((e: MouseEvent) => void) | null
};

/**
 * Cleans up builder mouse handlers when switching to player mode
 */
export function cleanupBuilderMouseHandlers(container: HTMLElement): void {
  console.log("Cleaning up builder mouse handlers");
  
  // Remove each event listener if it exists
  if (builderMouseHandlers.click) {
    container.removeEventListener('click', builderMouseHandlers.click);
    builderMouseHandlers.click = null;
  }
  
  if (builderMouseHandlers.mousedown) {
    container.removeEventListener('mousedown', builderMouseHandlers.mousedown);
    builderMouseHandlers.mousedown = null;
  }
  
  if (builderMouseHandlers.mousemove) {
    container.removeEventListener('mousemove', builderMouseHandlers.mousemove);
    builderMouseHandlers.mousemove = null;
  }
  
  if (builderMouseHandlers.mouseup) {
    container.removeEventListener('mouseup', builderMouseHandlers.mouseup);
    builderMouseHandlers.mouseup = null;
  }
  
  if (builderMouseHandlers.mouseleave) {
    container.removeEventListener('mouseleave', builderMouseHandlers.mouseleave);
    builderMouseHandlers.mouseleave = null;
  }
  
  // Reset cursor just in case
  container.style.cursor = 'default';
}

/**
 * Sets up mouse handlers for builder mode
 */
export function setupBuilderMouseHandlers(
  container: HTMLElement,
  camera: THREE.Camera,
  placementPreviewFn: () => void,
  placeBlockFn: () => void,
  removeBlockFn: () => void,
  rotateBlockFn?: (deltaX: number, deltaY: number) => void
): void {
  // First clean up any existing handlers to prevent duplicates
  cleanupBuilderMouseHandlers(container);
  
  let isRightMouseDown = false;
  let isLeftMouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let dragDistance = 0;
  let isRecentToolClick = false;
  
  // Set camera's euler order to YXZ to prevent gimbal lock
  camera.rotation.order = "YXZ";
  
  // Function to check if modal is open
  const isModalOpen = () => document.getElementById("modal-overlay") !== null;
  
  // Context menu prevention
  const preventContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    return false;
  };
  
  container.addEventListener('contextmenu', preventContextMenu);
  document.body.addEventListener('contextmenu', preventContextMenu);
  document.addEventListener('contextmenu', preventContextMenu);
  
  // Create handlers and store references BEFORE attaching them
  
  // Click handler
  const clickHandler = (event: MouseEvent) => {
    if (isModalOpen()) return;
    
    // SAFETY CHECK: Only process in builder mode
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
    
    // Handle different inputs based on current builder tool
    const currentBuilderTool = localStorage.getItem('currentBuilderTool') || 'build';
    
    // Prevent block placement if it's a recent tool click or during right-click drag
    if (event.button === 0 && !isRightMouseDown && !isRecentToolClick) {
      // Only place/remove blocks if not in rotate mode
      if (currentBuilderTool !== 'rotate') {
        placeBlockFn();
        removeBlockFn();
      }
    }
  };
  
  // Mousedown handler
  const mousedownHandler = (event: MouseEvent) => {
    if (isModalOpen()) return;
    
    // SAFETY CHECK: Only process in builder mode
    const isBuilderMode = localStorage.getItem('lastMode') === 'builder';
    if (!isBuilderMode) return;
    
    // Check if click is on toolbar or UI
    const target = event.target as HTMLElement;
    const isToolbarClick = target.closest('#builder-toolbar') !== null;
    const isUIClick = target.closest('#builder-ui') !== null;
    
    // Don't handle camera rotation if clicking UI elements
    if (isToolbarClick || isUIClick) {
      return;
    }
    
    // Right-click is always for camera rotation in any tool mode
    if (event.button === 2) {
      isRightMouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      dragDistance = 0;
      
      // Change cursor to indicate camera control
      container.style.cursor = 'grabbing';
      
      event.preventDefault();
    } 
    // Left-click handling depends on the current tool
    else if (event.button === 0) {
      // Get current tool - with fallback to ensure it works immediately
      const currentBuilderTool = localStorage.getItem('currentBuilderTool') || 'build';
      
      isLeftMouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      
      // Change cursor for rotate mode
      if (currentBuilderTool === 'rotate') {
        container.style.cursor = 'move';
      }
      
      event.preventDefault();
    }
  };
  
  // Mousemove handler
  const mousemoveHandler = (event: MouseEvent) => {
    if (isModalOpen()) return;
    
    // SAFETY CHECK: Only process in builder mode
    const isBuilderMode = localStorage.getItem('lastMode') === 'builder';
    if (!isBuilderMode) return;
    
    // Always update placement preview on mouse move
    placementPreviewFn();
    
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    
    // Get the current builder tool - default to 'build' if not set
    // This ensures we have a valid value even if localStorage is not set yet
    const currentBuilderTool = localStorage.getItem('currentBuilderTool') || 'build';
    
    // Handle right mouse button for camera control (in any tool mode)
    if (isRightMouseDown) {
      // Update drag distance
      dragDistance += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Default behavior: camera rotation - ALWAYS works with right mouse
      const sensitivity = 0.005;
      
      // Rotate horizontally (yaw)
      camera.rotation.y -= deltaX * sensitivity;
      
      // Rotate vertically (pitch) with limits
      const newPitch = camera.rotation.x - deltaY * sensitivity;
      camera.rotation.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, newPitch));
      
      // Keep camera level (no roll)
      camera.rotation.z = 0;
    }
    // Handle left mouse button for rotation (only in rotate mode)
    else if (isLeftMouseDown && currentBuilderTool === 'rotate' && rotateBlockFn) {
      // Call the rotate function
      rotateBlockFn(deltaX, deltaY);
    }
    
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    event.preventDefault();
  };
  
  // Mouseup handler
  const mouseupHandler = (event: MouseEvent) => {
    if (isModalOpen()) return;
    
    // SAFETY CHECK: Only process in builder mode
    const isBuilderMode = localStorage.getItem('lastMode') === 'builder';
    if (!isBuilderMode) return;
    
    if (event.button === 2) {
      isRightMouseDown = false;
      
      // Reset cursor
      if (container.style.cursor === 'grabbing') {
        container.style.cursor = 'default';
      }
      
      event.preventDefault();
    } else if (event.button === 0) {
      isLeftMouseDown = false;
      
      // Get current tool
      const currentBuilderTool = localStorage.getItem('currentBuilderTool') || 'build';
      
      // Reset cursor for rotate mode
      if (currentBuilderTool === 'rotate') {
        container.style.cursor = 'default';
      }
      
      event.preventDefault();
    }
  };
  
  // Mouseleave handler
  const mouseleaveHandler = () => {
    if (isModalOpen()) return;
    
    // SAFETY CHECK: Only process in builder mode
    const isBuilderMode = localStorage.getItem('lastMode') === 'builder';
    if (!isBuilderMode) return;
    
    if (isRightMouseDown) {
      isRightMouseDown = false;
      container.style.cursor = 'default';
    }
    
    if (isLeftMouseDown) {
      isLeftMouseDown = false;
      container.style.cursor = 'default';
    }
  };
  
  // Store references
  builderMouseHandlers.click = clickHandler;
  builderMouseHandlers.mousedown = mousedownHandler;
  builderMouseHandlers.mousemove = mousemoveHandler;
  builderMouseHandlers.mouseup = mouseupHandler;
  builderMouseHandlers.mouseleave = mouseleaveHandler;
  
  // Attach handlers AFTER storing references
  container.addEventListener('click', clickHandler);
  container.addEventListener('mousedown', mousedownHandler);
  container.addEventListener('mousemove', mousemoveHandler);
  container.addEventListener('mouseup', mouseupHandler);
  container.addEventListener('mouseleave', mouseleaveHandler);
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