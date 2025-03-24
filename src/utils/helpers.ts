// Helper utility functions
import * as THREE from "three";
import { STORAGE_KEYS } from "./config.js";
import { BuilderState } from "./types.js";

/**
 * Checks if the current environment is mobile
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Sends a message to the parent window
 */
export function sendMessageToParent(type: string, data: any = {}): void {
  window.parent.postMessage({ type, data }, "*");
}

/**
 * Saves builder state to localStorage
 */
export function saveBuilderState(
  isBuilderMode: boolean,
  template: string,
  camera: THREE.Camera,
  selectedTool: string,
  selectedBlockType: string,
  blocks?: THREE.Mesh[]
): void {
  console.log("STORAGE DEBUG - Saving builder state with", blocks?.length || 0, "blocks, builder mode:", isBuilderMode);
  
  // Create serializable state object
  const state: BuilderState = {
    isBuilderMode,
    template,
    cameraPosition: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    cameraRotation: {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z
    },
    selectedTool,
    selectedBlockType
  };
  
  // If blocks are provided, serialize them
  if (blocks && blocks.length > 0) {
    console.log("STORAGE DEBUG - Serializing", blocks.length, "blocks for storage");
    
    // Maintain a map to prevent duplicates
    const positionMap = new Map();
    
    state.blocks = blocks
      .filter(block => {
        // Create a position key
        const posKey = `${Math.round(block.position.x)},${Math.round(block.position.y)},${Math.round(block.position.z)}`;
        
        // If we've seen this position, skip it
        if (positionMap.has(posKey)) {
          console.log("STORAGE DEBUG - Skipping duplicate block at position:", posKey);
          return false;
        }
        
        // Otherwise, record this position and keep the block
        positionMap.set(posKey, true);
        return true;
      })
      .map(block => ({
        position: {
          x: block.position.x,
          y: block.position.y,
          z: block.position.z
        },
        type: block.userData?.type || 'platform',
        size: block.geometry.type.includes("Box") ? 
          (block.geometry as THREE.BoxGeometry).parameters : 
          { width: 3, height: 1, depth: 3 }
      }));
    
    console.log("STORAGE DEBUG - After de-duplication, saving", state.blocks.length, "blocks");
  }
  
  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.BUILDER_STATE, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEYS.BUILDER_TEMPLATE, template);
    localStorage.setItem(STORAGE_KEYS.LAST_MODE, isBuilderMode ? 'builder' : 'player');
    console.log("STORAGE DEBUG - Builder state saved successfully");
  } catch (error) {
    console.error("Error saving builder state:", error);
  }
}

/**
 * Load builder state from localStorage
 */
export function loadBuilderState(): BuilderState | null {
  const stateStr = localStorage.getItem(STORAGE_KEYS.BUILDER_STATE);
  if (!stateStr) return null;
  
  try {
    const state = JSON.parse(stateStr) as BuilderState;
    
    // Check for duplicate blocks
    if (state.blocks && state.blocks.length > 0) {
      console.log("STORAGE DEBUG - Loading state with", state.blocks.length, "blocks");
      
      // Look for duplicate positions
      const positionMap = new Map();
      const uniqueBlocks = state.blocks.filter(block => {
        // Create a position key (rounded to nearest integer for stability)
        const posKey = `${Math.round(block.position.x)},${Math.round(block.position.y)},${Math.round(block.position.z)}`;
        
        // If we've seen this position, skip it
        if (positionMap.has(posKey)) {
          console.log("STORAGE DEBUG - Found duplicate block at position:", posKey);
          return false;
        }
        
        // Otherwise, record this position and keep the block
        positionMap.set(posKey, true);
        return true;
      });
      
      if (uniqueBlocks.length !== state.blocks.length) {
        console.log(`STORAGE DEBUG - De-duplicated blocks: ${state.blocks.length} -> ${uniqueBlocks.length}`);
        state.blocks = uniqueBlocks;
      }
    }
    
    return state;
  } catch (error) {
    console.error("Error loading builder state:", error);
    
    // Clear corrupted state
    localStorage.removeItem(STORAGE_KEYS.BUILDER_STATE);
    localStorage.removeItem(STORAGE_KEYS.BUILDER_TEMPLATE);
    return null;
  }
}

/**
 * Safely removes an element from the DOM
 */
export function removeElement(id: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}

/**
 * Creates an HTML element with specified properties
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  styles: Partial<CSSStyleDeclaration> = {},
  innerHTML: string = ""
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  // Set styles
  Object.entries(styles).forEach(([key, value]) => {
    // @ts-ignore - This is a simple workaround for setting styles
    element.style[key] = value;
  });
  
  // Set inner HTML if provided
  if (innerHTML) {
    element.innerHTML = innerHTML;
  }
  
  return element;
}

/**
 * Clears all builder-related localStorage data
 */
export function resetBuilderLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.BUILDER_STATE);
    localStorage.removeItem(STORAGE_KEYS.BUILDER_TEMPLATE);
    localStorage.removeItem(STORAGE_KEYS.LAST_MODE);
    console.log("Builder localStorage data reset successfully");
  } catch (error) {
    console.error("Error resetting builder localStorage:", error);
  }
} 