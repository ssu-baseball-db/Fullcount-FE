import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 개발 중 /api 로 시작하는 요청은 스프링부트(8080)로 넘겨준다.
    // 덕분에 프론트 코드에서는 '/api/...' 처럼 짧게 쓰면 되고, CORS 문제도 생기지 않는다.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
