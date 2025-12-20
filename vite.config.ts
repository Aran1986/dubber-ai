
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from the system (Vercel)
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" TypeScript error in the config environment.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This injects the API_KEY from Vercel's Environment Variables into the code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Provide a fallback for other process.env checks
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
