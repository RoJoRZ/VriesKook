import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HelpMenu',
        short_name: 'HelpMenu',
        description: 'Samen kiezen, plannen en bijhouden wat jullie eten.',
        theme_color: '#1253a4',
        background_color: '#f4f7fc',
        display: 'standalone',
        lang: 'nl',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ]
});
