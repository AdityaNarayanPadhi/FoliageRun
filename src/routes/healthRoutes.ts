import { Router, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { config } from '../config';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const sentryInitialized = Sentry.isInitialized();
  let llmConnected = false;
  let llmMessage = 'Offline fallback mode active (no live Groq/HF API key configured)';

  const hasApiKey =
    config.llm.apiKey &&
    !config.llm.apiKey.startsWith('mock-') &&
    !config.llm.apiKey.startsWith('gsk_your_');

  if (hasApiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Lightweight check of models endpoint
      const response = await fetch(`${config.llm.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.llm.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        llmConnected = true;
        llmMessage = `Connected to LLM provider (${config.llm.baseUrl})`;
      } else {
        llmMessage = `LLM endpoint returned HTTP ${response.status}`;
      }
    } catch (err: any) {
      llmMessage = `LLM connection check failed: ${err?.message || 'Network error'}`;
    }
  }

  const isHealthy = true; // Service operates fully with deterministic fallbacks

  res.status(200).json({
    status: llmConnected || !hasApiKey ? 'healthy' : 'degraded',
    service: 'FoliageRun Route Generator',
    challenge: 'Hacktoberfest 2026 Touch Grass',
    timestamp: new Date().toISOString(),
    sentry: {
      initialized: sentryInitialized,
      environment: config.sentry.environment,
      hasDsn: Boolean(config.sentry.dsn),
    },
    llm: {
      provider: config.llm.baseUrl.includes('groq') ? 'Groq' : 'Hugging Face / OpenAI-Compatible',
      model: config.llm.modelName,
      connected: llmConnected,
      message: llmMessage,
    },
    tools: {
      serpApiConfigured: Boolean(config.serpApi.apiKey && !config.serpApi.apiKey.startsWith('your_')),
      overpassEndpoint: config.overpass.apiUrl,
    },
  });
});

export default router;
