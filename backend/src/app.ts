import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './shared/swagger';
import { config } from './config';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get(['/health', '/api/health'], (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'Enterprise Inventory & Warehouse Management API',
      environment: config.nodeEnv,
    });
  });

  // Swagger Documentation
  setupSwagger(app);

  // Application API Routes
  app.use('/api', routes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
