import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import prerender from 'vite-plugin-prerender';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    prerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: ['/', '/address-please'],
      renderer: '@prerenderer/renderer-puppeteer',
      postProcess(renderedRoute) {
        // Clean up routes
        renderedRoute.html = renderedRoute.html.replace(/<script (.*?)>/gi, '<script $1 defer>');
        return renderedRoute;
      },
    }),
  ],
});
