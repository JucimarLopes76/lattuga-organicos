import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'admin-manifest.json'],
            manifest: {
                name: 'Lattuga Orgânicos',
                short_name: 'Lattuga',
                description: 'Loja de produtos orgânicos',
                theme_color: '#059669',
                background_color: '#fdf6e3',
                display: 'standalone',
                start_url: '/',
                icons: [
                    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
