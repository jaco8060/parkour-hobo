// Player system to handle player movement, physics, and animations
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlayerState, KeyState, AnimationActions } from "../utils/types.js";
import { PLAYER_SETTINGS } from "../utils/config.js";
import { sendMessageToParent } from "../utils/helpers.js";

/**
 * Creates a placeholder player character
 */
export function createPlaceholderPlayer(scene: THREE.Scene): THREE.Object3D {
  // Create a group to hold all player parts
  const playerGroup = new THREE.Group();
  playerGroup.position.copy(PLAYER_SETTINGS.DEFAULT_POSITION);
  
  // Create body
  const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.6);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.75;
  body.castShadow = true;
  playerGroup.add(body);
  
  // Create head
  const headGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xecf0f1 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.85;
  head.castShadow = true;
  playerGroup.add(head);
  
  // Create face to indicate front direction
  const faceGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
  
  // Create nose to indicate front
  const nose = new THREE.Mesh(faceGeometry, faceMaterial);
  nose.position.set(0, 1.85, 0.4); // Position it on the front of the head
  nose.castShadow = true;
  playerGroup.add(nose);
  
  // Create eyes to further indicate front
  const eyeGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.1);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  
  // Left eye
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.2, 1.9, 0.35);
  playerGroup.add(leftEye);
  
  // Right eye
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.2, 1.9, 0.35);
  playerGroup.add(rightEye);
  
  // Create arms
  const armGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
  
  // Left arm
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.65, 0.75, 0);
  leftArm.castShadow = true;
  playerGroup.add(leftArm);
  
  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.65, 0.75, 0);
  rightArm.castShadow = true;
  playerGroup.add(rightArm);
  
  // Create legs
  const legGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x34495e });
  
  // Left leg
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.3, -0.25, 0);
  leftLeg.castShadow = true;
  playerGroup.add(leftLeg);
  
  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.3, -0.25, 0);
  rightLeg.castShadow = true;
  playerGroup.add(rightLeg);
  
  // Add a small cube to the back to make it clearer which is back/front
  const backIndicator = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x95a5a6 })
  );
  backIndicator.position.set(0, 0.75, -0.35);
  playerGroup.add(backIndicator);
  
  // Add to scene
  scene.add(playerGroup);
  
  // Make sure the player is facing forward (negative Z is forward in Three.js)
  playerGroup.rotation.y = 0;
  
  // Mark as placeholder
  playerGroup.userData = { isPlaceholder: true };
  
  return playerGroup;
}

/**
 * Loads a character model from GLTF file
 */
export function loadPlayerCharacter(
  scene: THREE.Scene, 
  onLoaded: (player: THREE.Object3D, mixer: THREE.AnimationMixer, actions: AnimationActions) => void
): void {
  // For now use placeholder box, switch to GLTF loader when character model is ready
  const player = createPlaceholderPlayer(scene);
  
  // Send initial position
  sendPositionUpdate(player);
  
  // Since we're using placeholder, skip animation setup
  onLoaded(player, null as any, {
    idle: null,
    running: null,
    jumping: null
  });
  
  // Uncomment when you have a real character model:
  /*
  const loader = new GLTFLoader();
  loader.load(
    'character.glb',
    function (gltf) {
      const player = gltf.scene;
      player.position.copy(PLAYER_SETTINGS.DEFAULT_POSITION);
      player.castShadow = true;
      scene.add(player);
      
      // Animation setup
      const mixer = new THREE.AnimationMixer(player);
      const actions = {
        idle: mixer.clipAction(gltf.animations[0]),
        running: mixer.clipAction(gltf.animations[1]),
        jumping: mixer.clipAction(gltf.animations[2])
      };
      
      // Start with idle animation
      actions.idle.play();
      
      // Call the callback with loaded objects
      onLoaded(player, mixer, actions);
    },
    undefined,
    function (error) {
      console.error('Error loading character model:', error);
      
      // Fall back to placeholder
      const placeholder = createPlaceholderPlayer(scene);
      
      onLoaded(placeholder, null as any, {
        idle: null,
        running: null,
        jumping: null
      });
    }
  );
  */
}

/**
 * Checks for wall collisions and adjusts player position accordingly
 */
