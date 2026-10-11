import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { foliageRouteAgent } from '../mastra/agent';
import { routeStore } from '../storage/routeStore';
import { routeGenerateRequestSchema } from '../types/route';
import { generateGpxXml } from '../utils/gpx';

/**
 * Controller handling route generation and GPX downloads.
 */
export class RouteController {
  /**
   * POST /api/routes/generate
   */
  public static async generateRoute(req: Request, res: Response): Promise<void> {
    const parseResult = routeGenerateRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    try {
      const generated = await foliageRouteAgent.generateRoute(parseResult.data);
      const routeId = routeStore.save(generated);

      res.setHeader('X-Route-Id', routeId);
      res.status(200).json({
        ...generated,
        routeId,
      });
    } catch (error: any) {
      Sentry.captureException(error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate foliage route',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/routes/download-gpx
   * Supports ?routeId=... or raw GPX retrieval
   */
  public static async downloadGpx(req: Request, res: Response): Promise<void> {
    const routeId = req.query.routeId as string | undefined;
    const rawGpx = req.query.gpx as string | undefined;

    if (rawGpx) {
      res.setHeader('Content-Type', 'application/gpx+xml');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="foliagerun-route.gpx"'
      );
      res.status(200).send(rawGpx);
      return;
    }

    if (!routeId) {
      res.status(400).json({
        success: false,
        error: 'Missing routeId or gpx query parameter',
      });
      return;
    }

    const stored = routeStore.get(routeId);
    if (!stored) {
      res.status(404).json({
        success: false,
        error: 'Route not found or expired',
      });
      return;
    }

    const filename = `${stored.response.routeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.gpx`;

    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(stored.response.gpxData);
  }
}
