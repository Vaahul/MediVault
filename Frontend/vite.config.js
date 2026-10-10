import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to Flask so cookies and PDFs work without CORS setup.
    proxy: { '/api': 'http://127.0.0.1:5001' },
  },
})
