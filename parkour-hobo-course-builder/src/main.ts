import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from './player';
import { BlockFactory } from './blockFactory';
import { CourseManager } from './courseManager';
import { UI } from './ui';
import { Course, Vector3, Block } from './types';
import './styles.css';

class ParkourHoboCourseBuilder {
  // Three.js components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  
  // Game components
  private blockFactory: BlockFactory;
  private courseManager: CourseManager;
  private ui: UI;
  private currentCourse: Course | null = null;
  private selectedBlockType: string | null = null;
  private player: Player | null = null;
  private isBuilderMode: boolean = true;
  
  // Movement in player mode
  private keys: { [key: string]: boolean } = {};
  private clock: THREE.Clock;
  
  // Add placeholder property
  private placeholderMesh: THREE.Mesh | null = null;
  private canPlaceBlock: boolean = true;

  // Add these properties to the ParkourHoboCourseBuilder class
  private currentTool: string = 'build';
  private rotationAngle: number = 0;

  // Add this property to the class
  private gridHelper: THREE.GridHelper;

  // Add these properties to the class
  private highlightedBlock: Block | null = null;
  private originalMaterial: THREE.Material | THREE.Material[] | null = null;
  private deleteMaterial: THREE.MeshBasicMaterial;

  constructor() {
    // Initialize components
    this.blockFactory = new BlockFactory();
    this.courseManager = new CourseManager();
    this.ui = new UI(this.courseManager);
    this.clock = new THREE.Clock();
    
    // Set up Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(10, 10, 10);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('threejs-canvas') as HTMLCanvasElement,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
    
    // Add grid helper
    this.gridHelper = new THREE.GridHelper(50, 50);
    this.scene.add(this.gridHelper);
    
    // Create a material for deletion highlighting
    this.deleteMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,  // Red
      transparent: true,
      opacity: 0.7
    });
    
    // Set up UI callbacks
    this.setupUICallbacks();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start animation loop
    this.animate();
  }

  private setupUICallbacks() {
    this.ui.setOnNewCourse((templateName: string) => {
      const courseName = `New ${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Course`;
      this.currentCourse = this.courseManager.createNewCourse(courseName, templateName);
      this.ui.setCourseNameInput(courseName);
      this.ui.hideStartMenu();
      this.ui.showBuilderMode();
      this.isBuilderMode = true;
      this.updateBlockCounter();
    });
    
    this.ui.setOnLoadCourse((courseId: string) => {
      const course = this.courseManager.getCourse(courseId);
      if (course) {
        this.currentCourse = this.loadCourseIntoScene(course);
        this.ui.setCourseNameInput(course.name);
        this.ui.hideStartMenu();
        this.ui.showBuilderMode();
        this.isBuilderMode = true;
        this.updateBlockCounter();
      }
    });
    
    this.ui.setOnBlockSelected((blockType: string) => {
      this.selectedBlockType = blockType;
      this.updatePlaceholder();
    });
    
    this.ui.setOnSaveCourse(() => {
      if (this.currentCourse) {
        const courseName = this.ui.getCourseName();
        if (courseName.trim() === '') {
          alert('Please enter a course name');
          return;
        }
        
        this.currentCourse.name = courseName;
        this.courseManager.saveCourse(this.currentCourse);
        alert('Course saved successfully!');
      }
    });
    
    this.ui.setOnExportCourse(() => {
      if (this.currentCourse) {
        const jsonCode = this.courseManager.exportCourseAsJson(this.currentCourse);
        this.ui.showExportModal(jsonCode);
      }
    });
    
    this.ui.setOnReset(() => {
      this.clearScene();
      this.ui.showStartMenu();
    });
    
    this.ui.setOnToolSelected((tool: string) => {
      // Set the current tool
      this.setTool(tool);
      
      // Handle player mode tool
      if (tool === 'player') {
        if (this.isBuilderMode) {
          this.toggleMode();
        }
        return;
      }
      
      // If we're in player mode, switch back to builder mode
      if (!this.isBuilderMode) {
        this.toggleMode();
      }
    });
  }

  private setupEventListeners() {
    // Resize handling
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Track if we're dragging the camera
    let isDragging = false;
    let dragStartTime = 0;
    
    this.renderer.domElement.addEventListener('mousedown', () => {
      isDragging = false;
      dragStartTime = Date.now();
    });
    
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      // Calculate pointer position in normalized device coordinates
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // If mouse is moving with button down, consider it a drag
      if (event.buttons > 0 && Date.now() - dragStartTime > 100) {
        isDragging = true;
      }
      
      // Update placeholder position if in build mode
      if (this.isBuilderMode && this.selectedBlockType && this.currentTool === 'build') {
        this.updatePlaceholderPosition();
      }
      
      // Highlight blocks when in delete mode
      if (this.isBuilderMode && this.currentTool === 'delete') {
        this.highlightBlockForDeletion();
      }
    });
    
    this.renderer.domElement.addEventListener('click', () => {
      // Only place/delete blocks if we're not dragging the camera
      if (!isDragging && this.isBuilderMode) {
        if (this.currentTool === 'build' && this.selectedBlockType && this.canPlaceBlock) {
          this.buildBlock();
        } else if (this.currentTool === 'delete' && this.highlightedBlock) {
          this.deleteHighlightedBlock();
        } else if (this.currentTool === 'rotate' && this.selectedBlockType) {
          this.rotateBlock();
        }
      }
      
      // Reset drag state
      isDragging = false;
    });
    
    // Keyboard events
    window.addEventListener('keydown', (event) => {
      // Tool shortcuts
      if (event.key === '1') {
        this.ui.selectTool('build');
        // Set the tool internally as well
        this.currentTool = 'build';
      } else if (event.key === '2') {
        this.ui.selectTool('delete');
        this.currentTool = 'delete';
      } else if (event.key === '3') {
        this.ui.selectTool('rotate');
        this.currentTool = 'rotate';
      } else if (event.key === 'b' || event.key === 'B') {
        // B toggles between builder and player modes
        this.toggleMode();
        
        // Update toolbar to reflect the current mode
        if (this.isBuilderMode) {
          this.ui.selectTool(this.currentTool); // Go back to previous build tool
        } else {
          this.ui.selectTool('player');
        }
      }
      
      // Player controls
      this.keys[event.key.toLowerCase()] = true;
      
      // Jump with space in player mode
      if (!this.isBuilderMode && (event.key === ' ' || event.key === 'Space') && this.player) {
        this.player.jump();
      }
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false;
    });
  }

  private toggleMode() {
    this.isBuilderMode = !this.isBuilderMode;
    
    if (this.isBuilderMode) {
      // Switch to builder mode
      this.ui.showBuilderMode();
      
      if (this.player) {
        // Remove player from scene
        this.scene.remove(this.player.mesh);
        this.player = null;
      }
      
      // Reset camera and controls
      this.controls.enabled = true;
      
      // Restore placeholder if block type is selected
      if (this.selectedBlockType) {
        this.updatePlaceholder();
      }
      
      // Show grid in builder mode
      this.gridHelper.visible = true;
      
      // Reset any highlighted blocks
      if (this.highlightedBlock && this.originalMaterial) {
        this.highlightedBlock.mesh!.material = this.originalMaterial;
        this.highlightedBlock = null;
        this.originalMaterial = null;
      }
    } else {
      // Switch to player mode
      this.ui.showPlayerMode();
      
      // Create player at start position
      if (this.currentCourse && this.currentCourse.startPosition) {
        this.createPlayer(this.currentCourse.startPosition);
      } else {
        // If no start position, create player at origin
        this.createPlayer({ x: 0, y: 1, z: 0 });
      }
      
      // Disable orbit controls in player mode
      this.controls.enabled = false;
      
      // Hide placeholder in player mode
      if (this.placeholderMesh) {
        this.scene.remove(this.placeholderMesh);
        this.placeholderMesh = null;
      }
      
      // Hide grid in player mode
      this.gridHelper.visible = false;
    }
  }

  private createPlayer(position: Vector3) {
    if (this.player) {
      this.scene.remove(this.player.mesh);
    }
    
    this.player = new Player(position);
    this.scene.add(this.player.mesh);
    
    // Set camera to follow player
    this.camera.position.set(
      this.player.mesh.position.x, 
      this.player.mesh.position.y + 2, 
      this.player.mesh.position.z + 5
    );
    this.camera.lookAt(this.player.mesh.position);
  }

  private buildBlock() {
    if (!this.placeholderMesh || !this.selectedBlockType || !this.currentCourse) return;
    
    const position = this.placeholderMesh.position.clone();
    
    // Get block definition
    const blockDef = this.blockFactory.getBlockDefinition(this.selectedBlockType);
    
    // Create block
    const block = this.blockFactory.createBlock(
      this.selectedBlockType, 
      { x: position.x, y: position.y, z: position.z }, 
      { x: 0, y: this.rotationAngle, z: 0 }
    );
    
    // Apply rotation
    block.mesh!.rotation.y = THREE.MathUtils.degToRad(this.rotationAngle);
    
    // Add to scene and course
    this.scene.add(block.mesh!);
    this.currentCourse.blocks.push(block);
    
    // Update start/finish positions if needed
    if (this.selectedBlockType === 'start') {
      this.currentCourse.startPosition = { 
        x: position.x, 
        y: position.y + blockDef.dimensions.y / 2, 
        z: position.z 
      };
    } else if (this.selectedBlockType === 'finish') {
      this.currentCourse.finishPosition = { 
        x: position.x, 
        y: position.y + blockDef.dimensions.y / 2, 
        z: position.z 
      };
    }
    
    // Update block counter
    this.updateBlockCounter();
    
    // Update placeholder validity (limits might have changed)
    this.updatePlaceholderPosition();
  }

  
  

  private rotateBlock() {
    // Rotate in 90 degree increments
    this.rotationAngle = (this.rotationAngle + 90) % 360;
    
    // Update placeholder rotation
    if (this.placeholderMesh) {
      this.placeholderMesh.rotation.y = THREE.MathUtils.degToRad(this.rotationAngle);
    }
  }

  private updateBlockCounter() {
    if (this.currentCourse) {
      const template = this.courseManager.getTemplate(this.currentCourse.template);
      this.ui.updateBlockCounter(this.currentCourse.blocks.length, template.maxBlocks);
    }
  }

  private loadCourseIntoScene(course: Course): Course {
    // Clear current scene first
    this.clearScene();
    
    // Create a copy of the course to work with
    const courseCopy: Course = {
      ...course,
      blocks: []
    };
    
    // Create and add blocks to the scene
    course.blocks.forEach(block => {
      const newBlock = this.blockFactory.createBlock(
        block.type,
        block.position,
        block.rotation
      );
      
      this.scene.add(newBlock.mesh!);
      courseCopy.blocks.push(newBlock);
    });
    
    return courseCopy;
  }

  private clearScene() {
    // Remove all blocks from the scene
    if (this.currentCourse) {
      this.currentCourse.blocks.forEach(block => {
        if (block.mesh) {
          this.scene.remove(block.mesh);
        }
      });
    }
    
    // Remove player if exists
    if (this.player) {
      this.scene.remove(this.player.mesh);
      this.player = null;
    }
    
    this.currentCourse = null;
  }

  private handlePlayerMovement(delta: number) {
    if (!this.isBuilderMode && this.player) {
      const speed = 5; // Units per second
      const distance = speed * delta;
      
      // WASD controls
      if (this.keys['w']) {
        this.player.moveForward(distance);
      }
      if (this.keys['s']) {
        this.player.moveBackward(distance);
      }
      if (this.keys['a']) {
        this.player.moveLeft(distance);
      }
      if (this.keys['d']) {
        this.player.moveRight(distance);
      }
      
      // Update camera to follow player
      const playerPos = this.player.mesh.position;
      this.camera.position.set(
        playerPos.x, 
        playerPos.y + 2, 
        playerPos.z + 5
      );
      this.camera.lookAt(playerPos);
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();
    
    // Update controls
    this.controls.update();
    
    // Update placeholder position in builder mode (no animation)
    if (this.isBuilderMode && this.placeholderMesh) {
      this.updatePlaceholderPosition();
    }
    
    // Update player if in player mode
    if (!this.isBuilderMode && this.player) {
      const isMoving = this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'];
      this.player.update(delta, time, isMoving);
      this.handlePlayerMovement(delta);
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private updatePlaceholder() {
    // Remove existing placeholder if it exists
    if (this.placeholderMesh) {
      this.scene.remove(this.placeholderMesh);
      this.placeholderMesh = null;
    }
    
    // Create new placeholder if a block type is selected
    if (this.selectedBlockType && this.isBuilderMode) {
      this.placeholderMesh = this.blockFactory.createPlaceholder(this.selectedBlockType);
      this.scene.add(this.placeholderMesh);
      
      // Initial position update
      this.updatePlaceholderPosition();
    }
  }
  
  private updatePlaceholderPosition() {
    if (!this.placeholderMesh || !this.selectedBlockType) return;
    
    // Get the intersection point on the grid
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    for (const intersect of intersects) {
      // Skip the placeholder itself
      if (intersect.object === this.placeholderMesh) continue;
      
      // Calculate position (snap to grid)
      const position = new THREE.Vector3().copy(intersect.point);
      
      // Round to nearest grid point to ensure proper alignment
      position.x = Math.round(position.x);
      position.z = Math.round(position.z);
      
      // Get block definition
      const blockDef = this.blockFactory.getBlockDefinition(this.selectedBlockType);
      
      // Adjust Y position based on block height
      position.y = blockDef.dimensions.y / 2;
      
      // Update placeholder position
      this.placeholderMesh.position.copy(position);
      
      // Check if placement is valid
      this.canPlaceBlock = this.isValidPlacement(position);
      
      // Visual indicator for valid/invalid placement
      const material = this.placeholderMesh.material as THREE.MeshLambertMaterial;
      
      if (this.canPlaceBlock) {
        material.opacity = 0.5;
        // Reset to the original color if it was previously red
        material.color.set(blockDef.previewColor || blockDef.color);
      } else {
        material.opacity = 0.7;
        material.color.set('#FF0000'); // Red for invalid placement
      }
      
      // Set rotation of placeholder
      this.placeholderMesh.rotation.y = THREE.MathUtils.degToRad(this.rotationAngle);
      
      return;
    }
  }
  
  private isValidPlacement(position: THREE.Vector3): boolean {
    if (!this.currentCourse || !this.selectedBlockType) return false;
    
    // Get block definition
    const blockDef = this.blockFactory.getBlockDefinition(this.selectedBlockType);
    
    // Check for block limits (Start and Finish)
    if (blockDef.limit) {
      const existingCount = this.currentCourse.blocks.filter(
        block => block.type === this.selectedBlockType
      ).length;
      
      if (existingCount >= blockDef.limit) {
        return false;
      }
    }
    
    // Check for template max blocks
    const template = this.courseManager.getTemplate(this.currentCourse.template);
    if (this.currentCourse.blocks.length >= template.maxBlocks) {
      return false;
    }
    
    // Check for collision with other blocks
    for (const block of this.currentCourse.blocks) {
      if (block.mesh) {
        const distance = new THREE.Vector3(
          block.position.x, 
          block.position.y, 
          block.position.z
        ).distanceTo(position);
        
        // If blocks are too close (overlapping), prevent placement
        // This is a simple collision check, you might want to improve it
        const minDistance = (blockDef.dimensions.x + 
                            this.blockFactory.getBlockDefinition(block.type).dimensions.x) / 2;
        if (distance < minDistance * 0.8) {
          return false;
        }
      }
    }
    
    return true;
  }

  private highlightBlockForDeletion() {
    // Reset previous highlighting
    if (this.highlightedBlock && this.highlightedBlock.mesh && this.originalMaterial) {
      this.highlightedBlock.mesh.material = this.originalMaterial;
      this.highlightedBlock = null;
      this.originalMaterial = null;
    }
    
    if (!this.currentCourse) return;
    
    // Cast a ray to find which block we're pointing at
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    for (const intersect of intersects) {
      // Skip grid, placeholders, etc.
      if (!(intersect.object instanceof THREE.Mesh) || 
          intersect.object === this.placeholderMesh || 
          intersect.object instanceof THREE.GridHelper) continue;
      
      // Find the block that matches this mesh
      const block = this.currentCourse.blocks.find(b => b.mesh === intersect.object);
      
      if (block) {
        // Store the highlighted block and its original material
        this.highlightedBlock = block;
        this.originalMaterial = block.mesh!.material;
        
        // Apply the red highlight material
        block.mesh!.material = this.deleteMaterial;
        break;
      }
    }
  }

  private deleteHighlightedBlock() {
    if (!this.currentCourse || !this.highlightedBlock) return;
    
    const blockIndex = this.currentCourse.blocks.findIndex(
      block => block === this.highlightedBlock
    );
    
    if (blockIndex >= 0) {
      const block = this.currentCourse.blocks[blockIndex];
      
      // Remove from scene
      this.scene.remove(block.mesh!);
      
      // Remove from blocks array
      this.currentCourse.blocks.splice(blockIndex, 1);
      
      // Update start/finish positions if needed
      if (block.type === 'start') {
        this.currentCourse.startPosition = { x: 0, y: 0, z: 0 };
      } else if (block.type === 'finish') {
        this.currentCourse.finishPosition = { x: 0, y: 0, z: 0 };
      }
      
      // Clear the highlighted block
      this.highlightedBlock = null;
      this.originalMaterial = null;
      
      // Update block counter
      this.updateBlockCounter();
    }
  }

  // Update the tool selection method
  public setTool(tool: string) {
    this.currentTool = tool;
    
    // Hide placeholder when not in build mode
    if (tool !== 'build' && this.placeholderMesh) {
      this.scene.remove(this.placeholderMesh);
      this.placeholderMesh = null;
    }
    
    // Restore placeholder if switching to build mode
    if (tool === 'build' && this.selectedBlockType && !this.placeholderMesh) {
      this.updatePlaceholder();
    }
    
    // Reset any highlighted blocks if switching away from delete tool
    if (tool !== 'delete' && this.highlightedBlock && this.originalMaterial) {
      this.highlightedBlock.mesh!.material = this.originalMaterial;
      this.highlightedBlock = null;
      this.originalMaterial = null;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ParkourHoboCourseBuilder();
});