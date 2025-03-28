import { CourseManager } from "./courseManager";
import { DEFAULT_CONTROLS, PlayerControls } from "./types";

export class UI {
  private pixelatedMenu: HTMLElement;
  private mainMenu: HTMLElement;
  private newCourseMenu: HTMLElement;
  private loadCourseMenu: HTMLElement;
  private savedCoursesList: HTMLElement;
  private header: HTMLElement;
  private sideMenu: HTMLElement;
  private courseNameInput: HTMLInputElement;
  private blockCounter: HTMLElement;
  private exportModal: HTMLElement;
  private exportCode: HTMLTextAreaElement;
  private toolbar: HTMLElement;
  private toast: HTMLElement | null = null;
  private selectedBlockTooltip: HTMLElement | null = null;
  private controlsModal: HTMLElement | null = null;
  private errorModal: HTMLElement | null = null;
  private successModal: HTMLElement | null = null;
  private playerControls: HTMLElement;

  private courseManager: CourseManager;
  private onNewCourse: ((templateName: string) => void) | undefined;
  private onLoadCourse: ((courseId: string) => void) | undefined;
  private onBlockSelected: ((blockType: string) => void) | undefined;
  private onExportCourse: (() => void) | undefined;
  private onSaveCourse: (() => void) | undefined;
  private onReset: (() => void) | undefined;
  private onToolSelected: ((tool: string) => void) | undefined;
  private onUpdateControls:
    | ((controls: Partial<PlayerControls>) => void)
    | undefined;
  private toastTimeout: number | null = null;
  private resetPlayerCallback: (() => void) | null = null;
  private atmosphereBtn: HTMLElement | null = null;

  constructor(courseManager: CourseManager) {
    this.courseManager = courseManager;

    // Get UI elements
    this.pixelatedMenu = document.getElementById(
      "pixelated-menu"
    ) as HTMLElement;
    this.mainMenu = document.getElementById("main-menu") as HTMLElement;
    this.newCourseMenu = document.getElementById(
      "new-course-menu"
    ) as HTMLElement;
    this.loadCourseMenu = document.getElementById(
      "load-course-menu"
    ) as HTMLElement;
    this.savedCoursesList = document.getElementById(
      "saved-courses-list"
    ) as HTMLElement;
    this.header = document.getElementById("header") as HTMLElement;
    this.sideMenu = document.getElementById("side-menu") as HTMLElement;
    this.courseNameInput = document.getElementById(
      "course-name"
    ) as HTMLInputElement;
    this.blockCounter = document.getElementById("block-counter") as HTMLElement;
    this.exportModal = document.getElementById("export-modal") as HTMLElement;
    this.exportCode = document.getElementById(
      "export-code"
    ) as HTMLTextAreaElement;
    this.toolbar = document.getElementById("toolbar") as HTMLElement;
    this.playerControls = document.getElementById(
      "player-controls"
    ) as HTMLElement;

    this.setupEventListeners();
    this.setupExportModalEvents();
    this.setupToolbar();
    this.setupAtmosphereToggle();

    // Add this to initialize the reset button click handler
    const resetPlayerBtn = document.getElementById("reset-player-btn");
    if (resetPlayerBtn) {
      resetPlayerBtn.addEventListener("click", () => {
        if (this.resetPlayerCallback) {
          this.resetPlayerCallback();
        }
      });
    }
  }

