// Builder functionality for creating and managing courses

class Builder {
    constructor() {
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Game state
        this.buildingBlocks = [];
        this.placementPreview = null;
        this.selectedBlockType = "platform";
        this.currentTemplate = "medium";
        this.currentTool = "build";
        this.gameMode = GAME_MODES.BUILDER;
        
        // Input state
        this.buildControls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            rotateLeft: false,
            rotateRight: false,
            sprint: false
        };
        
        // Timer for animation
        this.clock = new THREE.Clock();
    }
    
    // Initialize the Three.js scene
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Light blue sky
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 30, 100);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            CAMERA_SETTINGS.FOV,
            window.innerWidth / window.innerHeight,
            CAMERA_SETTINGS.NEAR,
            CAMERA_SETTINGS.FAR
        );
        this.camera.position.copy(CAMERA_SETTINGS.DEFAULT_POSITION);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add to container
        const container = document.getElementById("game-container");
        if (container) {
            container.appendChild(this.renderer.domElement);
            
            // Add resize handler
            window.addEventListener("resize", () => this.onWindowResize());
        } else {
            console.error("No #game-container found!");
            return;
        }
        
        // Setup lighting
        this.setupLighting();
        
        // Create a ground
        this.createGround(this.currentTemplate);
        
        // Create placement preview
        this.placementPreview = this.createPlacementPreview(this.selectedBlockType);
        
        // Setup mouse move handler for placement preview
        window.addEventListener("mousemove", (event) => this.onMouseMove(event));
        
        // Start the animation loop
        this.animate();
        
        // Try to load any saved course
        this.loadSavedCourse();
    }
    
    // Set up scene lighting
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        // Adjust shadow properties for better quality
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        
        // Adjust the shadow camera to cover a larger area
        const size = 30;
        directionalLight.shadow.camera.left = -size;
        directionalLight.shadow.camera.right = size;
        directionalLight.shadow.camera.top = size;
        directionalLight.shadow.camera.bottom = -size;
        
        this.scene.add(directionalLight);
    }
    
    // Create the ground based on template size
    createGround(templateSize) {
        // Get the ground size from template
        const template = templateSize.toUpperCase();
        const groundSize = COURSE_TEMPLATES[template]?.ground.size || COURSE_TEMPLATES.MEDIUM.ground.size;
        
        // Create a large flat ground
        const geometry = new THREE.BoxGeometry(groundSize, 1, groundSize);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x7CFC00,
            roughness: 0.8 
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.position.y = -0.5; // Position it so the top is at y=0
        ground.receiveShadow = true;
        ground.name = "Ground";
        
        this.scene.add(ground);
    }
    
    // Create a placement preview mesh for the selected block type
    createPlacementPreview(blockType) {
        let geometry, material;
        
        // Determine geometry and material based on block type
        switch (blockType) {
            case "start":
                geometry = new THREE.BoxGeometry(
                    BLOCK_TYPES.START.size.width,
                    BLOCK_TYPES.START.size.height,
                    BLOCK_TYPES.START.size.depth
                );
                material = new THREE.MeshStandardMaterial({ 
                    color: BLOCK_TYPES.START.color,
                    transparent: true,
                    opacity: 0.7
                });
                break;
                
            case "finish":
                geometry = new THREE.BoxGeometry(
                    BLOCK_TYPES.FINISH.size.width,
                    BLOCK_TYPES.FINISH.size.height,
                    BLOCK_TYPES.FINISH.size.depth
                );
                material = new THREE.MeshStandardMaterial({ 
                    color: BLOCK_TYPES.FINISH.color,
                    transparent: true,
                    opacity: 0.7
                });
                break;
                
            default: // platform
                geometry = new THREE.BoxGeometry(
                    BLOCK_TYPES.PLATFORM.size.width,
                    BLOCK_TYPES.PLATFORM.size.height,
                    BLOCK_TYPES.PLATFORM.size.depth
                );
                material = new THREE.MeshStandardMaterial({ 
                    color: BLOCK_TYPES.PLATFORM.color,
                    transparent: true,
                    opacity: 0.7
                });
        }
        
        const preview = new THREE.Mesh(geometry, material);
        preview.userData = { type: blockType };
        this.scene.add(preview);
        
        return preview;
    }
    
    // Update the placement preview position based on mouse position
    updatePlacementPreview() {
        if (!this.placementPreview || this.currentTool !== "build") {
            return;
        }
        
        // Cast a ray from the camera through the mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all objects that the ray intersects with
        const allObjects = [];
        
        // Add building blocks to intersectables
        this.buildingBlocks.forEach(block => {
            allObjects.push(block);
        });
        
        // Add ground
        const ground = this.scene.getObjectByName("Ground");
        if (ground) {
            allObjects.push(ground);
        }
        
        const intersects = this.raycaster.intersectObjects(allObjects);
        
        // If we hit something, position the preview on top of it
        if (intersects.length > 0) {
            const intersect = intersects[0];
            
            // Calculate the position where the new block should be placed
            // We need to account for the normal of the face we're hitting
            const point = intersect.point.clone();
            const normal = intersect.face.normal.clone();
            
            // Adjust position based on the normal and block height
            point.add(normal.multiplyScalar(BUILDER_SETTINGS.PLACEMENT_HEIGHT));
            
            // Snap to grid
            point.x = Math.round(point.x / BUILDER_SETTINGS.GRID_SIZE) * BUILDER_SETTINGS.GRID_SIZE;
            point.y = Math.round(point.y / BUILDER_SETTINGS.GRID_SIZE) * BUILDER_SETTINGS.GRID_SIZE;
            point.z = Math.round(point.z / BUILDER_SETTINGS.GRID_SIZE) * BUILDER_SETTINGS.GRID_SIZE;
            
            // Update the preview position
            this.placementPreview.position.copy(point);
            this.placementPreview.visible = true;
        } else {
            // If no intersection, hide the preview
            this.placementPreview.visible = false;
        }
    }
    
    // Place a block at the current preview position
    placeBlock() {
        if (this.currentTool !== "build" || !this.placementPreview || !this.placementPreview.visible) {
            return;
        }
        
        // Check if we've reached the block limit
        if (this.buildingBlocks.length >= BUILDER_SETTINGS.MAX_BLOCKS) {
            alert(`Maximum of ${BUILDER_SETTINGS.MAX_BLOCKS} blocks reached!`);
            return;
        }
        
        // Check for start/finish block limit
        if (this.selectedBlockType === "start" || this.selectedBlockType === "finish") {
            // Check if we already have this type of special block
            const existingBlock = this.buildingBlocks.find(
                block => block.userData.type === this.selectedBlockType
            );
            
            if (existingBlock) {
                alert(`Only one ${this.selectedBlockType} block allowed! Remove the existing one first.`);
                return;
            }
        }
        
        // Create block geometry based on type
        let geometry, material;
        const blockConfig = 
            this.selectedBlockType === "start" ? BLOCK_TYPES.START : 
            this.selectedBlockType === "finish" ? BLOCK_TYPES.FINISH : 
            BLOCK_TYPES.PLATFORM;
        
        geometry = new THREE.BoxGeometry(
            blockConfig.size.width,
            blockConfig.size.height,
            blockConfig.size.depth
        );
        
        material = new THREE.MeshStandardMaterial({ 
            color: blockConfig.color,
            roughness: 0.7
        });
        
        // Create the new block
        const block = new THREE.Mesh(geometry, material);
        block.position.copy(this.placementPreview.position);
        block.userData = { type: this.selectedBlockType };
        block.castShadow = true;
        block.receiveShadow = true;
        
        // Add to scene and tracking arrays
        this.scene.add(block);
        this.buildingBlocks.push(block);
        
        // Save the course state
        this.saveCourse();
    }
    
    // Remove a block at the current mouse position
    removeBlock() {
        if (this.currentTool !== "remove") {
            return;
        }
        
        // Cast a ray from the camera through the mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Only check against building blocks
        const intersects = this.raycaster.intersectObjects(this.buildingBlocks);
        
        // If we hit a block, remove it
        if (intersects.length > 0) {
            const block = intersects[0].object;
            
            // Remove from scene
            this.scene.remove(block);
            
            // Remove from building blocks array
            const index = this.buildingBlocks.indexOf(block);
            if (index !== -1) {
                this.buildingBlocks.splice(index, 1);
            }
            
            // Save the course state
            this.saveCourse();
        }
    }
    
    // Highlight a block for removal
    highlightBlockForRemoval() {
        if (this.currentTool !== "remove") {
            return;
        }
        
        // Reset all blocks to normal material
        this.buildingBlocks.forEach(block => {
            if (block.userData.type === "platform") {
                block.material.color.set(BLOCK_TYPES.PLATFORM.color);
            } else if (block.userData.type === "start") {
                block.material.color.set(BLOCK_TYPES.START.color);
            } else if (block.userData.type === "finish") {
                block.material.color.set(BLOCK_TYPES.FINISH.color);
            }
        });
        
        // Cast a ray from the camera through the mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Only check against building blocks
        const intersects = this.raycaster.intersectObjects(this.buildingBlocks);
        
        // If we hit a block, highlight it
        if (intersects.length > 0 && intersects[0].distance <= BUILDER_SETTINGS.REMOVAL_RANGE) {
            const block = intersects[0].object;
            block.material.color.set(0xff00ff); // Highlight in magenta
        }
    }
    
    // Update camera position based on controls
    updateCamera(deltaTime) {
        // Get camera direction and right vector based on camera rotation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.y = 0; // Keep movement horizontal
        direction.normalize();
        
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0; // Keep movement horizontal
        right.normalize();
        
        // Use the configured builder camera speed with sprint multiplier if active
        let moveSpeed = BUILDER_SETTINGS.CAMERA_SPEED;
        if (this.buildControls.sprint) {
            moveSpeed *= BUILDER_SETTINGS.SPRINT_MULTIPLIER;
        }
        
        // Handle keyboard movement
        if (this.buildControls.forward) {
            this.camera.position.addScaledVector(direction, moveSpeed);
        }
        if (this.buildControls.backward) {
            this.camera.position.addScaledVector(direction, -moveSpeed);
        }
        if (this.buildControls.left) {
            this.camera.position.addScaledVector(right, -moveSpeed);
        }
        if (this.buildControls.right) {
            this.camera.position.addScaledVector(right, moveSpeed);
        }
        if (this.buildControls.up) {
            this.camera.position.y += moveSpeed;
        }
        if (this.buildControls.down) {
            this.camera.position.y -= moveSpeed;
        }
        
        // Handle camera rotation
        if (this.buildControls.rotateLeft) {
            this.camera.rotation.y += BUILDER_SETTINGS.CAMERA_ROTATION_SPEED;
        }
        if (this.buildControls.rotateRight) {
            this.camera.rotation.y -= BUILDER_SETTINGS.CAMERA_ROTATION_SPEED;
        }
    }
    
    // Save the current course to local storage
    saveCourse() {
        const courseData = {
            template: this.currentTemplate,
            cameraPosition: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            cameraRotation: {
                x: this.camera.rotation.x,
                y: this.camera.rotation.y,
                z: this.camera.rotation.z
            },
            selectedTool: this.currentTool,
            selectedBlockType: this.selectedBlockType,
            blocks: this.buildingBlocks.map(block => ({
                type: block.userData.type,
                position: {
                    x: block.position.x,
                    y: block.position.y,
                    z: block.position.z
                }
            }))
        };
        
        localStorage.setItem(STORAGE_KEYS.SAVED_COURSE, JSON.stringify(courseData));
        localStorage.setItem(STORAGE_KEYS.BUILDER_TEMPLATE, this.currentTemplate);
        localStorage.setItem(STORAGE_KEYS.LAST_MODE, this.gameMode);
    }
    
    // Load a saved course from local storage
    loadSavedCourse() {
        const savedData = localStorage.getItem(STORAGE_KEYS.SAVED_COURSE);
        if (!savedData) {
            return;
        }
        
        try {
            const courseData = JSON.parse(savedData);
            
            // Clear existing blocks
            this.buildingBlocks.forEach(block => {
                this.scene.remove(block);
            });
            this.buildingBlocks = [];
            
            // Load template size
            if (courseData.template) {
                this.currentTemplate = courseData.template;
                
                // Clear existing ground
                const ground = this.scene.getObjectByName("Ground");
                if (ground) {
                    this.scene.remove(ground);
                }
                
                // Create new ground with correct size
                this.createGround(this.currentTemplate);
            }
            
            // Restore saved blocks
            if (courseData.blocks && Array.isArray(courseData.blocks)) {
                courseData.blocks.forEach(blockData => {
                    let geometry, material;
                    
                    // Create the appropriate geometry and material
                    switch (blockData.type) {
                        case "start":
                            geometry = new THREE.BoxGeometry(
                                BLOCK_TYPES.START.size.width,
                                BLOCK_TYPES.START.size.height,
                                BLOCK_TYPES.START.size.depth
                            );
                            material = new THREE.MeshStandardMaterial({
                                color: BLOCK_TYPES.START.color,
                                roughness: 0.7
                            });
                            break;
                            
                        case "finish":
                            geometry = new THREE.BoxGeometry(
                                BLOCK_TYPES.FINISH.size.width,
                                BLOCK_TYPES.FINISH.size.height,
                                BLOCK_TYPES.FINISH.size.depth
                            );
                            material = new THREE.MeshStandardMaterial({
                                color: BLOCK_TYPES.FINISH.color,
                                roughness: 0.7
                            });
                            break;
                            
                        default: // platform
                            geometry = new THREE.BoxGeometry(
                                BLOCK_TYPES.PLATFORM.size.width,
                                BLOCK_TYPES.PLATFORM.size.height,
                                BLOCK_TYPES.PLATFORM.size.depth
                            );
                            material = new THREE.MeshStandardMaterial({
                                color: BLOCK_TYPES.PLATFORM.color,
                                roughness: 0.7
                            });
                    }
                    
                    // Create the block
                    const block = new THREE.Mesh(geometry, material);
                    block.position.set(
                        blockData.position.x,
                        blockData.position.y,
                        blockData.position.z
                    );
                    block.userData = { type: blockData.type };
                    block.castShadow = true;
                    block.receiveShadow = true;
                    
                    // Add to scene and building blocks array
                    this.scene.add(block);
                    this.buildingBlocks.push(block);
                });
            }
            
            // Restore camera position and rotation
            if (courseData.cameraPosition) {
                this.camera.position.set(
                    courseData.cameraPosition.x,
                    courseData.cameraPosition.y,
                    courseData.cameraPosition.z
                );
            }
            
            if (courseData.cameraRotation) {
                this.camera.rotation.set(
                    courseData.cameraRotation.x,
                    courseData.cameraRotation.y,
                    courseData.cameraRotation.z
                );
            }
            
            // Restore tool and block type
            if (courseData.selectedTool) {
                this.currentTool = courseData.selectedTool;
            }
            
            if (courseData.selectedBlockType) {
                this.selectedBlockType = courseData.selectedBlockType;
                
                // Update placement preview
                if (this.placementPreview) {
                    this.scene.remove(this.placementPreview);
                }
                this.placementPreview = this.createPlacementPreview(this.selectedBlockType);
            }
            
            console.log("Course loaded from storage");
        } catch (error) {
            console.error("Error loading saved course:", error);
        }
    }
    
    // Export the course as a string
    exportCourse() {
        // Validate course before export
        const validationResult = this.validateCourse();
        if (!validationResult.valid) {
            return { valid: false, message: validationResult.message };
        }
        
        // Create a simplified version of the course data
        const exportData = {
            blocks: this.buildingBlocks.map(block => ({
                type: block.userData.type,
                position: {
                    x: block.position.x,
                    y: block.position.y,
                    z: block.position.z
                }
            }))
        };
        
        return { 
            valid: true, 
            data: JSON.stringify(exportData),
            message: "Course valid and ready for export!"
        };
    }
    
    // Validate the course before export
    validateCourse() {
        // Check if we have blocks
        if (this.buildingBlocks.length === 0) {
            return { valid: false, message: "Course must have at least one block!" };
        }
        
        // Check if we have exactly one start block
        const startBlocks = this.buildingBlocks.filter(
            block => block.userData.type === "start"
        );
        
        if (startBlocks.length === 0) {
            return { valid: false, message: "Course must have a start block!" };
        }
        
        if (startBlocks.length > 1) {
            return { valid: false, message: "Course must have exactly one start block!" };
        }
        
        // Check if we have exactly one finish block
        const finishBlocks = this.buildingBlocks.filter(
            block => block.userData.type === "finish"
        );
        
        if (finishBlocks.length === 0) {
            return { valid: false, message: "Course must have a finish block!" };
        }
        
        if (finishBlocks.length > 1) {
            return { valid: false, message: "Course must have exactly one finish block!" };
        }
        
        return { valid: true, message: "Course is valid!" };
    }
    
    // Handle mouse movement
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    // Handle window resize
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Update camera based on controls
        this.updateCamera(deltaTime);
        
        // Update placement preview
        this.updatePlacementPreview();
        
        // Update block highlighting for removal
        this.highlightBlockForRemoval();
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    // Public methods for UI interaction
    
    // Set the selected block type
    setBlockType(type) {
        this.selectedBlockType = type;
        
        // Update placement preview
        if (this.placementPreview) {
            this.scene.remove(this.placementPreview);
        }
        this.placementPreview = this.createPlacementPreview(this.selectedBlockType);
        
        // Switch to build tool
        this.setTool("build");
        
        // Save state
        this.saveCourse();
    }
    
    // Set the current tool
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI based on tool
        if (tool === "build") {
            if (this.placementPreview) {
                this.placementPreview.visible = true;
            }
        } else {
            if (this.placementPreview) {
                this.placementPreview.visible = false;
            }
        }
        
        // Save state
        this.saveCourse();
    }
    
    // Set the course template size
    setTemplate(templateSize) {
        this.currentTemplate = templateSize;
        
        // Clear existing ground
        const ground = this.scene.getObjectByName("Ground");
        if (ground) {
            this.scene.remove(ground);
        }
        
        // Create new ground with correct size
        this.createGround(this.currentTemplate);
        
        // Save state
        this.saveCourse();
    }
    
    // Create a new empty course
    newCourse() {
        // Clear existing blocks
        this.buildingBlocks.forEach(block => {
            this.scene.remove(block);
        });
        this.buildingBlocks = [];
        
        // Reset camera
        this.camera.position.copy(CAMERA_SETTINGS.DEFAULT_POSITION);
        this.camera.rotation.set(-0.3, 0, 0);
        
        // Reset tools and block type
        this.currentTool = "build";
        this.selectedBlockType = "platform";
        
        // Update placement preview
        if (this.placementPreview) {
            this.scene.remove(this.placementPreview);
        }
        this.placementPreview = this.createPlacementPreview(this.selectedBlockType);
        
        // Save empty state
        this.saveCourse();
    }
    
    // Set the game mode (builder or preview)
    setGameMode(mode) {
        this.gameMode = mode;
        
        // Update UI based on mode
        if (mode === GAME_MODES.PREVIEW) {
            // Hide placement preview in preview mode
            if (this.placementPreview) {
                this.placementPreview.visible = false;
            }
        } else {
            // Show placement preview in builder mode if using build tool
            if (this.placementPreview && this.currentTool === "build") {
                this.placementPreview.visible = true;
            }
        }
        
        // Save state
        localStorage.setItem(STORAGE_KEYS.LAST_MODE, this.gameMode);
    }
} 