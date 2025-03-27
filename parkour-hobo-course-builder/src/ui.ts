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
  
  private courseManager: CourseManager;
  private onNewCourse: ((templateName: string) => void) | undefined;
  private onLoadCourse: ((courseId: string) => void) | undefined;
  private onBlockSelected: ((blockType: string) => void) | undefined;
  private onExportCourse: (() => void) | undefined;
  private onSaveCourse: (() => void) | undefined;
  private onReset: (() => void) | undefined;
  private onToolSelected: ((tool: string) => void) | undefined;

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
    
    // Select build tool by default
    this.selectTool('build');
  }

  public selectTool(tool: string) {
    // Remove active class from all tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to selected tool
    const toolBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
    if (toolBtn) {
      toolBtn.classList.add('active');
    }
    
    if (this.onToolSelected) {
      this.onToolSelected(tool);
    }
    
    // Special handling for player mode
    if (tool === 'player') {
      // This will be handled by the main class
    }
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
}
