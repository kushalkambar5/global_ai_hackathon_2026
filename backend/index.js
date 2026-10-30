import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './src/routes/auth.js';
import healthRoutes from './src/routes/health.js';
import uploadRoutes from './src/routes/upload.js';
import apiRoutes from './src/routes/api.js';
import tasksRoutes from './src/routes/tasks.js';
import dietRoutes from './src/routes/diet.js';
import chatRoutes from './src/routes/chat.js';
import { initDb } from './src/db/init.js';

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', apiRoutes);

// Initialize database (create if missing, migrate, and seed) then start server
initDb().catch((err) => {
  console.error('[Server Error] Database initialization failed:', err);
}).finally(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
