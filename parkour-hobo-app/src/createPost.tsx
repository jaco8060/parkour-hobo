// src/createPost.tsx
import { Devvit, Context } from '@devvit/public-api';

// Define the form structure and submission handler
const createCourseForm = Devvit.createForm(
  {
    title: "Create Parkour Hobo Post",
    fields: [
      {
        name: 'courseJson',
        label: 'Paste Course JSON Code',
        type: 'paragraph', // Suitable for large JSON text
        required: true,
        placeholder: '{"id": "...", "name": "...", "blocks": [...], ...}',
      },
      {
        name: 'postTitle',
        label: 'Post Title',
        type: 'string',
        required: true,
        defaultValue: 'Parkour Hobo Challenge!',
      }
    ],
    acceptLabel: 'Create Post',
  },
  // onSubmit Handler - runs after user submits the form
  async (event, context: Context) => {
    const { ui, reddit, redis } = context;
    const courseJsonString = event.values.courseJson as string;
    const postTitle = event.values.postTitle as string;

    // 1. Validate JSON
    try {
      JSON.parse(courseJsonString); // Check if it's valid JSON
      console.log("Course JSON is valid.");

      // 2. Submit the Post (get postId first)
      const subreddit = await reddit.getCurrentSubreddit();
      const post = await reddit.submitPost({
        title: postTitle,
        subredditName: subreddit.name,
        // Preview is shown while post + data are being set up
        preview: (
          <vstack height="100%" width="100%" alignment="middle center">
            <text size="large">Creating Parkour Course...</text>
          </vstack>
        ),
      });
      const postId = post.id;
      console.log(`Post created with ID: ${postId}`);

      // 3. Store JSON in Redis using the postId as part of the key
      const redisKey = `courseJson_${postId}`;
      await redis.set(redisKey, courseJsonString);
      console.log(`Stored course JSON in Redis under key: ${redisKey}`);

      // 4. Notify user and navigate
      ui.showToast({ text: 'Created Parkour Hobo post!' });
      ui.navigateTo(post); // Navigate to the newly created post

    } catch (e: any) {
      console.error("Invalid JSON submitted:", e.message);
      ui.showToast({ text: `Invalid Course JSON: ${e.message}`, appearance: 'neutral' });
      // Optional: You could re-show the form here if needed, but a toast might be sufficient
    }
  }
);

// Modify the Menu Item to show the form instead of directly submitting
Devvit.addMenuItem({
  label: 'Create Parkour Hobo Post',
  location: 'subreddit',
  onPress: async (_event, context: Context) => {
    // Show the form defined above
    context.ui.showForm(createCourseForm);
  },
});

// No need to export default here if only menu items/forms are defined