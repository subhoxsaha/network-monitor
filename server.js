import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Import handlers manually since Vercel does this automatically in production
import trailsHandler from './api/trails.js';
import activeUsersHandler from './api/users/active.js';
import pingHandler from './api/users/ping.js';

// Wrap Vercel lambda handlers to work with Express locally
const wrapHandler = (handler) => async (req, res) => {
  return handler(req, res);
};

app.get('/api/users/active', wrapHandler(activeUsersHandler));
app.put('/api/users/ping', wrapHandler(pingHandler));
app.post('/api/trails', wrapHandler(trailsHandler));
app.put('/api/trails', wrapHandler(trailsHandler));
app.get('/api/trails', wrapHandler(trailsHandler));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server listening on 0.0.0.0:${PORT}`);
});
