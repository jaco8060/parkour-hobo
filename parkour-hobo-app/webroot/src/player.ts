// webroot/src/player.ts
// Copied from your original src/player.ts
// Adapted callbacks and removed localStorage control saving/loading

import * as THREE from "three";
// Make sure the path to types is correct relative to this file
import { Block, Vector3, AtmosphereSettings /* Removed PlayerControls, DEFAULT_CONTROLS */ } from "./types.js";
// Import message types to communicate with Devvit
import type { WebViewMessage } from './message.js'; // Adjust path as needed

/**
 * Helper function to send messages to the parent Devvit frame.
 * @param msg The message payload conforming to WebViewMessage.
 */
function postDevvitMessage(msg: WebViewMessage): void {
  if (window.parent) {
    window.parent.postMessage(msg, '*');
  } else {
    console.error("Cannot post message: not running inside an iframe (window.parent is null)");
  }
}


export class Player {
  mesh: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  gravity: number = 15;

  // Movement control properties - Hardcoded defaults for simplicity in webview
  // Could add internal customization later if needed
  private controls = {
    forward: "w",
    backward: "s",
    left: "a",
    right: "d",
    jump: " ", // Space
  };
  private keys: { [key: string]: boolean } = {};
  private isMoving: boolean = false;
  private camera: THREE.PerspectiveCamera;
  private speed: number = 5; // Units per second

