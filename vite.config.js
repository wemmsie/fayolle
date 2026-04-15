import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Local dev proxy for Vercel serverless functions
function vercelApiDev() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      // Load all env vars (including non-VITE_ ones) into process.env
      const env = loadEnv('', __dirname, '');
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        const route = req.url.split('?')[0];
        const filePath = resolve(__dirname, `.${route}.js`);

        try {
          const mod = await import(`${filePath}?t=${Date.now()}`);
          const handler = mod.default;

          // Parse body for POST
          if (req.method === 'POST') {
            const body = await new Promise((resolve) => {
              let data = '';
              req.on('data', (chunk) => data += chunk);
              req.on('end', () => resolve(data));
            });
            req.body = body ? JSON.parse(body) : {};
          }

          // Parse query params
          const url = new URL(req.url, `http://${req.headers.host}`);
          req.query = Object.fromEntries(url.searchParams);

          // Mock Vercel res methods
          let statusCode = 200;
          const headers = {};
          const mockRes = {
            status(code) { statusCode = code; return this; },
            setHeader(k, v) { headers[k] = v; return this; },
            json(data) {
              res.writeHead(statusCode, { ...headers, 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            },
            send(data) {
              res.writeHead(statusCode, headers);
              res.end(data);
            },
          };

          await handler(req, mockRes);
        } catch (e) {
          console.error('API handler error:', e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiDev()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'deets-please': resolve(__dirname, 'deets-please.html'),
      },
    },
  },
});
