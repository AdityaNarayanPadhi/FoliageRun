# 🍂 FoliageRun Backend Service

> **Hacktoberfest 2026 "Touch Grass" Challenge Entry**  
> An autonomous outdoor autumn running route generator powered by the **Mastra framework**, open-weight LLMs via **Groq / Hugging Face Inference API**, **OpenStreetMap Overpass API**, **SerpApi**, and telemetry tracked by **Sentry AI Agent Monitoring**.

---

## 🧭 Overview

**FoliageRun** encourages runners and outdoor enthusiasts to get outside and "touch grass" during peak autumn foliage. Given a starting point and desired distance (e.g., 5km, 10km), the backend orchestrates specialized agents and tools to synthesize a closed-loop running route that maximizes tree canopy coverage, routes through local parks, and includes live foliage condition reports and turnkey GPX export for Garmin, Strava, and Apple Watch.

---

## 🛠 Architectural Stack

- **Runtime & Language**: Node.js (v20+ / v22+), TypeScript, Express
- **Agent Orchestration**: [Mastra Framework](https://mastra.ai/) (`@mastra/core`)
- **Open-Weight LLMs**: `google/gemma-2-9b-it` or `meta-llama/llama-3.1-8b-instant` via Groq API or Hugging Face Inference API using OpenAI-compatible SDK (zero local daemons or Ollama required).
- **Telemetry & Tracing**: `@sentry/node` with OpenTelemetry and Sentry AI Agent tracing (`ai.agent`, `ai.tool`, `ai.chat_completions.create` spans, token accounting, and latency logging).
- **External Data Tools**:
  - **SerpApi**: Real-time regional autumn foliage status, peak color timing, and park trail surface advisories.
  - **OpenStreetMap Overpass API**: Live query endpoint (`https://overpass-api.de/api/interpreter`) finding `leisure=park`, `landuse=forest`, and `highway=footway|cycleway|path`.
- **Export Engine**: Standards-compliant GPX 1.1 XML generator with elevation profiling and simulated running timestamps.

---

## 📂 Project Directory Structure

```text
d:/FoliageRun/
├── .env.example                     # Environment template
├── .env                             # Local environment variables
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── src/
│   ├── index.ts                     # Express entry point, Sentry initialization & error handling
│   ├── config.ts                    # Central validated configuration
│   ├── mastra/
│   │   ├── agent.ts                 # Mastra Route Agent orchestrator & LLM synthesis
│   │   └── tools/
│   │       ├── foliage.ts           # SerpApi foliage report tool with Sentry tracing
│   │       └── overpass.ts          # OpenStreetMap Overpass API tool with Sentry tracing
│   ├── controllers/
│   │   └── routeController.ts       # Express request validation & route controller
│   ├── routes/
│   │   ├── routeRoutes.ts           # /api/routes endpoints
│   │   └── healthRoutes.ts          # /health connectivity verification
│   ├── storage/
│   │   └── routeStore.ts            # In-memory LRU store for generated routes & GPX retrieval
│   ├── types/
│   │   └── route.ts                 # TypeScript types & Zod schemas
│   └── utils/
│       ├── geo.ts                   # Haversine distance, bearings & loop synthesizer
│       └── gpx.ts                   # GPX 1.1 XML generation engine
└── test/
    └── verify.ts                    # Automated integration verification test suite
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Sentry Tracing & Telemetry
SENTRY_DSN=https://your_public_key@o0.ingest.sentry.io/your_project_id
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_ENVIRONMENT=development

# LLM Provider (Groq API or Hugging Face Inference API)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
MODEL_NAME=gemma2-9b-it

# Alternative: Hugging Face Inference API
# HF_API_KEY=hf_your_token_here
# HF_BASE_URL=https://api-inference.huggingface.co/v1
# MODEL_NAME=google/gemma-2-9b-it

# External Tool APIs
SERPAPI_API_KEY=your_serpapi_api_key_here
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OVERPASS_TIMEOUT_MS=15000
```

> **Note**: If `GROQ_API_KEY` or `SERPAPI_API_KEY` are not provided, the service automatically engages high-fidelity deterministic fallback generators with realistic terrain models, so the API never crashes and remains fully functional in offline/demo environments.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

### 3. Build & Run in Production
```bash
npm run build
npm start
```

### 4. Run Integration Verification Tests
```bash
npx tsx test/verify.ts
```

---

## 📡 API Endpoints Reference

### 1. Generate Route
- **Method**: `POST`
- **Endpoint**: `/api/routes/generate`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "startLat": 40.785091,
  "startLng": -73.968285,
  "targetDistanceKm": 5.0,
  "locationName": "Central Park, New York"
}
```

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "routeTitle": "Central Park, New York Autumn 5k Near Peak Loop",
  "distanceKm": 5.12,
  "foliageSummary": "Crisp autumn conditions observed around Central Park, New York. Canopy displays vibrant golden amber and scarlet tones with dry, runnable footing along wooded trails.",
  "waypoints": [
    {
      "lat": 40.785091,
      "lng": -73.968285,
      "name": "Central Park, New York - Route Start",
      "ele": 45
    },
    {
      "lat": 40.791240,
      "lng": -73.962130,
      "name": "Autumn Foliage Trail - KM 1.2",
      "ele": 58
    },
    {
      "lat": 40.785091,
      "lng": -73.968285,
      "name": "Central Park, New York - Route Finish",
      "ele": 45
    }
  ],
  "turnByTurnInstructions": [
    "Start at Central Park baseline trailhead. Head north towards North Woods.",
    "At 1.2km, enter the wooded section under mature maple and oak canopy.",
    "Follow the winding park loop path eastward, enjoying views of yellow and scarlet foliage.",
    "Complete the circular loop returning safely to the initial start point."
  ],
  "gpxData": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\" creator=\"FoliageRun Touch Grass Engine v1.0\" ...",
  "routeId": "foliage_1791442456477_g52x81"
}
```