  // Rotation and camera properties
  private cameraRotationSpeed: number = 2; // Radians per second
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 2, 5);
  private cameraTargetOffset: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0);
  private playerDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private rotationAngle: number = 0;

  // Physics properties
  private isGrounded: boolean = false;
  private playerHeight: number = 1.5; // Total height of player
  private playerWidth: number = 0.5; // Width of player for collision
  private collisionBlocks: Block[] = [];
  private verticalVelocity: number = 0;
  private jumpForce: number = 8;
  private terminalVelocity: number = 20;

  // Kill zone properties
  private respawnPosition: Vector3;
  private isDead: boolean = false;
  private deathTimeout: number | null = null;
  private onDeath: (() => void) | null = null; // Keep internal callback for effects

  // Box for collision
  private collisionBox: THREE.Box3;
  private collisionOffsetY: number = 0.75; // Offset from center for the collision box
  private onLevelComplete: (() => void) | null = null; // Keep internal callback for effects
  private isLevelCompleted: boolean = false;

  constructor(position: Vector3, camera: THREE.PerspectiveCamera) {
    this.mesh = new THREE.Group();
    this.camera = camera;

    // Store initial position as respawn point
    this.respawnPosition = { ...position };

    // --- Player Model Creation (copied directly, assumed correct) ---
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x4d3b21 });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = 0.35;
    this.mesh.add(this.body);
    const addPatch = (x: number, y: number, z: number, width: number, height: number, depth: number) => { /* ... patch code ... */
        const patchGeometry = new THREE.BoxGeometry(width, height, depth);
        const patchMaterial = new THREE.MeshBasicMaterial({ color: 0x5d4037 });
        const patch = new THREE.Mesh(patchGeometry, patchMaterial);
        patch.position.set(x, y, z);
        this.body.add(patch);
    };
    addPatch(0.1, 0.1, 0.16, 0.2, 0.2, 0.01);
    addPatch(-0.15, -0.2, 0.16, 0.15, 0.15, 0.01);
    addPatch(0.18, -0.1, 0.16, 0.1, 0.25, 0.01);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xc8a080 });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = 0.95;
    this.mesh.add(this.head);
    const beanieGeometry = new THREE.BoxGeometry(0.44, 0.15, 0.44);
    const beanieMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
    const beanie = new THREE.Mesh(beanieGeometry, beanieMaterial);
    beanie.position.y = 0.25;
    this.head.add(beanie);
    const beanieRimGeometry = new THREE.BoxGeometry(0.45, 0.08, 0.45);
    const beanieRimMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
    const beanieRim = new THREE.Mesh(beanieRimGeometry, beanieRimMaterial);
    beanieRim.position.y = 0.11;
    beanie.add(beanieRim);
    const stubbleGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.35);
    const stubbleMaterial = new THREE.MeshBasicMaterial({ color: 0x3d3d3d });
    const stubble = new THREE.Mesh(stubbleGeometry, stubbleMaterial);
    stubble.position.y = -0.25;
    stubble.position.z = 0.03;
    this.head.add(stubble);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0x1b2631 });
    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.leftLeg.position.set(0.15, -0.25, 0);
    this.mesh.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.rightLeg.position.set(-0.15, -0.25, 0);
    this.mesh.add(this.rightLeg);
    const leftLegTatterGeometry = new THREE.BoxGeometry(0.18, 0.07, 0.18);
    const leftLegTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x17202a });
    const leftLegTatter = new THREE.Mesh(leftLegTatterGeometry, leftLegTatterMaterial);
    leftLegTatter.position.y = -0.25;
    this.leftLeg.add(leftLegTatter);
    const rightLegTatterGeometry = new THREE.BoxGeometry(0.18, 0.07, 0.18);
    const rightLegTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x17202a });
    const rightLegTatter = new THREE.Mesh(rightLegTatterGeometry, rightLegTatterMaterial);
    rightLegTatter.position.y = -0.25;
    this.rightLeg.add(rightLegTatter);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshBasicMaterial({ color: 0x4d3b21 });
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(0.325, 0.35, 0);
    this.mesh.add(this.leftArm);
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(-0.325, 0.35, 0);
    this.mesh.add(this.rightArm);
    const leftArmTatterGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.18);
    const leftArmTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x5d4037 });
    const leftArmTatter = new THREE.Mesh(leftArmTatterGeometry, leftArmTatterMaterial);
    leftArmTatter.position.set(0.04, -0.22, 0);
    this.leftArm.add(leftArmTatter);
    const rightArmTatterGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.18);
    const rightArmTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x5d4037 });
    const rightArmTatter = new THREE.Mesh(rightArmTatterGeometry, rightArmTatterMaterial);
    rightArmTatter.position.set(-0.04, -0.22, 0);
    this.rightArm.add(rightArmTatter);
    const leftGloveGeometry = new THREE.BoxGeometry(0.17, 0.15, 0.17);
    const leftGloveMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
    const leftGlove = new THREE.Mesh(leftGloveGeometry, leftGloveMaterial);
    leftGlove.position.y = -0.2;
    this.leftArm.add(leftGlove);
    const rightGloveGeometry = new THREE.BoxGeometry(0.17, 0.15, 0.17);
    const rightGloveMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
    const rightGlove = new THREE.Mesh(rightGloveGeometry, rightGloveMaterial);
    rightGlove.position.y = -0.2;
    this.rightArm.add(rightGlove);
    // --- End Player Model Creation ---

    // Set initial position
    this.mesh.position.set(position.x, position.y, position.z);

    // Initialize collision box
    this.collisionBox = new THREE.Box3();
    this.updateCollisionBox();

    // Initialize player direction and update camera position
    this.updateCamera();

    // Set up control event listeners
    this.setupEventListeners();

    // Control loading/saving REMOVED
  }

  private setupEventListeners() {
    // Keyboard events bound directly
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
  }

  update(delta: number, time: number, blocks: Block[]) {
    // Don't update if player is dead or level completed (to prevent further actions)
    if (this.isDead || this.isLevelCompleted) return;

    // Store blocks for collision detection
    this.collisionBlocks = blocks;

    // Check if player is moving based on key states
    this.isMoving =
      this.keys[this.controls.forward] ||
      this.keys[this.controls.backward] ||
      this.keys[this.controls.left] ||
      this.keys[this.controls.right];

    // Handle rotation and movement
    this.handleRotation(delta);

    // Apply physics (gravity, vertical velocity)
    this.applyPhysics(delta);

    // Handle movement with collision detection
    this.handleMovement(delta);

    // Update camera position to follow player
    this.updateCamera();

    // Check if player fell out of the world (y < -10)
    if (this.mesh.position.y < -10) {
      this.respawn(); // Use the die->respawn flow
      return;
    }

    // Apply animations based on state
    this.applyAnimations(time);


    // Update the collision box AFTER all movement/physics
    this.updateCollisionBox();
  }

  private applyPhysics(delta: number) {
    // Apply gravity
    this.verticalVelocity -= this.gravity * delta;

    // Limit fall speed to terminal velocity
    this.verticalVelocity = Math.max(this.verticalVelocity, -this.terminalVelocity);

    // Tentative vertical movement
    const dy = this.verticalVelocity * delta;
    const tentativeY = this.mesh.position.y + dy;

    // Check vertical collision BEFORE applying movement
    const verticalCollision = this.checkVerticalCollision(tentativeY);

    if (verticalCollision.collided) {
        // Adjust position to collision surface
        this.mesh.position.y = verticalCollision.positionY;
        // Stop vertical velocity based on collision type
        if ((dy > 0 && verticalCollision.type === 'bottom') || (dy < 0 && verticalCollision.type === 'top')) {
            this.verticalVelocity = 0;
        }
        this.isGrounded = (dy < 0 && verticalCollision.type === 'top'); // Grounded only if landing
    } else {
        // No vertical collision, apply movement
        this.mesh.position.y = tentativeY;
        this.isGrounded = false; // Not grounded if freely moving vertically
    }

    // Check for kill zones and finish zones AFTER position update
    this.checkSpecialZones();
  }

  // Separated vertical collision check
  private checkVerticalCollision(tentativeY: number): { collided: boolean; positionY: number; type: 'top' | 'bottom' | 'none' } {
    // Update collision box for the *tentative* position
    const tentativeCollisionBox = this.collisionBox.clone();
    tentativeCollisionBox.min.y = tentativeY - this.collisionOffsetY;
    tentativeCollisionBox.max.y = tentativeY + this.playerHeight - this.collisionOffsetY;

    for (const block of this.collisionBlocks) {
        if (!block.mesh || block.type === 'killZone' || block.type === 'killZoneLarge') continue; // Skip non-collidable

        const blockBox = new THREE.Box3().setFromObject(block.mesh);

        if (tentativeCollisionBox.intersectsBox(blockBox)) {
            // Check if landing on top
            if (this.verticalVelocity <= 0 && tentativeCollisionBox.min.y < blockBox.max.y && this.mesh.position.y >= blockBox.max.y - 0.01) { // Check previous position was above
                return { collided: true, positionY: blockBox.max.y + this.collisionOffsetY, type: 'top' };
            }
            // Check if hitting bottom
            if (this.verticalVelocity > 0 && tentativeCollisionBox.max.y > blockBox.min.y && this.mesh.position.y + this.playerHeight <= blockBox.min.y + 0.01) { // Check previous pos was below
                return { collided: true, positionY: blockBox.min.y - this.playerHeight + this.collisionOffsetY, type: 'bottom' };
            }
        }
    }

     // Check ground collision (y=0)
     if (tentativeY - this.collisionOffsetY < 0) {
         return { collided: true, positionY: this.collisionOffsetY, type: 'top' };
     }


    return { collided: false, positionY: tentativeY, type: 'none' };
  }

  // Check for kill zones and finish zone separately after position is finalized for the frame
  private checkSpecialZones() {
      this.updateCollisionBox(); // Ensure collision box is current

      for (const block of this.collisionBlocks) {
          if (!block.mesh) continue;

          const blockBox = new THREE.Box3().setFromObject(block.mesh);

          // Finish Block Check
          if (block.type === 'finish' && this.collisionBox.intersectsBox(blockBox)) {
              if (!this.isLevelCompleted) {
                  this.isLevelCompleted = true;
                  console.log('Finish block reached!');
                  postDevvitMessage({ type: 'levelComplete' });
                  if (this.onLevelComplete) {
                      this.onLevelComplete(); // Trigger internal callback if set
                  }
              }
              // No return, player can stay on finish block
          }

          // Kill Zone Check
          if ((block.type === 'killZone' || block.type === 'killZoneLarge')) {
              let killZoneBox = blockBox;
              // If it's a group, use the base mesh for collision
              if (block.mesh instanceof THREE.Group && block.mesh.children.length > 0 && block.mesh.children[0] instanceof THREE.Mesh) {
                  killZoneBox = new THREE.Box3().setFromObject(block.mesh.children[0]);
              }

              if (this.collisionBox.intersectsBox(killZoneBox)) {
                  this.die();
                  return; // Exit early if died
              }
          }
      }
  }


  // Simplified Collision checking (no longer handles vertical, only horizontal)
  private checkHorizontalCollision(tentativeX: number, tentativeZ: number): { collided: boolean; positionX: number; positionZ: number } {
     // Update collision box for the *tentative* position
     const tentativeCollisionBox = this.collisionBox.clone();
     const halfWidth = (this.collisionBox.max.x - this.collisionBox.min.x) / 2;
     tentativeCollisionBox.min.x = tentativeX - halfWidth;
     tentativeCollisionBox.max.x = tentativeX + halfWidth;
     tentativeCollisionBox.min.z = tentativeZ - halfWidth; // Assuming square base for simplicity
     tentativeCollisionBox.max.z = tentativeZ + halfWidth;

      for (const block of this.collisionBlocks) {
         if (!block.mesh || block.type === 'killZone' || block.type === 'killZoneLarge' || block.type === 'finish') continue; // Skip non-collidable

         const blockBox = new THREE.Box3().setFromObject(block.mesh);

          // Check simple intersection first
          if (tentativeCollisionBox.intersectsBox(blockBox)) {

            // Check if the collision is primarily horizontal (and not just landing/hitting head)
            // A simple check: if vertical overlap is less than horizontal overlap
            const yOverlap = Math.max(0, Math.min(tentativeCollisionBox.max.y, blockBox.max.y) - Math.max(tentativeCollisionBox.min.y, blockBox.min.y));
            const xOverlap = Math.max(0, Math.min(tentativeCollisionBox.max.x, blockBox.max.x) - Math.max(tentativeCollisionBox.min.x, blockBox.min.x));
            const zOverlap = Math.max(0, Math.min(tentativeCollisionBox.max.z, blockBox.max.z) - Math.max(tentativeCollisionBox.min.z, blockBox.min.z));

            // If significant horizontal overlap compared to vertical, treat as horizontal collision
            if (xOverlap > 0.01 || zOverlap > 0.01) {
                // More sophisticated push-back needed here, but for now, just prevent movement
                 // Calculate minimum pushback needed
                const pushX = (tentativeCollisionBox.getCenter(new THREE.Vector3()).x < blockBox.getCenter(new THREE.Vector3()).x) ?
                              -(tentativeCollisionBox.max.x - blockBox.min.x) : (blockBox.max.x - tentativeCollisionBox.min.x);
                const pushZ = (tentativeCollisionBox.getCenter(new THREE.Vector3()).z < blockBox.getCenter(new THREE.Vector3()).z) ?
                              -(tentativeCollisionBox.max.z - blockBox.min.z) : (blockBox.max.z - tentativeCollisionBox.min.z);

                // Apply smallest pushback
                if (Math.abs(pushX) < Math.abs(pushZ)) {
                     return { collided: true, positionX: this.mesh.position.x, positionZ: tentativeZ }; // Block X movement
                } else {
                     return { collided: true, positionX: tentativeX, positionZ: this.mesh.position.z }; // Block Z movement
                }
                // Simple stop: return { collided: true, positionX: this.mesh.position.x, positionZ: this.mesh.position.z };
            }
         }
      }

     return { collided: false, positionX: tentativeX, positionZ: tentativeZ };
   }


  private updateCollisionBox() {
    // Using playerWidth for X and Z dimensions
    const halfWidth = this.playerWidth * 0.45; // Slightly reduced for better feel
    const bottomY = this.mesh.position.y - this.collisionOffsetY;
    const topY = bottomY + this.playerHeight;

    this.collisionBox.min.set(
      this.mesh.position.x - halfWidth,
      bottomY,
      this.mesh.position.z - halfWidth
    );
    this.collisionBox.max.set(
      this.mesh.position.x + halfWidth,
      topY,
      this.mesh.position.z + halfWidth
    );
  }

  private handleRotation(delta: number) {
    const rotationAmount = this.cameraRotationSpeed * delta;
    let didRotate = false;

    if (this.keys[this.controls.left]) {
      this.rotationAngle += rotationAmount; // Adjust based on how mesh rotation is applied
      didRotate = true;
    }
    if (this.keys[this.controls.right]) {
      this.rotationAngle -= rotationAmount; // Adjust based on how mesh rotation is applied
      didRotate = true;
    }

    if(didRotate){
        this.mesh.rotation.y = this.rotationAngle; // Apply rotation to mesh
        // Update the player's direction vector based on mesh rotation
        this.mesh.getWorldDirection(this.playerDirection);
        // Ensure direction is horizontal (remove y component if necessary)
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
    }
  }

  private handleMovement(delta: number) {
    const distance = this.speed * delta;
    let dx = 0;
    let dz = 0;

    // Calculate desired movement based on input and player direction
    if (this.keys[this.controls.forward]) {
      dx -= this.playerDirection.x * distance;
      dz -= this.playerDirection.z * distance;
    }
    if (this.keys[this.controls.backward]) {
      dx += this.playerDirection.x * distance;
      dz += this.playerDirection.z * distance;
    }

    if (dx !== 0 || dz !== 0) {
        const tentativeX = this.mesh.position.x + dx;
        const tentativeZ = this.mesh.position.z + dz;

        // Check for horizontal collisions BEFORE applying movement
        const horizontalCollision = this.checkHorizontalCollision(tentativeX, tentativeZ);

        if (!horizontalCollision.collided) {
            // No collision, apply full movement
            this.mesh.position.x = tentativeX;
            this.mesh.position.z = tentativeZ;
        } else {
            // Apply corrected position if collision occurred (optional, simple stop might be okay)
             this.mesh.position.x = horizontalCollision.positionX;
             this.mesh.position.z = horizontalCollision.positionZ;

             // Try sliding: Check collision only on X axis if Z was blocked, and vice-versa
            // const collisionXOnly = this.checkHorizontalCollision(tentativeX, this.mesh.position.z);
            // if (!collisionXOnly.collided) {
            //      this.mesh.position.x = tentativeX;
            // } else {
            //     const collisionZOnly = this.checkHorizontalCollision(this.mesh.position.x, tentativeZ);
            //     if (!collisionZOnly.collided) {
            //          this.mesh.position.z = tentativeZ;
            //     }
            // }

        }
    }
  }

  private updateCamera() {
    // Camera follows player
    // Use the mesh's rotation directly
    const offset = this.cameraOffset.clone();
    offset.applyEuler(this.mesh.rotation); // Apply player's rotation to the offset

    this.camera.position.copy(this.mesh.position).add(offset);

    // Look at a point slightly above the player's base
    const lookAtTarget = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + this.cameraTargetOffset.y, // Look slightly above feet
      this.mesh.position.z
    );

    this.camera.lookAt(lookAtTarget);
  }

  private applyAnimations(time: number) {
     // Idle animation only when grounded and not moving
     if (!this.isMoving && this.isGrounded) {
       // Subtle bobbing
       // this.mesh.position.y += Math.sin(time * 2) * 0.005; // Careful: this fights physics, maybe animate parts?
       this.body.position.y = 0.35 + Math.sin(time * 2) * 0.01;
       // Reset legs/arms if they were animating
       this.leftLeg.rotation.x = 0;
       this.rightLeg.rotation.x = 0;
       this.leftArm.rotation.x = 0;
       this.rightArm.rotation.x = 0;
     }

     // Running animation only when grounded and moving
     if (this.isMoving && this.isGrounded) {
       const runCycle = time * 10;
       this.leftLeg.rotation.x = Math.sin(runCycle) * 0.7;
       this.rightLeg.rotation.x = Math.sin(runCycle + Math.PI) * 0.7;
       this.leftArm.rotation.x = Math.sin(runCycle + Math.PI) * 0.5;
       this.rightArm.rotation.x = Math.sin(runCycle) * 0.5;
       // Reset body bobbing if applied
       this.body.position.y = 0.35;
     }

     // Jumping pose when in air
     if (!this.isGrounded) {
       // Tucked legs/arms pose
       this.leftLeg.rotation.x = -0.5;
       this.rightLeg.rotation.x = -0.5;
       this.leftArm.rotation.x = -0.8;
       this.rightArm.rotation.x = -0.8;
       // Reset body bobbing if applied
       this.body.position.y = 0.35;
     }
   }


  jump() {
    // Only allow jumping if player is on ground
    if (this.isGrounded) {
      this.isGrounded = false;
      this.verticalVelocity = this.jumpForce;
    }
  }

  getPosition(): Vector3 {
    return {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
    };
  }

  setPosition(position: Vector3) {
    this.mesh.position.set(position.x, position.y, position.z);
    // Reset physics
    this.verticalVelocity = 0;
    this.isGrounded = false; // Force re-check on next update

    // Reset rotation when position is explicitly set (e.g., respawn)
    this.rotationAngle = 0;
    this.mesh.rotation.y = 0;
     // Re-calculate direction based on reset rotation
    this.mesh.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();

    this.updateCamera(); // Update camera immediately

    // Update collision box
    this.updateCollisionBox();

    // Update respawn position
    this.respawnPosition = { ...position };

    // Reset completion state on explicit setPosition (e.g. reset button)
    this.isLevelCompleted = false;
  }

  // Control management methods REMOVED (updateControls, saveControls, loadControls, getControls, resetControls)
  // Rely on hardcoded this.controls or implement webview-internal customization if needed.

  // Kill zone methods
  private die() {
    if (this.isDead) return;
    this.isDead = true;
    console.log('Player died!');

    // Call the internal death callback if it exists (for effects)
    if (this.onDeath) {
      this.onDeath();
    }

    // --- Death Effect (Turn Red) ---
    const meshColorMap = new Map<THREE.Mesh, THREE.Color>();
    const collectMeshes = (parent: THREE.Object3D) => {
      parent.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          if (!meshColorMap.has(child)) {
            meshColorMap.set(child, child.material.color.clone());
          }
        }
      });
    };
    collectMeshes(this.mesh);
    meshColorMap.forEach((_, mesh) => {
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.color.set(0xff0000);
      }
    });
    // --- End Death Effect ---


    // Wait a moment, then respawn
    this.deathTimeout = window.setTimeout(() => {
      // Restore original colors
      meshColorMap.forEach((originalColor, mesh) => {
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.color.copy(originalColor);
        }
      });
      this.respawn();
    }, 500); // Short delay before respawn
  }

  private respawn() {
    // Reset isDead flag
    this.isDead = false;

    console.log('Respawning player at:', this.respawnPosition);
    // Use setPosition to handle resetting physics, rotation, camera etc.
    this.setPosition(this.respawnPosition);

  }

  // Update the respawn position (e.g., if checkpoints were added)
  updateRespawnPosition(position: Vector3) {
    this.respawnPosition = { ...position };
  }

  // Set internal death callback (e.g., for sounds or screen effects within webview)
  setOnDeath(callback: () => void) {
    this.onDeath = callback;
  }

  // Set internal level complete callback (e.g., for sounds or effects within webview)
  // The primary notification to Devvit happens via postDevvitMessage in checkSpecialZones
  setOnLevelComplete(callback: () => void) {
    this.onLevelComplete = callback;
  }

  // Reset level completion state externally if needed (e.g., via Devvit message)
  resetLevelCompletion() {
    this.isLevelCompleted = false;
  }

  // Clean up event listeners on destroy
  destroy() {
    console.log('Destroying Player instance...');
    window.removeEventListener("keydown", this.keydownHandler);
    window.removeEventListener("keyup", this.keyupHandler);

    // Clear any pending timeouts
    if (this.deathTimeout !== null) {
      window.clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }

    // Reset any callbacks
    this.onDeath = null;
    this.onLevelComplete = null;
  }

  // Event handlers using arrow functions to maintain 'this' context
  private keydownHandler = (event: KeyboardEvent) => {
    // Prevent default browser actions for spacebar etc. if needed
     if (event.key === ' ') {
       event.preventDefault();
     }
    this.keys[event.key.toLowerCase()] = true;

    // Trigger jump directly on keydown for responsiveness
    if (event.key.toLowerCase() === this.controls.jump) {
      this.jump();
    }
  };

  private keyupHandler = (event: KeyboardEvent) => {
    this.keys[event.key.toLowerCase()] = false;
  };
}
