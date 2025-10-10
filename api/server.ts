/**
 * local server entry file, for local development
 */
import app from './app.js';
import { createServer } from 'http';
import { websocketService } from './services/websocketService.js';
import { checkRedisConnection } from './lib/redis.js';
import './services/queueProcessors.js'; // Inicializa os processadores de fila

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

// Criar servidor HTTP
const server = createServer(app);

// Inicializar WebSocket
websocketService.initialize(server);

// Disponibilizar a instância do WebSocket para as rotas
app.set('websocketService', websocketService);

server.listen(PORT, async () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`WebSocket server initialized`);
  
  // Verificar conexão Redis
  try {
    await checkRedisConnection();
    console.log('Redis connection established');
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;