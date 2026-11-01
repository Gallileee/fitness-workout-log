import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    // `npm run demo` (mode "demo") replaces the real Supabase client with an
    // in-memory one with sample data, so the UI works without a Supabase project.
    alias:
      mode === 'demo'
        ? [
            {
              find: /^(\.\.?\/)+supabaseClient(\.js)?$/,
              replacement: fileURLToPath(new URL('./src/demo/demoSupabaseClient.js', import.meta.url)),
            },
          ]
        : [],
  },
}))
