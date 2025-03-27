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
  
  // Add a global emergency reset function
  window.__forceControlReset = () => {
    console.log("Emergency control reset triggered");
    resetAllControls(keyState, buildControls);
    
    // Re-enable right-click for camera control
    document.oncontextmenu = (e) => {
      e.preventDefault();
      return false;
    };
    
    // Force the builder mode state to be correct
    const currentMode = localStorage.getItem('lastMode');
    builderMode = currentMode === 'builder';
    
    // Ensure the game container accepts mouse events
    const container = document.getElementById('game-container');
    if (container) {
      container.style.pointerEvents = 'auto';
    }
  };
  
  // Rest of the function remains the same...
} 