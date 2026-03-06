import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';

const manifestForPlugin = {
  registerType: 'prompt',
  includeAssests: ['favicon.ico', 'apple-touc-icon.png', 'masked-icon.svg'],
  manifest: {
    name: 'Find-your-beauty',
    short_name: 'find-your-beauty',
    description: 'Find beauty saloons near you',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'favicon',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'favicon',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'apple touch icon',
      },
      {
        src: '/maskable_icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: '#181818',
    background_color: '#e0cc3b',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    orientation: 'portrait',
  },
};

export default defineConfig({
  plugins: [react(), svgr(), VitePWA(manifestForPlugin)],
});
