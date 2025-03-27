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
  mesh?: THREE.Mesh; // Reference to the Three.js mesh
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
  previewColor?: string; // This is already correctly defined for placeholder previews
}
