// Common types used across the application
import * as THREE from "three";

// Player state interface
export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  onGround: boolean;
  jumping: boolean;
  speed: number;
  jumpPower: number;
  gravity: number;
  fallGravity: number;
  currentAnimation: string;
}

// Input state interface
export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
}

// Builder controls interface
export interface BuildControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
}

// Touch joystick interface
export interface TouchJoystick {
  active: boolean;
  startX: number;
  startY: number;
}

// Block data interface
export interface BlockData {
  position: {
    x: number;
    y: number;
    z: number;
  };
  type: string;
  size: any;
}

// Course data interface
export interface CourseData {
  template: string;
  blocks: BlockData[];
  startPosition: {
    x: number;
    y: number;
    z: number;
  };
  finishPosition: {
    x: number;
    y: number;
    z: number;
  };
}

// Player animation actions
export interface AnimationActions {
  idle: THREE.AnimationAction | null;
  running: THREE.AnimationAction | null;
  jumping: THREE.AnimationAction | null;
}

// Builder state interface for localStorage
export interface BuilderState {
  isBuilderMode: boolean;
  template: string;
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
  cameraRotation: {
    x: number;
    y: number;
    z: number;
  };
  selectedTool: string;
  selectedBlockType: string;
  blocks?: BlockData[]; // Optional array of blocks for saved builder state
} 