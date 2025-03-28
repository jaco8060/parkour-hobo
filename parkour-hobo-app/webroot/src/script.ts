// webroot/src/script.ts
import * as THREE from 'three';
import { BlockFactory } from './blockFactory.js';
import { Player } from './player.js';
import { Block, CourseData, Vector3, AtmosphereSettings } from './types.js'; // Use simplified CourseData
import type { WebViewMessage, DevvitMessage, DevvitSystemMessage } from './message.js'; // Adjust path

/**
 * Sends a message TO the Devvit app frame.
 * @param {WebViewMessage} msg - The message to send.
 */
function postDevvitMessage(msg: WebViewMessage): void {
  if (window.parent) {
    window.parent.postMessage(msg, '*');
  } else {
    console.error("Cannot post message: not running inside an iframe (window.parent is null)");
  }
}

class ParkourPlayerGame {
  // Three.js components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Game components
  private blockFactory: BlockFactory;
  private player: Player | null = null;
  private currentCourseBlocks: Block[] = [];

  // Atmosphere
  private skyBox: THREE.Mesh | null = null;
  private clouds: THREE.Group | null = null;
  private sunMoon: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  private gameLoopId: number | null = null; // To control the animation loop
  private loadingIndicator: HTMLElement | null;

  constructor() {
    this.blockFactory = new BlockFactory();
    this.clock = new THREE.Clock();
    this.loadingIndicator = document.getElementById('loading-indicator');

    // --- Basic Three.js Setup ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Default day sky

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Camera position will be controlled by the Player

    const canvas = document.getElementById("threejs-canvas") as HTMLCanvasElement;
    if (!canvas) {
        throw new Error("Canvas element #threejs-canvas not found!");
    }
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // --- Lighting ---
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Slightly dimmer ambient
    this.scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Slightly dimmer directional
    this.directionalLight.position.set(10, 20, 10);
    // Add shadow capabilities if desired
    // this.directionalLight.castShadow = true;
    // this.renderer.shadowMap.enabled = true;
    this.scene.add(this.directionalLight);


    // --- Event Listeners ---
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('message', this.handleDevvitMessage);

    // --- Signal Devvit that the web view is ready ---
    // Wait a tiny moment for scripts to fully load before signaling ready
    requestAnimationFrame(() => {
        postDevvitMessage({ type: 'webViewReady' });
        console.log('Web View Ready message sent.');
         if (this.loadingIndicator) this.loadingIndicator.textContent = 'Waiting for course data...';
    });
  }

  private onWindowResize = () => {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- Message Handling from Devvit ---
  private handleDevvitMessage = (event: MessageEvent) => {
     // More robust check for Devvit messages
     if (!event.data || event.data.type !== 'devvit-message' || !event.data.data || !event.data.data.message) {
         // console.log("Ignoring non-Devvit message or invalid format:", event.data);
         return;
     }

    const message = event.data.data.message as DevvitMessage; // Extract the actual message
    console.log('Received message from Devvit:', message);

    switch (message.type) {
      case 'loadCourse':
        this.loadCourse(message.courseJson);
        break;
      case 'resetPlayer':
        if (this.player) {
           const startBlock = this.currentCourseBlocks.find(b => b.type === 'start');
           const startPos = startBlock
              ? { x: startBlock.position.x, y: startBlock.position.y + 1.0, z: startBlock.position.z }
              : { x: 0, y: 1, z: 0 };
           this.player.setPosition(startPos);
           this.player.resetLevelCompletion(); // Ensure level complete flag is reset
        }
        break;
      default:
        console.warn('Unknown message type received from Devvit:', message);
    }
  };

  // --- Course Loading ---
  private loadCourse(courseJson: string) {
    if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Loading Course...';
    }

    try {
      // Use the simplified CourseData type for parsing
      const courseData: CourseData = JSON.parse(courseJson);
      console.log('Successfully parsed course JSON:', courseData.name);

      // Clear existing scene elements
      this.clearScene();

      // --- Deserialize and Add Blocks ---
      if (!courseData.blocks || !Array.isArray(courseData.blocks)) {
          throw new Error("Course data is missing or has invalid 'blocks' array.");
      }
      this.currentCourseBlocks = courseData.blocks.map((blockData) => {
        if (!blockData || !blockData.type || !blockData.position || !blockData.rotation) {
             console.warn("Skipping invalid block data:", blockData);
             return null; // Skip invalid block data
        }
        try {
            return this.blockFactory.createBlock(
              blockData.type,
              blockData.position,
              blockData.rotation
            );
        } catch(blockError: any) {
             console.error(`Failed to create block of type ${blockData.type}:`, blockError.message);
             return null; // Skip blocks that fail creation
        }
      }).filter(block => block !== null) as Block[]; // Filter out nulls


      this.currentCourseBlocks.forEach(block => {
        if (block.mesh) {
          this.scene.add(block.mesh);
          // Enable shadows if needed
          // block.mesh.castShadow = true;
          // block.mesh.receiveShadow = true;
        }
      });
      console.log(`Added ${this.currentCourseBlocks.length} blocks to the scene.`);

      // --- Setup Atmosphere ---
      const atmosphereSettings = courseData.atmosphere || { isDayMode: true };
      this.setupAtmosphere(atmosphereSettings);

      // --- Determine Start Position ---
      // Use startPosition from JSON if available, otherwise find 'start' block
       let startPosition: Vector3;
       if (courseData.startPosition && courseData.startPosition.x !== undefined) {
            // Use provided start position, maybe raise Y slightly
            startPosition = { ...courseData.startPosition, y: courseData.startPosition.y + 0.1 };
            console.log('Using startPosition from JSON:', startPosition);
       } else {
            const startBlock = this.currentCourseBlocks.find(b => b.type === 'start');
            startPosition = startBlock
            ? { x: startBlock.position.x, y: startBlock.position.y + 1.0, z: startBlock.position.z } // Start slightly above the block
            : { x: 0, y: 1, z: 0 }; // Default start position if none found
            console.log('Using detected start block or default:', startPosition);
       }


      console.log('Creating player at:', startPosition);
      // --- Create Player ---
      this.player = new Player(startPosition, this.camera);
      this.scene.add(this.player.mesh);
      // Enable shadows if needed
      // this.player.mesh.castShadow = true;

      // --- Set Player Callbacks ---
      // Player death is handled internally (respawn), no message needed unless desired
      this.player.setOnDeath(() => {
        console.log('Player died (internal callback).');
        // Could send message: postDevvitMessage({ type: 'playerDied' });
      });

      // Level completion sends message back to Devvit
      this.player.setOnLevelComplete(() => {
        console.log('Level Complete! (internal callback)');
        // Message is sent from within Player.checkSpecialZones now
      });

      // --- Start Game Loop ---
      this.startGameLoop();

      if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';

    } catch (error: any) {
      console.error("Failed to load course:", error.message);
      if (this.loadingIndicator) {
          this.loadingIndicator.textContent = `Error loading course: ${error.message}`;
          this.loadingIndicator.style.color = 'red';
      }
      // Optional: Send error message back to Devvit
      // postDevvitMessage({ type: 'loadError', error: `Invalid course data: ${error.message}` });
    }
  }

