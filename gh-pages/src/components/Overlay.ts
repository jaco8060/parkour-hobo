// Overlay component handling game pauses and overlays
import { createElement, removeElement } from "../../../src/utils/helpers.js";

export { removeElement };

let isOverlayActive = false;

/**
 * Creates and shows the game overlay
 */
export function showOverlay(
  resetControlsFn: () => void,
  isBuilderMode: boolean = false
): void {
  if (isOverlayActive) return;
  
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Reset all controls when overlay is shown
  resetControlsFn();
  
  const overlay = createElement("div", 
    { id: "game-overlay" },
    {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "9999",
      cursor: "pointer"
    }
  );
  
  // Different content based on mode
  let messageContent = "";
  
  if (isBuilderMode) {
    // Minimal content for builder mode
    messageContent = "Click to continue building";
  } else {
    // Full instructions for player mode
    messageContent = `
      <div style="text-align: center;">
        <h2 style="margin-bottom: 10px; color: #4CAF50;">Parkour Hobo</h2>
        <div style="margin-bottom: 20px;">
          <p>Use <b>WASD</b> to move</p>
          <p><b>Space</b> to jump</p>
          <p>Hold <b>Shift</b> to sprint</p>
        </div>
        <p style="font-style: italic; font-size: 0.9em;">Click to start playing</p>
      </div>
    `;
  }
  
  const message = createElement("div", 
    {},
    {
      color: "white",
      fontSize: "24px",
      fontFamily: "Arial, sans-serif",
      padding: "20px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderRadius: "10px",
      border: "2px solid white",
      maxWidth: "400px"
    },
    messageContent
  );
  
  overlay.appendChild(message);
  container.appendChild(overlay);
  isOverlayActive = true;
  
  // Add click handler to remove overlay
  overlay.addEventListener("click", () => hideOverlay());
}

/**
 * Hides the overlay and resumes game
 */
export function hideOverlay(): void {
  removeElement("game-overlay");
  isOverlayActive = false;
}

/**
 * Checks if the overlay is currently active
 */
export function getOverlayActive(): boolean {
  return isOverlayActive;
}

/**
 * Creates a modal dialog with customizable content
 */
