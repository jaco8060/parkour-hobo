// /** @jsxImportSource @devvit/public-api */
import './createPost.js'; // This now just registers the menu item
import { Devvit, useState, useWebView, Context, useAsync } from '@devvit/public-api'; // Added useAsync

import type { DevvitMessage, WebViewMessage } from './message.js';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

type AppState = {
  // courseJson is now fetched, not stored directly in state initially
  gameStarted: boolean;
  gameFinished: boolean;
};

// Initial state no longer includes courseJson
const getInitialState = (): AppState => ({
  gameStarted: false,
  gameFinished: false,
});

Devvit.addCustomPostType({
  name: 'Parkour Hobo Player',
  description: 'Play user-created Parkour Hobo courses',
  height: 'tall',

  render: (context: Context) => {
    const { ui, reddit, redis, postId, userId } = context;
    const [appState, setAppState] = useState<AppState>(getInitialState);

    // --- Fetch Course JSON from Redis ---
    const { data: courseJson, loading: courseLoading, error: courseError } = useAsync(async () => {
        const redisKey = `courseJson_${postId}`;
        console.log(`Fetching course data from Redis key: ${redisKey}`);
        const jsonData = await redis.get(redisKey);
        if (!jsonData) {
            console.error(`No course data found in Redis for key: ${redisKey}`);
            throw new Error("Course data not found for this post.");
        }
        // Basic validation before returning
        try {
            JSON.parse(jsonData);
            console.log("Successfully fetched and validated course JSON from Redis.");
            return jsonData;
        } catch (parseError: any) {
             console.error("Invalid JSON data fetched from Redis:", parseError.message);
             throw new Error("Invalid course data stored for this post.");
        }
    }); // No dependencies needed, fetched once per post load

    // --- Web View Hook ---
    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'index.html',
      async onMessage(message, webView) {
        switch (message.type) {
          case 'webViewReady':
            // Check if JSON is loaded and game has been started by button press
            if (courseJson && !courseLoading && !courseError && appState.gameStarted) {
              console.log('Web view ready, sending fetched course data...');
              webView.postMessage({ type: 'loadCourse', courseJson: courseJson });
            } else {
                 console.log(`Web view ready, but courseJson not ready yet (loading: ${courseLoading}, error: ${!!courseError}) or game not started.`);
            }
            break;

          case 'levelComplete':
            console.log('Level completed!');
            setAppState((prev) => ({ ...prev, gameFinished: true, gameStarted: false })); // End game state
            try {
              const user = await reddit.getCurrentUser();
              const username = user?.username ?? `anon_${userId ?? 'unknown'}`;
              const scoreIncrement = 10;
              console.log(`Incrementing score for ${username} by ${scoreIncrement}`);
              // Use NUMBER for score increment
              await redis.zIncrBy('parkourHoboLeaderboard', scoreIncrement, username);
              ui.showToast({ text: `${username} completed! +${scoreIncrement} pts.`, appearance: 'success' });
            } catch (error: any) {
                console.error("Failed to update score:", error);
                ui.showToast({ text: 'Failed to record score.', appearance: 'neutral'});
            }
             // Optionally close web view on complete
             // webView.unmount();
            break;
          default: /* ... */ break;
        }
      },
      onUnmount() {
        console.log('Web view closed.');
        // Reset state if webview is closed manually
        setAppState(prev => ({ ...prev, gameStarted: false, gameFinished: false }));
      },
    });

    // --- UI Rendering ---

    // Handle Loading State
    if (courseLoading) {
        return (
            <vstack padding="medium" alignment="center middle" gap="medium" grow>
                <text size="large">Loading Course Data...</text>
            </vstack>
        );
    }

    // Handle Error State
    if (courseError) {
         return (
            <vstack padding="medium" alignment="center middle" gap="medium" grow>
                <text size="large" color="danger">Error Loading Course!</text>
                <text alignment='center'>{courseError.message}</text>
            </vstack>
        );
    }

    // Handle Game Finished State
    if (appState.gameFinished) {
      return (
        <vstack padding="medium" alignment="center middle" gap="medium" grow>
          <text style="heading" size="xxlarge" color="success">CONGRATULATIONS!</text>
          <text size="large" alignment="center">
            You successfully parkoured,
            <spacer size="small" />
            now get out of here!
          </text>
          {/* Reset to initial 'ready' state, not full reset */}
          <button onPress={() => setAppState(prev => ({...prev, gameFinished: false, gameStarted: false }))}>
            View Start Screen
          </button>
        </vstack>
      );
    }

    // Handle Game In Progress State
    if (appState.gameStarted) {
      return (
        <vstack padding="medium" alignment="center middle" gap="medium" grow>
          <text size="large">Game in progress...</text>
          <text size="small">(Loading or playing in the web view)</text>
          <button appearance='destructive' onPress={() => webView.unmount()}>
            Cancel Game
          </button>
        </vstack>
      );
    }

    // --- Initial state: Show Start Button (after data loaded successfully) ---
    return (
      <vstack padding="medium" alignment="center middle" gap="medium" grow>
        <text style="heading" size="xlarge">Parkour Hobo Player</text>
        <text alignment="center">Course loaded successfully!</text>
        <button
          onPress={() => {
            if (courseJson) { // Ensure JSON is actually loaded before starting
                console.log('Starting game and mounting web view...');
                setAppState(prev => ({ ...prev, gameStarted: true, gameFinished: false }));
                webView.mount(); // Mount the web view, it will request data via webViewReady
            } else {
                 ui.showToast({ text: "Course data still loading, please wait.", appearance: "neutral"});
            }
          }}
        >
          Start Game!
        </button>
      </vstack>
    );
  },
});

export default Devvit;