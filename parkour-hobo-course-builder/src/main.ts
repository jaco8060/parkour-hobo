import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from './player';
import { BlockFactory } from './blockFactory';
import { CourseManager } from './courseManager';
import { UI } from './ui';
import { Course, Vector3, Block, PlayerControls, DEFAULT_CONTROLS, BlockDefinition } from './types';
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
  private clock: THREE.Clock;
  
  // Add placeholder property
  private placeholderMesh: THREE.Mesh | THREE.Group | null = null;
  private canPlaceBlock: boolean = true;

  // Add these properties to the ParkourHoboCourseBuilder class
  private currentTool: string = 'build';
  private rotationAngle: number = 0;

  // Add this property to the class
  private gridHelper: THREE.GridHelper;

  // Add these properties to the class
  private highlightedBlock: Block | null = null;
  private deleteMaterial: THREE.MeshBasicMaterial;
  private selectedBlock: Block | null = null;
  private selectionMaterial: THREE.MeshBasicMaterial;

  // Add this property to the class with proper initialization
  private toast: HTMLDivElement | null = null;
  private selectedBlockTooltip: HTMLDivElement | null = null;

  // Add this property to the class
  private placeholderHeightOffset: number = 0;

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
    
    // Create a material for selection highlighting
    this.selectionMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,  // Green
      transparent: true,
      opacity: 0.7
    });
    
    // Set up UI callbacks
    this.setupUICallbacks();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize UI elements
    this.ui.initializeToolbar();
    this.setupToolbar();
    
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
        // Validate course before exporting
        const validation = this.courseManager.validateCourse(this.currentCourse);
        if (!validation.valid) {
          this.ui.showErrorModal(validation.message);
          return;
        }
        
        const courseName = this.ui.getCourseName();
        if (courseName.trim() === '') {
          this.ui.showErrorModal('Please enter a course name');
          return;
        }
        
        this.currentCourse.name = courseName;
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
    
    // Set up player controls callback
    this.ui.setOnUpdateControls((controls: Partial<PlayerControls>) => {
      if (this.player) {
        this.player.updateControls(controls);
        this.ui.updateControlsDisplay(this.player.getControls());
      }
    });
    
    // Override the UI's getControlsFromPlayer method using a closure
    (this.ui as any).getControlsFromPlayer = () => {
      if (this.player) {
        return this.player.getControls();
      }
      return DEFAULT_CONTROLS;
    };

    this.ui.setOnResetPlayer(() => {
      if (!this.isBuilderMode && this.player && this.currentCourse) {
        // Reset player to start position
        if (this.currentCourse.startPosition) {
          this.player.setPosition(this.currentCourse.startPosition);
        } else {
          // If no start position, reset to origin
          this.player.setPosition({ x: 0, y: 1, z: 0 });
        }
        this.ui.displayToast('Player position reset!', 1500);
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
      
      // Highlight blocks when in select mode
      if (this.isBuilderMode && this.currentTool === 'select') {
        this.highlightBlockForSelection();
      }
      
      // Update tooltip position for selected block if we have one
      if (this.selectedBlock && this.selectedBlock.mesh) {
        // Create a position vector from the block's position
        const blockPosition = new THREE.Vector3(
          this.selectedBlock.position.x, 
          this.selectedBlock.position.y,
          this.selectedBlock.position.z
        );
        
        // Project the 3D position to screen coordinates
        const screenPosition = blockPosition.clone().project(this.camera);
        
        // Convert to pixel coordinates
        const canvas = this.renderer.domElement;
        const x = (screenPosition.x + 1) * canvas.width / 2;
        const y = (-screenPosition.y + 1) * canvas.height / 2;
        
        // Update tooltip with computed screen coordinates (only when in select tool mode)
        if (this.currentTool === 'select') {
          this.ui.updateSelectedBlockTooltipPosition(x, y);
        } else {
          this.ui.updateSelectedBlockTooltip(false);
        }
      }
    });
    
    this.renderer.domElement.addEventListener('click', () => {
      // Only place/delete/select blocks if we're not dragging the camera
      if (!isDragging && this.isBuilderMode) {
        if (this.currentTool === 'build' && this.selectedBlockType && this.canPlaceBlock) {
          this.buildBlock();
        } else if (this.currentTool === 'delete' && this.highlightedBlock) {
          this.deleteHighlightedBlock();
        } else if (this.currentTool === 'select' && this.highlightedBlock) {
          this.selectHighlightedBlock();
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
        this.ui.selectTool('select');  // Changed from 'rotate' to 'select'
        this.currentTool = 'select';
      } else if (event.key === 'b' || event.key === 'B') {
        // B toggles between builder and player modes
        this.toggleMode();
        
        // Update toolbar to reflect the current mode
        if (this.isBuilderMode) {
          this.ui.selectTool(this.currentTool); // Go back to previous build tool
        } else {
          this.ui.selectTool('player');
        }
      } else if (event.key === 'r' || event.key === 'R') {
        // Rotate logic for both modes
        if (this.isBuilderMode) {
          if (this.currentTool === 'build' && this.selectedBlockType) {
            // Rotate the placeholder in build mode
            this.rotateBlock();
          } else if (this.currentTool === 'select' && this.selectedBlock) {
            // Rotate the selected block in select mode
            this.rotateSelectedBlock();
          }
        }
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        // Add delete functionality when a block is selected
        if (this.isBuilderMode && this.currentTool === 'select' && this.selectedBlock) {
          const blockToDelete = this.selectedBlock;
          this.selectedBlock = null;
          this.ui.updateSelectedBlockTooltip(false);
          
          // Find and delete the block
          if (this.currentCourse) {
            const blockIndex = this.currentCourse.blocks.findIndex(block => block === blockToDelete);
            if (blockIndex >= 0) {
              const block = this.currentCourse.blocks[blockIndex];
              
              // Remove from scene
              if (block.mesh) {
                this.scene.remove(block.mesh);
              }
              
              // Remove from blocks array
              this.currentCourse.blocks.splice(blockIndex, 1);
              
              // Update start/finish positions if needed
              if (block.type === 'start') {
                this.currentCourse.startPosition = { x: 0, y: 0, z: 0 };
              } else if (block.type === 'finish') {
                this.currentCourse.finishPosition = { x: 0, y: 0, z: 0 };
              }
              
              // Update block counter
              this.updateBlockCounter();
            }
          }
        }
      } else if (event.key === 'Escape') {
        // Cancel selection when Escape key is pressed
        if (this.selectedBlock) {
          this.clearSelection();
        }
      } else if (event.key === 'e' || event.key === 'E') {
        // Raise the placeholder height in builder mode
        if (this.isBuilderMode && this.currentTool === 'build' && this.placeholderMesh) {
          this.placeholderHeightOffset += 1;
          this.updatePlaceholderPosition();
          this.ui.displayToast(`Placeholder height: ${this.placeholderHeightOffset}`, 1500);
        }
      } else if (event.key === 'q' || event.key === 'Q') {
        // Lower the placeholder height in builder mode
        if (this.isBuilderMode && this.currentTool === 'build' && this.placeholderMesh) {
          this.placeholderHeightOffset = Math.max(0, this.placeholderHeightOffset - 1);
          this.updatePlaceholderPosition();
          this.ui.displayToast(`Placeholder height: ${this.placeholderHeightOffset}`, 1500);
        }
      }
      
      // Player controls - forward jump key event to player only in player mode
      if (!this.isBuilderMode && this.player && this.player.getControls) {
        const controls = this.player.getControls();
        if (event.key.toLowerCase() === controls.jump) {
          this.player.jump();
        }
      }
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
      if (this.highlightedBlock) {
        this.highlightedBlock.unhighlight();
        this.highlightedBlock = null;
      }
    } else {
      // Switch to player mode
      this.ui.showPlayerMode();
      
      // Clear any selections when switching to player mode
      if (this.selectedBlock) {
        this.clearSelection();
      }
      
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
      this.player.destroy(); // Clean up event listeners
    }
    
    // Disable orbit controls for camera
    this.controls.enabled = false;
    
    // Create new player
    this.player = new Player(position, this.camera);
    this.scene.add(this.player.mesh);
    
    // Set death callback to show a toast message
    this.player.setOnDeath(() => {
      this.ui.displayToast('You died! Returning to start point...', 2000);
    });
    
    // Set level completion callback
    this.player.setOnLevelComplete(() => {
      // Show success message with the more prominent UI
      this.ui.showSuccessMessage('CONGRATULATIONS!<br><br>You successfully parkoured,<br>now get out of here!', 5000);
      
      // Optional: Add a small delay before returning to builder mode
      setTimeout(() => {
        if (!this.isBuilderMode) {
          this.toggleMode(); // Switch back to builder mode
          this.ui.selectTool(this.currentTool); // Go back to previous build tool
        }
      }, 6000);
    });
    
    // Update UI with player controls
    this.ui.updateControlsDisplay(this.player.getControls());
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
    
    // Animate kill zones in builder mode
    if (this.isBuilderMode && this.currentCourse) {
      this.animateKillZones(time);
    }
    
    // Update player if in player mode
    if (!this.isBuilderMode && this.player) {
      // Pass blocks for collision detection 
      const blocks = this.currentCourse ? this.currentCourse.blocks : [];
      this.player.update(delta, time, blocks);
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  // Animate kill zones to make them more visible
  private animateKillZones(time: number) {
    if (!this.currentCourse) return;
    
    for (const block of this.currentCourse.blocks) {
      if (block.type === 'killZone' && block.mesh) {
        // Pulse the opacity between 0.3 and 0.7
        const opacity = 0.3 + (Math.sin(time * 3) + 1) * 0.2;
        
        if (block.mesh instanceof THREE.Mesh) {
          const material = block.mesh.material as THREE.MeshLambertMaterial;
          if (material.transparent) {
            material.opacity = opacity;
          }
        } else if (block.mesh instanceof THREE.Group) {
          // Handle the base mesh opacity
          if (block.mesh.children.length > 0) {
            const baseMesh = block.mesh.children[0];
            if (baseMesh instanceof THREE.Mesh) {
              const material = baseMesh.material as THREE.MeshLambertMaterial;
              if (material.transparent) {
                material.opacity = opacity;
              }
            }
          }
          
          // Animate the warning triangles
          for (let i = 1; i < block.mesh.children.length; i++) {
            const triangle = block.mesh.children[i];
            if (triangle instanceof THREE.Mesh) {
              // Get the original Y position and random phase stored during creation
              const originalY = (triangle as any).originalY || 0.3;
              const randomPhase = (triangle as any).randomPhase || 0;
              
              // Float up and down with a slight random phase difference
              triangle.position.y = originalY + Math.sin(time * 2 + randomPhase) * 0.1;
              
              // Rotate slowly 
              triangle.rotation.y = time * 0.5 + randomPhase;
            }
          }
        }
      }
    }
  }

  private updatePlaceholder() {
    // Remove existing placeholder if it exists
    if (this.placeholderMesh) {
      this.scene.remove(this.placeholderMesh);
      this.placeholderMesh = null;
    }
    
    // Reset height offset when changing block type
    this.placeholderHeightOffset = 0;
    
    // Create new placeholder if a block type is selected
    if (this.selectedBlockType && this.isBuilderMode) {
      this.placeholderMesh = this.blockFactory.createPlaceholder(this.selectedBlockType);
      if (this.placeholderMesh) {
        this.scene.add(this.placeholderMesh);
        
        // Initial position update
        this.updatePlaceholderPosition();
      }
    }
  }
  
  private updatePlaceholderPosition() {
    if (!this.placeholderMesh || !this.selectedBlockType) return;
    
    // Get the intersection point on the grid or any object in the scene
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    // Skip if no intersections are found
    if (intersects.length === 0) return;
    
    // Get the first valid intersection
    let validIntersection = null;
    for (const intersect of intersects) {
      // Skip the placeholder itself and its children
      if (intersect.object === this.placeholderMesh || 
          (this.placeholderMesh instanceof THREE.Group && this.placeholderMesh.children.includes(intersect.object))) {
        continue;
      }
      
      // Valid intersection found
      validIntersection = intersect;
      break;
    }
    
    if (!validIntersection) return;
    
    // Calculate position (snap to grid)
    const position = new THREE.Vector3().copy(validIntersection.point);
    
    // Round to nearest grid point to ensure proper alignment
    position.x = Math.round(position.x);
    position.z = Math.round(position.z);
    
    // Get block definition
    const blockDef = this.blockFactory.getBlockDefinition(this.selectedBlockType);
    
    // Check if we're placing on an existing block or the ground
    const isExistingBlock = validIntersection.object !== this.gridHelper && 
                           !(validIntersection.object instanceof THREE.GridHelper);
    
    if (isExistingBlock) {
      // If we're placing on a block, adjust y position based on intersection point
      // and add half of the new block's height for proper positioning
      position.y = validIntersection.point.y + blockDef.dimensions.y / 2;
      
      // Check if we're placing on top or on the side of a block
      // Calculate the normal of the face that was hit
      const normal = validIntersection.face?.normal;
      
      if (normal) {
        // Convert the normal to world space
        const worldNormal = normal.clone().transformDirection(validIntersection.object.matrixWorld);
        
        // If the normal is pointing up (y is close to 1), we're placing on top
        if (worldNormal.y > 0.5) {
          // We're on top, use the above calculation
        } else {
          // We're on the side, position the block next to the existing one
          // Move the block in the direction of the normal
          const existingBlockDef = this.getBlockDefForObject(validIntersection.object);
          if (existingBlockDef) {
            // Calculate how much to move based on the block dimensions
            const moveX = worldNormal.x * ((existingBlockDef.dimensions.x + blockDef.dimensions.x) / 2);
            const moveZ = worldNormal.z * ((existingBlockDef.dimensions.z + blockDef.dimensions.z) / 2);
            
            // Apply the movement
            position.x += moveX;
            position.z += moveZ;
            
            // Set y to match the existing block's y level for side placement
            // Get the y center of the existing block
            const existingBlockY = validIntersection.object.position.y;
            position.y = existingBlockY;
          }
        }
      }
    } else {
      // We're placing on the ground grid
      position.y = blockDef.dimensions.y / 2;
    }
    
    // Apply height offset for manual adjustment (using Q/E keys)
    position.y += this.placeholderHeightOffset;
    
    // Update placeholder position
    this.placeholderMesh.position.copy(position);
    
    // Check if placement is valid
    this.canPlaceBlock = this.isValidPlacement(position);
    
    // Use the factory to update the placeholder appearance
    this.blockFactory.highlightPlaceholder(
      this.selectedBlockType, 
      this.placeholderMesh, 
      this.canPlaceBlock
    );
    
    // Set rotation of placeholder
    this.placeholderMesh.rotation.y = THREE.MathUtils.degToRad(this.rotationAngle);
  }
  
  // Helper method to get block definition for an object
  private getBlockDefForObject(object: THREE.Object3D): BlockDefinition | null {
    if (!this.currentCourse) return null;
    
    // Find the block that contains this object
    let block = this.currentCourse.blocks.find(b => b.mesh === object);
    
    // If not found directly, check if it's a child of a group
    if (!block) {
      block = this.currentCourse.blocks.find(b => 
        b.mesh instanceof THREE.Group && 
        b.mesh.children.some(child => child === object)
      );
    }
    
    if (block) {
      return this.blockFactory.getBlockDefinition(block.type);
    }
    
    return null;
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
    
    // Create a box for the new block
    const newBlockBox = new THREE.Box3();
    const halfWidth = blockDef.dimensions.x / 2;
    const halfHeight = blockDef.dimensions.y / 2;
    const halfDepth = blockDef.dimensions.z / 2;
    
    // Special case for garbage bag which needs a smaller collision box
    const collisionFactor = this.selectedBlockType === 'garbageBag' ? 0.8 : 0.9;
    
    newBlockBox.min.set(
      position.x - halfWidth * collisionFactor,
      position.y - halfHeight * collisionFactor,
      position.z - halfDepth * collisionFactor
    );
    
    newBlockBox.max.set(
      position.x + halfWidth * collisionFactor,
      position.y + halfHeight * collisionFactor,
      position.z + halfDepth * collisionFactor
    );
    
    // Check for collision with other blocks
    for (const block of this.currentCourse.blocks) {
      if (!block.mesh) continue;
      
      // Create a box for the existing block
      const existingBlockDef = this.blockFactory.getBlockDefinition(block.type);
      const existingBlockBox = new THREE.Box3();
      const exHalfWidth = existingBlockDef.dimensions.x / 2;
      const exHalfHeight = existingBlockDef.dimensions.y / 2;
      const exHalfDepth = existingBlockDef.dimensions.z / 2;
      
      // Adjust collision factor for garbage bags
      const exCollisionFactor = block.type === 'garbageBag' ? 0.8 : 0.9;
      
      existingBlockBox.min.set(
        block.position.x - exHalfWidth * exCollisionFactor,
        block.position.y - exHalfHeight * exCollisionFactor,
        block.position.z - exHalfDepth * exCollisionFactor
      );
      
      existingBlockBox.max.set(
        block.position.x + exHalfWidth * exCollisionFactor,
        block.position.y + exHalfHeight * exCollisionFactor,
        block.position.z + exHalfDepth * exCollisionFactor
      );
      
      // Check if boxes intersect
      if (newBlockBox.intersectsBox(existingBlockBox)) {
        // Now check if this is a valid stacking situation
        
        // Calculate vertical overlap
        const verticalOverlap = Math.min(
          newBlockBox.max.y - existingBlockBox.min.y,
          existingBlockBox.max.y - newBlockBox.min.y
        );
        
        // Calculate horizontal overlap along X and Z
        const xOverlap = Math.min(
          newBlockBox.max.x - existingBlockBox.min.x,
          existingBlockBox.max.x - newBlockBox.min.x
        );
        
        const zOverlap = Math.min(
          newBlockBox.max.z - existingBlockBox.min.z,
          existingBlockBox.max.z - newBlockBox.min.z
        );
        
        const xyArea = existingBlockDef.dimensions.x * existingBlockDef.dimensions.z;
        const overlapArea = xOverlap * zOverlap;
        
        // Check if this is a stacking situation (small vertical overlap, significant horizontal overlap)
        const isStacking = verticalOverlap < 0.3 * existingBlockDef.dimensions.y && 
                          overlapArea > 0.2 * xyArea;
        
        // Allow stacking, but prevent true overlaps
        if (!isStacking) {
          return false;
        }
      }
    }
    
    return true;
  }

  private highlightBlockForDeletion() {
    // Reset previous highlighted block
    if (this.highlightedBlock) {
      this.highlightedBlock.unhighlight();
      this.highlightedBlock = null;
    }
    
    if (!this.currentCourse) return;
    
    // Cast a ray to find which block we're pointing at
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true); // true for recursive (check children)
    
    for (const intersect of intersects) {
      // Skip grid, placeholders, etc.
      if (!(intersect.object instanceof THREE.Mesh) || 
          intersect.object === this.placeholderMesh || 
          (this.placeholderMesh instanceof THREE.Group && this.placeholderMesh.children.includes(intersect.object)) ||
          intersect.object instanceof THREE.GridHelper) continue;
      
      // Find the block that matches this mesh or is parent of this mesh
      let block = this.currentCourse.blocks.find(b => b.mesh === intersect.object);
      
      // If not found directly, check if it's a child of a group
      if (!block) {
        block = this.currentCourse.blocks.find(b => 
          b.mesh instanceof THREE.Group && 
          b.mesh.children.some(child => child === intersect.object)
        );
      }
      
      if (block) {
        // Store the highlighted block
        this.highlightedBlock = block;
        
        // Highlight the block using its built-in method
        block.highlight(this.deleteMaterial);
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
      
      // If this is also the selected block, clear that reference first
      if (this.selectedBlock === block) {
        this.ui.updateSelectedBlockTooltip(false);
        this.selectedBlock = null;
      }
      
      // Unhighlight before removing
      block.unhighlight();
      
      // Remove from scene
      if (block.mesh) {
        this.scene.remove(block.mesh);
      }
      
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
      
      // Update block counter
      this.updateBlockCounter();
    }
  }

  private highlightBlockForSelection() {
    // Reset previous highlighted block (but not if it's the selected block)
    if (this.highlightedBlock && this.highlightedBlock !== this.selectedBlock) {
      this.highlightedBlock.unhighlight();
      this.highlightedBlock = null;
    }
    
    if (!this.currentCourse) return;
    
    // Cast a ray to find which block we're pointing at
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    for (const intersect of intersects) {
      // Skip grid, placeholders, etc.
      if (!(intersect.object instanceof THREE.Mesh) || 
          intersect.object === this.placeholderMesh || 
          (this.placeholderMesh instanceof THREE.Group && this.placeholderMesh.children.includes(intersect.object)) ||
          intersect.object instanceof THREE.GridHelper) continue;
      
      // Find the block that matches this mesh or is parent of this mesh
      let block = this.currentCourse.blocks.find(b => b.mesh === intersect.object);
      
      // If not found directly, check if it's a child of a group
      if (!block) {
        block = this.currentCourse.blocks.find(b => 
          b.mesh instanceof THREE.Group && 
          b.mesh.children.some(child => child === intersect.object)
        );
      }
      
      if (block) {
        // If we're hovering over the already selected block, just return without highlighting
        if (block === this.selectedBlock) {
          return;
        }
        
        // Store the highlighted block
        this.highlightedBlock = block;
        
        // Highlight with selection material
        block.highlight(this.selectionMaterial);
        break;
      }
    }
  }

  private selectHighlightedBlock() {
    // If we're selecting the same block that's already selected, deselect it
    if (this.selectedBlock === this.highlightedBlock) {
      this.clearSelection();
      return;
    }
    
    // Clear previous selection
    if (this.selectedBlock) {
      this.clearSelection();
    }
    
    // Select the currently highlighted block
    if (this.highlightedBlock) {
      // Store the reference to the highlighted block
      this.selectedBlock = this.highlightedBlock;
      
      // Clear the highlighted block reference to avoid duplicate highlighting
      this.highlightedBlock = null;
      
      // Make sure the block's original materials are reset before applying new highlight
      this.selectedBlock.unhighlight();
      
      // Apply the selection highlight
      this.selectedBlock.highlight(this.selectionMaterial);
      
      // Update the tooltip below the selected block
      if (this.selectedBlock.mesh) {
        // Create a position vector from the block's position
        const blockPosition = new THREE.Vector3(
          this.selectedBlock.position.x, 
          this.selectedBlock.position.y,
          this.selectedBlock.position.z
        );
        
        // Project the 3D position to screen coordinates
        const screenPosition = blockPosition.clone().project(this.camera);
        
        // Convert to pixel coordinates
        const canvas = this.renderer.domElement;
        const x = (screenPosition.x + 1) * canvas.width / 2;
        const y = (-screenPosition.y + 1) * canvas.height / 2;
        
        // Update tooltip with computed screen coordinates
        this.ui.updateSelectedBlockTooltipPosition(x, y);
      }
    }
  }

  private rotateSelectedBlock() {
    if (!this.selectedBlock || !this.selectedBlock.mesh) return;
    
    // Rotate the selected block by 90 degrees
    const currentRotation = this.selectedBlock.rotation;
    const newYRotation = (currentRotation.y + 90) % 360;
    
    // Update the rotation in the block data
    this.selectedBlock.rotation.y = newYRotation;
    
    // Apply rotation to the mesh
    this.selectedBlock.mesh.rotation.y = THREE.MathUtils.degToRad(newYRotation);
  }

  // Update the tool selection method
  public setTool(tool: string) {
    const previousTool = this.currentTool;
    this.currentTool = tool;
    
    // Reset height offset when changing tools
    this.placeholderHeightOffset = 0;
    
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
    if (previousTool === 'delete' && this.highlightedBlock) {
      this.highlightedBlock.unhighlight();
      this.highlightedBlock = null;
    }
    
    // Clear selected block if switching away from select tool
    if (previousTool === 'select') {
      this.clearSelection();
    }
    
    // Ensure tooltip is hidden when not in select mode
    if (tool !== 'select') {
      this.ui.updateSelectedBlockTooltip(false);
    }
  }

  private clearSelection() {
    if (this.selectedBlock) {
      this.selectedBlock.unhighlight();
      this.selectedBlock = null;
      this.ui.updateSelectedBlockTooltip(false);
    }
    
    // Also clear any highlighted blocks to ensure clean state
    if (this.highlightedBlock) {
      this.highlightedBlock.unhighlight();
      this.highlightedBlock = null;
    }
  }

  private setupToolbar() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') || 'build';
        this.setTool(tool);
      });
    });
    
    // Create toast element for showing controls
    this.toast = document.createElement('div');
    this.toast.classList.add('controls-toast');
    this.toast.style.position = 'fixed';
    this.toast.style.top = '70px'; // Just below the header
    this.toast.style.left = '50%';
    this.toast.style.transform = 'translateX(-50%)';
    this.toast.style.backgroundColor = '#333';
    this.toast.style.color = 'white';
    this.toast.style.padding = '10px 20px';
    this.toast.style.borderRadius = '4px';
    this.toast.style.fontSize = '12px';
    this.toast.style.fontFamily = 'Press Start 2P, monospace';
    this.toast.style.zIndex = '1000';
    this.toast.style.border = '2px solid #4CAF50';
    this.toast.style.display = 'none';
    this.toast.style.textAlign = 'center';
    this.toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(this.toast);
    
    // Create tooltip for selected block
    this.selectedBlockTooltip = document.createElement('div');
    this.selectedBlockTooltip.classList.add('selected-block-tooltip');
    this.selectedBlockTooltip.style.position = 'absolute';
    this.selectedBlockTooltip.style.backgroundColor = '#333';
    this.selectedBlockTooltip.style.color = 'white';
    this.selectedBlockTooltip.style.padding = '8px';
    this.selectedBlockTooltip.style.borderRadius = '4px';
    this.selectedBlockTooltip.style.fontSize = '12px';
    this.selectedBlockTooltip.style.fontFamily = 'Press Start 2P, monospace';
    this.selectedBlockTooltip.style.pointerEvents = 'none';
    this.selectedBlockTooltip.style.zIndex = '1000';
    this.selectedBlockTooltip.style.border = '2px solid #4CAF50';
    this.selectedBlockTooltip.style.display = 'none';
    this.selectedBlockTooltip.innerHTML = 'R: Rotate Block<br>Delete: Remove Block<br>Esc: Cancel Selection';
    document.body.appendChild(this.selectedBlockTooltip);
    
    // Select build tool by default
    this.setTool('build');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ParkourHoboCourseBuilder();
});