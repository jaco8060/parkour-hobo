// Main initialization for the Parkour Hobo Course Builder

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Parkour Hobo Course Builder...");
    
    // Add instructions to the game container
    addInstructions();
    
    // Create and initialize the builder
    const builder = new Builder();
    builder.init();
    
    // Create and initialize controls
    const controls = new Controls(builder);
    controls.init();
    
    console.log("Builder initialization complete!");
});

// Add keyboard/mouse instructions to the game container
function addInstructions() {
    const container = document.getElementById("game-container");
    if (!container) return;
    
    const instructions = document.createElement("div");
    instructions.className = "instructions";
    instructions.innerHTML = `
        <h3>Controls:</h3>
        <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> - Move camera</p>
        <p><kbd>Q</kbd><kbd>E</kbd> - Move up/down</p>
        <p><kbd>Shift</kbd> - Sprint</p>
        <p><kbd>Right-click + drag</kbd> - Rotate camera</p>
        <p><kbd>Left-click</kbd> - Place/remove block</p>
        <p><kbd>B</kbd> - Build tool</p>
        <p><kbd>R</kbd> - Remove tool</p>
        <p><kbd>C</kbd> - Camera tool</p>
        <p><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> - Select block type</p>
        <p><kbd>X</kbd> - Export course</p>
    `;
    
    container.appendChild(instructions);
} 