---

### 2. Download GPX File
- **Method**: `GET`
- **Endpoint**: `/api/routes/download-gpx?routeId=:id`
- **Response**: `Content-Type: application/gpx+xml` with `Content-Disposition: attachment; filename="<route-title>.gpx"`

Ready for direct import into:
- Garmin Connect / Garmin Forerunner / Fenix
- Strava (Upload Activity / Routes)
- Apple Watch Workout app
- Komoot / COROS / Suunto

---

### 3. Health & Connectivity Check
- **Method**: `GET`
- **Endpoint**: `/api/health`

#### Response (`200 OK`)
```json
{
  "status": "healthy",
  "service": "FoliageRun Route Generator",
  "challenge": "Hacktoberfest 2026 Touch Grass",
  "timestamp": "2026-10-08T06:54:12.950Z",
  "sentry": {
    "initialized": true,
    "environment": "development",
    "hasDsn": true
  },
  "llm": {
    "provider": "Groq",
    "model": "gemma2-9b-it",
    "connected": true,
    "message": "Connected to LLM provider (https://api.groq.com/openai/v1)"
  },
  "tools": {
    "serpApiConfigured": true,
    "overpassEndpoint": "https://overpass-api.de/api/interpreter"
  }
}
```

---

## 🔍 Observability & Sentry Agent Tracing

Every stage of the agent orchestration is traced using standard Sentry spans:

1. **`generate_foliage_route` (`op: "ai.agent"`)**:
   - Spans the complete lifecycle from request intake to GPX output.
   - Logs target location, requested distance, measured distance, and waypoint counts.

2. **`foliageSearchTool` (`op: "ai.tool"`)**:
   - Traces SerpApi requests, queries, latency, and foliage peak status extraction.
   - Gracefully records timeouts and falls back without breaking the workflow.

3. **`osmParkRouteTool` (`op: "ai.tool"`)**:
   - Traces OpenStreetMap Overpass queries, polygon parsing, park counts, and trail extraction.
   - Gracefully degrades to procedural loop waypoints if Overpass times out.

4. **`chat_completion` (`op: "ai.chat_completions.create"`)**:
   - Logs LLM prompt and completion token counts (`ai.usage.prompt_tokens`, `ai.usage.completion_tokens`, `ai.usage.total_tokens`).
   - Populates Sentry's AI Dashboard metrics seamlessly.

---

## 🧪 Testing with cURL

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Generate 5km route in Boston
curl -X POST http://localhost:3000/api/routes/generate \
  -H "Content-Type: application/json" \
  -d '{"startLat": 42.3554, "startLng": -71.0664, "targetDistanceKm": 5.0, "locationName": "Boston Common, Boston"}'

# 3. Download GPX (replace with routeId from response)
curl -O http://localhost:3000/api/routes/download-gpx?routeId=foliage_1791442456477_g52x81
```

---

## 🏆 Hacktoberfest 2026 Touch Grass Badge
Built with pride for Hacktoberfest 2026. Put on your running shoes, touch grass, and experience the peak colors of autumn! 🍁🏃💨
