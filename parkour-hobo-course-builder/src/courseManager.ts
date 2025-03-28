import { Course, Template } from './types';
import { BlockFactory } from './blockFactory';

export class CourseManager {
  private courses: Course[] = [];
  private templates: Template[] = [];
  private blockFactory: BlockFactory;
  
  constructor() {
    this.blockFactory = new BlockFactory();
    this.loadTemplates();
    this.loadCoursesFromStorage();
  }
  
  private loadTemplates(): void {
    // Define some default templates
    this.templates = [
      {
        name: 'small',
        maxBlocks: 20
      },
      {
        name: 'medium',
        maxBlocks: 35
      },
      {
        name: 'large',
        maxBlocks: 50
      }
    ];
  }
  
  private loadCoursesFromStorage(): void {
    const savedCourses = localStorage.getItem('parkourHoboCourses');
    if (savedCourses) {
      try {
        const courseData = JSON.parse(savedCourses);
        // Convert the serialized courses back to Course objects with proper methods
        this.courses = courseData.map((course: any) => this.deserializeCourse(course));
      } catch (e) {
        console.error('Failed to load courses from local storage', e);
        this.courses = [];
      }
    }
  }
  
  private saveCoursesToStorage(): void {
    const serializedCourses = this.courses.map(course => this.serializeCourse(course));
    localStorage.setItem('parkourHoboCourses', JSON.stringify(serializedCourses));
  }

  private serializeCourse(course: Course): any {
    // Create a serializable version of the course
    return {
      id: course.id,
      name: course.name,
      template: course.template,
      // Remove the mesh property from blocks before serialization
      blocks: course.blocks.map(block => ({
        type: block.type,
        position: block.position,
        rotation: block.rotation
      })),
      startPosition: course.startPosition,
      finishPosition: course.finishPosition
    };
  }

  private deserializeCourse(courseData: any): Course {
    // Create a new Course object from serialized data
    const course: Course = {
      id: courseData.id,
      name: courseData.name,
      template: courseData.template,
      blocks: courseData.blocks.map((blockData: any) => {
        // Re-create each block using the block factory
        return this.blockFactory.createBlock(
          blockData.type,
          blockData.position,
          blockData.rotation
        );
      }),
      startPosition: courseData.startPosition,
      finishPosition: courseData.finishPosition
    };
    
    return course;
  }
  
  public createNewCourse(name: string, templateName: string): Course {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    const course: Course = {
      id: this.generateId(),
      name,
      template: templateName,
      blocks: [],
      startPosition: { x: 0, y: 0, z: 0 },
      finishPosition: { x: 0, y: 0, z: 0 }
    };
    
    this.courses.push(course);
    this.saveCoursesToStorage();
    
    return course;
  }
  
  public saveCourse(course: Course): void {
    const index = this.courses.findIndex(c => c.id === course.id);
    
    if (index >= 0) {
      this.courses[index] = course;
    } else {
      this.courses.push(course);
    }
    
    this.saveCoursesToStorage();
  }
  
  public deleteCourse(courseId: string): void {
    const index = this.courses.findIndex(c => c.id === courseId);
    
    if (index >= 0) {
      this.courses.splice(index, 1);
      this.saveCoursesToStorage();
    }
  }
  
  public getCourse(courseId: string): Course | null {
    return this.courses.find(c => c.id === courseId) || null;
  }
  
  public getAllCourses(): Course[] {
    return [...this.courses];
  }
  
  public getTemplate(templateName: string): Template {
    const template = this.templates.find(t => t.name === templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return template;
  }
  
  public getAllTemplates(): Template[] {
    return [...this.templates];
  }
  
  public exportCourseAsJson(course: Course): string {
    const exportData = this.serializeCourse(course);
    return JSON.stringify(exportData, null, 2);
  }
  
  // Add validation method to check if a course has exactly one start and one finish block
  public validateCourse(course: Course): { valid: boolean; message: string } {
    if (!course || !course.blocks) {
      return { valid: false, message: 'Invalid course data' };
    }
    
    const startBlocks = course.blocks.filter(block => block.type === 'start');
    const finishBlocks = course.blocks.filter(block => block.type === 'finish');
    
    if (startBlocks.length === 0) {
      return { valid: false, message: 'Course must have a Start block' };
    }
    
    if (startBlocks.length > 1) {
      return { valid: false, message: 'Course must have exactly one Start block' };
    }
    
    if (finishBlocks.length === 0) {
      return { valid: false, message: 'Course must have a Finish block' };
    }
    
    if (finishBlocks.length > 1) {
      return { valid: false, message: 'Course must have exactly one Finish block' };
    }
    
    return { valid: true, message: 'Course is valid' };
  }
  
  public importCourseFromJson(jsonData: string): Course {
    try {
      const courseData = JSON.parse(jsonData);
      const course = this.deserializeCourse(courseData);
      
      // Assign a new ID to avoid conflicts
      course.id = this.generateId();
      
      this.courses.push(course);
      this.saveCoursesToStorage();
      
      return course;
    } catch (e) {
      console.error('Failed to import course from JSON', e);
      throw new Error('Invalid course data');
    }
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
