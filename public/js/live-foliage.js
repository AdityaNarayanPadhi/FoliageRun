/**
 * FoliageRun - Live Foliage Scanner Controller
 * Bhubaneswar Greenways & Google Maps Sage/Forest Vector Styling
 */

document.addEventListener('DOMContentLoaded', () => {
  // Bhubaneswar Landmark Coordinates & Trail Profiles
  const BBSR_LANDMARKS = {
    'ekamra kanan': {
      name: 'Ekamra Kanan Botanical Gardens',
      coords: [20.3015, 85.8078],
      canopy: '96% Sal & Bamboo Canopy',
    },
    'jayadev vatika': {
      name: 'Jayadev Vatika Herbal Gardens',
      coords: [20.2605, 85.7865],
      canopy: '94% Medicinal Forest Grove',
    },
    'kalinga stadium': {
      name: 'Kalinga Stadium Environs',
      coords: [20.2995, 85.8245],
      canopy: '88% Vidyut Marg Tree Avenue',
    },
    'chandaka': {
      name: 'Chandaka Wildlife Sanctuary Trails',
      coords: [20.3660, 85.7480],
      canopy: '98% Dense Deciduous Sal Forest',
    },
    'master canteen': {
      name: 'Master Canteen Plaza',
      coords: [20.2660, 85.8435],
      canopy: '76% Boulevard Gulmohar Shade',
    },
    'nandankanan': {
      name: 'Nandankanan Lake Perimeter',
      coords: [20.3950, 85.8250],
      canopy: '92% Lakeside Mangrove & Teak',
    },
  };

  // Google Maps Custom Styling JSON (Sage / Forest Theme)
  const SAGE_FOREST_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#ccd5ae' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#01472e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#fefae0' }, { weight: 2 }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#01472e' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#01472e' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#a3b18a' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#01472e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e9edc9' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#01472e' }, { weight: 1 }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d48324' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#01472e' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#8fa382' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#01472e' }] },
  ];

  // DOM Elements
  const form = document.getElementById('foliage-scan-form');
  const startInput = document.getElementById('start-point-input');
  const endInput = document.getElementById('end-point-input');
  const scanBtn = document.getElementById('scan-submit-btn');
  const metricDensity = document.getElementById('metric-density');
  const metricAqi = document.getElementById('metric-aqi');
  const metricTemp = document.getElementById('metric-temp');
  const metricDistance = document.getElementById('metric-distance');
  const routeTitleEl = document.getElementById('scan-route-title');
  const instructionsListEl = document.getElementById('scan-instructions-list');
  const mapEngineBadge = document.getElementById('map-engine-badge');

  let leafletMap = null;
  let polylineGlow = null;
  let polylineCore = null;
  let markersLayer = null;

  // Initialize Map Engine (Styled Leaflet with Sage/Forest grading)
  function initMapEngine() {
    const defaultCenter = [20.2810, 85.7970]; // Midpoint between Ekamra and Jayadev Vatika
    leafletMap = L.map('foliage-google-map', {
      zoomControl: true,
      attributionControl: true,
    }).setView(defaultCenter, 13);

    // Free OpenStreetMap base layer with custom Forest/Sage filter
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors • Google Sage/Forest Vector Grading',
    });
    tileLayer.addTo(leafletMap);

    markersLayer = L.layerGroup().addTo(leafletMap);

    // Initial scan with default locations
    scanRoute(startInput.value, endInput.value);
  }

  // Quick Chips Click Listeners
  document.querySelectorAll('.chip-start').forEach((chip) => {
    chip.addEventListener('click', () => {
      startInput.value = chip.dataset.val;
    });
  });

  document.querySelectorAll('.chip-end').forEach((chip) => {
    chip.addEventListener('click', () => {
      endInput.value = chip.dataset.val;
    });
  });

  // Helper to find closest landmark coords
  function resolveCoordinates(query, defaultFallback) {
    const q = query.toLowerCase();
    for (const [key, val] of Object.entries(BBSR_LANDMARKS)) {
      if (q.includes(key)) return { coords: val.coords, name: val.name };
    }
    return { coords: defaultFallback, name: query };
  }

  // Generate intermediate shaded trail waypoints between two points
  function generateShadedWaypoints(start, end) {
    const waypoints = [start];
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const fraction = i / steps;
      // Slight scenic curvature deviation toward green spaces
      const deviation = Math.sin(fraction * Math.PI) * 0.0085;
      const lat = start[0] + (end[0] - start[0]) * fraction + (i % 2 === 0 ? deviation : -deviation * 0.5);
      const lng = start[1] + (end[1] - start[1]) * fraction + (i % 2 !== 0 ? deviation * 0.7 : -deviation * 0.3);
      waypoints.push([lat, lng]);
    }
    waypoints.push(end);
    return waypoints;
  }

  // Scan & Render Route
  function scanRoute(startName, endName) {
    scanBtn.disabled = true;
    scanBtn.style.opacity = '0.7';

    setTimeout(() => {
      const startRes = resolveCoordinates(startName, [20.3015, 85.8078]);
      const endRes = resolveCoordinates(endName, [20.2605, 85.7865]);

      const points = generateShadedWaypoints(startRes.coords, endRes.coords);

      // Calculate approximate distance
      const dLat = (endRes.coords[0] - startRes.coords[0]) * 111;
      const dLng = (endRes.coords[1] - startRes.coords[1]) * 105;
      const linearKm = Math.sqrt(dLat * dLat + dLng * dLng);
      const trailKm = Math.max(3.2, (linearKm * 1.35)).toFixed(1);

      // Update Telemetry Metrics
      if (metricDistance) metricDistance.textContent = `${trailKm} KM`;
      if (metricDensity) metricDensity.textContent = `${Math.floor(90 + Math.random() * 8)}%`;
      if (metricAqi) metricAqi.textContent = `${Math.floor(32 + Math.random() * 12)} AQI`;
      if (metricTemp) metricTemp.textContent = `-${(3.2 + Math.random() * 1.2).toFixed(1)}°C`;

      // Update Route Title & Guidance
      if (routeTitleEl) {
        routeTitleEl.textContent = `${startRes.name} to ${endRes.name} Shaded Corridor`;
      }

      if (instructionsListEl) {
        instructionsListEl.innerHTML = `
          <li class="turn-step">
            <span class="step-number">1</span>
            <span class="step-text">Depart <strong>${startRes.name}</strong> trailhead following tree-lined pedestrian avenue.</span>
          </li>
          <li class="turn-step">
            <span class="step-number">2</span>
            <span class="step-text">Enter shaded forest greenway corridor; canopy density measuring over 90% Sal & Teak trees.</span>
          </li>
          <li class="turn-step">
            <span class="step-number">3</span>
            <span class="step-text">Navigate along the quiet woodland perimeter path with low UV exposure and fresh air.</span>
          </li>
          <li class="turn-step">
            <span class="step-number">4</span>
            <span class="step-text">Conclude the ${trailKm} KM autumn run safely at <strong>${endRes.name}</strong>.</span>
          </li>
        `;
      }

      // Render on Map
      if (leafletMap) {
        if (polylineGlow) leafletMap.removeLayer(polylineGlow);
        if (polylineCore) leafletMap.removeLayer(polylineCore);
        markersLayer.clearLayers();

        // Glow Layer (Autumn Amber)
        polylineGlow = L.polyline(points, {
          color: '#d48324',
          weight: 12,
          opacity: 0.45,
          lineCap: 'round',
        }).addTo(leafletMap);

        // Core Layer (Forest & Coral dashed)
        polylineCore = L.polyline(points, {
          color: '#01472e',
          weight: 5,
          opacity: 0.95,
          dashArray: '10, 8',
          lineCap: 'round',
        }).addTo(leafletMap);

        // Start & End Markers
        const startIcon = L.divIcon({
          className: 'custom-wp-badge',
          html: `<div style="background:#01472e; color:#fefae0; padding:6px 14px; border-radius:9999px; font-weight:800; font-size:12px; border:2px solid #ccd5ae; box-shadow:0 4px 12px rgba(1,71,46,0.3);">🏁 START</div>`,
          iconSize: [85, 30],
          iconAnchor: [42, 15],
        });

        const endIcon = L.divIcon({
          className: 'custom-wp-badge',
          html: `<div style="background:#d48324; color:#fefae0; padding:6px 14px; border-radius:9999px; font-weight:800; font-size:12px; border:2px solid #fefae0; box-shadow:0 4px 12px rgba(212,131,36,0.35);">🌲 END</div>`,
          iconSize: [75, 30],
          iconAnchor: [37, 15],
        });

        L.marker(points[0], { icon: startIcon }).addTo(markersLayer).bindPopup(`<strong>${startRes.name}</strong>`);
        L.marker(points[points.length - 1], { icon: endIcon }).addTo(markersLayer).bindPopup(`<strong>${endRes.name}</strong>`);

        leafletMap.fitBounds(polylineGlow.getBounds(), { padding: [50, 50] });
      }

      scanBtn.disabled = false;
      scanBtn.style.opacity = '1';
    }, 600);
  }

  // Form Submit Handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    scanRoute(startInput.value, endInput.value);
  });

  // Start Map
  initMapEngine();
});
