// src/message.ts
// Define the types for messages exchanged between Devvit and the Web View

/** Message from Devvit (Reddit App) to the Web View (Three.js Game). */
export type DevvitMessage =
  | { type: 'loadCourse'; courseJson: string } // Send the course data
  | { type: 'resetPlayer' }; // Optional: Could be used to reset player externally

/** Message from the Web View (Three.js Game) to Devvit (Reddit App). */
export type WebViewMessage =
  | { type: 'webViewReady' } // Sent when the web view JS has loaded
  | { type: 'levelComplete'; /* Add score/time later if needed */ }; // Sent when finish block is reached

/**
 * Web view MessageEvent listener data type. The Devvit API wraps all messages
 * from Blocks to the web view.
 */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  /** Reserved type for messages sent via `context.ui.webView.postMessage`. */
  type?: 'devvit-message' | string;
};
