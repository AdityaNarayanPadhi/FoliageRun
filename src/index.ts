import 'dotenv/config';
import * as Sentry from '@sentry/node';

// Initialize Sentry telemetry right at entry point before importing route handlers
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'production',
  });
}


import path from 'path';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import healthRoutes from './routes/healthRoutes';
import routeRoutes from './routes/routeRoutes';

const app = express();

// Security and middleware setup
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Route-Id', 'Content-Disposition'],
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

// Multi-Page HTML Routes
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/live-foliage', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'live-foliage.html'));
});

app.get('/community', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'community.html'));
});

app.get('/about', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'about.html'));
});

// Config Endpoint Exposing Google Maps API Key to frontend
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    googleMapsApiKey: config.googleMaps.apiKey,
    city: 'Bhubaneswar, Odisha',
  });
});

// API Documentation & Info Route
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'FoliageRun Route Generator API (Bhubaneswar Edition)',
    tagline: 'Autumn running route generator built for Hacktoberfest 2026 Touch Grass challenge',
    version: '1.0.0',
    documentation: {
      endpoints: [
        {
          method: 'POST',
          path: '/api/routes/generate',
          description: 'Synthesizes an autumn loop running route matching target distance and foliage status in Bhubaneswar',
        },
        {
          method: 'GET',
          path: '/api/routes/download-gpx?routeId=:id',
          description: 'Downloads valid GPX 1.1 file for Strava, Garmin, and Apple Watch',
        },
        {
          method: 'GET',
          path: '/api/health',
          description: 'Health status and telemetry verification for all 4 environment variables',
        },
        {
          method: 'GET',
          path: '/api/config',
          description: 'Frontend configuration including Google Maps key',
        },
      ],
    },
  });
});

// Register Health & API Routes
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);
app.use('/api/routes', routeRoutes);

// Sentry error handler
Sentry.setupExpressErrorHandler(app);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[FoliageRun Error] ${req.method} ${req.url}:`, err);

  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred while processing the request',
    traceId: Sentry.getActiveSpan() ? Sentry.spanToJSON(Sentry.getActiveSpan()!) : undefined,
  });
});

// Start listening
let server: any = null;
if (require.main === module && process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`
=====================================================
  🍂 FoliageRun Backend Service Started! 🍂
  Bhubaneswar, Odisha Edition - Touch Grass
=====================================================
  * Port:         ${config.port}
  * Environment:  ${config.nodeEnv}
  * Model:        ${config.llm.modelName} (${config.llm.baseUrl})
  * Sentry DSN:   ${config.sentry.dsn ? 'Active' : 'Disabled (Local Spans Only)'}
  * Google Maps:  ${config.googleMaps.apiKey ? 'Configured' : 'Missing'}
  * SerpApi:      ${config.serpApi.apiKey ? 'Configured' : 'Missing'}
  * Endpoints:
      POST  /api/routes/generate
      GET   /api/routes/download-gpx
      GET   /api/health
      GET   /api/config
=====================================================
    `);
  });
}

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down FoliageRun gracefully...`);
  if (server) {
    server.close(async () => {
      await Sentry.flush(2000);
      console.log('HTTP server closed and Sentry flushed. Exiting.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
