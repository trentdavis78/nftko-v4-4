import express from 'express';
import pkg from 'body-parser';
import cors from 'cors';
import { router as apiRoutes } from './routes/api.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const { json, urlencoded } = pkg;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(json());
app.use(urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/generated', express.static(path.join(__dirname, '../public/generated')));

// Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});