// webroot/src/types.ts
// Copied from your original src/types.ts
// Remove types not needed for player-only mode (e.g., PlayerControls if not used here)

import * as THREE from "three";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Removed PlayerControls and DEFAULT_CONTROLS as they are not used in this player-only webview

export interface Block {
  position: Vector3;
  rotation: Vector3;
  type: string;
  mesh?: THREE.Mesh | THREE.Group;
  highlight(material: THREE.Material): void; // Keep for potential effects? Or remove if unused.
  unhighlight(): void;                   // Keep for potential effects? Or remove if unused.
  getMeshChildren?(): THREE.Object3D[]; // Keep if player collision needs children
  originalMaterials?: THREE.Material[]; // Keep if highlight/unhighlight are kept
}

export interface AtmosphereSettings {
  isDayMode: boolean; // true for day, false for night
}

// Simplified Course interface for the player - might not need template, id etc.
export interface CourseData {
    name: string; // Keep name for potential display
    blocks: Array<{ // Only need the data to deserialize
        type: string;
        position: Vector3;
        rotation: Vector3;
    }>;
    startPosition: Vector3; // Needed for player start
    finishPosition: Vector3; // Needed for player goal
    atmosphere: AtmosphereSettings;
}


// Keep BlockDefinition as BlockFactory uses it
export interface BlockDefinition {
  type: string;
  dimensions: Vector3;
  color: string;
  limit?: number; // Keep for reference, though not enforced here
  previewColor?: string; // Not needed
  createMesh: (
    position: Vector3,
    rotation: Vector3
  ) => THREE.Mesh | THREE.Group;
  // createPlaceholder and highlightPlaceholder are REMOVED
}
