import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
// import { VitePWA } from 'vite-plugin-pwa';

// const manifestForPlugin = {
//   registerType: 'prompt',
//   manifest: {
//     name: 'Find-your-beauty',
//     short_name: 'find-your-beauty',
//     description: 'Shop your favorite clothes without leaving your house.',
//     icons: [
//       {
//         src: 'favicon.svg',
//         sizes: 'any',
//         type: 'image/svg+xml',
//       },
//       {
//         src: 'logo-192x192.svg',
//         type: 'image/svg+xml',
//         sizes: '192x192',
//         purpose: 'any maskable',
//       },
//       {
//         src: 'logo-512x512.svg',
//         type: 'image/svg+xml',
//         sizes: '512x512',
//         purpose: 'any maskable',
//       },
//     ],
//     display: 'standalone',
//     theme_color: '#000000',
//     background_color: '#ffffff',
//     scope: '/',
//     start_url: '/',
//     orientation: 'portrait',
//   },
// };

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // VitePWA(manifestForPlugin),
  ],
});
