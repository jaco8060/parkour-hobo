// Game configuration settings
import * as THREE from "three";

// Camera settings
export const CAMERA_SETTINGS = {
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,
  DEFAULT_POSITION: new THREE.Vector3(0, 5, 10),
  DEFAULT_ROTATION: new THREE.Euler(-0.3, 0, 0),
  FOLLOW_HEIGHT: 5,
  FOLLOW_DISTANCE: 7,
  ROTATION_SPEED: 2.0
};

// Player settings
export const PLAYER_SETTINGS = {
  DEFAULT_POSITION: new THREE.Vector3(0, 1, 0),
  MOVEMENT_SPEED: 5,
  JUMP_POWER: 15,
  GRAVITY: 20,
  FALL_GRAVITY: 35,
  GROUND_CHECK_DISTANCE: 1.1
};

// Builder settings
export const BUILDER_SETTINGS = {
  CAMERA_SPEED: 0.5,
  ROTATION_SPEED: 0.05,
  GRID_CELL_SIZE: 10,
  PLACEMENT_PREVIEW_DISTANCE: 20,
  PLACEMENT_GRID_SNAP: true,
  REMOVAL_RANGE: 5
};

// Environment settings
export const ENVIRONMENT_SETTINGS = {
  GROUND_SIZE: 100,
  GROUND_COLOR: 0x333333,
  SKY_COLOR: 0x87CEEB,
  FOG_NEAR: 30,
  FOG_FAR: 100
};

// Block type settings
export const BLOCK_TYPES = {
  PLATFORM: {
    name: "platform",
    color: 0xcccccc,
    size: { width: 3, height: 1, depth: 3 },
    type: "platform"
  },
  START: {
    name: "start",
    color: 0x00ff00,
    size: { width: 5, height: 1, depth: 5 },
    type: "start"
  },
  FINISH: {
    name: "finish",
    color: 0x0000ff,
    size: { width: 5, height: 1, depth: 5 },
    type: "finish"
  }
};

// Course template sizes
export const TEMPLATE_SIZES = {
  SMALL: 50,
  MEDIUM: 100,
  LARGE: 150
};

// Local storage keys
export const STORAGE_KEYS = {
  BUILDER_STATE: 'builderState',
  BUILDER_TEMPLATE: 'builderTemplate',
  LAST_MODE: 'lastMode'
}; 