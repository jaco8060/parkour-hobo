import * as THREE from 'three';
import { BlockDefinition, Vector3, Block } from './types';

export class BlockFactory {
  private blockDefinitions: Record<string, BlockDefinition> = {};

  constructor() {
    this.registerBlockTypes();
  }

  private registerBlockTypes() {
    // Register Floor
    this.registerBlockType({
      type: 'floor',
      dimensions: { x: 5, y: 0.2, z: 5 },
      color: '#8B8B8B',
      previewColor: '#8B8B8B80',
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(5, 0.2, 5);
        const material = new THREE.MeshLambertMaterial({ color: '#8B8B8B' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(5, 0.2, 5);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#8B8B8B80',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#8B8B8B80' : '#FF0000');
        }
      }
    });

    // Register Small Platform
    this.registerBlockType({
      type: 'smallPlatform',
      dimensions: { x: 2, y: 0.5, z: 2 },
      color: '#C4C4C4',
      previewColor: '#C4C4C480',
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(2, 0.5, 2);
        const material = new THREE.MeshLambertMaterial({ color: '#C4C4C4' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(2, 0.5, 2);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#C4C4C480',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#C4C4C480' : '#FF0000');
        }
      }
    });

    // Register Large Platform
    this.registerBlockType({
      type: 'largePlatform',
      dimensions: { x: 4, y: 0.5, z: 4 },
      color: '#C4C4C4',
      previewColor: '#C4C4C480',
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(4, 0.5, 4);
        const material = new THREE.MeshLambertMaterial({ color: '#C4C4C4' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(4, 0.5, 4);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#C4C4C480',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#C4C4C480' : '#FF0000');
        }
      }
    });

    // Register Garbage Bag
    this.registerBlockType({
      type: 'garbageBag',
      dimensions: { x: 2, y: 1.5, z: 2 },
      color: '#4D4D4D',
      previewColor: '#4D4D4D80',
      createMesh: (position, rotation) => {
        const garbageBagGroup = new THREE.Group();
        
        // Create the main bag shape - slightly irregular
        const bagGeometry = new THREE.SphereGeometry(1, 8, 8);
        // Flatten the bottom
        for (let i = 0; i < bagGeometry.attributes.position.count; i++) {
          const y = bagGeometry.attributes.position.getY(i);
          if (y < 0) {
            bagGeometry.attributes.position.setY(i, y * 0.5);
          }
        }
        bagGeometry.computeVertexNormals();
        
        // Scale to make it look more like a bag
        bagGeometry.scale(1, 1.2, 1);
        
        const bagMaterial = new THREE.MeshLambertMaterial({ 
          color: '#2C2C2C',
          flatShading: true 
        });
        const bag = new THREE.Mesh(bagGeometry, bagMaterial);
        
        // Create the tied-up part at the top
        const tieGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.3, 8);
        const tieMaterial = new THREE.MeshLambertMaterial({ color: '#1A1A1A' });
        const tie = new THREE.Mesh(tieGeometry, tieMaterial);
        tie.position.y = 1.2;
        
        // Add subtle bulges to create a more organic look without sticks
        const createBulge = (x: number, y: number, z: number, scale: THREE.Vector3) => {
          const bulgeGeometry = new THREE.SphereGeometry(0.4, 6, 6);
          const bulgeMaterial = new THREE.MeshLambertMaterial({ 
            color: '#3A3A3A',
            flatShading: true
          });
          const bulge = new THREE.Mesh(bulgeGeometry, bulgeMaterial);
          bulge.position.set(x, y, z);
          bulge.scale.copy(scale);
          garbageBagGroup.add(bulge);
        };
        
        // Add a few subtle bulges for texture
        createBulge(0.6, 0.2, 0.5, new THREE.Vector3(1.2, 1, 1.3));
        createBulge(-0.5, 0.4, 0.4, new THREE.Vector3(1.0, 0.8, 1.1));
        createBulge(0.2, -0.2, -0.6, new THREE.Vector3(1.1, 0.9, 1.0));
        
        // Add all parts to the group
        garbageBagGroup.add(bag);
        garbageBagGroup.add(tie);
        
        // Position and rotate the entire group
        garbageBagGroup.position.set(position.x, position.y, position.z);
        garbageBagGroup.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return garbageBagGroup;
      },
      createPlaceholder: () => {
        // Simpler placeholder for better performance
        const garbageBagGroup = new THREE.Group();
        
        // Create a simplified bag shape
        const bagGeometry = new THREE.SphereGeometry(1, 8, 8);
        // Flatten the bottom
        for (let i = 0; i < bagGeometry.attributes.position.count; i++) {
          const y = bagGeometry.attributes.position.getY(i);
          if (y < 0) {
            bagGeometry.attributes.position.setY(i, y * 0.5);
          }
        }
        bagGeometry.scale(1, 1.2, 1);
        
        const bagMaterial = new THREE.MeshLambertMaterial({ 
          color: '#4D4D4D80',
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          flatShading: true
        });
        
        const bag = new THREE.Mesh(bagGeometry, bagMaterial);
        garbageBagGroup.add(bag);
        
        return garbageBagGroup;
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Group) {
          mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
              const material = child.material as THREE.MeshLambertMaterial;
              material.opacity = isValid ? 0.5 : 0.7;
              material.color.set(isValid ? '#4D4D4D80' : '#FF0000');
            }
          });
        }
      }
    });

    // Register Rooftop
    this.registerBlockType({
      type: 'rooftop',
      dimensions: { x: 3, y: 0.3, z: 3 },
      color: '#6D6D6D',
      previewColor: '#6D6D6D80',
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(3, 0.3, 3);
        const material = new THREE.MeshLambertMaterial({ color: '#6D6D6D' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(3, 0.3, 3);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#6D6D6D80',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#6D6D6D80' : '#FF0000');
        }
      }
    });

    // Register Building
    this.registerBlockType({
      type: 'building',
      dimensions: { x: 2, y: 5, z: 2 },
      color: '#9E9E9E',
      previewColor: '#9E9E9E80',
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(2, 5, 2);
        const material = new THREE.MeshLambertMaterial({ color: '#9E9E9E' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(2, 5, 2);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#9E9E9E80',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#9E9E9E80' : '#FF0000');
        }
      }
    });

    // Register Bridge - More complex with railings
    this.registerBlockType({
      type: 'bridge',
      dimensions: { x: 2, y: 0.3, z: 6 },
      color: '#A0522D',
      previewColor: '#A0522D80',
      createMesh: (position, rotation) => {
        const bridgeGroup = new THREE.Group();
        
        // Create the bridge deck
        const deckGeometry = new THREE.BoxGeometry(2, 0.3, 6);
        const deckMaterial = new THREE.MeshLambertMaterial({ color: '#A0522D' });
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        bridgeGroup.add(deck);
        
        // Create the left railing
        const leftRailingGeometry = new THREE.BoxGeometry(0.1, 0.3, 6);
        const railingMaterial = new THREE.MeshLambertMaterial({ color: '#8B4513' });
        const leftRailing = new THREE.Mesh(leftRailingGeometry, railingMaterial);
        leftRailing.position.set(-0.95, 0.3, 0);
        bridgeGroup.add(leftRailing);
        
        // Create the right railing
        const rightRailingGeometry = new THREE.BoxGeometry(0.1, 0.3, 6);
        const rightRailing = new THREE.Mesh(rightRailingGeometry, railingMaterial);
        rightRailing.position.set(0.95, 0.3, 0);
        bridgeGroup.add(rightRailing);
        
        // Add posts along the railings
        const postMaterial = new THREE.MeshLambertMaterial({ color: '#6D4C41' });
        
        for (let z = -2.5; z <= 2.5; z += 1.5) {
          // Left posts
          const leftPostGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
          const leftPost = new THREE.Mesh(leftPostGeometry, postMaterial);
          leftPost.position.set(-0.95, 0.4, z);
          bridgeGroup.add(leftPost);
          
          // Right posts
          const rightPostGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
          const rightPost = new THREE.Mesh(rightPostGeometry, postMaterial);
          rightPost.position.set(0.95, 0.4, z);
          bridgeGroup.add(rightPost);
        }
        
        bridgeGroup.position.set(position.x, position.y, position.z);
        bridgeGroup.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return bridgeGroup;
      },
      createPlaceholder: () => {
        const bridgeGroup = new THREE.Group();
        
        // Create the bridge deck
        const deckGeometry = new THREE.BoxGeometry(2, 0.3, 6);
        const deckMaterial = new THREE.MeshLambertMaterial({ 
          color: '#A0522D80',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        bridgeGroup.add(deck);
        
        // Create simplified railings
        const railingMaterial = new THREE.MeshLambertMaterial({ 
          color: '#8B4513',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        // Left railing
        const leftRailingGeometry = new THREE.BoxGeometry(0.1, 0.3, 6);
        const leftRailing = new THREE.Mesh(leftRailingGeometry, railingMaterial);
        leftRailing.position.set(-0.95, 0.3, 0);
        bridgeGroup.add(leftRailing);
        
        // Right railing
        const rightRailingGeometry = new THREE.BoxGeometry(0.1, 0.3, 6);
        const rightRailing = new THREE.Mesh(rightRailingGeometry, railingMaterial);
        rightRailing.position.set(0.95, 0.3, 0);
        bridgeGroup.add(rightRailing);
        
        return bridgeGroup;
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Group) {
          mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
              const material = child.material as THREE.MeshLambertMaterial;
              material.opacity = isValid ? 0.5 : 0.7;
              
              // Only change color of deck (first child) if invalid
              if (!isValid || child === mesh.children[0]) {
                material.color.set(isValid ? (child === mesh.children[0] ? '#A0522D80' : '#8B4513') : '#FF0000');
              }
            }
          });
        }
      }
    });

    // Register Kill Zone
    this.registerBlockType({
      type: 'killZone',
      dimensions: { x: 3, y: 0.2, z: 3 },
      color: '#FF0000',
      previewColor: '#FF000080',
      createMesh: (position, rotation) => {
        // Create a group to hold all the elements
        const killZoneGroup = new THREE.Group();
        
        // Create the base transparent red box
        const geometry = new THREE.BoxGeometry(3, 0.2, 3);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#FF0000',
          transparent: true,
          opacity: 0.6
        });
        
        const baseMesh = new THREE.Mesh(geometry, material);
        killZoneGroup.add(baseMesh);
        
        // Add visual particles/warning markers
        const particleMaterial = new THREE.MeshBasicMaterial({ color: '#FF0000' });
        
        // Create small warning triangles
        for (let i = 0; i < 8; i++) {
          const triangleGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
          const triangle = new THREE.Mesh(triangleGeometry, particleMaterial);
          
          // Position triangles in a circular pattern around the kill zone
          const angle = (i / 8) * Math.PI * 2;
          const radius = 1.2;
          triangle.position.set(
            Math.sin(angle) * radius,
            0.3, // Slightly above the platform
            Math.cos(angle) * radius
          );
          
          // Point triangles upward
          triangle.rotation.x = Math.PI;
          
          // Store the original Y position for animation
          (triangle as any).originalY = triangle.position.y;
          (triangle as any).randomPhase = Math.random() * Math.PI * 2;
          
          killZoneGroup.add(triangle);
        }
        
        // Set group position and rotation
        killZoneGroup.position.set(position.x, position.y, position.z);
        killZoneGroup.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return killZoneGroup;
      },
      createPlaceholder: () => {
        // Create a group for the placeholder
        const killZoneGroup = new THREE.Group();
        
        // Create the base transparent red box
        const geometry = new THREE.BoxGeometry(3, 0.2, 3);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#FF000080',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        const baseMesh = new THREE.Mesh(geometry, material);
        killZoneGroup.add(baseMesh);
        
        return killZoneGroup;
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Group && mesh.children.length > 0) {
          const baseMesh = mesh.children[0];
          if (baseMesh instanceof THREE.Mesh) {
            const material = baseMesh.material as THREE.MeshLambertMaterial;
            material.opacity = isValid ? 0.5 : 0.7;
            material.color.set(isValid ? '#FF000080' : '#FF0000');
          }
        }
      }
    });

    // Register Large Kill Zone
    this.registerBlockType({
      type: 'killZoneLarge',
      dimensions: { x: 6, y: 0.2, z: 6 },
      color: '#FF0000',
      previewColor: '#FF000080',
      createMesh: (position, rotation) => {
        // Create a group to hold all the elements
        const killZoneGroup = new THREE.Group();
        
        // Create the base transparent red box
        const geometry = new THREE.BoxGeometry(6, 0.2, 6);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#FF0000',
          transparent: true,
          opacity: 0.6
        });
        
        const baseMesh = new THREE.Mesh(geometry, material);
        killZoneGroup.add(baseMesh);
        
        // Add visual particles/warning markers
        const particleMaterial = new THREE.MeshBasicMaterial({ color: '#FF0000' });
        
        // Create small warning triangles
        for (let i = 0; i < 16; i++) {
          const triangleGeometry = new THREE.ConeGeometry(0.15, 0.3, 3);
          const triangle = new THREE.Mesh(triangleGeometry, particleMaterial);
          
          // Position triangles in a circular pattern around the kill zone
          const angle = (i / 16) * Math.PI * 2;
          const radius = 2.5;
          triangle.position.set(
            Math.sin(angle) * radius,
            0.3, // Slightly above the platform
            Math.cos(angle) * radius
          );
          
          // Point triangles upward
          triangle.rotation.x = Math.PI;
          
          // Store the original Y position for animation
          (triangle as any).originalY = triangle.position.y;
          (triangle as any).randomPhase = Math.random() * Math.PI * 2;
          
          killZoneGroup.add(triangle);
        }
        
        // Add central warning symbol
        const centerTriangleGeometry = new THREE.ConeGeometry(0.3, 0.5, 3);
        const centerTriangle = new THREE.Mesh(centerTriangleGeometry, particleMaterial);
        centerTriangle.position.set(0, 0.4, 0);
        centerTriangle.rotation.x = Math.PI;
        (centerTriangle as any).originalY = centerTriangle.position.y;
        (centerTriangle as any).randomPhase = 0;
        killZoneGroup.add(centerTriangle);
        
        // Set group position and rotation
        killZoneGroup.position.set(position.x, position.y, position.z);
        killZoneGroup.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return killZoneGroup;
      },
      createPlaceholder: () => {
        // Create a group for the placeholder
        const killZoneGroup = new THREE.Group();
        
        // Create the base transparent red box
        const geometry = new THREE.BoxGeometry(6, 0.2, 6);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#FF000080',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        const baseMesh = new THREE.Mesh(geometry, material);
        killZoneGroup.add(baseMesh);
        
        return killZoneGroup;
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Group && mesh.children.length > 0) {
          const baseMesh = mesh.children[0];
          if (baseMesh instanceof THREE.Mesh) {
            const material = baseMesh.material as THREE.MeshLambertMaterial;
            material.opacity = isValid ? 0.5 : 0.7;
            material.color.set(isValid ? '#FF000080' : '#FF0000');
          }
        }
      }
    });

    // Register Start
    this.registerBlockType({
      type: 'start',
      dimensions: { x: 1, y: 0.5, z: 1 },
      color: '#4CAF50',
      previewColor: '#4CAF5080',
      limit: 1,
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        const material = new THREE.MeshLambertMaterial({ color: '#4CAF50' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#4CAF5080',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#4CAF5080' : '#FF0000');
        }
      }
    });

    // Register Finish
    this.registerBlockType({
      type: 'finish',
      dimensions: { x: 1, y: 0.5, z: 1 },
      color: '#f44336',
      previewColor: '#f4433680',
      limit: 1,
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        const material = new THREE.MeshLambertMaterial({ color: '#f44336' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        
        return mesh;
      },
      createPlaceholder: () => {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        const material = new THREE.MeshLambertMaterial({ 
          color: '#f4433680',
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        });
        
        return new THREE.Mesh(geometry, material);
      },
      highlightPlaceholder: (mesh, isValid) => {
        if (mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshLambertMaterial;
          material.opacity = isValid ? 0.5 : 0.7;
          material.color.set(isValid ? '#f4433680' : '#FF0000');
        }
      }
    });
  }

  private registerBlockType(definition: BlockDefinition) {
    this.blockDefinitions[definition.type] = definition;
  }

  createBlock(type: string, position: Vector3, rotation: Vector3): Block {
    const definition = this.blockDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    // Create the mesh using the definition's factory method
    const mesh = definition.createMesh(position, rotation);
    
    // Create a block with proper highlighting methods
    const block: Block = {
      type,
      position,
      rotation,
      mesh,
      originalMaterials: [],
      
      // Method to highlight the block
      highlight(material: THREE.Material): void {
        this.originalMaterials = [];
        
        if (this.mesh instanceof THREE.Mesh) {
          this.originalMaterials.push(this.mesh.material as THREE.Material);
          this.mesh.material = material;
        } else if (this.mesh instanceof THREE.Group) {
          this.mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
              this.originalMaterials?.push(child.material as THREE.Material);
              child.material = material;
            }
          });
        }
      },
      
      // Method to unhighlight the block
      unhighlight(): void {
        if (!this.originalMaterials || this.originalMaterials.length === 0) return;
        
        if (this.mesh instanceof THREE.Mesh) {
          this.mesh.material = this.originalMaterials[0];
        } else if (this.mesh instanceof THREE.Group) {
          let i = 0;
          this.mesh.traverse(child => {
            if (child instanceof THREE.Mesh && i < this.originalMaterials!.length) {
              child.material = this.originalMaterials![i];
              i++;
            }
          });
        }
        
        this.originalMaterials = [];
      },
      
      // Get all mesh children for raycasting
      getMeshChildren(): THREE.Object3D[] {
        if (this.mesh instanceof THREE.Mesh) {
          return [this.mesh];
        } else if (this.mesh instanceof THREE.Group) {
          const children: THREE.Object3D[] = [];
          this.mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
              children.push(child);
            }
          });
          return children;
        }
        return [];
      }
    };
    
    return block;
  }

  createPlaceholder(type: string): THREE.Mesh | THREE.Group {
    const definition = this.blockDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    return definition.createPlaceholder();
  }

  highlightPlaceholder(type: string, mesh: THREE.Mesh | THREE.Group, isValid: boolean): void {
    const definition = this.blockDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    definition.highlightPlaceholder(mesh, isValid);
  }

  getBlockDefinition(type: string): BlockDefinition {
    return this.blockDefinitions[type];
  }

  getAllBlockTypes(): string[] {
    return Object.keys(this.blockDefinitions);
  }
}
