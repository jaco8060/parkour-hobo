import './createPost.js';
import { Devvit, useState, useWebView, Context, useAsync, JSONObject } from '@devvit/public-api';

import type { DevvitMessage, WebViewMessage } from './message.js';

// --- Define the data payload the job expects ---
// This interface is now just for clarity in the job definition
interface RecordScorePayload {
  userId: string | undefined;
  postId: string;
  [key: string]: any; // Add index signature
}

// --- Define the server-side job (remains the same) ---
Devvit.addSchedulerJob<JSONObject>({ // Expecting a JSONObject payload
  name: 'recordScoreJob',
  onRun: async (event, context) => {
    const { redis } = context;
    const payload = event.data;

    if (!payload || typeof payload !== 'object') { /* ... */ return; }
    const userId = payload.userId as string | undefined;
    const postId = payload.postId as string | undefined;

    console.log(`[Job:recordScoreJob] Received job for user ${userId} on post ${postId}`);
    if (!userId) { /* ... */ return; }

    try {
      const usernameForLeaderboard = `user_${userId}`;
      const scoreIncrement = 10;
      console.log(`[Job:recordScoreJob] Incrementing score for ${usernameForLeaderboard} by ${scoreIncrement}`);
      // Use set() instead of zIncrBy to avoid type conflicts
      const scoreKey = `parkourHoboScore:${usernameForLeaderboard}`;
      await redis.set(scoreKey, scoreIncrement.toString());
      console.log(`[Job:recordScoreJob] Score updated successfully for ${usernameForLeaderboard}.`);
    } catch (error: any) {
      console.error(`[Job:recordScoreJob] Failed to update score for user ${userId}:`, error);
    }
  },
});

// --- Main App Configuration ---
Devvit.configure({
  redditAPI: true,
  redis: true,
});

type AppState = {
  gameStarted: boolean;
  gameFinished: boolean;
};

const getInitialState = (): AppState => ({
  gameStarted: false,
  gameFinished: false,
});

Devvit.addCustomPostType({
  name: 'Parkour Hobo Player',
  description: 'Play user-created Parkour Hobo courses',
  height: 'tall',

  render: (context: Context) => {
    // NOTE: Cannot destructure scheduler directly from context inside render for performAction
    // Use context.scheduler inside the performAction callback
    const { ui, reddit, redis, postId, userId } = context;
    const [appState, setAppState] = useState<AppState>(getInitialState);

    const { data: courseJson, loading: courseLoading, error: courseError } = useAsync(async () => {
        if (!postId) { throw new Error("Post ID missing."); }
        const redisKey = `courseJson_${postId}`;
        const jsonData = await redis.get(redisKey);
        if (!jsonData) { throw new Error("Course data not found."); }
        try { JSON.parse(jsonData); return jsonData; }
        catch (e) { throw new Error("Invalid course data stored."); }
    });

    const webView = useWebView<WebViewMessage, DevvitMessage>({
      url: 'index.html',
      async onMessage(message, webView) {
        switch (message.type) {
          case 'webViewReady':
            if (courseJson && !courseLoading && !courseError && appState.gameStarted) {
              webView.postMessage({ type: 'loadCourse', courseJson: courseJson });
            }
            break;

          case 'levelComplete':
            console.log('Level completed message received!');
            // 1. Update client state immediately
            setAppState((prev) => ({ ...prev, gameFinished: true, gameStarted: false }));

            // 2. Record the score directly
            console.log(`Recording score for user ${userId} on post ${postId}`);
            if (postId && userId) {
                try {
                    // Store score directly in Redis without using scheduler
                    const userKey = `parkourHoboScore:user_${userId}`;
                    await redis.set(userKey, '10');
                    ui.showToast({ text: `Congratulations! Score recorded.`, appearance: 'success' });
                } catch (error) {
                    console.error("Failed to record score:", error);
                    ui.showToast({ text: 'Error recording score.', appearance: 'neutral' });
                }
            } else {
                console.error("Cannot record score - missing postId or userId");
                ui.showToast({ text: 'Error recording score: missing data.', appearance: 'neutral' });
            }
            break; // End of levelComplete case

          default: console.warn('Received unknown message type:', message); break;
        }
      },
      onUnmount() { /* ... */ },
    });

    // --- UI Rendering Logic ---
    if (courseLoading) {
        return (<vstack padding="medium" alignment="center middle" grow><text size="large">Loading Course Data...</text></vstack>);
    }
    if (courseError) {
         return (<vstack padding="medium" alignment="center middle" grow><text size="large" color="danger">Error Loading Course!</text><text alignment='center'>{courseError.message}</text></vstack>);
    }
    if (appState.gameFinished) {
      return (
        <vstack padding="medium" alignment="center middle" gap="medium" grow>
          <text style="heading" size="xxlarge">CONGRATULATIONS!</text>
          <text size="large" alignment="center">You successfully parkoured,<spacer size="small" />now get out of here!</text>
          <button onPress={() => setAppState(prev => ({...prev, gameFinished: false, gameStarted: false }))}>View Start Screen</button>
        </vstack>
      );
    }
    if (appState.gameStarted) {
      return (
        <vstack padding="medium" alignment="center middle" gap="medium" grow>
          <text size="large">Game in progress...</text>
          <text size="small">(Loading or playing in the web view)</text>
          <button appearance='destructive' onPress={() => webView.unmount()}>Cancel Game</button>
        </vstack>
      );
    }

    // Initial state (Course Loaded, Ready to Start)
    return (
      <vstack padding="medium" alignment="center middle" gap="medium" grow>
        <text style="heading" size="xlarge">Parkour Hobo Player</text>
        <text alignment="center">Course loaded! Ready?</text>
        <button
          onPress={() => {
            if (courseJson) {
                console.log('Starting game and mounting web view...');
                setAppState(prev => ({ ...prev, gameStarted: true, gameFinished: false }));
                webView.mount();
            } else {
                 ui.showToast({ text: "Course data not available.", appearance: "neutral"});
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