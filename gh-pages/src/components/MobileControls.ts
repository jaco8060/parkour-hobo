// Mobile controls component for touch interfaces
import { createElement } from "../../../src/utils/helpers.js";
import { KeyState, TouchJoystick } from "../../../src/utils/types.js";

/**
 * Creates mobile joystick and button controls
 */
export function createMobileControls(
  container: HTMLElement,
  keyState: KeyState,
  touchJoystick: TouchJoystick
): void {
  // Create joystick
  const joystickElement = createElement("div", 
    { id: "joystick" },
    {
      position: "absolute",
      left: "100px",
      bottom: "100px",
      width: "100px",
      height: "100px",
      borderRadius: "50%",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      border: "2px solid white",
      touchAction: "none"
    }
  );
  
  // Create joystick knob
  const knobElement = createElement("div", 
    { id: "joystick-knob" },
    {
      position: "absolute",
      left: "35px",
      top: "35px",
      width: "30px",
      height: "30px",
      borderRadius: "50%",
      backgroundColor: "rgba(255, 255, 255, 0.7)"
    }
  );
  
  joystickElement.appendChild(knobElement);
  
  // Create jump button
  const jumpButton = createElement("div", 
    { id: "jump-button" },
    {
      position: "absolute",
      right: "100px",
      bottom: "100px",
      width: "80px",
      height: "80px",
      borderRadius: "50%",
      backgroundColor: "rgba(255, 80, 80, 0.7)",
      border: "2px solid white",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      color: "white",
      fontWeight: "bold",
      fontSize: "18px",
      touchAction: "none"
    },
    "JUMP"
  );
  
  // Add touch events to jump button
  jumpButton.addEventListener("touchstart", () => {
    keyState.jump = true;
  });
  
  jumpButton.addEventListener("touchend", () => {
    keyState.jump = false;
  });
  
  // Add elements to container
  container.appendChild(joystickElement);
  container.appendChild(jumpButton);
}

/**
 * Handle touch events for mobile joystick
 */
export function setupMobileTouchHandlers(
  container: HTMLElement,
  keyState: KeyState,
  touchJoystick: TouchJoystick,
  joystickPosition: { x: number, y: number }
): void {
  container.addEventListener("touchstart", (event: TouchEvent) => handleTouchStart(event, touchJoystick));
  container.addEventListener("touchmove", (event: TouchEvent) => handleTouchMove(event, touchJoystick, joystickPosition));
  container.addEventListener("touchend", () => handleTouchEnd(touchJoystick, joystickPosition, keyState));
}

/**
 * Handle touch start for joystick
 */
function handleTouchStart(
  event: TouchEvent,
  touchJoystick: TouchJoystick
): void {
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
    }
  }
}

/**
 * Handle touch move for joystick
 */
function handleTouchMove(
  event: TouchEvent,
  touchJoystick: TouchJoystick,
  joystickPosition: { x: number, y: number }
): void {
  if (touchJoystick.active) {
    event.preventDefault();
    const touch = event.touches[0];
    updateJoystickPosition(touch.clientX, touch.clientY, touchJoystick, joystickPosition);
  }
}

/**
 * Handle touch end for joystick
 */
function handleTouchEnd(
  touchJoystick: TouchJoystick,
  joystickPosition: { x: number, y: number },
  keyState: KeyState
): void {
  if (touchJoystick.active) {
    touchJoystick.active = false;
    joystickPosition.x = 0;
    joystickPosition.y = 0;
    
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

/**
 * Update joystick position based on touch coordinates
 */
function updateJoystickPosition(
  touchX: number,
  touchY: number,
  touchJoystick: TouchJoystick,
  joystickPosition: { x: number, y: number }
): void {
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
}

/**
 * Convert joystick position to key states
 */
export function updateKeyStatesFromJoystick(
  joystickPosition: { x: number, y: number },
  keyState: KeyState
): void {
  keyState.forward = joystickPosition.y < -0.3;
  keyState.backward = joystickPosition.y > 0.3;
  keyState.left = joystickPosition.x < -0.3;
  keyState.right = joystickPosition.x > 0.3;
}

/**
 * Creates specific builder mode controls for mobile
 */
export function setupMobileBuilderControls(
  container: HTMLElement,
  buildControls: any
): void {
  // Create movement pad
  const movementPad = createElement("div", 
    { id: "movement-pad" },
    {
      position: "absolute",
      bottom: "100px",
      left: "50px",
      width: "150px",
      height: "150px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr"
    }
  );
  
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
    const button = createElement("button", 
      {},
      {
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        border: "1px solid white",
        color: "white",
        fontSize: "20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      },
      dir.text
    );
    
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
  
  container.appendChild(movementPad);
  
  // Add vertical movement buttons
  addVerticalControlButtons(container, buildControls);
  
  // Add rotation buttons
  addRotationControlButtons(container, buildControls);
}

/**
 * Add vertical movement buttons for builder mode
 */
function addVerticalControlButtons(
  container: HTMLElement,
  buildControls: any
): void {
  const upButton = createElement("button", 
    {},
    {
      position: "absolute",
      right: "50px",
      bottom: "150px",
      width: "60px",
      height: "60px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      border: "1px solid white",
      borderRadius: "50%",
      color: "white"
    },
    "Up"
  );
  
  upButton.addEventListener("touchstart", () => {
    buildControls.up = true;
  });
  
  upButton.addEventListener("touchend", () => {
    buildControls.up = false;
  });
  
  const downButton = createElement("button", 
    {},
    {
      position: "absolute",
      right: "50px",
      bottom: "80px",
      width: "60px",
      height: "60px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      border: "1px solid white",
      borderRadius: "50%",
      color: "white"
    },
    "Down"
  );
  
  downButton.addEventListener("touchstart", () => {
    buildControls.down = true;
  });
  
  downButton.addEventListener("touchend", () => {
    buildControls.down = false;
  });
  
  container.appendChild(upButton);
  container.appendChild(downButton);
}

/**
 * Add rotation control buttons for builder mode
 */
function addRotationControlButtons(
  container: HTMLElement,
  buildControls: any
): void {
  const rotateLeftButton = createElement("button", 
    {},
    {
      position: "absolute",
      right: "120px",
      bottom: "115px",
      width: "60px",
      height: "60px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      border: "1px solid white",
      borderRadius: "50%",
      color: "white",
      fontSize: "24px"
    },
    "⟲"
  );
  
  rotateLeftButton.addEventListener("touchstart", () => {
    buildControls.rotateLeft = true;
  });
  
  rotateLeftButton.addEventListener("touchend", () => {
    buildControls.rotateLeft = false;
  });
  
  const rotateRightButton = createElement("button", 
    {},
    {
      position: "absolute",
      right: "190px",
      bottom: "115px",
      width: "60px",
      height: "60px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      border: "1px solid white",
      borderRadius: "50%",
      color: "white",
      fontSize: "24px"
    },
    "⟳"
  );
  
  rotateRightButton.addEventListener("touchstart", () => {
    buildControls.rotateRight = true;
  });
  
  rotateRightButton.addEventListener("touchend", () => {
    buildControls.rotateRight = false;
  });
  
  container.appendChild(rotateLeftButton);
  container.appendChild(rotateRightButton);
} 