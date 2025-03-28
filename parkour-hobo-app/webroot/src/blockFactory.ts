// webroot/src/blockFactory.ts
// Copied from your original src/blockFactory.ts and simplified

import * as THREE from "three";
// Make sure the path to types is correct relative to this file
import { Block, BlockDefinition, Vector3 } from "./types";

export class BlockFactory {
  private blockDefinitions: Record<string, BlockDefinition> = {};

  constructor() {
    this.registerBlockTypes();
  }

  private registerBlockTypes() {
    // Register Floor (Example - keep all your definitions)
    this.registerBlockType({
      type: "floor",
      dimensions: { x: 5, y: 0.2, z: 5 },
      color: "#8B8B8B",
      // previewColor REMOVED
      createMesh: (position, rotation) => {
        const geometry = new THREE.BoxGeometry(5, 0.2, 5);
        const material = new THREE.MeshLambertMaterial({ color: "#8B8B8B" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z)
        );
        return mesh;
      },
      // createPlaceholder REMOVED
      // highlightPlaceholder REMOVED
    });

     // Register Small Platform
     this.registerBlockType({
        type: "smallPlatform",
        dimensions: { x: 2, y: 0.5, z: 2 },
        color: "#C4C4C4",
        createMesh: (position, rotation) => {
          const geometry = new THREE.BoxGeometry(2, 0.5, 2);
          const material = new THREE.MeshLambertMaterial({ color: "#C4C4C4" });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(position.x, position.y, position.z);
          mesh.rotation.set(
            THREE.MathUtils.degToRad(rotation.x),
            THREE.MathUtils.degToRad(rotation.y),
            THREE.MathUtils.degToRad(rotation.z)
          );
          return mesh;
        },
      });

      // Register Large Platform
      this.registerBlockType({
        type: "largePlatform",
        dimensions: { x: 4, y: 0.5, z: 4 },
        color: "#C4C4C4",
        createMesh: (position, rotation) => {
            const geometry = new THREE.BoxGeometry(4, 0.5, 4);
            const material = new THREE.MeshLambertMaterial({ color: "#C4C4C4" });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return mesh;
          },
      });

       // Register Garbage Bag
      this.registerBlockType({
        type: "garbageBag",
        dimensions: { x: 2, y: 1.5, z: 2 }, // Use dimensions for collision approx if needed
        color: "#4D4D4D",
        createMesh: (position, rotation) => {
            const garbageBagGroup = new THREE.Group();
            const bagGeometry = new THREE.SphereGeometry(1, 8, 8);
            for (let i = 0; i < bagGeometry.attributes.position.count; i++) {
              const y = bagGeometry.attributes.position.getY(i);
              if (y < 0) bagGeometry.attributes.position.setY(i, y * 0.5);
            }
            bagGeometry.computeVertexNormals();
            bagGeometry.scale(1, 1.2, 1);
            const bagMaterial = new THREE.MeshLambertMaterial({ color: "#2C2C2C", flatShading: true });
            const bag = new THREE.Mesh(bagGeometry, bagMaterial);

            const tieGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.3, 8);
            const tieMaterial = new THREE.MeshLambertMaterial({ color: "#1A1A1A" });
            const tie = new THREE.Mesh(tieGeometry, tieMaterial);
            tie.position.y = 1.2;

            const createBulge = (x: number, y: number, z: number, scale: THREE.Vector3) => {
              const bulgeGeometry = new THREE.SphereGeometry(0.4, 6, 6);
              const bulgeMaterial = new THREE.MeshLambertMaterial({ color: "#3A3A3A", flatShading: true });
              const bulge = new THREE.Mesh(bulgeGeometry, bulgeMaterial);
              bulge.position.set(x, y, z);
              bulge.scale.copy(scale);
              garbageBagGroup.add(bulge);
            };
            createBulge(0.6, 0.2, 0.5, new THREE.Vector3(1.2, 1, 1.3));
            createBulge(-0.5, 0.4, 0.4, new THREE.Vector3(1.0, 0.8, 1.1));
            createBulge(0.2, -0.2, -0.6, new THREE.Vector3(1.1, 0.9, 1.0));

            garbageBagGroup.add(bag);
            garbageBagGroup.add(tie);
            garbageBagGroup.position.set(position.x, position.y, position.z);
            garbageBagGroup.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return garbageBagGroup;
        },
      });

