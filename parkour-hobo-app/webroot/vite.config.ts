import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Point to the source directory within webroot
  root: 'src',
  // Set the base URL for assets relative to the webroot
  base: './',
  build: {
    // Output directory relative to the webroot folder
    outDir: '../dist',
    // Generate source maps for easier debugging
    sourcemap: true,
    // Empty the output directory before building
    emptyOutDir: true,
    lib: {
        // The entry point for the web view bundle
        entry: resolve(__dirname, 'src/script.ts'),
        // Output format
        formats: ['es'], // ES Module format for <script type="module">
        // The name of the output file
        fileName: 'script'
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // (Not needed for 'three' as we want it bundled)
      // external: [],
      output: {
        // Provide global variables to use in the UMD build
        // (Not strictly needed for ES format, but good practice)
        // globals: {},
      },
    },
  },
});

