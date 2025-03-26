# Parkour Hobo Course Builder

A standalone course builder for Parkour Hobo, built with TypeScript and Three.js.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Automatic Deployment

This project is set up with GitHub Actions to automatically deploy to GitHub Pages when you push to the main branch. To enable this:

1. Push your code to a GitHub repository
2. Go to your repository settings
3. Navigate to "Pages" section
4. Under "Build and deployment", select the "GitHub Actions" option
5. Make sure the repository has "Actions" enabled under the "Actions" tab

The GitHub Actions workflow will:
1. Install dependencies
2. Build the project
3. Deploy the contents of the `dist` directory to the `gh-pages` branch
4. GitHub Pages will then serve your site from the `gh-pages` branch

### Manual Deployment

If you prefer to deploy manually:

```bash
# Build the project
npm run build

# Deploy to GitHub Pages
npm run deploy
```

This will publish the `dist` directory to the `gh-pages` branch of your repository.

## Usage

1. Use the builder to create courses
2. Export course data using the "Export" button
3. Copy the generated JSON string
4. Use this JSON in the main Parkour Hobo game 