      // Register Rooftop
      this.registerBlockType({
        type: "rooftop",
        dimensions: { x: 3, y: 0.3, z: 3 },
        color: "#6D6D6D",
         createMesh: (position, rotation) => {
            const geometry = new THREE.BoxGeometry(3, 0.3, 3);
            const material = new THREE.MeshLambertMaterial({ color: "#6D6D6D" });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return mesh;
          },
      });

       // Register Building
      this.registerBlockType({
        type: "building",
        dimensions: { x: 2, y: 5, z: 2 },
        color: "#9E9E9E",
        createMesh: (position, rotation) => {
            const geometry = new THREE.BoxGeometry(2, 5, 2);
            const material = new THREE.MeshLambertMaterial({ color: "#9E9E9E" });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return mesh;
          },
      });

       // Register Bridge
      this.registerBlockType({
        type: "bridge",
        dimensions: { x: 2, y: 0.3, z: 6 }, // Overall dimensions approx
        color: "#A0522D",
         createMesh: (position, rotation) => {
            const bridgeGroup = new THREE.Group();
            const deckGeometry = new THREE.BoxGeometry(2, 0.3, 6);
            const deckMaterial = new THREE.MeshLambertMaterial({ color: "#A0522D" });
            const deck = new THREE.Mesh(deckGeometry, deckMaterial);
            bridgeGroup.add(deck);

            const railingMaterial = new THREE.MeshLambertMaterial({ color: "#8B4513" });
            const leftRailingGeometry = new THREE.BoxGeometry(0.1, 0.3, 6);
            const leftRailing = new THREE.Mesh(leftRailingGeometry, railingMaterial);
            leftRailing.position.set(-0.95, 0.3, 0);
            bridgeGroup.add(leftRailing);

            const rightRailingGeometry = new THREE.BoxGeometry(0.1, 0.3, 6);
            const rightRailing = new THREE.Mesh(rightRailingGeometry, railingMaterial);
            rightRailing.position.set(0.95, 0.3, 0);
            bridgeGroup.add(rightRailing);

            const postMaterial = new THREE.MeshLambertMaterial({ color: "#6D4C41" });
            for (let z = -2.5; z <= 2.5; z += 1.5) {
              const leftPostGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
              const leftPost = new THREE.Mesh(leftPostGeometry, postMaterial);
              leftPost.position.set(-0.95, 0.4, z);
              bridgeGroup.add(leftPost);

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
      });

      // Register Kill Zone
      this.registerBlockType({
        type: "killZone",
        dimensions: { x: 3, y: 0.2, z: 3 },
        color: "#FF0000",
        createMesh: (position, rotation) => {
            const killZoneGroup = new THREE.Group();
            const geometry = new THREE.BoxGeometry(3, 0.2, 3);
            const material = new THREE.MeshLambertMaterial({ color: "#FF0000", transparent: true, opacity: 0.6 });
            const baseMesh = new THREE.Mesh(geometry, material);
            killZoneGroup.add(baseMesh);

            const particleMaterial = new THREE.MeshBasicMaterial({ color: "#FF0000" });
            for (let i = 0; i < 8; i++) {
              const triangleGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
              const triangle = new THREE.Mesh(triangleGeometry, particleMaterial);
              const angle = (i / 8) * Math.PI * 2;
              const radius = 1.2;
              triangle.position.set(Math.sin(angle) * radius, 0.3, Math.cos(angle) * radius);
              triangle.rotation.x = Math.PI;
              (triangle as any).originalY = triangle.position.y;
              (triangle as any).randomPhase = Math.random() * Math.PI * 2;
              killZoneGroup.add(triangle);
            }
            killZoneGroup.position.set(position.x, position.y, position.z);
            killZoneGroup.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return killZoneGroup;
        },
      });

      // Register Large Kill Zone
      this.registerBlockType({
        type: "killZoneLarge",
        dimensions: { x: 6, y: 0.2, z: 6 },
        color: "#FF0000",
        createMesh: (position, rotation) => {
            const killZoneGroup = new THREE.Group();
            const geometry = new THREE.BoxGeometry(6, 0.2, 6);
            const material = new THREE.MeshLambertMaterial({ color: "#FF0000", transparent: true, opacity: 0.6 });
            const baseMesh = new THREE.Mesh(geometry, material);
            killZoneGroup.add(baseMesh);

            const particleMaterial = new THREE.MeshBasicMaterial({ color: "#FF0000" });
            for (let i = 0; i < 16; i++) { /* ... triangle creation ... */
                const triangleGeometry = new THREE.ConeGeometry(0.15, 0.3, 3);
                const triangle = new THREE.Mesh(triangleGeometry, particleMaterial);
                const angle = (i / 16) * Math.PI * 2;
                const radius = 2.5;
                triangle.position.set(Math.sin(angle) * radius, 0.3, Math.cos(angle) * radius);
                triangle.rotation.x = Math.PI;
                (triangle as any).originalY = triangle.position.y;
                (triangle as any).randomPhase = Math.random() * Math.PI * 2;
                killZoneGroup.add(triangle);
            }
            const centerTriangleGeometry = new THREE.ConeGeometry(0.3, 0.5, 3);
            const centerTriangle = new THREE.Mesh(centerTriangleGeometry, particleMaterial);
            centerTriangle.position.set(0, 0.4, 0);
            centerTriangle.rotation.x = Math.PI;
            (centerTriangle as any).originalY = centerTriangle.position.y;
            (centerTriangle as any).randomPhase = 0;
            killZoneGroup.add(centerTriangle);

            killZoneGroup.position.set(position.x, position.y, position.z);
            killZoneGroup.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return killZoneGroup;
        },
      });

     // Register Start
     this.registerBlockType({
        type: "start",
        dimensions: { x: 1, y: 0.5, z: 1 },
        color: "#4CAF50",
        limit: 1, // Keep limit for reference
        createMesh: (position, rotation) => {
            const geometry = new THREE.BoxGeometry(1, 0.5, 1);
            const material = new THREE.MeshLambertMaterial({ color: "#4CAF50" });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return mesh;
          },
      });

      // Register Finish
      this.registerBlockType({
        type: "finish",
        dimensions: { x: 1, y: 0.5, z: 1 },
        color: "#f44336",
        limit: 1, // Keep limit for reference
        createMesh: (position, rotation) => {
            const geometry = new THREE.BoxGeometry(1, 0.5, 1);
            const material = new THREE.MeshLambertMaterial({ color: "#f44336" });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(position.x, position.y, position.z);
            mesh.rotation.set(
              THREE.MathUtils.degToRad(rotation.x),
              THREE.MathUtils.degToRad(rotation.y),
              THREE.MathUtils.degToRad(rotation.z)
            );
            return mesh;
          },
      });

    // Add ALL your other block type registrations here, removing only
    // previewColor, createPlaceholder, and highlightPlaceholder
    // ...
  }

  // registerBlockType remains the same
  private registerBlockType(definition: BlockDefinition) {
    this.blockDefinitions[definition.type] = definition;
  }

  createBlock(type: string, position: Vector3, rotation: Vector3): Block {
    const definition = this.blockDefinitions[type];
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    const mesh = definition.createMesh(position, rotation);

    // Simplified block - remove highlight/unhighlight if not needed for player effects
    const block: Block = {
      type,
      position,
      rotation,
      mesh,
      originalMaterials: [], // Keep if highlight/unhighlight used

      // Method to highlight the block (keep if needed, e.g., for interaction effects)
      highlight(material: THREE.Material): void {
        this.originalMaterials = [];
        if (this.mesh instanceof THREE.Mesh) {
          this.originalMaterials.push(this.mesh.material as THREE.Material);
          this.mesh.material = material;
        } else if (this.mesh instanceof THREE.Group) {
          this.mesh.traverse((child) => {
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
           this.mesh.traverse((child) => {
             if (child instanceof THREE.Mesh && i < this.originalMaterials!.length) {
               child.material = this.originalMaterials![i++];
             }
           });
         }
         this.originalMaterials = [];
      },

      // Keep getMeshChildren if player collision needs it
       getMeshChildren(): THREE.Object3D[] {
        if (this.mesh instanceof THREE.Mesh) {
          return [this.mesh];
        } else if (this.mesh instanceof THREE.Group) {
          const children: THREE.Object3D[] = [];
          this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) children.push(child);
          });
          return children;
        }
        return [];
      },
    };
    return block;
  }

  // createPlaceholder REMOVED
  // highlightPlaceholder REMOVED

  // Keep getBlockDefinition if needed internally by player/game logic
  getBlockDefinition(type: string): BlockDefinition {
     const definition = this.blockDefinitions[type];
     if (!definition) {
         throw new Error(`Unknown block type definition requested: ${type}`);
     }
    return definition;
  }

  // getAllBlockTypes REMOVED (not needed for player)
}
