import { Devvit, useState, useWebView, useInterval, useAsync } from "@devvit/public-api";
import "./createPost.tsx";
import type { DevvitMessage, WebViewMessage } from "./message.ts";
import { addPaymentHandler, usePayments, OnPurchaseResult } from "@devvit/payments";

// Player ranking tiers
enum PlayerRank {
  ALLEY_ROOKIE = "Alley Rookie",
  GARBAGE_GOBLIN = "Garbage Goblin",
  DUMPSTER_DIVER = "Dumpster Diver",
  HOBO_HUSTLER = "Hobo Hustler",
  HOBO_LEGEND = "Hobo Legend"
}

// Calculate player rank based on elo points
function calculateRank(eloPoints: number): PlayerRank {
  if (eloPoints >= 1000) return PlayerRank.HOBO_LEGEND;
  if (eloPoints >= 750) return PlayerRank.HOBO_HUSTLER;
  if (eloPoints >= 500) return PlayerRank.DUMPSTER_DIVER;
  if (eloPoints >= 250) return PlayerRank.GARBAGE_GOBLIN;
  return PlayerRank.ALLEY_ROOKIE;
}

// Add payment handler for product purchases
addPaymentHandler({
  fulfillOrder: async (order, ctx) => {
    if (order.status !== 'PAID') {
      throw new Error('Payment was not completed successfully');
    }

    // Get the user's existing customizations
    const customizationsData = await ctx.redis.get(`player:${ctx.userId}:customizations`);
    let playerCustomizations = customizationsData ? JSON.parse(customizationsData) : [];

    // Add newly purchased items to the user's inventory
    for (const product of order.products) {
      if (!playerCustomizations.includes(product.sku)) {
        playerCustomizations.push(product.sku);
      }
    }

    // Save back to Redis
    await ctx.redis.set(`player:${ctx.userId}:customizations`, JSON.stringify(playerCustomizations));
    
    return { success: true };
  },
  
  refundOrder: async (order, ctx) => {
    // Handle refunds by removing purchased items from the user's inventory
    const customizationsData = await ctx.redis.get(`player:${ctx.userId}:customizations`);
    
    if (customizationsData) {
      let playerCustomizations = JSON.parse(customizationsData);
      
      // Remove refunded items
      for (const product of order.products) {
        playerCustomizations = playerCustomizations.filter((item: string) => item !== product.sku);
      }
      
      // Save back to Redis
      await ctx.redis.set(`player:${ctx.userId}:customizations`, JSON.stringify(playerCustomizations));
    }
  }
});

Devvit.configure({
  redditAPI: true,
  redis: true,
});

