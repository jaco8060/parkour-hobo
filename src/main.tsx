import { Devvit, useState, useWebView } from "@devvit/public-api";
import "./createPost.tsx";
import type { DevvitMessage, WebViewMessage } from "./message.ts";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

const App: Devvit.CustomPostComponent = (context) => {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 }); // Fixed initial state

  const { mount, postMessage } = useWebView<WebViewMessage, DevvitMessage>({
    url: "page.html",
    onMessage: (message) => {
      if (message.type === "webViewReady") {
        postMessage({ type: "startGame" });
      } else if (message.type === "positionUpdate") {
        setPosition(message.data);
        context.redis.set(
          `position_${context.userId}`,
          JSON.stringify(message.data)
        );
      }
    },
    onUnmount: () => {
      context.ui.showToast("Game closed!");
    },
  });

  return (
    <vstack alignment="center middle" gap="medium" height="100%">
      <button onPress={mount}>Play 3D Keyboard Game</button>
      <text>
        Position: X: {position.x.toFixed(1)}, Y: {position.y.toFixed(1)}, Z:{" "}
        {position.z.toFixed(1)}
      </text>
    </vstack>
  );
};

Devvit.addCustomPostType({
  name: "KeyboardTest",
  description: "Move a 3D cube with WASD and Space!",
  height: "tall",
  render: App,
});

export default Devvit;
