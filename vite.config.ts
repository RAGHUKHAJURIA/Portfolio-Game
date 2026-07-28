import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js + the Rapier wasm blob are both large and both needed on the
    // first frame, so there is nothing useful to lazy-load here. Splitting
    // them into their own chunks still helps: they change far less often than
    // app code, so they stay cached across deploys.
    chunkSizeWarningLimit: 1800,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three)[\\/]/ },
            { name: 'rapier', test: /node_modules[\\/]@dimforge[\\/]/ },
          ],
        },
      },
    },
  },
  server: { host: true },
  preview: { host: true },
})