const App: Devvit.CustomPostComponent = (context) => {
  // Game state
  const [currentMenu, setCurrentMenu] = useState<"main" | "play" | "create" | "rank" | "leaderboard" | "customization" | "game">("main");
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0, onGround: true as boolean, animation: "idle" });
  const [playerElo, setPlayerElo] = useState(0);
  const [playerRank, setPlayerRank] = useState(PlayerRank.ALLEY_ROOKIE);
  const [courses, setCourses] = useState<{ id: string; name: string; creatorId: string; bestTime: number }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [courseName, setCourseName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<"small" | "medium" | "large">("medium");
  const [leaderboard, setLeaderboard] = useState<{ userId: string; username: string; elo: number; rank: PlayerRank }[]>([]);
  const [availableCustomizations, setAvailableCustomizations] = useState<{ id: string; name: string; type: string; isPremium: boolean; owned: boolean }[]>([]);

  // Initialize payments hook
  const payments = usePayments((result) => {
    // Just handle the result generally without checking specific status values
    try {
      // Refresh the player's customizations after purchase attempt
      context.redis.get(`player:${context.userId}:customizations`).then(data => {
        const playerCustomizations = data ? JSON.parse(data) : [];
        
        const updatedCustomizations = availableCustomizations.map(item => ({
          ...item,
          owned: playerCustomizations.includes(item.id)
        }));
        
        setAvailableCustomizations(updatedCustomizations);
        
        // Show a toast message
        context.ui.showToast({
          text: `Purchase processed. Check your inventory.`,
          appearance: "success"
        });
      });
    } catch (error) {
      context.ui.showToast({
        text: `Error processing purchase.`,
        appearance: "neutral"
      });
    }
  });

  // Load initial data using useAsync instead of useState for async operations
  useAsync(async () => {
    // Load player data
    const playerEloStr = await context.redis.get(`player:${context.userId}:elo`);
    const newPlayerElo = playerEloStr ? parseInt(playerEloStr) : 0;
    setPlayerElo(newPlayerElo);
    setPlayerRank(calculateRank(newPlayerElo));

    // Load courses
    const coursesData = await context.redis.get(`courses`);
    if (coursesData) {
      setCourses(JSON.parse(coursesData));
    }

    // Load leaderboard
    const leaderboardData = await context.redis.get(`leaderboard`);
    if (leaderboardData) {
      setLeaderboard(JSON.parse(leaderboardData));
    }

    // Load customizations
    const customizationsData = await context.redis.get(`player:${context.userId}:customizations`);
    const playerCustomizations = customizationsData ? JSON.parse(customizationsData) : [];
    
    // Some default customizations with SKUs matching products.json
    const defaultCustomizations = [
      { id: "hobo_cape", name: "Hobo Cape", type: "accessory", isPremium: true, owned: false },
      { id: "cool_shades", name: "Cool Shades", type: "accessory", isPremium: true, owned: false },
      { id: "cardboard_armor", name: "Cardboard Armor", type: "outfit", isPremium: true, owned: false },
      { id: "extra_life", name: "Extra Life", type: "powerup", isPremium: true, owned: false },
      { id: "hat", name: "Tin Foil Hat", type: "headwear", isPremium: false, owned: true },
      { id: "shoes", name: "Mismatched Shoes", type: "footwear", isPremium: false, owned: true }
    ];
    
    // Merge owned customizations with defaults
    const mergedCustomizations = defaultCustomizations.map(item => {
      const owned = playerCustomizations.includes(item.id);
      return { ...item, owned };
    });
    
    setAvailableCustomizations(mergedCustomizations);
    
    return "Data loaded"; // Return a value to satisfy JSON requirement
  });

  // Web view setup
  const { mount, postMessage } = useWebView<WebViewMessage, DevvitMessage>({
    url: "page.html",
    onMessage: async (message) => {
      if (message.type === "webViewReady") {
        postMessage({ type: "startGame" });
      } else if (message.type === "positionUpdate") {
        setPlayerPosition(message.data as typeof playerPosition);
        // We don't need to store every position update in Redis
      } else if (message.type === "courseComplete") {
        // Update course completion data
        const { courseId, time } = message.data;
        const courseData = courses.find(c => c.id === courseId);
        
        if (courseData) {
          // If this is a new best time, update it
          if (!courseData.bestTime || time < courseData.bestTime) {
            const updatedCourses = courses.map(c => 
              c.id === courseId ? { ...c, bestTime: time } : c
            );
            setCourses(updatedCourses);
            
            // Update Redis
            await context.redis.set(`courses`, JSON.stringify(updatedCourses));
            
            // Update player ELO (more points for faster times)
            const eloGain = Math.floor(100 - (time / 10));
            const newElo = playerElo + eloGain;
            setPlayerElo(newElo);
            setPlayerRank(calculateRank(newElo));
            
            // Update Redis with new ELO
            await context.redis.set(`player:${context.userId}:elo`, newElo.toString());
            
            // Update leaderboard
            const currentUser = await context.reddit.getCurrentUser();
            const username = currentUser?.username || "Unknown";
            
            // Create a new entry with correct userId type
            const newEntry = { 
              userId: context.userId || "", 
              username, 
              elo: newElo,
              rank: calculateRank(newElo)
            };
            
            const updatedLeaderboard = [...leaderboard, newEntry]
              .sort((a, b) => b.elo - a.elo)
              .slice(0, 20); // Keep top 20
            
            setLeaderboard(updatedLeaderboard);
            await context.redis.set(`leaderboard`, JSON.stringify(updatedLeaderboard));
            
            // Show congratulatory message
            context.ui.showToast({
              text: `Course completed! You gained ${eloGain} points!`,
              appearance: "success"
            });
          }
        }
        
        // Return to main menu
        setCurrentMenu("main");
      } else if (message.type === "courseCreated") {
        // Handle the newly created course data
        handleCreateCourse(message.data);
      } else if (message.type === "menuRequest") {
        // Handle menu navigation requests from web view
        if (message.data.menu === "createCourse") {
          setCurrentMenu("create");
        } else {
          setCurrentMenu(message.data.menu as "main" | "customization" | "leaderboard");
        }
      }
    },
    onUnmount: () => {
      setCurrentMenu("main");
      context.ui.showToast({ text: "Game closed!" });
    },
  });

  // Handler for creating a new course
  const handleCreateCourse = async (courseData: any) => {
    if (!courseName || courseName.trim() === "") {
      context.ui.showToast({ 
        text: "Please enter a course name", 
        appearance: "neutral" 
      });
      return;
    }
    
    // Generate a unique ID for the course
    const courseId = `course_${Date.now()}`;
    const newCourse = {
      id: courseId,
      name: courseName,
      creatorId: context.userId || "", // Ensure userId is never undefined
      bestTime: 0,
      data: courseData || {}
    };
    
    // Update courses list
    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    
    // Save to Redis
    await context.redis.set(`courses`, JSON.stringify(updatedCourses));
    
    // Clear form and navigate
    setCourseName("");
    setCurrentMenu("play");
    
    context.ui.showToast({ 
      text: "Course created successfully!", 
      appearance: "success" 
    });
  };

  // Handler for purchasing customizations
  const handlePurchaseItem = async (itemId: string) => {
    // Use the payments hook to process purchases
    const item = availableCustomizations.find(i => i.id === itemId);
    
    if (item && item.isPremium && !item.owned) {
      // Initiate purchase flow for premium items
      payments.purchase(itemId);
    } else if (item && !item.isPremium) {
      context.ui.showToast({ 
        text: "This item is already available for free!", 
        appearance: "neutral" 
      });
    } else if (item && item.owned) {
      context.ui.showToast({ 
        text: "You already own this item!", 
        appearance: "neutral" 
      });
    }
  };

  // Handler for starting the course builder
  const handleStartCourseBuilder = () => {
    if (!courseName || courseName.trim() === "") {
      context.ui.showToast({ 
        text: "Please enter a course name", 
        appearance: "neutral" 
      });
      return;
    }
    
    setCurrentMenu("game");
    mount();
    
    // Send message to start builder mode with the selected template
    postMessage({ 
      type: "startBuilder", 
      data: { 
        template: selectedTemplate 
      } 
    });
  };

  // Render the appropriate UI based on current menu
  const renderContent = () => {
    switch (currentMenu) {
      case "main":
        return (
          <vstack padding="medium" gap="large" cornerRadius="medium" alignment="center middle">
            <text size="xxlarge" weight="bold" color="#FF5500">PARKOUR HOBO</text>
            {/* Using placeholder dimensions for the image */}
            <image url="hobo_logo.png" imageWidth={200} imageHeight={200} />
            <vstack gap="medium" width="80%">
              <button onPress={() => setCurrentMenu("play")} appearance="primary">Play Game</button>
              <button onPress={() => setCurrentMenu("create")} appearance="secondary">Create a Challenge</button>
              <button onPress={() => setCurrentMenu("rank")} appearance="secondary">My Rank</button>
              <button onPress={() => setCurrentMenu("leaderboard")} appearance="secondary">Leaderboard</button>
              <button onPress={() => setCurrentMenu("customization")} appearance="secondary">Customization</button>
            </vstack>
          </vstack>
        );
        
      case "play":
        return (
          <vstack padding="medium" gap="medium" cornerRadius="medium">
            <hstack alignment="center middle">
              <button onPress={() => setCurrentMenu("main")} appearance="secondary">← Back</button>
              <text size="xlarge" weight="bold" grow>Select Course</text>
            </hstack>
            <vstack gap="small" padding="small">
              {courses.length === 0 ? (
                <text>No courses available. Create one first!</text>
              ) : (
                courses.map(course => (
                  <hstack key={course.id} gap="small" padding="small" backgroundColor={selectedCourse === course.id ? "#444" : "#333"} cornerRadius="small">
                    <vstack grow>
                      <text weight="bold">{course.name}</text>
                      <text size="small">Best Time: {course.bestTime ? `${course.bestTime.toFixed(2)}s` : "Not completed"}</text>
                    </vstack>
                    <button 
                      onPress={() => {
                        setSelectedCourse(course.id);
                        setCurrentMenu("game");
                        mount();
                      }} 
                      appearance="primary"
                    >
                      Play
                    </button>
                  </hstack>
                ))
              )}
            </vstack>
          </vstack>
        );
        
      case "create":
        return (
          <vstack padding="medium" gap="medium" cornerRadius="medium">
            <hstack alignment="center middle">
              <button onPress={() => setCurrentMenu("main")} appearance="secondary">← Back</button>
              <text size="xlarge" weight="bold" grow>Create New Course</text>
            </hstack>
            <text>Give your parkour challenge a name:</text>
            {/* Simplified course creation without complex input handling */}
            <vstack padding="medium" backgroundColor="#333" cornerRadius="medium">
              <text size="large" weight="bold">{courseName || "No Name Selected"}</text>
              <hstack gap="small" alignment="center middle">
                <button 
                  onPress={() => setCourseName("Easy City Run")} 
                  appearance="secondary"
                >
                  Easy City Run
                </button>
                <button 
                  onPress={() => setCourseName("Rooftop Challenge")} 
                  appearance="secondary"
                >
                  Rooftop Challenge
                </button>
              </hstack>
              <hstack gap="small" alignment="center middle" padding="small">
                <button 
                  onPress={() => setCourseName("Garbage Gauntlet")} 
                  appearance="secondary"
                >
                  Garbage Gauntlet
                </button>
                <button 
                  onPress={() => setCourseName("Hobo's Hurdle")} 
                  appearance="secondary"
                >
                  Hobo's Hurdle
                </button>
              </hstack>
            </vstack>
            
            <text>Select course template size:</text>
            <hstack gap="medium" alignment="center middle">
              <button 
                onPress={() => setSelectedTemplate("small")} 
                appearance={selectedTemplate === "small" ? "primary" : "secondary"}
              >
                Small
              </button>
              <button 
                onPress={() => setSelectedTemplate("medium")} 
                appearance={selectedTemplate === "medium" ? "primary" : "secondary"}
              >
                Medium
              </button>
              <button 
                onPress={() => setSelectedTemplate("large")} 
                appearance={selectedTemplate === "large" ? "primary" : "secondary"}
              >
                Large
              </button>
            </hstack>
            
            <vstack gap="small" alignment="center">
              <button 
                onPress={handleStartCourseBuilder} 
                appearance="primary"
                disabled={!courseName || courseName.trim() === ""}
              >
                Build Course
              </button>
              <text size="small">You'll enter builder mode where you can design your course with platforms and obstacles.</text>
            </vstack>
          </vstack>
        );
        
      case "rank":
        return (
          <vstack padding="medium" gap="medium" cornerRadius="medium" alignment="center middle">
            <hstack alignment="center">
              <button onPress={() => setCurrentMenu("main")} appearance="secondary">← Back</button>
              <text size="xlarge" weight="bold" grow>My Rank</text>
            </hstack>
            <vstack gap="medium" padding="large" backgroundColor="#444" cornerRadius="large" alignment="center middle">
              <text size="xxlarge" weight="bold" color={
                playerRank === PlayerRank.HOBO_LEGEND ? "#FFD700" :
                playerRank === PlayerRank.HOBO_HUSTLER ? "#C0C0C0" :
                playerRank === PlayerRank.DUMPSTER_DIVER ? "#CD7F32" :
                playerRank === PlayerRank.GARBAGE_GOBLIN ? "#228B22" :
                "#A9A9A9"
              }>
                {playerRank}
              </text>
              <text>ELO Points: {playerElo}</text>
              <vstack padding="medium" gap="small" cornerRadius="medium" backgroundColor="#333">
                <text size="small">Next Rank: {
                  playerRank === PlayerRank.ALLEY_ROOKIE ? PlayerRank.GARBAGE_GOBLIN :
                  playerRank === PlayerRank.GARBAGE_GOBLIN ? PlayerRank.DUMPSTER_DIVER :
                  playerRank === PlayerRank.DUMPSTER_DIVER ? PlayerRank.HOBO_HUSTLER :
                  playerRank === PlayerRank.HOBO_HUSTLER ? PlayerRank.HOBO_LEGEND :
                  "Maximum Rank Achieved!"
                }</text>
                {playerRank !== PlayerRank.HOBO_LEGEND && (
                  <text size="small">Points Needed: {
                    playerRank === PlayerRank.ALLEY_ROOKIE ? 250 - playerElo :
                    playerRank === PlayerRank.GARBAGE_GOBLIN ? 500 - playerElo :
                    playerRank === PlayerRank.DUMPSTER_DIVER ? 750 - playerElo :
                    1000 - playerElo
                  }</text>
                )}
              </vstack>
            </vstack>
            <text size="small" color="#888">Complete courses to earn more points and increase your rank!</text>
          </vstack>
        );
        
      case "leaderboard":
        return (
          <vstack padding="medium" gap="medium" cornerRadius="medium">
            <hstack alignment="center middle">
              <button onPress={() => setCurrentMenu("main")} appearance="secondary">← Back</button>
              <text size="xlarge" weight="bold" grow>Leaderboard</text>
            </hstack>
            <vstack gap="small" padding="small">
              {leaderboard.length === 0 ? (
                <text>No players on the leaderboard yet!</text>
              ) : (
                leaderboard.map((player, index) => (
                  <hstack key={player.userId} gap="small" padding="small" backgroundColor={player.userId === context.userId ? "#444" : "#333"} cornerRadius="small">
                    <text weight="bold" size="small">{index + 1}.</text>
                    <text grow>{player.username}</text>
                    <vstack alignment="end">
                      <text weight="bold" color={
                        player.rank === PlayerRank.HOBO_LEGEND ? "#FFD700" :
                        player.rank === PlayerRank.HOBO_HUSTLER ? "#C0C0C0" :
                        player.rank === PlayerRank.DUMPSTER_DIVER ? "#CD7F32" :
                        player.rank === PlayerRank.GARBAGE_GOBLIN ? "#228B22" :
                        "#A9A9A9"
                      }>
                        {player.rank}
                      </text>
                      <text size="small">{player.elo} pts</text>
                    </vstack>
                  </hstack>
                ))
              )}
            </vstack>
          </vstack>
        );
        
      case "customization":
        return (
          <vstack padding="medium" gap="medium" cornerRadius="medium">
            <hstack alignment="center middle">
              <button onPress={() => setCurrentMenu("main")} appearance="secondary">← Back</button>
              <text size="xlarge" weight="bold" grow>Customization</text>
            </hstack>
            <vstack gap="small" padding="small">
              {availableCustomizations.map(item => (
                <hstack key={item.id} gap="small" padding="small" backgroundColor="#333" cornerRadius="small">
                  <vstack grow>
                    <hstack gap="small">
                      <text weight="bold">{item.name}</text>
                      {item.isPremium && <text color="#FFD700" size="small">Premium</text>}
                    </hstack>
                    <text size="small">Type: {item.type}</text>
                  </vstack>
                  {item.owned ? (
                    <button 
                      appearance="primary"
                      disabled={true}
                    >
                      Owned
                    </button>
                  ) : (
                    <button 
                      onPress={() => handlePurchaseItem(item.id)} 
                      appearance={item.isPremium ? "primary" : "secondary"}
                    >
                      {item.isPremium ? "Buy" : "Free"}
                    </button>
                  )}
                </hstack>
              ))}
            </vstack>
          </vstack>
        );
        
      case "game":
        return (
          <vstack alignment="center middle" gap="medium" height="100%">
            <text size="large">Use WASD to move, Space to jump!</text>
            <text>
              Position: X: {playerPosition.x.toFixed(1)}, Y: {playerPosition.y.toFixed(1)}, Z: {playerPosition.z.toFixed(1)}
            </text>
            <text>Status: {playerPosition.onGround ? "On Ground" : "In Air"} ({playerPosition.animation})</text>
            <button onPress={() => setCurrentMenu("main")}>Return to Menu</button>
          </vstack>
        );
    }
  };

  return (
    <vstack height="100%">
      {renderContent()}
    </vstack>
  );
};

Devvit.addCustomPostType({
  name: "Parkour Hobo",
  description: "A 3D parkour game where you play as a hobo navigating the urban jungle!",
  height: "tall",
  render: App,
});

export default Devvit;