  private clearScene() {
    // Stop loop first
    if (this.gameLoopId !== null) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }

    // Remove blocks
    this.currentCourseBlocks.forEach(block => {
      if (block.mesh) {
        this.scene.remove(block.mesh);
        // Proper disposal (important for WebGL memory)
        if (block.mesh instanceof THREE.Group) {
            block.mesh.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material?.dispose();
                    }
                }
            });
        } else if (block.mesh instanceof THREE.Mesh) {
             block.mesh.geometry?.dispose();
             if (Array.isArray(block.mesh.material)) {
                 block.mesh.material.forEach(mat => mat.dispose());
             } else {
                 block.mesh.material?.dispose();
             }
        }
      }
    });
    this.currentCourseBlocks = [];

    // Remove player
    if (this.player) {
      this.scene.remove(this.player.mesh);
      this.player.destroy(); // Clean up player listeners
      this.player = null;
    }
     // Remove atmosphere elements
    if (this.skyBox) this.scene.remove(this.skyBox);
    if (this.clouds) this.scene.remove(this.clouds);
    if (this.sunMoon) this.scene.remove(this.sunMoon);
    // Add disposal for atmosphere geometries/materials if needed
    this.skyBox = null;
    this.clouds = null;
    this.sunMoon = null;
  }

  // --- Game Loop ---
  private startGameLoop() {
    if (this.gameLoopId === null) { // Prevent multiple loops
        console.log("Starting game loop...");
        this.animate();
    } else {
        console.log("Game loop already running.");
    }
  }

  private animate = () => { // Use arrow function to bind 'this'
    this.gameLoopId = requestAnimationFrame(this.animate); // Request next frame

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Animate kill zones
    this.animateKillZones(time);

    // Update Player
    if (this.player) {
      this.player.update(delta, time, this.currentCourseBlocks);
      // Camera is updated inside player.update()
    } else {
        // If no player, maybe stop the loop? Or just wait.
        // console.log("Waiting for player...");
    }

    // Render the scene
    if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
    } else {
         console.error("Renderer, Scene, or Camera is missing. Cannot render.");
         if (this.gameLoopId !== null) cancelAnimationFrame(this.gameLoopId);
         this.gameLoopId = null;
    }

  }

  // --- Atmosphere & Killzone Methods (Copied directly from previous example, ensure THREE is accessible) ---
  private setupAtmosphere(settings: AtmosphereSettings) { /* ... code ... */
    // Remove existing atmosphere elements
    if (this.skyBox) this.scene.remove(this.skyBox);
    if (this.clouds) this.scene.remove(this.clouds);
    if (this.sunMoon) this.scene.remove(this.sunMoon);

    if (settings.isDayMode) {
      this.scene.background = new THREE.Color(0x87ceeb);
      this.createDaytimeAtmosphere();
    } else {
      this.scene.background = new THREE.Color(0x6666ff);
      this.createNighttimeAtmosphere();
    }
    this.updateLighting(settings);
  }
  private createDaytimeAtmosphere() { /* ... code ... */
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
    this.sunMoon = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMoon.position.set(50, 100, -100);
    this.scene.add(this.sunMoon);

    this.clouds = new THREE.Group();
    for (let i = 0; i < 15; i++) {
      const cloud = this.createCloud(0xffffff, 0.3);
      cloud.position.set((Math.random() - 0.5) * 200, 25 + Math.random() * 20, (Math.random() - 0.5) * 200);
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }
  private createNighttimeAtmosphere() { /* ... code ... */
    const moonGeometry = new THREE.SphereGeometry(5, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.8 });
    this.sunMoon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.sunMoon.position.set(50, 100, -100);
    this.scene.add(this.sunMoon);

    this.clouds = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const cloud = this.createCloud(0x777777, 0.5);
      cloud.position.set((Math.random() - 0.5) * 200, 25 + Math.random() * 20, (Math.random() - 0.5) * 200);
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }
  private createCloud(color: number, opacity: number): THREE.Group { /* ... code ... */
    const cloudGroup = new THREE.Group();
    const sphereCount = 5 + Math.floor(Math.random() * 5);
    const baseSize = 3 + Math.random() * 3;
    for (let i = 0; i < sphereCount; i++) {
        const sphereGeometry = new THREE.SphereGeometry(baseSize * (0.6 + Math.random() * 0.4), 8, 8);
        const sphereMaterial = new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: opacity });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        const angle = (i / sphereCount) * Math.PI * 2;
        const radius = baseSize * 0.8;
        sphere.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * baseSize * 0.5, Math.sin(angle) * radius);
        cloudGroup.add(sphere);
    }
    return cloudGroup;
  }
  private updateLighting(settings: AtmosphereSettings) { /* ... code ... */
    if (settings.isDayMode) {
      this.ambientLight.intensity = 0.5;
      this.directionalLight.intensity = 0.7;
      this.directionalLight.color.set(0xffffff);
      this.directionalLight.position.set(10, 20, 10);
    } else {
      this.ambientLight.intensity = 0.3; // Dimmer night ambient
      this.directionalLight.intensity = 0.4; // Dimmer night directional
      this.directionalLight.color.set(0xccddff); // Moonlight color
      this.directionalLight.position.set(-10, 20, -10);
    }
  }
  private animateKillZones(time: number) { /* ... code ... */
    if (!this.currentCourseBlocks) return;
     for (const block of this.currentCourseBlocks) {
       if ((block.type === 'killZone' || block.type === 'killZoneLarge') && block.mesh) {
         const opacity = 0.4 + (Math.sin(time * 4) + 1) * 0.15; // Faster pulse
         if (block.mesh instanceof THREE.Mesh) {
           const material = block.mesh.material as THREE.MeshLambertMaterial;
           if (material.transparent) material.opacity = opacity;
         } else if (block.mesh instanceof THREE.Group) {
           if (block.mesh.children.length > 0) {
             const baseMesh = block.mesh.children[0];
             if (baseMesh instanceof THREE.Mesh) {
               const material = baseMesh.material as THREE.MeshLambertMaterial;
               if (material.transparent) material.opacity = opacity;
             }
           }
           for (let i = 1; i < block.mesh.children.length; i++) {
             const triangle = block.mesh.children[i];
             if (triangle instanceof THREE.Mesh) {
               const originalY = (triangle as any).originalY ?? 0.3;
               const randomPhase = (triangle as any).randomPhase ?? 0;
               triangle.position.y = originalY + Math.sin(time * 2.5 + randomPhase) * 0.12; // Slightly different animation
               triangle.rotation.y = time * 0.6 + randomPhase;
             }
           }
         }
       }
     }
   }

  // Method to clean up resources
  public destroy() {
    console.log("Destroying ParkourPlayerGame instance...");
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('message', this.handleDevvitMessage);
    this.clearScene(); // Stops loop and cleans up player/blocks
    // Dispose renderer and its context
    this.renderer?.dispose();
    console.log("ParkourPlayerGame destroyed.");
  }
}

// --- Global Instance ---
// Ensure only one game instance is created
let gameInstance: ParkourPlayerGame | null = null;

if (!gameInstance) {
    try {
        gameInstance = new ParkourPlayerGame();
        console.log("ParkourPlayerGame Initialized");
    } catch (initError) {
         console.error("Failed to initialize ParkourPlayerGame:", initError);
         const indicator = document.getElementById('loading-indicator');
         if(indicator) {
             indicator.textContent = "Initialization Error!";
             indicator.style.color = 'red';
         }
    }

}

// Optional: Add cleanup listener for when the web view might be abruptly closed
// Note: 'unload' and 'beforeunload' are unreliable, especially in iframes.
// Devvit's onUnmount in useWebView is generally more reliable.
// window.addEventListener('unload', () => {
//   if (gameInstance) {
//     gameInstance.destroy();
//     gameInstance = null;
//   }
// });
