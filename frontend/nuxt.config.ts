export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  devServer: {
    port: 3001,
  },
  css: ['~/assets/main.css'],
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },
});
