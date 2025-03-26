// Overlay component handling game pauses and overlays
import { createElement, removeElement } from "../utils/helpers.js";

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
        <h2 style="margin-bottom: 10px; color: #4CAF50;">Parkour Challenge</h2>
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
  onClose?: () => void
): void {
  const container = document.getElementById("game-container");
  if (!container) return;
  
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
      zIndex: "10000"
    }
  );
  
  const modalBox = createElement("div", 
    { id: "modal-box" },
    {
      backgroundColor: "#fff",
      borderRadius: "8px",
      padding: "20px",
      maxWidth: "500px",
      width: "80%",
      maxHeight: "80vh",
      overflowY: "auto"
    }
  );
  
  const modalTitle = createElement("h2", 
    {},
    {
      margin: "0 0 15px 0",
      color: "#333"
    },
    title
  );
  
  const modalContent = createElement("div", 
    {},
    {
      marginBottom: "20px",
      lineHeight: "1.4"
    },
    content
  );
  
  const closeButton = createElement("button", 
    {},
    {
      padding: "8px 16px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      float: "right"
    },
    "Close"
  );
  
  closeButton.addEventListener("click", () => {
    removeElement("modal-overlay");
    if (onClose) onClose();
  });
  
  modalBox.appendChild(modalTitle);
  modalBox.appendChild(modalContent);
  modalBox.appendChild(closeButton);
  modalOverlay.appendChild(modalBox);
  container.appendChild(modalOverlay);
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
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "10px 20px",
      borderRadius: "5px",
      zIndex: "9000",
      opacity: "1",
      transition: "opacity 0.3s ease-in-out"
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