import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Bridge to handle Vercel-style API routes locally
const bridge = async (handlerPath, req, res) => {
  try {
    const absolutePath = path.resolve(__dirname, handlerPath);
    // Dynamic import the handler
    const module = await import(`file://${absolutePath}?update=${Date.now()}`);
    const handler = module.default;
    
    // Express req/res are compatible enough for these handlers
    // req.query is already handled by Express/Router
    
    await handler(req, res);
  } catch (err) {
    console.error(`\x1b[31m%s\x1b[0m`, `[Bridge Error] Failed to handle ${handlerPath}:`);
    console.error(err);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
};

// Routes
app.all('/api/trails', (req, res) => bridge('./api/trails.js', req, res));

// Fallback for any other api routes
app.all('/api/:path', (req, res) => {
  const handlerPath = `./api/${req.params.path}.js`;
  bridge(handlerPath, req, res);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\x1b[32m%s\x1b[0m`, `[API Server] Running on http://localhost:${PORT}`);
  console.log(`[API Server] Proxying requests from Vite (Port 3000) to /api/*`);
});
