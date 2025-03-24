/** Message from Devvit to the web view. */
export type DevvitMessage = 
  | { type: "startGame" }
  | { type: "startBuilder"; data: { template: "small" | "medium" | "large" } }
  | { type: "createCourse"; data: { courseName: string; courseId: string } };

/** Message from the web view to Devvit. */
export type WebViewMessage =
  | { type: "webViewReady" }
  | { type: "positionUpdate"; data: { 
      x: number; 
      y: number; 
      z: number;
      onGround: boolean;
      animation: string;
    } 
  }
  | { type: "courseComplete"; data: { courseId: string; time: number } }
  | { type: "courseCreated"; data: { 
      template: string;
      blocks: Array<{
        position: { x: number; y: number; z: number };
        type: string;
        size: any;
      }>;
      startPosition: { x: number; y: number; z: number };
      finishPosition: { x: number; y: number; z: number };
    } 
  }
  | { type: "menuRequest"; data: { menu: "main" | "customization" | "leaderboard" | "createCourse" } };

/** Web view MessageEvent listener data type. */
export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  type?: "devvit-message" | string;
};
