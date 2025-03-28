import * as THREE from 'three';
import { Vector3, PlayerControls, DEFAULT_CONTROLS } from './types';

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

  constructor(position: Vector3, camera: THREE.PerspectiveCamera) {
    this.mesh = new THREE.Group();
    this.camera = camera;
    
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

  update(delta: number, time: number) {
    // Check if player is moving based on key states
    this.isMoving = this.keys[this.controls.forward] || 
                    this.keys[this.controls.backward] || 
                    this.keys[this.controls.left] || 
                    this.keys[this.controls.right];
    
    // Handle rotation and movement
    this.handleRotation(delta);
    this.handleMovement(delta);
    
    // Update camera position to follow player
    this.updateCamera();
    
    // Idle animation
    if (!this.isMoving && !this.isJumping) {
      this.mesh.position.y += Math.sin(time * 2) * 0.005;
    }

    // Running animation
    if (this.isMoving && !this.isJumping) {
      this.leftLeg.rotation.x = Math.sin(time * 10) * 0.5;
      this.rightLeg.rotation.x = Math.sin(time * 10 + Math.PI) * 0.5;
      this.leftArm.rotation.x = Math.sin(time * 10 + Math.PI) * 0.25;
      this.rightArm.rotation.x = Math.sin(time * 10) * 0.25;
    }

    // Jump animation
    if (this.isJumping) {
      this.jumpTime += delta;
      
      // Jump up and then down
      const jumpProgress = this.jumpTime / this.jumpDuration;
      
      if (jumpProgress < 1) {
        const height = Math.sin(jumpProgress * Math.PI) * this.jumpHeight;
        this.mesh.position.y = height;
        
        // Set legs and arms for jump
        this.leftLeg.rotation.x = -0.3;
        this.rightLeg.rotation.x = -0.3;
        this.leftArm.rotation.x = -0.6;
        this.rightArm.rotation.x = -0.6;
      } else {
        this.mesh.position.y = 0;
        this.isJumping = false;
        this.jumpTime = 0;
        
        // Reset legs and arms
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }
    }
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
    
    // Move forward/backward in the direction player is facing
    if (this.keys[this.controls.forward]) {
      this.mesh.position.x += this.playerDirection.x * distance;
      this.mesh.position.z += this.playerDirection.z * distance;
    }
    
    if (this.keys[this.controls.backward]) {
      this.mesh.position.x -= this.playerDirection.x * distance;
      this.mesh.position.z -= this.playerDirection.z * distance;
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
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpTime = 0;
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
    // Reset rotation when position is explicitly set
    this.rotationAngle = 0;
    this.mesh.rotation.y = 0;
    this.playerDirection.set(0, 0, -1);
    this.updateCamera();
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
  
  // Clean up event listeners on destroy
  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
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
