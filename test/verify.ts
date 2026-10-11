process.env.NODE_ENV = 'test';
import app from '../src/index';

async function runTests() {
  console.log('--- FoliageRun Integration Test Suite ---');
  
  const server = app.listen(3099, async () => {
    try {
      const baseUrl = 'http://localhost:3099';

      // 1. Test GET / (HTML Frontend)
      console.log('\n[1] Testing GET / (HTML Frontend) ...');
      const rootRes = await fetch(`${baseUrl}/`);
      const rootHtml = await rootRes.text();
      console.log('Root status:', rootRes.status, 'HTML length:', rootHtml.length, 'Contains FOLIAGERUN:', rootHtml.includes('FOLIAGERUN'));
      if (rootRes.status !== 200 || !rootHtml.includes('FOLIAGERUN')) throw new Error('Root HTML failed');

      // 1b. Test GET /api (JSON Documentation)
      console.log('\n[1b] Testing GET /api (JSON API Docs) ...');
      const apiRes = await fetch(`${baseUrl}/api`);
      const apiJson = await apiRes.json();
      console.log('API Docs status:', apiRes.status, 'Service:', apiJson.name);
      if (apiRes.status !== 200) throw new Error('API docs endpoint failed');

      // 2. Test GET /health
      console.log('\n[2] Testing GET /health ...');
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthJson = await healthRes.json();
      console.log('Health status:', healthRes.status, 'Health payload:', JSON.stringify(healthJson, null, 2));
      if (healthRes.status !== 200) throw new Error('Health check failed');

      // 3. Test POST /api/routes/generate (Central Park 5km)
      console.log('\n[3] Testing POST /api/routes/generate ...');
      const genPayload = {
        startLat: 40.785091,
        startLng: -73.968285,
        targetDistanceKm: 5.0,
        locationName: 'Central Park, New York',
      };

      const genRes = await fetch(`${baseUrl}/api/routes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genPayload),
      });

      const genJson = await genRes.json();
      console.log('Generate status:', genRes.status);
      console.log('Route Title:', genJson.routeTitle);
      console.log('Distance (km):', genJson.distanceKm);
      console.log('Foliage Summary:', genJson.foliageSummary);
      console.log('Waypoints Count:', genJson.waypoints?.length);
      console.log('Instructions Count:', genJson.turnByTurnInstructions?.length);
      console.log('GPX Data Sample (first 150 chars):', genJson.gpxData?.substring(0, 150));

      if (!genJson.success) throw new Error('Route generation reported success=false');
      if (!genJson.gpxData.includes('<gpx')) throw new Error('Invalid GPX output');
      if (!genJson.routeId) throw new Error('Missing routeId');

      // 4. Test GET /api/routes/download-gpx?routeId=...
      console.log(`\n[4] Testing GET /api/routes/download-gpx?routeId=${genJson.routeId} ...`);
      const dlRes = await fetch(`${baseUrl}/api/routes/download-gpx?routeId=${genJson.routeId}`);
      console.log('Download status:', dlRes.status);
      console.log('Content-Type:', dlRes.headers.get('content-type'));
      console.log('Content-Disposition:', dlRes.headers.get('content-disposition'));
      const gpxBody = await dlRes.text();
      console.log('Downloaded GPX Length:', gpxBody.length, 'bytes');

      if (dlRes.status !== 200) throw new Error('GPX download failed');
      if (!gpxBody.includes('</gpx>')) throw new Error('Downloaded GPX incomplete');

      console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n');
    } catch (err) {
      console.error('\n❌ Test failure:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runTests();