export function showModal(
  title: string,
  content: string,
  closeOnOutsideClickOrCallback?: boolean | (() => boolean | void),
  showDefaultCloseButton: boolean = true
): void {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  // Remove any existing modal
  removeElement("modal-overlay");
  
  // Store original cursor style to restore it later
  const originalCursorStyle = container.style.cursor;
  
  // Reset all control states when opening modal
  import('../systems/input.js').then(inputModule => {
    if (typeof inputModule.resetAllControls === 'function') {
      const keyState = (window as any).__gameKeyState || {};
      const buildControls = (window as any).__gameBuildControls || {};
      inputModule.resetAllControls(keyState, buildControls);
    }
  });
  
  const modalOverlay = createElement("div", 
    { id: "modal-overlay" },
    {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "10000",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      imageRendering: "pixelated"
    }
  );
  
  const modalBox = createElement("div", 
    { id: "modal-box" },
    {
      backgroundColor: "rgba(18, 18, 18, 0.85)", // Semi-transparent background
      borderRadius: "8px",
      padding: "20px",
      maxWidth: "500px",
      width: "80%",
      maxHeight: "80vh",
      overflowY: "auto",
      border: "4px solid #4CAF50",
      color: "white",
      boxShadow: "0 0 20px rgba(76, 175, 80, 0.6)",
      backdropFilter: "blur(3px)" // Add blur effect for supported browsers
    }
  );
  
  const modalTitle = createElement("h2", 
    {},
    {
      margin: "0 0 15px 0",
      color: "#4CAF50",
      textAlign: "center",
      textShadow: "2px 2px 0 #000",
      fontSize: "1.5em",
      fontFamily: "'Press Start 2P', 'Courier New', monospace"
    },
    title
  );
  
  const modalContent = createElement("div", 
    {},
    {
      marginBottom: showDefaultCloseButton ? "20px" : "0px",
      lineHeight: "1.4",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "0.8em"
    },
    content
  );
  
  modalBox.appendChild(modalTitle);
  modalBox.appendChild(modalContent);
  
  // Only add default close button if requested
  if (showDefaultCloseButton) {
    const closeButton = createElement("button", 
      { id: "modal-close-button" },
      {
        padding: "8px 16px",
        backgroundColor: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        float: "right",
        fontFamily: "'Press Start 2P', 'Courier New', monospace",
        fontSize: "0.8em",
        boxShadow: "3px 3px 0 #333",
        transition: "transform 0.1s"
      },
      "Close"
    );
    
    // Add hover effect
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.transform = "scale(1.05)";
    });
    
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.transform = "scale(1)";
    });
    
    closeButton.addEventListener("click", closeModal);
    modalBox.appendChild(closeButton);
  }
  
  modalOverlay.appendChild(modalBox);
  container.appendChild(modalOverlay);
  
  // Function to handle closing the modal
  function closeModal() {
    // Check if the third parameter is a callback function
    if (typeof closeOnOutsideClickOrCallback === 'function') {
      // If callback returns false explicitly, don't close the modal
      const result = closeOnOutsideClickOrCallback();
      if (result === false) {
        return;
      }
    }
    
    // Remove event listeners first to prevent any race conditions
    document.removeEventListener("keydown", keydownHandler, true);
    document.removeEventListener("mousedown", outsideClickHandler, true);
    document.removeEventListener('click', modalClickHandler);
    
    // Remove the modal element
    removeElement("modal-overlay");
    
    // Restore original cursor style - Fix for null safety
    if (container) {
      container.style.cursor = originalCursorStyle;
    }
    
    // Make sure context menu stays disabled after modal closes
    setTimeout(() => {
      // Re-add context menu prevention
      const preventContextMenu = (event: MouseEvent) => {
        event.preventDefault();
        return false;
      };
      
      // Fix for null safety
      if (container) {
        container.addEventListener('contextmenu', preventContextMenu);
        document.body.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('contextmenu', preventContextMenu);
      }
    }, 100);
  }
  
  // Handle keydown events
  const keydownHandler = (event: KeyboardEvent) => {
    // Stop propagation of keyboard events when modal is open
    event.stopPropagation();
    
    // Close on Escape key
    if (event.key === "Escape") {
      closeModal();
    }
  };
  
  // Handle clicks outside the modal - adjust for the new parameter type
  const outsideClickHandler = (event: MouseEvent) => {
    // Determine if clicks outside should close the modal
    let shouldCloseOnOutsideClick: boolean;
    
    if (typeof closeOnOutsideClickOrCallback === 'boolean') {
      // If it's explicitly a boolean, use that value
      shouldCloseOnOutsideClick = closeOnOutsideClickOrCallback;
    } else if (typeof closeOnOutsideClickOrCallback === 'function') {
      // If it's a function, default to true (we'll call the function when actually closing)
      shouldCloseOnOutsideClick = true;
    } else {
      // If undefined, default to true
      shouldCloseOnOutsideClick = true;
    }
    
    // Check if the click was outside the modal box
    if (shouldCloseOnOutsideClick && modalBox && !modalBox.contains(event.target as Node) && event.target === modalOverlay) {
      // Only close if the click was on the overlay but not on a child element
      closeModal();
    }
    
    // Always stop propagation to prevent game interaction while modal is open
    event.stopPropagation();
  };
  
  // Make closeModal available globally for the save action
  (window as any).__closeCurrentModal = closeModal;
  
  // Add event listeners
  document.addEventListener("keydown", keydownHandler, true);
  document.addEventListener("mousedown", outsideClickHandler, true);
  
  // Focus the first input element when the modal opens
  setTimeout(() => {
    const inputElement = modalBox.querySelector('input') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
      
      // Fix for input focus issue - don't prevent default on click
      // This was causing the input to lose focus when clicked while already focused
      inputElement.addEventListener('click', (e) => {
        // Don't stop propagation but also don't prevent default
        e.stopPropagation();
        
        // Focus the input, but don't need to prevent default
        inputElement.focus();
      });
    }
    
    // Add click handler to the modal content to ensure input can be re-focused
    modalContent.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    // Add special handling for the save button
    const saveBtn = modalBox.querySelector('#save-course-btn') as HTMLElement;
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }, 100);
  
  // Special handler for clicks directly on the modal box (but not its content)
  modalBox.addEventListener("mousedown", (event) => {
    // Only run this for clicks directly on the modalBox, not its children
    if (event.target === modalBox) {
      event.stopPropagation();
    }
  });
  
  // Make sure the modal doesn't allow context menu
  modalOverlay.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    return false;
  });
  
  modalBox.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    return false;
  });
  
  // Handler for document clicks to ensure input can always be focused
  function modalClickHandler(event: MouseEvent) {
    if (!document.getElementById("modal-overlay")) {
      // Remove this handler if modal is closed
      document.removeEventListener('click', modalClickHandler);
      return;
    }
    
    // Find the input element if it exists
    const input = document.getElementById('course-name') as HTMLInputElement;
    
    // If we clicked inside modal but not on the input itself
    if (modalBox.contains(event.target as Node) && input && event.target !== input) {
      // Check if the target is a button - if so, don't change focus
      if ((event.target as HTMLElement).tagName === 'BUTTON') {
        return;
      }
      
      // For any other elements, re-focus the input after a short delay
      setTimeout(() => {
        input.focus();
      }, 0);
    }
  }
  
  document.addEventListener('click', modalClickHandler);
}

