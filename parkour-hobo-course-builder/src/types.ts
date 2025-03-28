import * as THREE from "three";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Define the control mapping interface
export interface PlayerControls {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
}

// Define default control mappings
export const DEFAULT_CONTROLS: PlayerControls = {
  forward: "w",
  backward: "s",
  left: "a",
  right: "d",
  jump: " ", // Space
};

export interface Block {
  position: Vector3;
  rotation: Vector3;
  type: string;
  mesh?: THREE.Mesh | THREE.Group;
  highlight(material: THREE.Material): void;
  unhighlight(): void;
  getMeshChildren?(): THREE.Object3D[];
  originalMaterials?: THREE.Material[];
}

export interface AtmosphereSettings {
  isDayMode: boolean; // true for day, false for night
}

export interface Course {
  id: string;
  name: string;
  template: string;
  blocks: Block[];
  startPosition: Vector3;
  finishPosition: Vector3;
  atmosphere: AtmosphereSettings; // Add atmosphere settings
}

export interface Template {
  name: string;
  maxBlocks: number;
}

export interface BlockDefinition {
  type: string;
  dimensions: Vector3;
  color: string;
  limit?: number;
  previewColor?: string;
  createMesh: (
    position: Vector3,
    rotation: Vector3
  ) => THREE.Mesh | THREE.Group;
  createPlaceholder: () => THREE.Mesh | THREE.Group;
  highlightPlaceholder: (
    mesh: THREE.Mesh | THREE.Group,
    isValid: boolean
  ) => void;
}
