// Configuration constants for the builder

// Block types
const BLOCK_TYPES = {
    PLATFORM: {
        type: "platform",
        color: 0x888888,
        size: {
            width: 2,
            height: 0.5,
            depth: 2
        }
    },
    START: {
        type: "start",
        color: 0x00ff00,
        size: {
            width: 2,
            height: 0.5,
            depth: 2
        }
    },
    FINISH: {
        type: "finish",
        color: 0xff0000,
        size: {
            width: 2,
            height: 0.5,
            depth: 2
        }
    }
};

// Camera settings
const CAMERA_SETTINGS = {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000,
    DEFAULT_POSITION: {
        x: 0,
        y: 10,
        z: 20
    }
};

// Builder settings
const BUILDER_SETTINGS = {
    CAMERA_SPEED: 0.2,
    SPRINT_MULTIPLIER: 3,
    CAMERA_ROTATION_SPEED: 0.02,
    REMOVAL_RANGE: 10,
    GRID_SIZE: 1, // Snap to grid
    MAX_BLOCKS: 100,
    GROUND_SIZE: 50,
    PLACEMENT_HEIGHT: 0.5 // Half the height of platform
};

// Course templates
const COURSE_TEMPLATES = {
    SMALL: {
        ground: {
            size: 30,
            position: { x: 0, y: 0, z: 0 }
        }
    },
    MEDIUM: {
        ground: {
            size: 50,
            position: { x: 0, y: 0, z: 0 }
        }
    },
    LARGE: {
        ground: {
            size: 100,
            position: { x: 0, y: 0, z: 0 }
        }
    }
};

// Storage keys
const STORAGE_KEYS = {
    SAVED_COURSE: "parkour_hobo_saved_course",
    BUILDER_TEMPLATE: "parkour_hobo_builder_template",
    LAST_MODE: "parkour_hobo_last_mode"
};

// Game modes
const GAME_MODES = {
    BUILDER: "builder",
    PREVIEW: "preview"
}; 