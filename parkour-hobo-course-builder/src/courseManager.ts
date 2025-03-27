import { Course, Template } from './types';

export class CourseManager {
  private courses: Course[] = [];
  private templates: Record<string, Template> = {
    small: { name: 'Small', maxBlocks: 200 },
    medium: { name: 'Medium', maxBlocks: 400 },
    large: { name: 'Large', maxBlocks: 600 }
  };

  constructor() {
    this.loadCoursesFromLocalStorage();
  }

  private loadCoursesFromLocalStorage() {
    const savedCourses = localStorage.getItem('parkour-hobo-courses');
    if (savedCourses) {
      this.courses = JSON.parse(savedCourses);
    }
  }

  private saveCoursesToLocalStorage() {
    // Create a cleaned version without mesh references
    const cleanedCourses = this.courses.map(course => {
      return {
        ...course,
        blocks: course.blocks.map(block => {
          const { mesh, ...cleanedBlock } = block;
          return cleanedBlock;
        })
      };
    });
    
    localStorage.setItem('parkour-hobo-courses', JSON.stringify(cleanedCourses));
  }

  createNewCourse(name: string, templateName: string): Course {
    const id = Date.now().toString();
    const template = this.templates[templateName];
    
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }
    
    const newCourse: Course = {
      id,
      name,
      template: templateName,
      blocks: [],
      startPosition: { x: 0, y: 0, z: 0 },
      finishPosition: { x: 0, y: 0, z: 0 }
    };
    
    return newCourse;
  }

  saveCourse(course: Course): boolean {
    // Find if the course already exists (by id)
    const index = this.courses.findIndex(c => c.id === course.id);
    
    if (index >= 0) {
      // Update existing course
      this.courses[index] = course;
    } else {
      // Add new course
      this.courses.push(course);
    }
    
    this.saveCoursesToLocalStorage();
    return true;
  }

  deleteCourse(courseId: string): boolean {
    const initialLength = this.courses.length;
    this.courses = this.courses.filter(course => course.id !== courseId);
    
    if (this.courses.length < initialLength) {
      this.saveCoursesToLocalStorage();
      return true;
    }
    
    return false;
  }

  getCourse(courseId: string): Course | undefined {
    return this.courses.find(course => course.id === courseId);
  }

  getAllCourses(): Course[] {
    return [...this.courses];
  }

  getTemplate(templateName: string): Template {
    return this.templates[templateName];
  }

  getAllTemplates(): Template[] {
    return Object.values(this.templates);
  }

  exportCourseAsJson(course: Course): string {
    // Create a cleaned version without mesh references
    const cleanedCourse = {
      ...course,
      blocks: course.blocks.map(block => {
        const { mesh, ...cleanedBlock } = block;
        return cleanedBlock;
      })
    };
    
    return JSON.stringify(cleanedCourse, null, 2);
  }
}
