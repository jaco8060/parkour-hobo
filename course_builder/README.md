# Parkour Hobo Course Builder

This is a standalone course builder for the Parkour Hobo Reddit game. Use this tool to create courses that can be exported and shared on Reddit.

## Features

- Build parkour courses with customizable blocks
- Support for three course sizes: small, medium, and large
- Real-time 3D visualization using Three.js
- Export courses as JSON code that can be shared on Reddit
- Auto-save to local storage
- Preview mode to test your courses

## How to Use

1. **Building Blocks**: Select a block type (platform, start, finish) and place it in the 3D environment.
2. **Tools**: Use the build tool to place blocks, remove tool to delete blocks, and camera tool to navigate.
3. **Course Size**: Choose between small, medium, and large course templates.
4. **Export**: When finished, export your course to get a code snippet that can be shared on Reddit.

## Controls

- **WASD**: Move camera horizontally
- **Q/E**: Move camera up/down
- **Shift**: Sprint (faster camera movement)
- **Right-click + drag**: Rotate camera
- **Left-click**: Place or remove block (depending on selected tool)
- **B**: Switch to build tool
- **R**: Switch to remove tool
- **C**: Switch to camera tool
- **1/2/3**: Select block type (platform/start/finish)
- **X**: Export course

## Requirements

- Each course must have exactly one start block
- Each course must have exactly one finish block
- Platforms can be placed as needed to create the course

## Sharing Courses

After creating a course, click the "Export Code" button to get a JSON string. This code can be posted to Reddit for others to play your course.

## Technical Details

This builder is built with:
- HTML5/CSS3/JavaScript
- Three.js for 3D rendering
- Local Storage for saving courses

The builder runs entirely in your browser and doesn't require a server to function. 