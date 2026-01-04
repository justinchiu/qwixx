import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClientToServerEvents, ServerToClientEvents } from '@qwixx/shared';
import { setupHandlers } from './handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: isProduction ? undefined : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

setupHandlers(io);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files in production
if (isProduction) {
  // __dirname is /app/packages/server/dist in Docker
  // client dist is at /app/packages/client/dist
  const clientDist = path.join(__dirname, '../../client/dist');
  console.log('Serving static files from:', clientDist);
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Qwixx server running on port ${PORT}`);
});
