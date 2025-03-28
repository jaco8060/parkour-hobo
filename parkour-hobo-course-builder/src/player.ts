import * as THREE from 'three';
import { Vector3, PlayerControls, DEFAULT_CONTROLS, Block } from './types';

export class Player {
  mesh: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  isJumping: boolean = false;
  jumpHeight: number = 2;
  jumpTime: number = 0;
  jumpDuration: number = 0.5;
  velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  gravity: number = 9.8;
  
  // Movement control properties
  private controls: PlayerControls = {...DEFAULT_CONTROLS};
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
  private playerWidth: number = 0.5;  // Width of player for collision
  private collisionBlocks: Block[] = [];
  private verticalVelocity: number = 0;
  private jumpForce: number = 8;
  private fallSpeed: number = 0;
  private terminalVelocity: number = 20;
  
  // Kill zone properties
  private respawnPosition: Vector3;
  private isDead: boolean = false;
  private deathTimeout: number | null = null;
  private onDeath: (() => void) | null = null;
  
  // Box for collision
  private collisionBox: THREE.Box3;
  private collisionOffsetY: number = 0.75; // Offset from center for the collision box

  constructor(position: Vector3, camera: THREE.PerspectiveCamera) {
    this.mesh = new THREE.Group();
    this.camera = camera;
    
    // Store initial position as respawn point
    this.respawnPosition = {...position};
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x965A3E });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = 0.35;
    this.mesh.add(this.body);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xE0AC69 });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = 0.95;
    this.mesh.add(this.head);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0x4D4D4D });
    
    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.leftLeg.position.set(0.15, -0.25, 0);
    this.mesh.add(this.leftLeg);
    
    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.rightLeg.position.set(-0.15, -0.25, 0);
    this.mesh.add(this.rightLeg);

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshBasicMaterial({ color: 0x965A3E });
    
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(0.325, 0.35, 0);
    this.mesh.add(this.leftArm);
    
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(-0.325, 0.35, 0);
    this.mesh.add(this.rightArm);

    // Set initial position
    this.mesh.position.set(position.x, position.y, position.z);
    
    // Initialize collision box
    this.collisionBox = new THREE.Box3();
    this.updateCollisionBox();
    
    // Initialize player direction and update camera position
    this.updateCamera();
    
    // Set up control event listeners
    this.setupEventListeners();
    
    // Load controls from local storage if available
    this.loadControls();
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  update(delta: number, time: number, blocks: Block[]) {
    // Don't update if player is dead
    if (this.isDead) return;
    
    // Store blocks for collision detection
    this.collisionBlocks = blocks;
    
    // Check if player is moving based on key states
    this.isMoving = this.keys[this.controls.forward] || 
                    this.keys[this.controls.backward] || 
                    this.keys[this.controls.left] || 
                    this.keys[this.controls.right];
    
    // Handle rotation and movement
    this.handleRotation(delta);
    
    // Apply physics
    this.applyPhysics(delta);
    
    // Handle movement with collision detection
    this.handleMovement(delta);
    
    // Update camera position to follow player
    this.updateCamera();
    
    // Check if player fell out of the world (y < -10)
    if (this.mesh.position.y < -10) {
      this.respawn();
      return;
    }
    
    // Idle animation only when grounded and not moving
    if (!this.isMoving && this.isGrounded) {
      this.mesh.position.y += Math.sin(time * 2) * 0.005;
    }

    // Running animation only when grounded
    if (this.isMoving && this.isGrounded) {
      this.leftLeg.rotation.x = Math.sin(time * 10) * 0.5;
      this.rightLeg.rotation.x = Math.sin(time * 10 + Math.PI) * 0.5;
      this.leftArm.rotation.x = Math.sin(time * 10 + Math.PI) * 0.25;
      this.rightArm.rotation.x = Math.sin(time * 10) * 0.25;
    }

    // Jumping pose when in air
    if (!this.isGrounded) {
      // Set legs and arms for jump
      this.leftLeg.rotation.x = -0.3;
      this.rightLeg.rotation.x = -0.3;
      this.leftArm.rotation.x = -0.6;
      this.rightArm.rotation.x = -0.6;
    }
    
    // Update the collision box
    this.updateCollisionBox();
  }
  
  private applyPhysics(delta: number) {
    // Apply gravity
    this.verticalVelocity -= this.gravity * delta;
    
    // Limit fall speed to terminal velocity
    if (this.verticalVelocity < -this.terminalVelocity) {
      this.verticalVelocity = -this.terminalVelocity;
    }
    
    // Move player vertically
    this.mesh.position.y += this.verticalVelocity * delta;
    
    // Check collision with ground and blocks
    this.checkGroundCollision();
    this.checkBlockCollisions();
    
    // Update collision box after movement
    this.updateCollisionBox();
  }
  
  private checkGroundCollision() {
    // Check if player is below ground level
    if (this.mesh.position.y < 0) {
      this.mesh.position.y = 0;
      this.verticalVelocity = 0;
      this.isGrounded = true;
      
      // Reset legs and arms to normal position
      if (this.isGrounded && !this.isMoving) {
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }
    }
  }
  
  private checkBlockCollisions() {
    this.isGrounded = false; // Reset grounded state
    
    // Get the bottom center of the player for better collision
    const playerBottom = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y - this.collisionOffsetY, // Bottom of player
      this.mesh.position.z
    );
    
    // Check collision with each block
    for (const block of this.collisionBlocks) {
      if (!block.mesh) continue;
      
      // Create a box3 for the block
      const blockBox = new THREE.Box3().setFromObject(block.mesh);
      
      // Check for kill zone - only check collision with the base platform (first child)
      if (block.type === 'killZone') {
        let killZoneBox;
        
        if (block.mesh instanceof THREE.Group && block.mesh.children.length > 0) {
          // Only check collision with the base platform, not the warning triangles
          killZoneBox = new THREE.Box3().setFromObject(block.mesh.children[0]);
        } else {
          killZoneBox = blockBox;
        }
        
        if (this.collisionBox.intersectsBox(killZoneBox)) {
          this.die();
          return;
        }
        continue; // Skip further collision checks for kill zones
      }
      
      // Check if player's collision box intersects with block
      if (this.collisionBox.intersectsBox(blockBox)) {
        // Get the intersection information
        const playerMinY = this.collisionBox.min.y;
        const blockMaxY = blockBox.max.y;
        const blockMinY = blockBox.min.y;
        
        // Check if player is above the block (landing)
        if (this.verticalVelocity < 0 && playerBottom.y > blockMaxY - 0.2) {
          // Land on top of the block
          this.mesh.position.y = blockMaxY + this.collisionOffsetY;
          this.verticalVelocity = 0;
          this.isGrounded = true;
          
          // Reset legs and arms to normal position if not moving
          if (!this.isMoving) {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
          }
        } 
        // Check for side/bottom collisions (prevent going through blocks)
        else {
          // Create a small box representing the player's feet
          const feetBox = new THREE.Box3().setFromObject(this.mesh);
          feetBox.min.y = this.collisionBox.min.y;
          feetBox.max.y = this.collisionBox.min.y + 0.1;
          
          // Only do horizontal collision if we're not standing on the block
          if (!feetBox.intersectsBox(blockBox)) {
            // Get horizontal position before collision
            const prevPosition = this.mesh.position.clone();
            
            // Calculate the penetration depth in each direction
            const rightPenetration = this.collisionBox.max.x - blockBox.min.x;
            const leftPenetration = blockBox.max.x - this.collisionBox.min.x;
            const frontPenetration = this.collisionBox.max.z - blockBox.min.z;
            const backPenetration = blockBox.max.z - this.collisionBox.min.z;
            
            // Find smallest penetration to push out
            const minPenetration = Math.min(
              rightPenetration, leftPenetration, 
              frontPenetration, backPenetration
            );
            
            // Push player out of the block based on the smallest penetration
            if (minPenetration === rightPenetration) {
              this.mesh.position.x = blockBox.min.x - this.playerWidth / 2;
            } else if (minPenetration === leftPenetration) {
              this.mesh.position.x = blockBox.max.x + this.playerWidth / 2;
            } else if (minPenetration === frontPenetration) {
              this.mesh.position.z = blockBox.min.z - this.playerWidth / 2;
            } else if (minPenetration === backPenetration) {
              this.mesh.position.z = blockBox.max.z + this.playerWidth / 2;
            }
            
            // If we're moving up and hit the bottom of a block, stop upward motion
            if (this.verticalVelocity > 0 && this.collisionBox.max.y > blockMinY && 
                prevPosition.y + this.playerHeight < blockMinY) {
              this.verticalVelocity = 0;
            }
          }
        }
      }
    }
    
    // Update collision box after corrections
    this.updateCollisionBox();
  }
  
  private updateCollisionBox() {
    // Create a slightly smaller box than the visual model for better gameplay
    const halfWidth = this.playerWidth * 0.4;
    
    this.collisionBox.min.set(
      this.mesh.position.x - halfWidth,
      this.mesh.position.y - this.collisionOffsetY,
      this.mesh.position.z - halfWidth
    );
    
    this.collisionBox.max.set(
      this.mesh.position.x + halfWidth,
      this.mesh.position.y + this.playerHeight - this.collisionOffsetY,
      this.mesh.position.z + halfWidth
    );
  }
  
  private handleRotation(delta: number) {
    // Rotate player and camera based on A/D keys
    const rotationAmount = this.cameraRotationSpeed * delta;
    
    if (this.keys[this.controls.left]) {
      // Rotate left
      this.rotationAngle -= rotationAmount;
      this.mesh.rotation.y += rotationAmount;
      
      // Update the player's direction vector
      this.playerDirection.x = Math.sin(this.rotationAngle);
      this.playerDirection.z = -Math.cos(this.rotationAngle);
    }
    
    if (this.keys[this.controls.right]) {
      // Rotate right
      this.rotationAngle += rotationAmount;
      this.mesh.rotation.y -= rotationAmount;
      
      // Update the player's direction vector
      this.playerDirection.x = Math.sin(this.rotationAngle);
      this.playerDirection.z = -Math.cos(this.rotationAngle);
    }
  }
  
  private handleMovement(delta: number) {
    const distance = this.speed * delta;
    const previousPosition = this.mesh.position.clone();
    
    // Move forward/backward in the direction player is facing
    if (this.keys[this.controls.forward]) {
      this.mesh.position.x += this.playerDirection.x * distance;
      this.mesh.position.z += this.playerDirection.z * distance;
      
      // Update collision box
      this.updateCollisionBox();
      
      // Check for collisions after movement
      let hasCollision = false;
      for (const block of this.collisionBlocks) {
        if (!block.mesh) continue;
        
        const blockBox = new THREE.Box3().setFromObject(block.mesh);
        if (this.collisionBox.intersectsBox(blockBox)) {
          // Create a small box representing the player's feet
          const feetBox = new THREE.Box3().setFromObject(this.mesh);
          feetBox.min.y = this.collisionBox.min.y;
          feetBox.max.y = this.collisionBox.min.y + 0.1;
          
          // If we're not standing on this block
          if (!feetBox.intersectsBox(blockBox)) {
            hasCollision = true;
            break;
          }
        }
      }
      
      // If there's a collision, revert the movement
      if (hasCollision) {
        this.mesh.position.x = previousPosition.x;
        this.mesh.position.z = previousPosition.z;
      }
    }
    
    if (this.keys[this.controls.backward]) {
      this.mesh.position.x -= this.playerDirection.x * distance;
      this.mesh.position.z -= this.playerDirection.z * distance;
      
      // Update collision box
      this.updateCollisionBox();
      
      // Check for collisions after movement
      let hasCollision = false;
      for (const block of this.collisionBlocks) {
        if (!block.mesh) continue;
        
        const blockBox = new THREE.Box3().setFromObject(block.mesh);
        if (this.collisionBox.intersectsBox(blockBox)) {
          // Create a small box representing the player's feet
          const feetBox = new THREE.Box3().setFromObject(this.mesh);
          feetBox.min.y = this.collisionBox.min.y;
          feetBox.max.y = this.collisionBox.min.y + 0.1;
          
          // If we're not standing on this block
          if (!feetBox.intersectsBox(blockBox)) {
            hasCollision = true;
            break;
          }
        }
      }
      
      // If there's a collision, revert the movement
      if (hasCollision) {
        this.mesh.position.x = previousPosition.x;
        this.mesh.position.z = previousPosition.z;
      }
    }
  }
  
  private updateCamera() {
    // Calculate camera position based on player position and rotation
    const offsetX = Math.sin(this.rotationAngle) * this.cameraOffset.z;
    const offsetZ = -Math.cos(this.rotationAngle) * this.cameraOffset.z;
    
    // Set camera position to offset behind player
    this.camera.position.set(
      this.mesh.position.x - offsetX, 
      this.mesh.position.y + this.cameraOffset.y, 
      this.mesh.position.z - offsetZ
    );
    
    // Camera looks at player's head level plus a small offset in the direction of movement
    const lookAtTarget = new THREE.Vector3(
      this.mesh.position.x + this.playerDirection.x * this.cameraTargetOffset.z,
      this.mesh.position.y + this.cameraTargetOffset.y, 
      this.mesh.position.z + this.playerDirection.z * this.cameraTargetOffset.z
    );
    
    this.camera.lookAt(lookAtTarget);
  }

  jump() {
    // Only allow jumping if player is on ground
    if (this.isGrounded) {
      this.isGrounded = false;
      this.verticalVelocity = this.jumpForce;
      this.isJumping = true;
    }
  }

  // Legacy movement methods (no longer used directly)
  moveForward(distance: number) {
    this.mesh.position.z -= distance;
  }

  moveBackward(distance: number) {
    this.mesh.position.z += distance;
  }

  moveLeft(distance: number) {
    this.mesh.position.x -= distance;
  }

  moveRight(distance: number) {
    this.mesh.position.x += distance;
  }

  getPosition(): Vector3 {
    return {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z
    };
  }

  setPosition(position: Vector3) {
    this.mesh.position.set(position.x, position.y, position.z);
    // Reset physics
    this.verticalVelocity = 0;
    this.isGrounded = false;
    
    // Reset rotation when position is explicitly set
    this.rotationAngle = 0;
    this.mesh.rotation.y = 0;
    this.playerDirection.set(0, 0, -1);
    this.updateCamera();
    
    // Update collision box
    this.updateCollisionBox();
    
    // Update respawn position
    this.respawnPosition = {...position};
  }
  
  // Control management methods
  updateControls(newControls: Partial<PlayerControls>) {
    this.controls = {
      ...this.controls,
      ...newControls
    };
    
    // Save to localStorage for persistence
    this.saveControls();
  }
  
  private saveControls() {
    localStorage.setItem('parkourHoboControls', JSON.stringify(this.controls));
  }
  
  private loadControls() {
    const savedControls = localStorage.getItem('parkourHoboControls');
    if (savedControls) {
      try {
        const controls = JSON.parse(savedControls);
        this.controls = {
          ...DEFAULT_CONTROLS, // Fallback defaults
          ...controls // Saved values
        };
      } catch (e) {
        console.error('Failed to load controls from local storage', e);
      }
    }
  }
  
  getControls(): PlayerControls {
    return {...this.controls};
  }
  
  resetControls() {
    this.controls = {...DEFAULT_CONTROLS};
    this.saveControls();
  }
  
  // Kill zone methods
  private die() {
    if (this.isDead) return;
    
    this.isDead = true;
    
    // Call the death callback if it exists
    if (this.onDeath) {
      this.onDeath();
    }
    
    // Flash the player red
    const originalBodyColor = (this.body.material as THREE.MeshBasicMaterial).color.clone();
    const originalHeadColor = (this.head.material as THREE.MeshBasicMaterial).color.clone();
    const originalArmColor = (this.leftArm.material as THREE.MeshBasicMaterial).color.clone();
    
    // Make all body parts red
    (this.body.material as THREE.MeshBasicMaterial).color.set(0xff0000);
    (this.head.material as THREE.MeshBasicMaterial).color.set(0xff0000);
    (this.leftArm.material as THREE.MeshBasicMaterial).color.set(0xff0000);
    (this.rightArm.material as THREE.MeshBasicMaterial).color.set(0xff0000);
    
    // Wait a moment, then respawn
    this.deathTimeout = window.setTimeout(() => {
      // Restore original colors
      (this.body.material as THREE.MeshBasicMaterial).color.copy(originalBodyColor);
      (this.head.material as THREE.MeshBasicMaterial).color.copy(originalHeadColor);
      (this.leftArm.material as THREE.MeshBasicMaterial).color.copy(originalArmColor);
      (this.rightArm.material as THREE.MeshBasicMaterial).color.copy(originalArmColor);
      
      this.respawn();
    }, 500);
  }
  
  private respawn() {
    // Reset isDead flag
    this.isDead = false;
    
    // Reset position to respawn point
    this.mesh.position.set(
      this.respawnPosition.x,
      this.respawnPosition.y,
      this.respawnPosition.z
    );
    
    // Reset physics
    this.verticalVelocity = 0;
    this.isGrounded = false;
    
    // Reset rotation to make player face forward
    this.rotationAngle = 0;
    this.mesh.rotation.y = 0;
    this.playerDirection.set(0, 0, -1);
    
    // Update camera
    this.updateCamera();
    
    // Update collision box
    this.updateCollisionBox();
  }
  
  // Update the respawn position (called when player passes checkpoints, etc.)
  updateRespawnPosition(position: Vector3) {
    this.respawnPosition = {...position};
  }
  
  // Set death callback
  setOnDeath(callback: () => void) {
    this.onDeath = callback;
  }
  
  // Clean up event listeners on destroy
  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    
    // Clear any pending timeouts
    if (this.deathTimeout !== null) {
      window.clearTimeout(this.deathTimeout);
    }
  }
  
  private keydownHandler = (event: KeyboardEvent) => {
    this.keys[event.key.toLowerCase()] = true;
    if (event.key.toLowerCase() === this.controls.jump) {
      this.jump();
    }
  }
  
  private keyupHandler = (event: KeyboardEvent) => {
    this.keys[event.key.toLowerCase()] = false;
  }
}