function checkWallCollision(
  position: THREE.Vector3,
  moveDirection: THREE.Vector3,
  platforms: THREE.Mesh[],
  playerRadius: number,
  wallCheckDistance: number,
  collisionSegments: number,
  slideFactorBase: number
): boolean {
  // No need to check if not moving
  if (moveDirection.length() === 0) return false;
  
  let collided = false;
  const normalizedDirection = moveDirection.clone().normalize();
  
  // Check for collisions at different angles around the player
  for (let i = 0; i < collisionSegments; i++) {
    // Calculate angle for this ray (0 to 2π)
    const angle = (i / collisionSegments) * Math.PI * 2;
    
    // Calculate ray direction (distributed around the player)
    const rayDirection = new THREE.Vector3(
      Math.sin(angle),
      0,
      Math.cos(angle)
    );
    
    // Only care about rays that are in the general direction we're moving
    // Dot product > 0 means the ray is pointing in roughly the same direction as movement
    const alignment = rayDirection.dot(normalizedDirection);
    if (alignment <= 0) continue;  // Skip rays pointing away from movement direction
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    const raycastPosition = position.clone();
    raycastPosition.y += 0.5; // Cast ray from middle of player, not feet
    
    raycaster.set(raycastPosition, rayDirection);
    
    // Check for intersections
    const intersects = raycaster.intersectObjects(platforms);
    
    // If we hit something within our collision distance
    if (intersects.length > 0 && intersects[0].distance < playerRadius + wallCheckDistance) {
      collided = true;
      
      // Get the collision normal (perpendicular to the hit surface)
      const collisionNormal = intersects[0].face?.normal || new THREE.Vector3(0, 0, 0);
      
      // Convert the normal from object space to world space
      const hitObject = intersects[0].object as THREE.Mesh;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hitObject.matrixWorld);
      collisionNormal.applyMatrix3(normalMatrix).normalize();
      
      // Calculate how much we should slide along the wall
      // Higher alignment = more direct collision = less sliding
      const slideFactor = slideFactorBase * (1 - alignment);
      
      // Project the movement vector onto the collision plane
      const projection = new THREE.Vector3();
      projection.copy(moveDirection);
      projection.projectOnPlane(collisionNormal);
      projection.multiplyScalar(slideFactor);
      
      // Replace the original movement with the slide projection
      moveDirection.copy(projection);
    }
  }
  
  return collided;
}

/**
 * Updates player character position and movement
 */
export function updatePlayer(
  deltaTime: number,
  player: THREE.Object3D,
  playerState: PlayerState,
  keyState: KeyState,
  platforms: THREE.Mesh[],
  scene: THREE.Scene,
  camera: THREE.Camera,
  cameraRotationAngle: number,
  updateCameraFn: () => void
): void {
  // Apply gravity
  const gravity = playerState.jumping ? playerState.gravity : playerState.fallGravity;
  playerState.velocity.y -= gravity * deltaTime;
  
  // Check if we're on the ground
  const raycaster = new THREE.Raycaster();
  raycaster.set(
    playerState.position,
    new THREE.Vector3(0, -1, 0)
  );
  
  const intersects = raycaster.intersectObjects(platforms);
  playerState.onGround = intersects.length > 0 && 
    intersects[0].distance < PLAYER_SETTINGS.GROUND_CHECK_DISTANCE;
  
  // Reset vertical velocity if on ground
  if (playerState.onGround && playerState.velocity.y < 0) {
    playerState.velocity.y = 0;
    playerState.jumping = false;
  }
  
  // Jump if on ground
  if (keyState.jump && playerState.onGround) {
    playerState.velocity.y = playerState.jumpPower;
    playerState.jumping = true;
    playerState.onGround = false;
  }
  
  // Get camera direction for movement
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();
  
  // Get right vector (perpendicular to camera direction)
  const right = new THREE.Vector3();
  right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
  
  // Calculate move direction
  const moveDirection = new THREE.Vector3(0, 0, 0);
  
  // Determine base movement speed based on sprint status
  let currentSpeed = playerState.speed;
  if (keyState.sprint) {
    currentSpeed *= PLAYER_SETTINGS.SPRINT_MULTIPLIER;
  }
  
  if (keyState.forward) {
    moveDirection.add(cameraDirection);
  }
  if (keyState.backward) {
    moveDirection.sub(cameraDirection);
  }
  
  // For left/right in FPS style, use A/D to rotate camera
  
  // Normalize if moving diagonally
  if (moveDirection.length() > 0) {
    moveDirection.normalize();
  }
  
  // Scale by speed and deltaTime
  moveDirection.multiplyScalar(currentSpeed * deltaTime);
  
  // Save original position before collision checks
  const originalPosition = playerState.position.clone();
  
  // Check for wall collisions and adjust movement if needed
  checkWallCollision(
    playerState.position,
    moveDirection,
    platforms,
    PLAYER_SETTINGS.PLAYER_RADIUS,
    PLAYER_SETTINGS.WALL_CHECK_DISTANCE,
    PLAYER_SETTINGS.COLLISION_SEGMENTS,
    PLAYER_SETTINGS.WALL_SLIDE_FACTOR
  );
  
  // Apply adjusted horizontal movement
  playerState.position.add(moveDirection);
  
  // Apply vertical velocity
  playerState.position.y += playerState.velocity.y * deltaTime;
  
  // Update player position
  player.position.copy(playerState.position);
  
  // Rotate player to face movement direction - ONLY if actually moving horizontally
  if (moveDirection.length() > 0.001) {
    // Calculate the angle to rotate to based on movement direction
    const targetRotationY = Math.atan2(moveDirection.x, moveDirection.z);
    
    // Prevent 360-degree spins by finding the shortest rotation path
    let rotationDifference = targetRotationY - playerState.rotation.y;
    
    // Normalize the rotation difference to be between -π and π
    while (rotationDifference > Math.PI) rotationDifference -= Math.PI * 2;
    while (rotationDifference < -Math.PI) rotationDifference += Math.PI * 2;
    
    // Use a stronger rotation factor when on ground for tighter controls
    // But slower rotation in air to prevent spinning
    const rotationLerpFactor = playerState.onGround ? 10 * deltaTime : 5 * deltaTime;
    
    // Apply rotation with smooth lerp
    playerState.rotation.y += rotationDifference * rotationLerpFactor;
    
    // Keep rotation within 0-2π range
    playerState.rotation.y = (playerState.rotation.y + Math.PI * 2) % (Math.PI * 2);
    
    // Apply rotation to player object
    player.rotation.y = playerState.rotation.y;
  }
  
  // Update camera position to follow player
  updateCameraFn();
  
  // Reset check for whether we were in the air for animation purposes
  playerState.jumping = !playerState.onGround;
  
  // Death check - if player falls below -20, reset position
  if (playerState.position.y < -20) {
    console.log("Player fell out of world, respawning");
    playerState.position.set(
      PLAYER_SETTINGS.DEFAULT_POSITION.x,
      PLAYER_SETTINGS.DEFAULT_POSITION.y,
      PLAYER_SETTINGS.DEFAULT_POSITION.z
    );
    playerState.velocity.set(0, 0, 0);
  }
  
  // Send position update to parent
  sendPositionUpdate(player, playerState);
}

