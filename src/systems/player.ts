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
  
  // Add to scene
  scene.add(playerGroup);
  
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
 * Updates the player physics and movement
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
  if (!player) return;
  
  // Movement direction based on input
  const moveDirection = new THREE.Vector3(0, 0, 0);
  
  // Get camera direction for movement relative to camera
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  cameraDirection.normalize();
  
  // Calculate right vector
  const right = new THREE.Vector3();
  right.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();
  
  // Apply input for forward/backward movement only
  if (keyState.forward) {
    moveDirection.add(cameraDirection);
  }
  if (keyState.backward) {
    moveDirection.sub(cameraDirection);
  }
  
  // Normalize movement direction if not zero
  if (moveDirection.lengthSq() > 0) {
    moveDirection.normalize();
    
    // Apply movement speed
    moveDirection.multiplyScalar(playerState.speed * deltaTime);
    
    // Update position with horizontal movement
    player.position.x += moveDirection.x;
    player.position.z += moveDirection.z;
    
    // Rotate player to face movement direction (only if actually moving)
    const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
    player.rotation.y = targetRotation;
  }
  
  // Apply gravity - use higher gravity when falling
  const currentGravity = playerState.velocity.y < 0 ? playerState.fallGravity : playerState.gravity;
  playerState.velocity.y -= currentGravity * deltaTime;
  
  // Apply jump if on ground
  if (keyState.jump && playerState.onGround) {
    playerState.velocity.y = playerState.jumpPower;
    playerState.onGround = false;
    playerState.jumping = true;
    console.log("Player jumped with velocity:", playerState.velocity.y);
  }
  
  // Apply vertical velocity
  player.position.y += playerState.velocity.y * deltaTime;
  
  // Check ground collision
  checkGroundCollision(player, playerState, platforms, scene);
  
  // Prevent falling below the ground
  if (player.position.y < 1) {
    player.position.y = 1;
    playerState.velocity.y = 0;
    playerState.onGround = true;
    playerState.jumping = false;
  }
  
  // Update camera to follow player
  updateCameraFn();
  
  // Send position update to parent
  sendPositionUpdate(player, playerState);
}

/**
 * Checks for collisions with the ground and platforms
 */
export function checkGroundCollision(
  player: THREE.Object3D,
  playerState: PlayerState,
  platforms: THREE.Mesh[],
  scene: THREE.Scene
): void {
  const raycaster = new THREE.Raycaster();
  raycaster.set(
    new THREE.Vector3(player.position.x, player.position.y, player.position.z),
    new THREE.Vector3(0, -1, 0)
  );
  
  // Find the ground mesh
  const groundMesh = scene.children.find(child => 
    child instanceof THREE.Mesh && child.rotation.x === -Math.PI / 2);
  
  // Create array of objects to check for collision
  const collisionObjects = [...platforms];
  if (groundMesh) collisionObjects.push(groundMesh as THREE.Mesh);
  
  // Check for collisions with the ground and platforms
  const intersects = raycaster.intersectObjects(collisionObjects);
  
  // If the player is very close to the ground or platform, consider them on the ground
  if (intersects.length > 0 && intersects[0].distance < PLAYER_SETTINGS.GROUND_CHECK_DISTANCE) {
    playerState.velocity.y = 0;
    player.position.y = intersects[0].point.y + 1;
    playerState.onGround = true;
    playerState.jumping = false;
  } else {
    playerState.onGround = false;
  }
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