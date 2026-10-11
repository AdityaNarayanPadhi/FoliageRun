import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Central environment schema validated using Zod
export const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.string().default('development'),
  SENTRY_DSN: z.string().optional().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.string().default('1.0'),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  MODEL_NAME: z.string().default('gemma2-9b-it'),
  SERPAPI_API_KEY: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  OVERPASS_API_URL: z.string().default('https://overpass-api.de/api/interpreter'),
  OVERPASS_TIMEOUT_MS: z.string().default('15000'),
});

const parsedEnv = envSchema.parse(process.env);

export const config = {
  port: parseInt(parsedEnv.PORT, 10),
  nodeEnv: parsedEnv.NODE_ENV,
  city: 'Bhubaneswar, Odisha',
  sentry: {
    dsn: parsedEnv.SENTRY_DSN,
    tracesSampleRate: parseFloat(parsedEnv.SENTRY_TRACES_SAMPLE_RATE),
    environment: parsedEnv.SENTRY_ENVIRONMENT,
  },
  llm: {
    apiKey: parsedEnv.GROQ_API_KEY || process.env.HF_API_KEY || '',
    baseUrl: parsedEnv.GROQ_BASE_URL,
    modelName: parsedEnv.MODEL_NAME || 'gemma2-9b-it',
  },
  serpApi: {
    apiKey: parsedEnv.SERPAPI_API_KEY,
  },
  googleMaps: {
    apiKey: parsedEnv.GOOGLE_MAPS_API_KEY || parsedEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  },
  overpass: {
    apiUrl: parsedEnv.OVERPASS_API_URL,
    timeoutMs: parseInt(parsedEnv.OVERPASS_TIMEOUT_MS, 10),
  },
};
