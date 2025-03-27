import * as THREE from 'three';
import { Vector3 } from './types';

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

  constructor(position: Vector3) {
    this.mesh = new THREE.Group();
    
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
  }

  update(delta: number, time: number, isMoving: boolean) {
    // Idle animation
    if (!isMoving && !this.isJumping) {
      this.mesh.position.y += Math.sin(time * 2) * 0.005;
    }

    // Running animation
    if (isMoving && !this.isJumping) {
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

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpTime = 0;
    }
  }

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
  }
}
