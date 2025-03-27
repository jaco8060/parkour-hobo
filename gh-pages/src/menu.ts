// Pixelated menu system for course selection and creation
import { STORAGE_KEYS } from "./utils/config.js";
import { 
  createElement, 
  removeElement, 
  clearBuilderState,
  loadSavedCourses, 
  saveSavedCourses 
} from "./utils/helpers.js";
import { SavedCourse } from "./utils/types.js";
import { showNotification } from "./components/Overlay.js";

/**
 * Creates and displays the main menu
 */
export function showMainMenu(
  onLoadCourse: (course: SavedCourse) => void, 
  onCreateNew: (template: string) => void
): void {
  // Remove any existing menu
  const existingMenu = document.getElementById("pixelated-menu");
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Get saved courses from localStorage
  const savedCourses = loadSavedCourses();
  
  // Create menu container with pixelated style
  const menuContainer = createElement("div", 
    { id: "pixelated-menu" },
    {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "#121212",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "10000",
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      color: "white",
      imageRendering: "pixelated"
    }
  );
  
  // Create pixelated title
  const title = createElement("h1", 
    {},
    {
      fontSize: "4vw",
      textAlign: "center",
      marginBottom: "5vh",
      textShadow: "3px 3px 0 #4CAF50, 6px 6px 0 #333",
      letterSpacing: "2px",
    },
    "PARKOUR HOBO<br>COURSE BUILDER"
  );
  menuContainer.appendChild(title);
  
  // Create menu content container
  const menuContent = createElement("div", 
    {},
    {
      width: "80%",
      maxWidth: "800px",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      border: "4px solid #4CAF50",
      borderRadius: "8px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "15px"
    }
  );
  
  // Add "New Course" button
  const newCourseSection = createElement("div", 
    {},
    {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      marginBottom: "20px",
      padding: "15px",
      border: "2px dashed #4CAF50",
      backgroundColor: "rgba(76, 175, 80, 0.1)"
    }
  );
  
  const newCourseTitle = createElement("h2", 
    {},
    {
      fontSize: "18px",
      margin: "0 0 10px 0"
    },
    "Create New Course"
  );
  newCourseSection.appendChild(newCourseTitle);
  
  // Add template size selection
  const templateSelectRow = createElement("div", 
    {},
    {
      display: "flex",
      justifyContent: "space-between",
      gap: "10px"
    }
  );
  
  ['small', 'medium', 'large'].forEach(size => {
    const button = createElement("button", 
      { "data-template": size },
      {
        flex: "1",
        padding: "10px",
        backgroundColor: size === 'medium' ? "#4CAF50" : "#333",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: "'Press Start 2P', 'Courier New', monospace",
        fontSize: "14px",
        boxShadow: "3px 3px 0 #222",
        outline: "none",
        imageRendering: "pixelated"
      },
      size.toUpperCase()
    );
    
    button.addEventListener("click", () => {
      // Start builder mode with selected template
      onCreateNew(size);
    });
    
    templateSelectRow.appendChild(button);
  });
  
  newCourseSection.appendChild(templateSelectRow);
  menuContent.appendChild(newCourseSection);
  
  // Add saved courses section if any exist
  if (savedCourses.length > 0) {
    const savedCoursesTitle = createElement("h2", 
      {},
      {
        fontSize: "18px",
        margin: "10px 0",
        borderBottom: "2px solid #4CAF50",
        paddingBottom: "5px"
      },
      "Saved Courses"
    );
    menuContent.appendChild(savedCoursesTitle);
    
    // Create courses list
    const coursesList = createElement("div", 
      {},
      {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxHeight: "40vh",
        overflowY: "auto",
        padding: "5px"
      }
    );
    
    savedCourses.forEach((course, index) => {
      const courseContainer = createElement("div", 
        {},
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px",
          backgroundColor: "rgba(20, 20, 20, 0.8)",
          borderRadius: "4px",
          border: "2px solid #333"
        }
      );
      
      // Get stats for this course
      const blockCount = course.blocks?.length || 0;
      const template = course.template || "medium";
      
      const courseInfo = createElement("div", 
        {},
        {
          display: "flex",
          flexDirection: "column",
          gap: "5px"
        },
        `
          <div style="font-size:16px;color:#4CAF50;">${course.name}</div>
          <div style="font-size:12px;opacity:0.8;">${blockCount} blocks • ${template} template</div>
        `
      );
      courseContainer.appendChild(courseInfo);
      
      const btnContainer = createElement("div", 
        {},
        {
          display: "flex",
          gap: "10px"
        }
      );
      
      // Load button
      const loadBtn = createElement("button", 
        {},
        {
          padding: "8px 15px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontFamily: "'Press Start 2P', 'Courier New', monospace",
          fontSize: "12px",
          boxShadow: "2px 2px 0 #222"
        },
        "LOAD"
      );
      
      loadBtn.addEventListener("click", () => {
        onLoadCourse(course);
      });
      
      btnContainer.appendChild(loadBtn);
      
      // Delete button
      const deleteBtn = createElement("button", 
        {},
        {
          padding: "8px 15px",
          backgroundColor: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontFamily: "'Press Start 2P', 'Courier New', monospace",
          fontSize: "12px",
          boxShadow: "2px 2px 0 #222"
        },
        "DELETE"
      );
      
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        if (confirm("Are you sure you want to delete this course?")) {
          // Remove course and refresh menu
          const updatedCourses = savedCourses.filter((_, i) => i !== index);
          saveSavedCourses(updatedCourses);
          showMainMenu(onLoadCourse, onCreateNew);
          showNotification(`Course "${course.name}" deleted`, 3000);
        }
      });
      
      btnContainer.appendChild(deleteBtn);
      courseContainer.appendChild(btnContainer);
      coursesList.appendChild(courseContainer);
    });
    
    menuContent.appendChild(coursesList);
  } else {
    // Show message if no saved courses
    const noCoursesMsg = createElement("div", 
      {},
      {
        textAlign: "center",
        padding: "20px",
        backgroundColor: "rgba(20, 20, 20, 0.8)",
        borderRadius: "4px",
        color: "#aaa",
        fontStyle: "italic"
      },
      "No saved courses yet. Create a new course to get started!"
    );
    menuContent.appendChild(noCoursesMsg);
  }
  
  menuContainer.appendChild(menuContent);
  
  // Add pixelated footer
  const footer = createElement("div", 
    {},
    {
      marginTop: "30px",
      fontSize: "12px",
      opacity: "0.7",
      textAlign: "center"
    },
    "© 2025 Parkour Hobo - Use B key to switch between Builder and Player modes"
  );
  menuContainer.appendChild(footer);
  
  // Add to document
  document.body.appendChild(menuContainer);
  
  // Add pixelated background
  addPixelatedBackground(menuContainer);
}

/**
 * Adds a pixelated background effect to the menu
 */
function addPixelatedBackground(container: HTMLElement): void {
  // Create canvas for pixelated background
  const canvas = document.createElement('canvas');
  const pixelSize = 10; // Size of each "pixel"
  
  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Get context
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Fill with pixels of various colors
  for (let x = 0; x < canvas.width; x += pixelSize) {
    for (let y = 0; y < canvas.height; y += pixelSize) {
      // Generate mostly dark pixels with occasional accent pixels
      let r, g, b;
      
      const rand = Math.random();
      if (rand < 0.005) {
        // Accent pixel (green for Parkour Hobo)
        r = 50 + Math.random() * 20;
        g = 180 + Math.random() * 75;
        b = 50 + Math.random() * 20;
      } else {
        // Dark pixel with slight variation
        const value = 10 + Math.random() * 30;
        r = value;
        g = value;
        b = value + (Math.random() < 0.2 ? 10 : 0); // Slight blue tint sometimes
      }
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
  
  // Apply canvas as background
  const dataUrl = canvas.toDataURL();
  container.style.backgroundImage = `url(${dataUrl})`;
  container.style.backgroundSize = '100% 100%';
} 