/**
 * Updates the camera to follow the player
 */
export function updateCamera(
  camera: THREE.Camera,
  player: THREE.Object3D,
  cameraRotationAngle: number,
  followHeight: number = 5,
  followDistance: number = 7
): void {
  if (!player) return;
  
  // Calculate camera position on a circle around the player
  const cameraX = player.position.x + followDistance * Math.sin(cameraRotationAngle);
  const cameraZ = player.position.z + followDistance * Math.cos(cameraRotationAngle);
  
  // Set target position
  const targetPosition = new THREE.Vector3(cameraX, player.position.y + followHeight, cameraZ);
  
  // Smoothly move camera to new position
  camera.position.lerp(targetPosition, 0.1);
  
  // Look at player
  camera.lookAt(player.position);
}

/**
 * Updates player animations based on state
 */
export function updatePlayerAnimation(
  mixer: THREE.AnimationMixer | null,
  actions: AnimationActions,
  playerState: PlayerState,
  keyState: KeyState
): void {
  if (!mixer || !actions.idle || !actions.running || !actions.jumping) return;
  
  let newAnimation = "idle";
  
  if (playerState.jumping) {
    newAnimation = "jumping";
  } else if (keyState.forward || keyState.backward || keyState.left || keyState.right) {
    newAnimation = "running";
  }
  
  // Change animation if needed
  if (newAnimation !== playerState.currentAnimation) {
    // Fade out current animation
    const current = getActionByName(actions, playerState.currentAnimation);
    if (current) {
      current.fadeOut(0.2);
    }
    
    // Fade in new animation
    const next = getActionByName(actions, newAnimation);
    if (next) {
      next.reset().fadeIn(0.2).play();
    }
    
    playerState.currentAnimation = newAnimation;
  }
}

/**
 * Helper function to get animation action by name
 */
function getActionByName(
  actions: AnimationActions,
  name: string
): THREE.AnimationAction | null {
  switch (name) {
    case "idle": return actions.idle;
    case "running": return actions.running;
    case "jumping": return actions.jumping;
    default: return null;
  }
}

/**
 * Sends player position update to parent window
 */
export function sendPositionUpdate(player: THREE.Object3D, playerState?: PlayerState): void {
  if (!player) return;
  
  sendMessageToParent("positionUpdate", {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    onGround: playerState?.onGround ?? true,
    animation: playerState?.currentAnimation ?? "idle"
  });
}

/**
 * Resets player state to default values
 */
export function resetPlayerState(): PlayerState {
  return {
    position: PLAYER_SETTINGS.DEFAULT_POSITION.clone(),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    onGround: true,
    jumping: false,
    speed: PLAYER_SETTINGS.MOVEMENT_SPEED,
    jumpPower: PLAYER_SETTINGS.JUMP_POWER,
    gravity: PLAYER_SETTINGS.GRAVITY,
    fallGravity: PLAYER_SETTINGS.FALL_GRAVITY,
    currentAnimation: "idle"
  };
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
  const isSprinting = keyState.sprint;
  
  // Get the parts of the player
  const arms = player.children.filter(child => 
    child.position.y === 0.75 && (child.position.x === -0.65 || child.position.x === 0.65));
  const legs = player.children.filter(child => 
    child.position.y === -0.25 && (child.position.x === -0.3 || child.position.x === 0.3));
  
  if (isMoving) {
    // Animate arms and legs while moving
    // Increase animation speed when sprinting
    const baseSpeed = 5;
    const speed = isSprinting ? baseSpeed * 1.8 : baseSpeed;
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