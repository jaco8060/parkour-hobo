import * as THREE from 'three';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

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

export interface Course {
  id: string;
  name: string;
  template: string;
  blocks: Block[];
  startPosition: Vector3;
  finishPosition: Vector3;
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
  createMesh: (position: Vector3, rotation: Vector3) => THREE.Mesh | THREE.Group;
  createPlaceholder: () => THREE.Mesh | THREE.Group;
  highlightPlaceholder: (mesh: THREE.Mesh | THREE.Group, isValid: boolean) => void;
}