  private setupEventListeners() {
    // Main menu buttons
    document.getElementById("new-course-btn")?.addEventListener("click", () => {
      this.mainMenu.classList.add("hidden");
      this.newCourseMenu.classList.remove("hidden");
    });

    document
      .getElementById("load-course-btn")
      ?.addEventListener("click", () => {
        this.mainMenu.classList.add("hidden");
        this.loadCourseMenu.classList.remove("hidden");
        this.updateSavedCoursesList();
      });

    // Back buttons
    document.querySelectorAll(".back-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.newCourseMenu.classList.add("hidden");
        this.loadCourseMenu.classList.add("hidden");
        this.mainMenu.classList.remove("hidden");
      });
    });

    // Template buttons
    document.querySelectorAll(".template-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const template =
          (e.target as HTMLElement).getAttribute("data-template") || "";
        if (this.onNewCourse) {
          this.onNewCourse(template);
        }
      });
    });

    // Block buttons
    document.querySelectorAll(".block-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Deselect all blocks
        document
          .querySelectorAll(".block-btn")
          .forEach((b) => b.classList.remove("active"));

        // Select the clicked block
        btn.classList.add("active");

        const blockType =
          (e.target as HTMLElement).getAttribute("data-block") || "";
        if (this.onBlockSelected) {
          this.onBlockSelected(blockType);
        }
      });
    });

    // Header buttons
    document
      .getElementById("save-course-btn")
      ?.addEventListener("click", () => {
        if (this.onSaveCourse) {
          this.onSaveCourse();
        }
      });

    document
      .getElementById("export-code-btn")
      ?.addEventListener("click", () => {
        if (this.onExportCourse) {
          this.onExportCourse();
        }
      });

    document.getElementById("reset-btn")?.addEventListener("click", () => {
      if (this.onReset) {
        this.onReset();
      }
    });

    // Modal close button
    document
      .getElementById("close-export-modal")
      ?.addEventListener("click", () => {
        this.hideExportModal();
      });
  }

  private setupExportModalEvents() {
    document
      .getElementById("copy-export-code")
      ?.addEventListener("click", () => {
        const codeText = this.exportCode.value;
        navigator.clipboard
          .writeText(codeText)
          .then(() => {
            alert("Code copied to clipboard!");
          })
          .catch((err) => {
            console.error("Could not copy text: ", err);
          });
      });
  }

  private setupToolbar() {
    const toolButtons = document.querySelectorAll(".tool-btn");

    toolButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.getAttribute("data-tool") || "build";
        this.selectTool(tool);
      });
    });

    // Create toast element for showing controls
    this.toast = document.createElement("div");
    this.toast.classList.add("controls-toast");
    this.toast.style.position = "fixed";
    this.toast.style.top = "70px"; // Just below the header
    this.toast.style.left = "50%";
    this.toast.style.transform = "translateX(-50%)";
    this.toast.style.backgroundColor = "#333";
    this.toast.style.color = "white";
    this.toast.style.padding = "10px 20px";
    this.toast.style.borderRadius = "4px";
    this.toast.style.fontSize = "12px";
    this.toast.style.fontFamily = "Press Start 2P, monospace";
    this.toast.style.zIndex = "1000";
    this.toast.style.border = "2px solid #4CAF50";
    this.toast.style.display = "none";
    this.toast.style.textAlign = "center";
    this.toast.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
    document.body.appendChild(this.toast);

    // Create tooltip for selected block
    this.selectedBlockTooltip = document.createElement("div");
    this.selectedBlockTooltip.classList.add("selected-block-tooltip");
    this.selectedBlockTooltip.style.position = "absolute";
    this.selectedBlockTooltip.style.backgroundColor = "#333";
    this.selectedBlockTooltip.style.color = "white";
    this.selectedBlockTooltip.style.padding = "8px";
    this.selectedBlockTooltip.style.borderRadius = "4px";
    this.selectedBlockTooltip.style.fontSize = "12px";
    this.selectedBlockTooltip.style.fontFamily = "Press Start 2P, monospace";
    this.selectedBlockTooltip.style.pointerEvents = "none";
    this.selectedBlockTooltip.style.zIndex = "1000";
    this.selectedBlockTooltip.style.border = "2px solid #4CAF50";
    this.selectedBlockTooltip.style.display = "none";
    this.selectedBlockTooltip.innerHTML =
      "R: Rotate Block<br>Delete: Remove Block<br>Esc: Cancel Selection";
    document.body.appendChild(this.selectedBlockTooltip);

    // Select build tool by default
    this.selectTool("build");
  }

  public selectTool(tool: string) {
    // Remove active class from all tools
    document.querySelectorAll(".tool-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Add active class to selected tool
    const toolBtn = document.querySelector(
      `.tool-btn[data-tool="${tool === "rotate" ? "select" : tool}"]`
    );
    if (toolBtn) {
      toolBtn.classList.add("active");
    }

    // Show toast with controls
    if (this.toast) {
      if (tool === "select") {
        this.showToast(
          "Select Mode: Click to select a block<br>R: Rotate selected block<br>Delete: Remove selected block<br>Esc: Cancel selection"
        );
      } else if (tool === "build") {
        this.showToast(
          "Build Mode: Click to place block<br>R: Rotate before placing<br>Q/E: Lower/Raise block placement height<br>Red Kill Zones will reset player position in player mode"
        );
      } else if (tool === "delete") {
        this.showToast("Delete Mode: Click to delete block");
      } else if (tool === "player") {
        // Use custom controls if available
        const toolbarPlayer = document.querySelector(
          '.tool-btn[data-tool="player"]'
        ) as HTMLElement;
        if (toolbarPlayer) {
          // Add a settings button to the player tool
          if (!toolbarPlayer.querySelector(".settings-btn")) {
            const settingsBtn = document.createElement("div");
            settingsBtn.className = "settings-btn";
            settingsBtn.innerHTML = "⚙️";
            settingsBtn.style.position = "absolute";
            settingsBtn.style.top = "2px";
            settingsBtn.style.right = "2px";
            settingsBtn.style.fontSize = "12px";
            settingsBtn.style.cursor = "pointer";
            settingsBtn.title = "Customize Controls";

            settingsBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              if (!this.controlsModal) {
                this.createControlsModal();
              }

              // Get current controls from the callback if available
              if (this.onUpdateControls) {
                // Use callback to get current controls
                const currentControls = this.getControlsFromPlayer();
                if (currentControls) {
                  this.showControlsModal(currentControls);
                } else {
                  this.showControlsModal(DEFAULT_CONTROLS);
                }
              } else {
                this.showControlsModal(DEFAULT_CONTROLS);
              }
            });

            toolbarPlayer.appendChild(settingsBtn);
            toolbarPlayer.style.position = "relative";
          }
        }
      }
    }

    if (this.onToolSelected) {
      // If the tool is "select", pass that value to the main class instead of "rotate"
      this.onToolSelected(tool === "rotate" ? "select" : tool);
    }

    // Special handling for player mode
    if (tool === "player") {
      // This will be handled by the main class
    }
  }

  // Helper method to get controls from the player instance
  private getControlsFromPlayer(): PlayerControls | null {
    // This would be populated by the setOnUpdateControls callback
    // which should be connected to the player's getControls method
    return null;
  }

  // Method to show a toast notification
  private showToast(message: string, duration: number = 3000) {
    // Don't show toast if the main menu is visible
    if (!this.toast || !this.pixelatedMenu.classList.contains("hidden")) return;

    // Clear any existing timeout
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    // Update and show toast
    this.toast.innerHTML = message;
    this.toast.style.display = "block";

    // Animate in
    this.toast.style.opacity = "0";
    this.toast.style.transition = "opacity 0.3s ease-in-out";
    setTimeout(() => {
      if (this.toast) this.toast.style.opacity = "1";
    }, 10);

    // Set timeout to hide toast
    this.toastTimeout = window.setTimeout(() => {
      if (this.toast) {
        this.toast.style.opacity = "0";
        setTimeout(() => {
          if (this.toast) this.toast.style.display = "none";
        }, 300);
      }
      this.toastTimeout = null;
    }, duration);
  }

  // Public method to allow external access to show toast messages
  public displayToast(message: string, duration: number = 3000) {
    this.showToast(message, duration);
  }

  // Add a method to show a success message for level completion
  public showSuccessMessage(message: string, duration: number = 4000) {
    // Use the toast for simpler messages
    if (message.length < 50) {
      this.showToast(message, duration);
      return;
    }

    // For longer messages, create a full-screen success overlay
    if (!this.successModal) {
      this.createSuccessModal();
    }

    const successMessage = this.successModal?.querySelector(
      ".success-message"
    ) as HTMLElement;
    if (successMessage) {
      successMessage.innerHTML = message;
    }

    this.successModal?.classList.remove("hidden");

    // Auto-hide after duration
    setTimeout(() => {
      this.successModal?.classList.add("hidden");
    }, duration);
  }

  // Create a success modal for level completion
  private createSuccessModal() {
    this.successModal = document.createElement("div");
    this.successModal.classList.add("success-overlay");
    this.successModal.classList.add("hidden");
    this.successModal.style.position = "fixed";
    this.successModal.style.top = "0";
    this.successModal.style.left = "0";
    this.successModal.style.width = "100%";
    this.successModal.style.height = "100%";
    this.successModal.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.successModal.style.display = "flex";
    this.successModal.style.justifyContent = "center";
    this.successModal.style.alignItems = "center";
    this.successModal.style.zIndex = "2000";

    const messageContainer = document.createElement("div");
    messageContainer.style.backgroundColor = "#4CAF50";
    messageContainer.style.color = "white";
    messageContainer.style.padding = "30px";
    messageContainer.style.borderRadius = "10px";
    messageContainer.style.maxWidth = "80%";
    messageContainer.style.textAlign = "center";
    messageContainer.style.boxShadow = "0 0 20px rgba(76, 175, 80, 0.5)";

    const successMessage = document.createElement("h2");
    successMessage.classList.add("success-message");
    successMessage.style.fontFamily = "Press Start 2P, monospace";
    successMessage.style.fontSize = "24px";
    successMessage.style.marginBottom = "20px";

    messageContainer.appendChild(successMessage);
    this.successModal.appendChild(messageContainer);
    document.body.appendChild(this.successModal);
  }

  setOnNewCourse(callback: (templateName: string) => void) {
    this.onNewCourse = callback;
  }

  setOnLoadCourse(callback: (courseId: string) => void) {
    this.onLoadCourse = callback;
  }

  setOnBlockSelected(callback: (blockType: string) => void) {
    this.onBlockSelected = callback;

    // Add the placement-mode class to the body when a block is selected
    document.body.classList.add("placement-mode");
  }

  setOnExportCourse(callback: () => void) {
    this.onExportCourse = callback;
  }

  setOnSaveCourse(callback: () => void) {
    this.onSaveCourse = callback;
  }

  setOnReset(callback: () => void) {
    this.onReset = callback;
  }

  setOnToolSelected(callback: (tool: string) => void) {
    this.onToolSelected = callback;
  }

  showStartMenu() {
    this.pixelatedMenu.classList.remove("hidden");
    this.header.classList.add("hidden");
    this.sideMenu.classList.add("hidden");
    document.body.classList.remove("builder-mode");
  }

  hideStartMenu() {
    this.pixelatedMenu.classList.add("hidden");
  }

  showBuilderMode() {
    this.hideStartMenu();
    this.header.classList.remove("hidden");
    this.sideMenu.classList.remove("hidden");
    this.toolbar.classList.remove("hidden");
    this.playerControls.classList.add("hidden");
    document.body.classList.add("builder-mode");
  }

  showPlayerMode() {
    this.header.classList.add("hidden");
    this.sideMenu.classList.add("hidden");
    this.playerControls.classList.remove("hidden");
    document.body.classList.remove("builder-mode");
  }

  updateBlockCounter(used: number, max: number) {
    this.blockCounter.textContent = `Blocks Used: ${used} / ${max}`;
  }

  setCourseNameInput(name: string) {
    this.courseNameInput.value = name;
  }

  getCourseName(): string {
    return this.courseNameInput.value.trim();
  }

  public showExportModal(jsonCode: string) {
    this.exportCode.value = jsonCode;
    this.exportModal.classList.remove("hidden");
  }

  public hideExportModal() {
    this.exportModal.classList.add("hidden");
  }

  // Add method to show an error modal
  public showErrorModal(message: string) {
    if (!this.errorModal) {
      this.createErrorModal();
    }

    const errorMessage = this.errorModal?.querySelector(
      ".error-message"
    ) as HTMLElement;
    if (errorMessage) {
      errorMessage.textContent = message;
    }

    this.errorModal?.classList.remove("hidden");
  }

  // Add method to create an error modal
  private createErrorModal() {
    this.errorModal = document.createElement("div");
    this.errorModal.classList.add("modal");

    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    modalContent.classList.add("error-modal");

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = "Error";

    const errorMessage = document.createElement("p");
    errorMessage.classList.add("error-message");
    errorMessage.style.color = "white";
    errorMessage.style.marginBottom = "20px";

    const closeButton = document.createElement("button");
    closeButton.textContent = "OK";
    closeButton.addEventListener("click", () => {
      this.errorModal?.classList.add("hidden");
    });

    modalContent.appendChild(modalTitle);
    modalContent.appendChild(errorMessage);
    modalContent.appendChild(closeButton);

    this.errorModal.appendChild(modalContent);
    document.body.appendChild(this.errorModal);
  }

  private updateSavedCoursesList() {
    this.savedCoursesList.innerHTML = "";
    const courses = this.courseManager.getAllCourses();

    if (courses.length === 0) {
      this.savedCoursesList.innerHTML =
        '<p style="color: white;">No saved courses found.</p>';
      return;
    }

    courses.forEach((course) => {
      const courseElement = document.createElement("div");
      courseElement.classList.add("course-item");

      const nameElement = document.createElement("div");
      nameElement.classList.add("course-name");
      nameElement.textContent = `${course.name} (${course.template})`;

      const actionsElement = document.createElement("div");
      actionsElement.classList.add("course-actions");

      const loadButton = document.createElement("button");
      loadButton.classList.add("load-course-btn");
      loadButton.textContent = "Load";
      loadButton.addEventListener("click", () => {
        if (this.onLoadCourse) {
          this.onLoadCourse(course.id);
        }
      });

      const deleteButton = document.createElement("button");
      deleteButton.classList.add("delete-course-btn");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        this.courseManager.deleteCourse(course.id);
        this.updateSavedCoursesList();
      });

      actionsElement.appendChild(loadButton);
      actionsElement.appendChild(deleteButton);

      courseElement.appendChild(nameElement);
      courseElement.appendChild(actionsElement);

      this.savedCoursesList.appendChild(courseElement);
    });
  }

  // Add a method to reset selected block
  resetBlockSelection() {
    document
      .querySelectorAll(".block-btn")
      .forEach((b) => b.classList.remove("active"));
    document.body.classList.remove("placement-mode");
  }

  // Update selected block tooltip position to show under the block
  public updateSelectedBlockTooltip(
    visible: boolean,
    position?: { x: number; y: number; z: number }
  ) {
    // Don't show tooltip if the main menu is visible (pixelated menu not hidden)
    if (
      !this.selectedBlockTooltip ||
      !visible ||
      !position ||
      !this.pixelatedMenu.classList.contains("hidden")
    ) {
      if (this.selectedBlockTooltip)
        this.selectedBlockTooltip.style.display = "none";
      return;
    }

    // Convert 3D position to screen coordinates
    const canvas = document.getElementById(
      "threejs-canvas"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Position the tooltip under the block
    // We need to estimate the screen position since we don't have direct access to the camera
    this.selectedBlockTooltip.style.display = "block";
    this.selectedBlockTooltip.style.left = `${rect.left + rect.width / 2}px`;
    this.selectedBlockTooltip.style.top = `${
      rect.top + rect.height / 2 + 100
    }px`;
  }

  // New method to position the tooltip using projected screen coordinates
  public updateSelectedBlockTooltipPosition(x: number, y: number) {
    // Don't show tooltip if the main menu is visible (pixelated menu not hidden)
    if (
      !this.selectedBlockTooltip ||
      !this.pixelatedMenu.classList.contains("hidden")
    ) {
      if (this.selectedBlockTooltip)
        this.selectedBlockTooltip.style.display = "none";
      return;
    }

    const canvas = document.getElementById(
      "threejs-canvas"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = rect.left + x;
    const canvasY = rect.top + y;

    // Position the tooltip under the block with a small offset
    this.selectedBlockTooltip.style.display = "block";
    this.selectedBlockTooltip.style.left = `${canvasX}px`;
    this.selectedBlockTooltip.style.top = `${canvasY + 40}px`; // 40px below the block
  }

  // Update the initializeToolbar method
  public initializeToolbar() {
    const rotateToolBtn = document.querySelector(
      '.tool-btn[data-tool="rotate"]'
    );
    if (rotateToolBtn) {
      rotateToolBtn.setAttribute("data-tool", "select");
      rotateToolBtn.setAttribute("title", "Select (3)");

      const toolLabel = rotateToolBtn.querySelector(".tool-label");
      if (toolLabel) {
        toolLabel.textContent = "Select";
      }

      const toolIcon = rotateToolBtn.querySelector(".tool-icon");
      if (toolIcon) {
        toolIcon.textContent = "👆"; // Selection cursor icon
      }
    }
  }

  // Add method to create controls modal
  private createControlsModal() {
    // Create modal if it doesn't exist
    if (!this.controlsModal) {
      this.controlsModal = document.createElement("div");
      this.controlsModal.classList.add("modal");
      this.controlsModal.classList.add("hidden");

      const modalContent = document.createElement("div");
      modalContent.classList.add("modal-content");

      const modalTitle = document.createElement("h2");
      modalTitle.textContent = "Customize Controls";
      modalContent.appendChild(modalTitle);

      // Create form for control inputs
      const controlsForm = document.createElement("div");
      controlsForm.classList.add("controls-form");

      // Add styles to the control form
      controlsForm.style.display = "grid";
      controlsForm.style.gridTemplateColumns = "auto 1fr";
      controlsForm.style.gap = "10px";
      controlsForm.style.marginBottom = "20px";

      // Create inputs for each control
      const controls = ["forward", "backward", "left", "right", "jump"];
      const controlLabels = ["Forward", "Backward", "Left", "Right", "Jump"];

      controls.forEach((control, index) => {
        const label = document.createElement("label");
        label.textContent = controlLabels[index] + ":";
        label.style.color = "white";
        label.style.fontFamily = "'Press Start 2P', monospace";
        label.style.fontSize = "12px";

        const input = document.createElement("input");
        input.type = "text";
        input.id = `control-${control}`;
        input.maxLength = 1;
        input.style.backgroundColor = "#333";
        input.style.color = "white";
        input.style.border = "2px solid #4CAF50";
        input.style.padding = "5px 10px";
        input.style.fontFamily = "'Press Start 2P', monospace";
        input.style.fontSize = "12px";
        input.style.textAlign = "center";

        controlsForm.appendChild(label);
        controlsForm.appendChild(input);
      });

      modalContent.appendChild(controlsForm);

      // Add buttons
      const buttonContainer = document.createElement("div");
      buttonContainer.style.display = "flex";
      buttonContainer.style.justifyContent = "space-between";

      const saveButton = document.createElement("button");
      saveButton.textContent = "Save Controls";
      saveButton.style.backgroundColor = "#4CAF50";
      saveButton.style.color = "white";
      saveButton.style.border = "none";
      saveButton.style.padding = "10px 20px";
      saveButton.style.fontFamily = "'Press Start 2P', monospace";
      saveButton.style.fontSize = "14px";
      saveButton.style.cursor = "pointer";

      saveButton.addEventListener("click", () => {
        this.saveControls();
      });

      const resetButton = document.createElement("button");
      resetButton.textContent = "Reset to Default";
      resetButton.style.backgroundColor = "#f44336";
      resetButton.style.color = "white";
      resetButton.style.border = "none";
      resetButton.style.padding = "10px 20px";
      resetButton.style.fontFamily = "'Press Start 2P', monospace";
      resetButton.style.fontSize = "14px";
      resetButton.style.cursor = "pointer";

      resetButton.addEventListener("click", () => {
        this.resetControlsToDefault();
      });

      const closeButton = document.createElement("button");
      closeButton.textContent = "Cancel";
      closeButton.style.backgroundColor = "#555";
      closeButton.style.color = "white";
      closeButton.style.border = "none";
      closeButton.style.padding = "10px 20px";
      closeButton.style.fontFamily = "'Press Start 2P', monospace";
      closeButton.style.fontSize = "14px";
      closeButton.style.cursor = "pointer";

      closeButton.addEventListener("click", () => {
        this.hideControlsModal();
      });

      buttonContainer.appendChild(resetButton);
      buttonContainer.appendChild(closeButton);
      buttonContainer.appendChild(saveButton);

      modalContent.appendChild(buttonContainer);

      this.controlsModal.appendChild(modalContent);
      document.body.appendChild(this.controlsModal);
    }
  }

  // Show controls modal with current controls
  public showControlsModal(currentControls: PlayerControls) {
    if (!this.controlsModal) {
      this.createControlsModal();
    }

    // Update input values
    Object.keys(currentControls).forEach((key) => {
      const input = document.getElementById(
        `control-${key}`
      ) as HTMLInputElement;
      if (input) {
        let value = currentControls[key as keyof PlayerControls];
        // Display space as "Space" for readability
        if (value === " ") {
          value = "Space";
        }
        input.value = value;
      }
    });

    // Show modal
    if (this.controlsModal) {
      this.controlsModal.classList.remove("hidden");
    }
  }

  // Hide controls modal
  public hideControlsModal() {
    if (this.controlsModal) {
      this.controlsModal.classList.add("hidden");
    }
  }

  // Save controls from form
  private saveControls() {
    if (!this.onUpdateControls) return;

    const newControls: Partial<PlayerControls> = {};

    // Get values from inputs
    const controls = ["forward", "backward", "left", "right", "jump"];
    controls.forEach((control) => {
      const input = document.getElementById(
        `control-${control}`
      ) as HTMLInputElement;
      if (input && input.value) {
        let value = input.value.toLowerCase();
        // Convert "Space" to actual space character
        if (value === "space") {
          value = " ";
        }
        newControls[control as keyof PlayerControls] = value;
      }
    });

    // Update controls
    this.onUpdateControls(newControls);

    // Hide modal
    this.hideControlsModal();

    // Show toast notification
    this.showToast("Controls updated successfully!");
  }

  // Reset controls to default
  private resetControlsToDefault() {
    if (!this.onUpdateControls) return;

    // Update with defaults
    this.onUpdateControls(DEFAULT_CONTROLS);

    // Hide modal
    this.hideControlsModal();

    // Show toast notification
    this.showToast("Controls reset to default");
  }

  // Update control display elements
  public updateControlsDisplay(controls: PlayerControls) {
    // Update toast message for player mode
    if (controls) {
      // Display space as "Space" for readability
      const jumpKey =
        controls.jump === " " ? "Space" : controls.jump.toUpperCase();

      // Update player mode toast with new movement description
      const controlsText = `Player Mode: ${controls.forward.toUpperCase()}/${controls.backward.toUpperCase()} to move forward/back<br>${controls.left.toUpperCase()}/${controls.right.toUpperCase()} to rotate<br>${jumpKey} to jump`;

      // Store for toast message
      if (
        document
          .querySelector(".tool-btn.active")
          ?.getAttribute("data-tool") === "player"
      ) {
        this.showToast(controlsText);
      }
    }
  }

  // Add method to set control update callback
  public setOnUpdateControls(
    callback: (controls: Partial<PlayerControls>) => void
  ) {
    this.onUpdateControls = callback;
  }

  // Add this new method
  setOnResetPlayer(callback: () => void) {
    this.resetPlayerCallback = callback;
  }

  private setupAtmosphereToggle() {
    // Create atmosphere toggle button
    this.atmosphereBtn = document.createElement("button");
    this.atmosphereBtn.id = "atmosphere-toggle";
    this.atmosphereBtn.classList.add("atmosphere-btn");
    this.atmosphereBtn.innerHTML = "☀️ Day Mode";
    this.atmosphereBtn.title = "Toggle between day and night mode";

    // Add event listener
    this.atmosphereBtn.addEventListener("click", () => {
      if (this.onToggleAtmosphere) {
        this.onToggleAtmosphere();
      }
    });

    // Add to header controls
    const headerControls = document.querySelector(".header-controls");
    if (headerControls) {
      headerControls.appendChild(this.atmosphereBtn);
    }
  }

  // Add method to update atmosphere button state
  public updateAtmosphereToggle(isDayMode: boolean) {
    if (this.atmosphereBtn) {
      this.atmosphereBtn.innerHTML = isDayMode
        ? "☀️ Day Mode"
        : "🌙 Night Mode";
      this.atmosphereBtn.classList.toggle("night-mode", !isDayMode);
    }
  }

  // Add callback for atmosphere toggle
  private onToggleAtmosphere: (() => void) | null = null;

  public setOnToggleAtmosphere(callback: () => void) {
    this.onToggleAtmosphere = callback;
  }
}
