import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: { port: Number(env.WEB_PORT || 5173), strictPort: true, host: '0.0.0.0' },
    preview: { port: Number(env.WEB_PORT || 5173), host: '0.0.0.0' },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase';
            if (id.includes('/@mui/') || id.includes('/@emotion/')) return 'vendor-mui';
            if (id.includes('/@tanstack/')) return 'vendor-query';
            if (id.includes('/react-router')) return 'vendor-router';
            return 'vendor';
          },
        },
      },
    },
  };
});
