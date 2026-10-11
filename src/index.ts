import path from 'path';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import healthRoutes from './routes/healthRoutes';
import routeRoutes from './routes/routeRoutes';

// Initialize Sentry telemetry before application boots
if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    tracesSampleRate: config.sentry.tracesSampleRate,
    environment: config.sentry.environment,
    integrations: [Sentry.expressIntegration()],
  });
} else {
  // Initialize mock/local tracer scope for offline resilience
  Sentry.init({
    tracesSampleRate: 1.0,
    environment: config.sentry.environment,
  });
}

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

// API Documentation & Info Route
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'FoliageRun Route Generator API',
    tagline: 'Autumn running route generator built for Hacktoberfest 2026 Touch Grass challenge',
    version: '1.0.0',
    documentation: {
      endpoints: [
        {
          method: 'POST',
          path: '/api/routes/generate',
          description: 'Synthesizes an autumn loop running route matching target distance and foliage status',
          bodyExample: {
            startLat: 40.785091,
            startLng: -73.968285,
            targetDistanceKm: 5.0,
            locationName: 'Central Park, New York',
          },
        },
        {
          method: 'GET',
          path: '/api/routes/download-gpx?routeId=:id',
          description: 'Downloads valid GPX 1.1 file for Strava, Garmin, and Apple Watch',
        },
        {
          method: 'GET',
          path: '/health',
          description: 'Health status, LLM provider connectivity, and Sentry telemetry verification',
        },
      ],
    },
  });
});

// Register API Routes
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
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, () => {
    console.log(`
=====================================================
  🍂 FoliageRun Backend Service Started! 🍂
  Hacktoberfest 2026 - Touch Grass Challenge
=====================================================
  * Port:         ${config.port}
  * Environment:  ${config.nodeEnv}
  * Model:        ${config.llm.modelName} (${config.llm.baseUrl})
  * Sentry DSN:   ${config.sentry.dsn ? 'Active' : 'Disabled (Local Spans Only)'}
  * Endpoints:
      POST  /api/routes/generate
      GET   /api/routes/download-gpx
      GET   /health
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
