import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initDb, getUploadsDirectory } from './server/db.js';
import { userRouter } from './server/routes/user.js';
import { adminRouter } from './server/routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Initialize SQLite database & seed
  initDb();
  console.log('✅ SQLite database initialized and pre-seeded.');

  // Serve static uploaded files (category icons & receipts)
  try {
    const uploadsCategoryDir = getUploadsDirectory();
    const uploadsBase = path.dirname(uploadsCategoryDir);
    app.use('/uploads', express.static(uploadsBase));
    app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  } catch (e) {
    console.warn('Could not bind uploads directory:', e);
  }

  // JSON and URL-encoded parsing (allow larger payload for receipt screenshot base64)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));


  // Mount API routers
  // User & Public API: /api
  app.use('/api', userRouter);
  // Admin Panel API: /api/admin
  app.use('/api/admin', adminRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'PakServices SMM Engine',
      timestamp: new Date().toISOString()
    });
  });

  // Catch-all 404 for unknown /api routes (prevents SPA HTML fallback on removed endpoints)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PakServices SMM Panel running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
