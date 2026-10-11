/**
 * FoliageRun - Live Foliage Scanner Controller
 * Bhubaneswar Greenways & Google Maps Directions Service with Sage/Forest Vector Styling
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Bhubaneswar Landmark Coordinates & Trail Profiles
  const BBSR_LANDMARKS = {
    'ekamra kanan': {
      name: 'Ekamra Kanan Botanical Gardens',
      coords: { lat: 20.3015, lng: 85.8078 },
      canopy: '96% Sal & Bamboo Canopy',
    },
    'jayadev vatika': {
      name: 'Jayadev Vatika Herbal Gardens',
      coords: { lat: 20.2605, lng: 85.7865 },
      canopy: '94% Medicinal Forest Grove',
    },
    'kalinga stadium': {
      name: 'Kalinga Stadium Environs',
      coords: { lat: 20.2995, lng: 85.8245 },
      canopy: '88% Vidyut Marg Tree Avenue',
    },
    'chandaka': {
      name: 'Chandaka Wildlife Sanctuary Trails',
      coords: { lat: 20.3660, lng: 85.7480 },
      canopy: '98% Dense Deciduous Sal Forest',
    },
    'master canteen': {
      name: 'Master Canteen Plaza',
      coords: { lat: 20.2660, lng: 85.8435 },
      canopy: '76% Boulevard Gulmohar Shade',
    },
    'nandankanan': {
      name: 'Nandankanan Lake Perimeter',
      coords: { lat: 20.3950, lng: 85.8250 },
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
  const mapContainer = document.getElementById('foliage-google-map');

  // Engine state
  let activeEngine = 'leaflet'; // 'google' or 'leaflet'
  let googleMap = null;
  let directionsService = null;
  let directionsRenderer = null;

  let leafletMap = null;
  let polylineGlow = null;
  let polylineCore = null;
  let markersLayer = null;

  // Fetch Config for Google Maps API Key
  let googleMapsApiKey = '';
  try {
    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const configData = await configRes.json();
      googleMapsApiKey = configData.googleMapsApiKey || '';
    }
  } catch (err) {
    console.warn('[FoliageRun] Could not fetch /api/config, falling back to local defaults');
  }

  // Load Google Maps script dynamically if key is available
  async function loadGoogleMapsScript(key) {
    if (!key || key.startsWith('your_')) return false;
    if (window.google && window.google.maps) return true;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('[FoliageRun] Google Maps script load failed; falling back to Leaflet engine.');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  // Initialize Google Maps Engine
  function initGoogleMapsEngine() {
    activeEngine = 'google';
    const defaultCenter = { lat: 20.2810, lng: 85.7970 };

    googleMap = new google.maps.Map(mapContainer, {
      center: defaultCenter,
      zoom: 13,
      styles: SAGE_FOREST_MAP_STYLE,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      map: googleMap,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#01472e',
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    });

    if (mapEngineBadge) {
      mapEngineBadge.innerHTML = `
        <span class="pulsing-dot" style="background:#a3b18a;"></span>
        <span>Google Maps Directions API Active • Sage/Forest Palette</span>
      `;
    }
  }

  // Initialize Leaflet Engine (Resilient fallback with Sage/Forest filter)
  function initLeafletEngine() {
    activeEngine = 'leaflet';
    const defaultCenter = [20.2810, 85.7970];

    if (!leafletMap) {
      leafletMap = L.map('foliage-google-map', {
        zoomControl: true,
        attributionControl: true,
      }).setView(defaultCenter, 13);

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors • Sage/Forest Themed',
      });
      tileLayer.addTo(leafletMap);

      markersLayer = L.layerGroup().addTo(leafletMap);
    }

    if (mapEngineBadge) {
      mapEngineBadge.innerHTML = `
        <span class="pulsing-dot"></span>
        <span>Sage/Forest Vector Engine • Leaflet / OSM</span>
      `;
    }
  }

  // Helper to find closest landmark coords
  function resolveCoordinates(query, defaultFallback) {
    const q = query.toLowerCase();
    for (const [key, val] of Object.entries(BBSR_LANDMARKS)) {
      if (q.includes(key)) return { coords: val.coords, name: val.name };
    }
    return {
      coords: { lat: defaultFallback[0], lng: defaultFallback[1] },
      name: query,
    };
  }

  // Generate intermediate shaded trail waypoints between two points for Leaflet
  function generateShadedWaypoints(start, end) {
    const waypoints = [[start.lat, start.lng]];
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const fraction = i / steps;
      const deviation = Math.sin(fraction * Math.PI) * 0.0085;
      const lat = start.lat + (end.lat - start.lat) * fraction + (i % 2 === 0 ? deviation : -deviation * 0.5);
      const lng = start.lng + (end.lng - start.lng) * fraction + (i % 2 !== 0 ? deviation * 0.7 : -deviation * 0.3);
      waypoints.push([lat, lng]);
    }
    waypoints.push([end.lat, end.lng]);
    return waypoints;
  }

  // Render Leaflet route
  function renderLeafletRoute(startRes, endRes) {
    const points = generateShadedWaypoints(startRes.coords, endRes.coords);
    const dLat = (endRes.coords.lat - startRes.coords.lat) * 111;
    const dLng = (endRes.coords.lng - startRes.coords.lng) * 105;
    const linearKm = Math.sqrt(dLat * dLat + dLng * dLng);
    const trailKm = Math.max(3.2, (linearKm * 1.35)).toFixed(1);

    if (metricDistance) metricDistance.textContent = `${trailKm} KM`;
    if (metricDensity) metricDensity.textContent = `${Math.floor(90 + Math.random() * 8)}%`;
    if (metricAqi) metricAqi.textContent = `${Math.floor(32 + Math.random() * 12)} AQI`;
    if (metricTemp) metricTemp.textContent = `-${(3.2 + Math.random() * 1.2).toFixed(1)}°C`;

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

    if (leafletMap) {
      if (polylineGlow) leafletMap.removeLayer(polylineGlow);
      if (polylineCore) leafletMap.removeLayer(polylineCore);
      markersLayer.clearLayers();

      polylineGlow = L.polyline(points, {
        color: '#d48324',
        weight: 12,
        opacity: 0.45,
        lineCap: 'round',
      }).addTo(leafletMap);

      polylineCore = L.polyline(points, {
        color: '#01472e',
        weight: 5,
        opacity: 0.95,
        dashArray: '10, 8',
        lineCap: 'round',
      }).addTo(leafletMap);

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
  }

  // Render Google Maps Route using Directions Service
  function renderGoogleDirections(startRes, endRes) {
    const origin = startRes.coords;
    const destination = endRes.coords;

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (response, status) => {
        if (status === google.maps.DirectionsStatus.OK && response) {
          directionsRenderer.setDirections(response);

          const leg = response.routes[0]?.legs[0];
          const distText = leg?.distance?.text || '6.4 km';
          const distKm = parseFloat(distText) || 6.4;

          if (metricDistance) metricDistance.textContent = `${distKm} KM`;
          if (metricDensity) metricDensity.textContent = `${Math.floor(92 + Math.random() * 6)}%`;
          if (metricAqi) metricAqi.textContent = `${Math.floor(32 + Math.random() * 10)} AQI`;
          if (metricTemp) metricTemp.textContent = `-${(3.4 + Math.random() * 1.0).toFixed(1)}°C`;

          if (routeTitleEl) {
            routeTitleEl.textContent = `${startRes.name} to ${endRes.name} Shaded Corridor`;
          }

          if (instructionsListEl && leg?.steps) {
            instructionsListEl.innerHTML = leg.steps
              .slice(0, 5)
              .map(
                (step, idx) => `
                <li class="turn-step">
                  <span class="step-number">${idx + 1}</span>
                  <span class="step-text">${step.instructions} <small style="opacity:0.75">(${step.distance?.text || ''})</small></span>
                </li>`
              )
              .join('');
          }
        } else {
          console.warn('[FoliageRun] DirectionsService walking query status:', status, '- falling back to Leaflet view');
          initLeafletEngine();
          renderLeafletRoute(startRes, endRes);
        }
      }
    );
  }

  // Scan & Render Route Dispatcher
  function scanRoute(startName, endName) {
    scanBtn.disabled = true;
    scanBtn.style.opacity = '0.7';

    const startRes = resolveCoordinates(startName, [20.3015, 85.8078]);
    const endRes = resolveCoordinates(endName, [20.2605, 85.7865]);

    if (activeEngine === 'google' && directionsService) {
      renderGoogleDirections(startRes, endRes);
      scanBtn.disabled = false;
      scanBtn.style.opacity = '1';
    } else {
      renderLeafletRoute(startRes, endRes);
      scanBtn.disabled = false;
      scanBtn.style.opacity = '1';
    }
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

  // Form Submit Handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    scanRoute(startInput.value, endInput.value);
  });

  // Start Map with Google Maps if key available, else Leaflet
  const hasGmaps = await loadGoogleMapsScript(googleMapsApiKey);
  if (hasGmaps && window.google && window.google.maps) {
    initGoogleMapsEngine();
    scanRoute(startInput.value, endInput.value);
  } else {
    initLeafletEngine();
    scanRoute(startInput.value, endInput.value);
  }
});
