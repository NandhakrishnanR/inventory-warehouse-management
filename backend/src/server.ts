import { createApp } from './app';
import { config } from './config';
import { prisma } from './shared/prisma';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`🚀 Enterprise ERP Backend running on http://localhost:${config.port}`);
  console.log(`📚 Swagger API Documentation available at http://localhost:${config.port}/api/docs`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database connections closed. Exiting process.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
