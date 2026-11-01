import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import authRoutes from './src/routes/auth.js';
import healthRoutes from './src/routes/health.js';
import uploadRoutes from './src/routes/upload.js';
import apiRoutes from './src/routes/api.js';
import tasksRoutes from './src/routes/tasks.js';
import dietRoutes from './src/routes/diet.js';
import chatRoutes from './src/routes/chat.js';
import medicationRoutes from './src/routes/medication.js';
import { initDb } from './src/db/init.js';
import { initChatWebSocket } from './src/chatSocket.js';

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Express and WebSockets
const server = http.createServer(app);

// Initialize Chat WebSocket
const wss = initChatWebSocket(server);

// Friendly startup errors (e.g. port already in use) instead of an
// unhandled 'error' crash. Note: ws forwards http-server errors to the
// WebSocketServer, so both emitters need listeners.
function handleListenError(err) {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${PORT} is already in use. Stop the other process or run with a different port (e.g. $env:PORT=5001; npm run dev).`);
    process.exit(1);
  }
  console.error('[Server Error]', err);
  process.exit(1);
}
server.on('error', handleListenError);
wss.on('error', (err) => {
  // EADDRINUSE is already reported by the http server handler above; just avoid the unhandled throw.
  if (!err || err.code !== 'EADDRINUSE') {
    console.error('[WebSocket Server Error]', err);
  }
});

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
app.use('/api/medication', medicationRoutes);
app.use('/api', apiRoutes);

// Initialize database (create if missing, migrate, and seed) then start server
initDb().catch((err) => {
  console.error('[Server Error] Database initialization failed:', err);
}).finally(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
