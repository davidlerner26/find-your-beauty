import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const manifestForPlugin = {
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'apple-touc-icon.png', 'masked-icon.svg'],
  manifest: {
    name: 'Crown-clothing',
    short_name: 'crown-clothing',
    description: 'Shop your favorite clothes without leaving your house.',
    icons: [
      {
        src: 'favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        src: 'logo-192x192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'any maskable',
      },
      {
        src: 'logo-512x512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any maskable',
      },
    ],
    display: 'standalone',
    theme_color: '#000000',
    background_color: '#ffffff',
    scope: '/',
    start_url: '/',
    orientation: 'portrait',
  },
};

export default defineConfig({
  plugins: [react(), VitePWA(manifestForPlugin)],
});
