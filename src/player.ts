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
  gravity: number = 15;
  
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
  private terminalVelocity: number = 20;
  
  // Kill zone properties
  private respawnPosition: Vector3;
  private isDead: boolean = false;
  private deathTimeout: number | null = null;
  private onDeath: (() => void) | null = null;
  
  // Box for collision
  private collisionBox: THREE.Box3;
  private collisionOffsetY: number = 0.75; // Offset from center for the collision box
  private onLevelComplete: (() => void) | null = null;
  private isLevelCompleted: boolean = false;

  constructor(position: Vector3, camera: THREE.PerspectiveCamera) {
    this.mesh = new THREE.Group();
    this.camera = camera;
    
    // Store initial position as respawn point
    this.respawnPosition = {...position};
    
    // Body - ragged clothes (darker, tattered look)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x4D3B21 }); // Darker brown for worn clothes
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = 0.35;
    this.mesh.add(this.body);

    // Create tattered clothing patches on the body
    const addPatch = (x: number, y: number, z: number, width: number, height: number, depth: number) => {
      const patchGeometry = new THREE.BoxGeometry(width, height, depth);
      const patchMaterial = new THREE.MeshBasicMaterial({ color: 0x5D4037 }); // Slightly different brown
      const patch = new THREE.Mesh(patchGeometry, patchMaterial);
      patch.position.set(x, y, z);
      this.body.add(patch);
    };

    // Add patches to simulate tattered clothes
    addPatch(0.1, 0.1, 0.16, 0.2, 0.2, 0.01);
    addPatch(-0.15, -0.2, 0.16, 0.15, 0.15, 0.01);
    addPatch(0.18, -0.1, 0.16, 0.1, 0.25, 0.01);

    // Head - with dirt/grunginess
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xC8A080 }); // Slightly dirty skin tone
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = 0.95;
    this.mesh.add(this.head);

    // Add a simpler beanie hat on top of the head
    const beanieGeometry = new THREE.BoxGeometry(0.44, 0.15, 0.44);
    const beanieMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Deep brown beanie
    const beanie = new THREE.Mesh(beanieGeometry, beanieMaterial);
    beanie.position.y = 0.25; // Position on top of the head
    this.head.add(beanie);

    // Add beanie fold/rim
    const beanieRimGeometry = new THREE.BoxGeometry(0.45, 0.08, 0.45);
    const beanieRimMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Darker rim
    const beanieRim = new THREE.Mesh(beanieRimGeometry, beanieRimMaterial);
    beanieRim.position.y = 0.11;
    beanie.add(beanieRim);

    // Add beard stubble - small box below the face
    const stubbleGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.35);
    const stubbleMaterial = new THREE.MeshBasicMaterial({ color: 0x3D3D3D });
    const stubble = new THREE.Mesh(stubbleGeometry, stubbleMaterial);
    stubble.position.y = -0.25;
    stubble.position.z = 0.03;
    this.head.add(stubble);

    // Legs - tattered pants
    const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0x1B2631 }); // Dark denim color
    
    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.leftLeg.position.set(0.15, -0.25, 0);
    this.mesh.add(this.leftLeg);
    
    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    this.rightLeg.position.set(-0.15, -0.25, 0);
    this.mesh.add(this.rightLeg);

    // Add tatters to the bottom of the pants
    const leftLegTatterGeometry = new THREE.BoxGeometry(0.18, 0.07, 0.18);
    const leftLegTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x17202A });
    const leftLegTatter = new THREE.Mesh(leftLegTatterGeometry, leftLegTatterMaterial);
    leftLegTatter.position.y = -0.25;
    this.leftLeg.add(leftLegTatter);

    const rightLegTatterGeometry = new THREE.BoxGeometry(0.18, 0.07, 0.18);
    const rightLegTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x17202A });
    const rightLegTatter = new THREE.Mesh(rightLegTatterGeometry, rightLegTatterMaterial);
    rightLegTatter.position.y = -0.25;
    this.rightLeg.add(rightLegTatter);

    // Arms - tattered sleeves
    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshBasicMaterial({ color: 0x4D3B21 }); // Match body color
    
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(0.325, 0.35, 0);
    this.mesh.add(this.leftArm);
    
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(-0.325, 0.35, 0);
    this.mesh.add(this.rightArm);

    // Add tatters to the sleeves
    const leftArmTatterGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.18);
    const leftArmTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x5D4037 });
    const leftArmTatter = new THREE.Mesh(leftArmTatterGeometry, leftArmTatterMaterial);
    leftArmTatter.position.set(0.04, -0.22, 0);
    this.leftArm.add(leftArmTatter);

    const rightArmTatterGeometry = new THREE.BoxGeometry(0.08, 0.1, 0.18);
    const rightArmTatterMaterial = new THREE.MeshBasicMaterial({ color: 0x5D4037 });
    const rightArmTatter = new THREE.Mesh(rightArmTatterGeometry, rightArmTatterMaterial);
    rightArmTatter.position.set(-0.04, -0.22, 0);
    this.rightArm.add(rightArmTatter);

    // Add fingerless gloves
    const leftGloveGeometry = new THREE.BoxGeometry(0.17, 0.15, 0.17);
    const leftGloveMaterial = new THREE.MeshBasicMaterial({ color: 0x4A4A4A });
    const leftGlove = new THREE.Mesh(leftGloveGeometry, leftGloveMaterial);
    leftGlove.position.y = -0.2;
    this.leftArm.add(leftGlove);

    const rightGloveGeometry = new THREE.BoxGeometry(0.17, 0.15, 0.17);
    const rightGloveMaterial = new THREE.MeshBasicMaterial({ color: 0x4A4A4A });
    const rightGlove = new THREE.Mesh(rightGloveGeometry, rightGloveMaterial);
    rightGlove.position.y = -0.2;
    this.rightArm.add(rightGlove);

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
      
      // Check for finish block - complete the level when player touches it
      if (block.type === 'finish') {
        if (this.collisionBox.intersectsBox(blockBox) && !this.isLevelCompleted) {
          this.isLevelCompleted = true;
          if (this.onLevelComplete) {
            this.onLevelComplete();
          }
        }
        // Continue with collision checks even if it's a finish block
      }
      
      // Check for kill zone - only check collision with the base platform (first child)
      if (block.type === 'killZone' || block.type === 'killZoneLarge') {
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
    }
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
    
    // Store all original colors
    const meshColorMap = new Map<THREE.Mesh, THREE.Color>();
    
    // Store original colors and collect all meshes to color red
    const collectMeshes = (parent: THREE.Object3D) => {
      parent.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          // Only store if we haven't seen this mesh before
          if (!meshColorMap.has(child)) {
            meshColorMap.set(child, child.material.color.clone());
          }
        }
      });
    };
    
    // Collect all meshes from the entire player
    collectMeshes(this.mesh);
    
    // Make all parts red
    meshColorMap.forEach((_, mesh) => {
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.color.set(0xff0000);
      }
    });
    
    // Wait a moment, then respawn
    this.deathTimeout = window.setTimeout(() => {
      // Restore original colors
      meshColorMap.forEach((originalColor, mesh) => {
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.color.copy(originalColor);
        }
      });
      
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
  
  // Set level complete callback
  setOnLevelComplete(callback: () => void) {
    this.onLevelComplete = callback;
  }
  
  // Reset level completion state
  resetLevelCompletion() {
    this.isLevelCompleted = false;
  }
  
  // Clean up event listeners on destroy
  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    
    // Clear any pending timeouts
    if (this.deathTimeout !== null) {
      window.clearTimeout(this.deathTimeout);
    }
    
    // Reset any callbacks
    this.onDeath = null;
    this.onLevelComplete = null;
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
