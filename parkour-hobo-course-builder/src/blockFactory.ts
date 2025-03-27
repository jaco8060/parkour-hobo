import * as THREE from 'three';
import { BlockDefinition, Vector3, Block } from './types';

export class BlockFactory {
  private blockDefinitions: Record<string, BlockDefinition> = {
    floor: {
      type: 'floor',
      dimensions: { x: 5, y: 0.2, z: 5 },
      color: '#8B8B8B',
      previewColor: '#8B8B8B80'
    },
    smallPlatform: {
      type: 'smallPlatform',
      dimensions: { x: 2, y: 0.5, z: 2 },
      color: '#C4C4C4',
      previewColor: '#C4C4C480'
    },
    largePlatform: {
      type: 'largePlatform',
      dimensions: { x: 4, y: 0.5, z: 4 },
      color: '#C4C4C4',
      previewColor: '#C4C4C480'
    },
    garbageBag: {
      type: 'garbageBag',
      dimensions: { x: 2, y: 1, z: 2 },
      color: '#4D4D4D',
      previewColor: '#4D4D4D80'
    },
    rooftop: {
      type: 'rooftop',
      dimensions: { x: 3, y: 0.3, z: 3 },
      color: '#6D6D6D',
      previewColor: '#6D6D6D80'
    },
    building: {
      type: 'building',
      dimensions: { x: 2, y: 5, z: 2 },
      color: '#9E9E9E',
      previewColor: '#9E9E9E80'
    },
    start: {
      type: 'start',
      dimensions: { x: 1, y: 0.5, z: 1 },
      color: '#4CAF50',
      previewColor: '#4CAF5080',
      limit: 1
    },
    finish: {
      type: 'finish',
      dimensions: { x: 1, y: 0.5, z: 1 },
      color: '#f44336',
      previewColor: '#f4433680',
      limit: 1
    }
  };

  constructor() {}

  createBlock(type: string, position: Vector3, rotation: Vector3): Block {
    const definition = this.blockDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    const geometry = new THREE.BoxGeometry(
      definition.dimensions.x,
      definition.dimensions.y,
      definition.dimensions.z
    );
    
    const material = new THREE.MeshLambertMaterial({ color: definition.color });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(rotation.x),
      THREE.MathUtils.degToRad(rotation.y),
      THREE.MathUtils.degToRad(rotation.z)
    );

    return {
      type,
      position,
      rotation,
      mesh
    };
  }

  getBlockDefinition(type: string): BlockDefinition {
    return this.blockDefinitions[type];
  }

  getAllBlockTypes(): string[] {
    return Object.keys(this.blockDefinitions);
  }

  createPlaceholder(type: string): THREE.Mesh {
    const definition = this.blockDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    const geometry = new THREE.BoxGeometry(
      definition.dimensions.x,
      definition.dimensions.y,
      definition.dimensions.z
    );
    
    const material = new THREE.MeshLambertMaterial({ 
      color: definition.previewColor || definition.color,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    
    return new THREE.Mesh(geometry, material);
  }
}
