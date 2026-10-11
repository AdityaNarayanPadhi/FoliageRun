import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
  },
  llm: {
    apiKey: process.env.GROQ_API_KEY || process.env.HF_API_KEY || '',
    baseUrl: process.env.GROQ_BASE_URL || process.env.HF_BASE_URL || 'https://api.groq.com/openai/v1',
    modelName: process.env.MODEL_NAME || 'gemma2-9b-it',
  },
  serpApi: {
    apiKey: process.env.SERPAPI_API_KEY || '',
  },
  overpass: {
    apiUrl: process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
    timeoutMs: parseInt(process.env.OVERPASS_TIMEOUT_MS || '15000', 10),
  },
};
