import { CourseManager } from './courseManager';

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
  
  private courseManager: CourseManager;
  private onNewCourse: ((templateName: string) => void) | undefined;
  private onLoadCourse: ((courseId: string) => void) | undefined;
  private onBlockSelected: ((blockType: string) => void) | undefined;
  private onExportCourse: (() => void) | undefined;
  private onSaveCourse: (() => void) | undefined;
  private onReset: (() => void) | undefined;
  private onToolSelected: ((tool: string) => void) | undefined;
  private toastTimeout: number | null = null;

  constructor(courseManager: CourseManager) {
    this.courseManager = courseManager;
    
    // Get UI elements
    this.pixelatedMenu = document.getElementById('pixelated-menu') as HTMLElement;
    this.mainMenu = document.getElementById('main-menu') as HTMLElement;
    this.newCourseMenu = document.getElementById('new-course-menu') as HTMLElement;
    this.loadCourseMenu = document.getElementById('load-course-menu') as HTMLElement;
    this.savedCoursesList = document.getElementById('saved-courses-list') as HTMLElement;
    this.header = document.getElementById('header') as HTMLElement;
    this.sideMenu = document.getElementById('side-menu') as HTMLElement;
    this.courseNameInput = document.getElementById('course-name') as HTMLInputElement;
    this.blockCounter = document.getElementById('block-counter') as HTMLElement;
    this.exportModal = document.getElementById('export-modal') as HTMLElement;
    this.exportCode = document.getElementById('export-code') as HTMLTextAreaElement;
    this.toolbar = document.getElementById('toolbar') as HTMLElement;
    
    this.setupEventListeners();
    this.setupExportModalEvents();
    this.setupToolbar();
  }

  private setupEventListeners() {
    // Main menu buttons
    document.getElementById('new-course-btn')?.addEventListener('click', () => {
      this.mainMenu.classList.add('hidden');
      this.newCourseMenu.classList.remove('hidden');
    });
    
    document.getElementById('load-course-btn')?.addEventListener('click', () => {
      this.mainMenu.classList.add('hidden');
      this.loadCourseMenu.classList.remove('hidden');
      this.updateSavedCoursesList();
    });
    
    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.newCourseMenu.classList.add('hidden');
        this.loadCourseMenu.classList.add('hidden');
        this.mainMenu.classList.remove('hidden');
      });
    });
    
    // Template buttons
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const template = (e.target as HTMLElement).getAttribute('data-template') || '';
        if (this.onNewCourse) {
          this.onNewCourse(template);
        }
      });
    });
    
    // Block buttons
    document.querySelectorAll('.block-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Deselect all blocks
        document.querySelectorAll('.block-btn').forEach(b => b.classList.remove('active'));
        
        // Select the clicked block
        btn.classList.add('active');
        
        const blockType = (e.target as HTMLElement).getAttribute('data-block') || '';
        if (this.onBlockSelected) {
          this.onBlockSelected(blockType);
        }
      });
    });
    
    // Header buttons
    document.getElementById('save-course-btn')?.addEventListener('click', () => {
      if (this.onSaveCourse) {
        this.onSaveCourse();
      }
    });
    
    document.getElementById('export-code-btn')?.addEventListener('click', () => {
      if (this.onExportCourse) {
        this.onExportCourse();
      }
    });
    
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      if (this.onReset) {
        this.onReset();
      }
    });
    
    // Modal close button
    document.getElementById('close-export-modal')?.addEventListener('click', () => {
      this.hideExportModal();
    });
  }

  private setupExportModalEvents() {
    document.getElementById('copy-export-code')?.addEventListener('click', () => {
      const codeText = this.exportCode.value;
      navigator.clipboard.writeText(codeText)
        .then(() => {
          alert('Code copied to clipboard!');
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
        });
    });
  }

  private setupToolbar() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') || 'build';
        this.selectTool(tool);
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
    this.selectTool('build');
  }

  public selectTool(tool: string) {
    // Remove active class from all tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to selected tool
    const toolBtn = document.querySelector(`.tool-btn[data-tool="${tool === 'rotate' ? 'select' : tool}"]`);
    if (toolBtn) {
      toolBtn.classList.add('active');
    }
    
    // Show toast with controls
    if (this.toast) {
      if (tool === 'select') {
        this.showToast('Select Mode: Click to select a block<br>R: Rotate selected block<br>Delete: Remove selected block<br>Esc: Cancel selection');
      } else if (tool === 'build') {
        this.showToast('Build Mode: Click to place block<br>R: Rotate before placing');
      } else if (tool === 'delete') {
        this.showToast('Delete Mode: Click to delete block');
      } else if (tool === 'player') {
        this.showToast('Player Mode: WASD to move<br>Space to jump');
      }
    }
    
    if (this.onToolSelected) {
      // If the tool is "select", pass that value to the main class instead of "rotate"
      this.onToolSelected(tool === 'rotate' ? 'select' : tool);
    }
    
    // Special handling for player mode
    if (tool === 'player') {
      // This will be handled by the main class
    }
  }

  // Method to show a toast notification
  private showToast(message: string, duration: number = 3000) {
    // Don't show toast if the main menu is visible
    if (!this.toast || !this.pixelatedMenu.classList.contains('hidden')) return;
    
    // Clear any existing timeout
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    
    // Update and show toast
    this.toast.innerHTML = message;
    this.toast.style.display = 'block';
    
    // Animate in
    this.toast.style.opacity = '0';
    this.toast.style.transition = 'opacity 0.3s ease-in-out';
    setTimeout(() => {
      if (this.toast) this.toast.style.opacity = '1';
    }, 10);
    
    // Set timeout to hide toast
    this.toastTimeout = window.setTimeout(() => {
      if (this.toast) {
        this.toast.style.opacity = '0';
        setTimeout(() => {
          if (this.toast) this.toast.style.display = 'none';
        }, 300);
      }
      this.toastTimeout = null;
    }, duration);
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
    document.body.classList.add('placement-mode');
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
    this.pixelatedMenu.classList.remove('hidden');
    this.header.classList.add('hidden');
    this.sideMenu.classList.add('hidden');
    document.body.classList.remove('builder-mode');
  }

  hideStartMenu() {
    this.pixelatedMenu.classList.add('hidden');
  }

  showBuilderMode() {
    this.hideStartMenu();
    this.header.classList.remove('hidden');
    this.sideMenu.classList.remove('hidden');
    this.toolbar.classList.remove('hidden');
    document.body.classList.add('builder-mode');
  }

  showPlayerMode() {
    this.header.classList.add('hidden');
    this.sideMenu.classList.add('hidden');
    document.body.classList.remove('builder-mode');
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

  showExportModal(jsonCode: string) {
    this.exportCode.value = jsonCode;
    this.exportModal.classList.remove('hidden');
  }

  hideExportModal() {
    this.exportModal.classList.add('hidden');
  }

  private updateSavedCoursesList() {
    this.savedCoursesList.innerHTML = '';
    const courses = this.courseManager.getAllCourses();
    
    if (courses.length === 0) {
      this.savedCoursesList.innerHTML = '<p style="color: white;">No saved courses found.</p>';
      return;
    }
    
    courses.forEach(course => {
      const courseElement = document.createElement('div');
      courseElement.classList.add('course-item');
      
      const nameElement = document.createElement('div');
      nameElement.classList.add('course-name');
      nameElement.textContent = `${course.name} (${course.template})`;
      
      const actionsElement = document.createElement('div');
      actionsElement.classList.add('course-actions');
      
      const loadButton = document.createElement('button');
      loadButton.classList.add('load-course-btn');
      loadButton.textContent = 'Load';
      loadButton.addEventListener('click', () => {
        if (this.onLoadCourse) {
          this.onLoadCourse(course.id);
        }
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.classList.add('delete-course-btn');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
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
    document.querySelectorAll('.block-btn').forEach(b => b.classList.remove('active'));
    document.body.classList.remove('placement-mode');
  }

  // Update selected block tooltip position to show under the block
  public updateSelectedBlockTooltip(visible: boolean, position?: { x: number, y: number, z: number }) {
    // Don't show tooltip if the main menu is visible (pixelated menu not hidden)
    if (!this.selectedBlockTooltip || !visible || !position || !this.pixelatedMenu.classList.contains('hidden')) {
      if (this.selectedBlockTooltip) this.selectedBlockTooltip.style.display = 'none';
      return;
    }

    // Convert 3D position to screen coordinates
    const canvas = document.getElementById('threejs-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Position the tooltip under the block
    // We need to estimate the screen position since we don't have direct access to the camera
    this.selectedBlockTooltip.style.display = 'block';
    this.selectedBlockTooltip.style.left = `${rect.left + rect.width/2}px`;
    this.selectedBlockTooltip.style.top = `${rect.top + rect.height/2 + 100}px`;
  }

  // New method to position the tooltip using projected screen coordinates
  public updateSelectedBlockTooltipPosition(x: number, y: number) {
    // Don't show tooltip if the main menu is visible (pixelated menu not hidden)
    if (!this.selectedBlockTooltip || !this.pixelatedMenu.classList.contains('hidden')) {
      if (this.selectedBlockTooltip) this.selectedBlockTooltip.style.display = 'none';
      return;
    }
    
    const canvas = document.getElementById('threejs-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = rect.left + x;
    const canvasY = rect.top + y;
    
    // Position the tooltip under the block with a small offset
    this.selectedBlockTooltip.style.display = 'block';
    this.selectedBlockTooltip.style.left = `${canvasX}px`;
    this.selectedBlockTooltip.style.top = `${canvasY + 40}px`; // 40px below the block
  }

  // Update the initializeToolbar method
  public initializeToolbar() {
    const rotateToolBtn = document.querySelector('.tool-btn[data-tool="rotate"]');
    if (rotateToolBtn) {
      rotateToolBtn.setAttribute('data-tool', 'select');
      rotateToolBtn.setAttribute('title', 'Select (3)');
      
      const toolLabel = rotateToolBtn.querySelector('.tool-label');
      if (toolLabel) {
        toolLabel.textContent = 'Select';
      }
      
      const toolIcon = rotateToolBtn.querySelector('.tool-icon');
      if (toolIcon) {
        toolIcon.textContent = '👆'; // Selection cursor icon
      }
    }
  }
}
