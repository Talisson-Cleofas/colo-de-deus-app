import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins:[react()], server:{ port:Number(env.WEB_PORT || 5173), strictPort:true, host:'0.0.0.0' }, preview:{port:Number(env.WEB_PORT || 5173),host:'0.0.0.0'} };
});
