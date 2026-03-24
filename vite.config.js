import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const manifestForPlugin = {
  registerType: 'prompt',
  manifest: {
    name: 'Crown-clothing',
    short_name: 'crown-clothing',
    description: 'Shop your favorite clothes without leaving your house.',
    icons: [
      {
        src: 'favicon.svg',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      {
        src: 'logo-192x192.svg',
        type: 'image/svg+xml',
        sizes: '192x192',
        purpose: 'any maskable',
      },
      {
        src: 'logo-512x512.svg',
        type: 'image/svg+xml',
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
