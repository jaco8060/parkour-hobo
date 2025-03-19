/** Message from Devvit to the web view. */
export type DevvitMessage = { type: "startGame" };

/** Message from the web view to Devvit. */
export type WebViewMessage =
  | { type: "webViewReady" }
  | { type: "positionUpdate"; data: { x: number; y: number } };

/** Web view MessageEvent listener data type. */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  type?: "devvit-message" | string;
};
