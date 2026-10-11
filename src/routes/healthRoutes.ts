import { Router, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { config } from '../config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const sentryStatus = Boolean(config.sentry.dsn || Sentry.isInitialized());
  const serpApiStatus = Boolean(config.serpApi.apiKey && !config.serpApi.apiKey.startsWith('your_'));
  const googleMapsStatus = Boolean(config.googleMaps.apiKey && !config.googleMaps.apiKey.startsWith('your_'));
  const groqStatus = Boolean(config.llm.apiKey && !config.llm.apiKey.startsWith('mock-'));

  res.status(200).json({
    status: 'healthy',
    city: 'Bhubaneswar, Odisha',
    sentry: sentryStatus,
    serpApi: serpApiStatus,
    googleMaps: googleMapsStatus,
    groq: groqStatus,
  });
});

export default router;
