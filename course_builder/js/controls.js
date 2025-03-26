// Controls for the builder interface

class Controls {
    constructor(builder) {
        this.builder = builder;
        this.isRightMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.dragDistance = 0;
        this.isRecentToolClick = false;
    }
    
    // Initialize event listeners
    init() {
        // Set camera's euler order to prevent gimbal lock
        this.builder.camera.rotation.order = "YXZ";
        
        // Mouse controls
        this.setupMouseControls();
        
        // Keyboard controls
        this.setupKeyboardControls();
        
        // UI controls
        this.setupUIControls();
    }
    
    // Setup mouse controls for camera and block placement
    setupMouseControls() {
        const container = document.getElementById("game-container");
        if (!container) return;
        
        // Right mouse button for camera rotation
        container.addEventListener("mousedown", (event) => {
            if (event.button === 2) { // Right mouse button
                this.isRightMouseDown = true;
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
                this.dragDistance = 0;
                
                // Add a class to show we're in camera rotation mode
                container.classList.add("rotating-camera");
            }
        });
        
        window.addEventListener("mouseup", (event) => {
            if (event.button === 2) { // Right mouse button
                this.isRightMouseDown = false;
                
                // Remove the rotating camera class
                container.classList.remove("rotating-camera");
            }
        });
        
        window.addEventListener("mousemove", (event) => {
            if (this.isRightMouseDown) {
                // Camera rotation with right mouse button
                const deltaX = event.clientX - this.lastMouseX;
                const deltaY = event.clientY - this.lastMouseY;
                
                // Update drag distance for distinguishing clicks from drags
                this.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
                
                // Rotate camera based on mouse movement
                this.builder.camera.rotation.y -= deltaX * 0.005;
                
                // Limit vertical rotation to avoid flipping
                const maxVerticalRotation = Math.PI / 2 - 0.1;
                this.builder.camera.rotation.x = Math.max(
                    -maxVerticalRotation,
                    Math.min(maxVerticalRotation, this.builder.camera.rotation.x - deltaY * 0.005)
                );
                
                this.lastMouseX = event.clientX;
                this.lastMouseY = event.clientY;
            }
        });
        
        // Left click for placing or removing blocks
        container.addEventListener("click", (event) => {
            // Check if click is on the toolbar or UI elements
            const target = event.target;
            const isToolbarClick = target.closest("#builder-controls") !== null;
            const isModalClick = target.closest("#export-modal") !== null;
            
            // Don't place blocks if clicking on UI elements or right after a tool change
            if (isToolbarClick || isModalClick || this.isRecentToolClick) {
                return;
            }
            
            // Process click based on current tool
            if (event.button === 0 && !this.isRightMouseDown) {
                if (this.builder.currentTool === "build") {
                    this.builder.placeBlock();
                } else if (this.builder.currentTool === "remove") {
                    this.builder.removeBlock();
                }
            }
        });
        
        // Prevent context menu from appearing on right-click
        container.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });
    }
    
    // Setup keyboard controls for camera and builder
    setupKeyboardControls() {
        // Keyboard controls for camera movement
        window.addEventListener("keydown", (event) => {
            switch (event.code) {
                case "KeyW":
                    this.builder.buildControls.forward = true;
                    break;
                case "KeyS":
                    this.builder.buildControls.backward = true;
                    break;
                case "KeyA":
                    this.builder.buildControls.left = true;
                    break;
                case "KeyD":
                    this.builder.buildControls.right = true;
                    break;
                case "KeyE":
                    this.builder.buildControls.up = true;
                    break;
                case "KeyQ":
                    this.builder.buildControls.down = true;
                    break;
                case "ShiftLeft":
                case "ShiftRight":
                    this.builder.buildControls.sprint = true;
                    break;
                case "ArrowLeft":
                    this.builder.buildControls.rotateLeft = true;
                    break;
                case "ArrowRight":
                    this.builder.buildControls.rotateRight = true;
                    break;
                case "KeyB":
                    // Switch to build tool
                    this.selectTool("build");
                    break;
                case "KeyR":
                    // Switch to remove tool
                    this.selectTool("remove");
                    break;
                case "KeyC":
                    // Switch to camera tool
                    this.selectTool("camera");
                    break;
                case "Digit1":
                    // Select platform block type
                    this.selectBlockType("platform");
                    break;
                case "Digit2":
                    // Select start block type
                    this.selectBlockType("start");
                    break;
                case "Digit3":
                    // Select finish block type
                    this.selectBlockType("finish");
                    break;
                case "KeyX":
                    // Export current course
                    this.exportCourse();
                    break;
                default:
                    break;
            }
        });
        
        window.addEventListener("keyup", (event) => {
            switch (event.code) {
                case "KeyW":
                    this.builder.buildControls.forward = false;
                    break;
                case "KeyS":
                    this.builder.buildControls.backward = false;
                    break;
                case "KeyA":
                    this.builder.buildControls.left = false;
                    break;
                case "KeyD":
                    this.builder.buildControls.right = false;
                    break;
                case "KeyE":
                    this.builder.buildControls.up = false;
                    break;
                case "KeyQ":
                    this.builder.buildControls.down = false;
                    break;
                case "ShiftLeft":
                case "ShiftRight":
                    this.builder.buildControls.sprint = false;
                    break;
                case "ArrowLeft":
                    this.builder.buildControls.rotateLeft = false;
                    break;
                case "ArrowRight":
                    this.builder.buildControls.rotateRight = false;
                    break;
                default:
                    break;
            }
        });
        
        // Stop all movement when window loses focus
        window.addEventListener("blur", () => {
            this.resetAllControls();
        });
    }
    
    // Setup UI controls (buttons, etc.)
    setupUIControls() {
        // Block type buttons
        const platformBtn = document.getElementById("platform-btn");
        const startBtn = document.getElementById("start-btn");
        const finishBtn = document.getElementById("finish-btn");
        
        platformBtn.addEventListener("click", () => this.selectBlockType("platform"));
        startBtn.addEventListener("click", () => this.selectBlockType("start"));
        finishBtn.addEventListener("click", () => this.selectBlockType("finish"));
        
        // Tool buttons
        const buildToolBtn = document.getElementById("build-tool-btn");
        const removeToolBtn = document.getElementById("remove-tool-btn");
        const cameraToolBtn = document.getElementById("camera-tool-btn");
        
        buildToolBtn.addEventListener("click", () => this.selectTool("build"));
        removeToolBtn.addEventListener("click", () => this.selectTool("remove"));
        cameraToolBtn.addEventListener("click", () => this.selectTool("camera"));
        
        // Template size buttons
        const templateSmallBtn = document.getElementById("template-small-btn");
        const templateMediumBtn = document.getElementById("template-medium-btn");
        const templateLargeBtn = document.getElementById("template-large-btn");
        
        templateSmallBtn.addEventListener("click", () => this.selectTemplate("small"));
        templateMediumBtn.addEventListener("click", () => this.selectTemplate("medium"));
        templateLargeBtn.addEventListener("click", () => this.selectTemplate("large"));
        
        // Action buttons
        const newBtn = document.getElementById("new-btn");
        const saveBtn = document.getElementById("save-btn");
        const exportBtn = document.getElementById("export-btn");
        
        newBtn.addEventListener("click", () => {
            if (confirm("Create a new course? This will delete your current course.")) {
                this.builder.newCourse();
                this.updateUISelections();
            }
        });
        
        saveBtn.addEventListener("click", () => {
            this.builder.saveCourse();
            alert("Course saved to local storage!");
        });
        
        exportBtn.addEventListener("click", () => this.exportCourse());
        
        // Mode toggle buttons
        const builderModeBtn = document.getElementById("builder-mode-btn");
        const previewModeBtn = document.getElementById("preview-mode-btn");
        
        builderModeBtn.addEventListener("click", () => this.selectGameMode(GAME_MODES.BUILDER));
        previewModeBtn.addEventListener("click", () => this.selectGameMode(GAME_MODES.PREVIEW));
        
        // Export modal buttons
        const copyBtn = document.getElementById("copy-btn");
        const closeModalBtn = document.getElementById("close-modal-btn");
        
        copyBtn.addEventListener("click", () => {
            const exportCode = document.getElementById("export-code");
            exportCode.select();
            document.execCommand("copy");
            
            // Show a success message
            const validationMessage = document.getElementById("validation-message");
            validationMessage.textContent = "Copied to clipboard!";
            validationMessage.className = "success";
            
            // Clear the message after a delay
            setTimeout(() => {
                validationMessage.textContent = "";
                validationMessage.className = "";
            }, 3000);
        });
        
        closeModalBtn.addEventListener("click", () => {
            const exportModal = document.getElementById("export-modal");
            exportModal.classList.add("hidden");
        });
        
        // Add keyboard shortcut for closing the modal with Escape
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                const exportModal = document.getElementById("export-modal");
                if (!exportModal.classList.contains("hidden")) {
                    exportModal.classList.add("hidden");
                }
            }
        });
        
        // Set initial UI state based on builder state
        this.updateUISelections();
    }
    
    // Reset all movement controls
    resetAllControls() {
        // Reset all builder controls
        Object.keys(this.builder.buildControls).forEach(key => {
            this.builder.buildControls[key] = false;
        });
        
        // Reset right mouse button state
        this.isRightMouseDown = false;
        
        // Remove any camera rotation classes
        const container = document.getElementById("game-container");
        if (container) {
            container.classList.remove("rotating-camera");
        }
    }
    
    // Update UI selections based on builder state
    updateUISelections() {
        // Update block type buttons
        const platformBtn = document.getElementById("platform-btn");
        const startBtn = document.getElementById("start-btn");
        const finishBtn = document.getElementById("finish-btn");
        
        platformBtn.classList.toggle("active", this.builder.selectedBlockType === "platform");
        startBtn.classList.toggle("active", this.builder.selectedBlockType === "start");
        finishBtn.classList.toggle("active", this.builder.selectedBlockType === "finish");
        
        // Update tool buttons
        const buildToolBtn = document.getElementById("build-tool-btn");
        const removeToolBtn = document.getElementById("remove-tool-btn");
        const cameraToolBtn = document.getElementById("camera-tool-btn");
        
        buildToolBtn.classList.toggle("active", this.builder.currentTool === "build");
        removeToolBtn.classList.toggle("active", this.builder.currentTool === "remove");
        cameraToolBtn.classList.toggle("active", this.builder.currentTool === "camera");
        
        // Update template buttons
        const templateSmallBtn = document.getElementById("template-small-btn");
        const templateMediumBtn = document.getElementById("template-medium-btn");
        const templateLargeBtn = document.getElementById("template-large-btn");
        
        templateSmallBtn.classList.toggle("active", this.builder.currentTemplate === "small");
        templateMediumBtn.classList.toggle("active", this.builder.currentTemplate === "medium");
        templateLargeBtn.classList.toggle("active", this.builder.currentTemplate === "large");
        
        // Update game mode buttons
        const builderModeBtn = document.getElementById("builder-mode-btn");
        const previewModeBtn = document.getElementById("preview-mode-btn");
        
        builderModeBtn.classList.toggle("active", this.builder.gameMode === GAME_MODES.BUILDER);
        previewModeBtn.classList.toggle("active", this.builder.gameMode === GAME_MODES.PREVIEW);
    }
    
    // Select a block type
    selectBlockType(type) {
        this.builder.setBlockType(type);
        
        // Flag to prevent accidental placement when clicking UI
        this.isRecentToolClick = true;
        setTimeout(() => {
            this.isRecentToolClick = false;
        }, 300);
        
        this.updateUISelections();
    }
    
    // Select a tool
    selectTool(tool) {
        this.builder.setTool(tool);
        
        // Flag to prevent accidental placement when clicking UI
        this.isRecentToolClick = true;
        setTimeout(() => {
            this.isRecentToolClick = false;
        }, 300);
        
        this.updateUISelections();
    }
    
    // Select a template size
    selectTemplate(templateSize) {
        if (confirm(`Change course size to ${templateSize}? This will keep your blocks but change the ground size.`)) {
            this.builder.setTemplate(templateSize);
            this.updateUISelections();
        }
    }
    
    // Select game mode
    selectGameMode(mode) {
        this.builder.setGameMode(mode);
        this.updateUISelections();
    }
    
    // Export course
    exportCourse() {
        const result = this.builder.exportCourse();
        
        // Get the export modal and code textarea
        const exportModal = document.getElementById("export-modal");
        const exportCode = document.getElementById("export-code");
        const validationMessage = document.getElementById("validation-message");
        
        if (result.valid) {
            // Show the export code
            exportCode.value = result.data;
            
            // Show success message
            validationMessage.textContent = result.message;
            validationMessage.className = "success";
            
            // Show the modal
            exportModal.classList.remove("hidden");
        } else {
            // Show error message
            validationMessage.textContent = result.message;
            validationMessage.className = "error";
            
            // Still show the modal
            exportModal.classList.remove("hidden");
        }
    }
} 