/**
 * Creates a notification that automatically disappears
 */
export function showNotification(
  message: string,
  duration: number = 3000
): void {
  const container = document.getElementById("game-container");
  if (!container) return;
  
  const notification = createElement("div", 
    { id: "game-notification" },
    {
      position: "absolute",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "15px 25px",
      borderRadius: "5px",
      zIndex: "9000",
      opacity: "1",
      transition: "opacity 0.3s ease-in-out",
      border: "2px solid #4CAF50",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: "0.8em",
      textShadow: "2px 2px 0 #000",
      boxShadow: "0 0 10px rgba(76, 175, 80, 0.5)"
    },
    message
  );
  
  container.appendChild(notification);
  
  // Auto-remove after duration
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      removeElement("game-notification");
    }, 300);
  }, duration);
}

/**
 * Adds a pixelated background effect similar to the main menu
 */
function addPixelatedBackground(container: HTMLElement): void {
  // Create canvas for pixelated background
  const canvas = document.createElement('canvas');
  const pixelSize = 10; // Size of each "pixel"
  
  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Get context
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Fill with pixels of various colors
  for (let x = 0; x < canvas.width; x += pixelSize) {
    for (let y = 0; y < canvas.height; y += pixelSize) {
      // Generate mostly dark pixels with occasional accent pixels
      let r, g, b;
      
      const rand = Math.random();
      if (rand < 0.005) {
        // Accent pixel (green for Parkour Hobo)
        r = 50 + Math.random() * 20;
        g = 180 + Math.random() * 75;
        b = 50 + Math.random() * 20;
      } else {
        // Dark pixel with slight variation
        const value = 10 + Math.random() * 30;
        r = value;
        g = value;
        b = value + (Math.random() < 0.2 ? 10 : 0); // Slight blue tint sometimes
      }
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  // Apply canvas as background
  const dataUrl = canvas.toDataURL();
  container.style.backgroundImage = `url(${dataUrl})`;
  container.style.backgroundSize = '100% 100%';
}

// Add this function to Overlay.ts - just export the global function
export function closeModal(): void {
  const closeModalFn = (window as any).__closeCurrentModal;
  if (typeof closeModalFn === 'function') {
    closeModalFn();
  } else {
    // Fallback if the global function isn't available
    removeElement("modal-overlay");
  }
} 