/**
 * FoliageRun Frontend Controller
 * Organic Brutalist UI & Interactive Map Engine
 * Features:
 * - 100% Free OpenStreetMap tile layer (zero API key errors)
 * - Themed with Forest/Sage CSS grading
 * - Glowing dual-layer animated running route polylines
 * - Custom START / FINISH and canopy distance waypoint badges
 * - Instant fly-to and dynamic preset routes for India
 * - Live Groq/Mastra backend dispatch & GPX 1.1 exporter
 */

document.addEventListener('DOMContentLoaded', () => {
  // Preset Route Definitions: Localized to Bhubaneswar, Odisha, India
  const PRESET_ROUTES = {
    ekamra: {
      name: 'Ekamra Kanan Botanical Gardens, Bhubaneswar, Odisha',
      center: [20.3015, 85.8078],
      zoom: 15,
      distanceKm: 5.2,
      elevationGain: 38,
      foliageStatus: 'BHUBANESWAR CANOPY ACTIVE',
      foliageSummary: 'Crisp morning running conditions across Ekamra Kanan and Nayapalli greenways. Dense bamboo, silver oak, sal, and teak canopy with clean, paved pedestrian loops.',
      subBadge: 'TEMPLE CITY GREENWAYS • ELEVATION ~45M ASL',
      routeTitle: 'Ekamra Kanan Lake & Forest Loop',
      coordinates: [
        [20.3015, 85.8078],
        [20.3040, 85.8095],
        [20.3065, 85.8070],
        [20.3080, 85.8040],
        [20.3060, 85.8015],
        [20.3030, 85.8020],
        [20.3005, 85.8040],
        [20.2995, 85.8065],
        [20.3015, 85.8078],
      ],
      waypoints: [
        { lat: 20.3040, lng: 85.8095, km: '1.2 km', name: 'Lotus Lake Perimeter' },
        { lat: 20.3080, lng: 85.8040, km: '2.5 km', name: 'Bamboo Sanctuary Avenue' },
        { lat: 20.3030, lng: 85.8020, km: '3.8 km', name: 'Rose Garden & Cactus Grove' },
      ],
      instructions: [
        'Start at the Main Nayapalli entrance gate trailhead.',
        'Head north along the wide paved track circling the central lotus lake.',
        'Turn west under the dense bamboo and mahogany canopy grove.',
        'Pace past the exotic cactus house and herbal garden avenue.',
        'Complete the scenic 5.2k woodland loop returning to start gate.',
      ],
    },
    jayadev: {
      name: 'Jayadev Vatika Herbal Gardens, Bhubaneswar, Odisha',
      center: [20.2605, 85.7865],
      zoom: 15,
      distanceKm: 5.5,
      elevationGain: 52,
      foliageStatus: 'AYURVEDIC FOREST PEAK',
      foliageSummary: 'Cool woodland air along Khandagiri foothills. Ancient Sal trees and aromatic herbal groves provide 94% shaded coverage across rolling gravel trails.',
      subBadge: 'HERBAL BOTANIC SANCTUARY • ELEVATION ~58M ASL',
      routeTitle: 'Jayadev Vatika Heritage Trail Loop',
      coordinates: [
        [20.2605, 85.7865],
        [20.2635, 85.7845],
        [20.2660, 85.7870],
        [20.2645, 85.7910],
        [20.2610, 85.7925],
        [20.2580, 85.7895],
        [20.2605, 85.7865],
      ],
      waypoints: [
        { lat: 20.2635, lng: 85.7845, km: '1.0 km', name: 'Khandagiri Ridge Overlook' },
        { lat: 20.2660, lng: 85.7870, km: '2.4 km', name: 'Ancient Sal Canopy Clearing' },
        { lat: 20.2610, lng: 85.7925, km: '4.0 km', name: 'Medicinal Plant Arboretum' },
      ],
      instructions: [
        'Start at the Khandagiri foothill entrance gate.',
        'Follow the shaded winding path uphill beneath century-old sal trees.',
        'Cross the wooden pedestrian footbridge over the seasonal stream.',
        'Loop south through the aromatic herbal and medicinal plant reserve.',
        'Return to the entrance clearing to conclude the 5.5k trail.',
      ],
    },
    kalinga: {
      name: 'Kalinga Stadium Environs, Bhubaneswar, Odisha',
      center: [20.2995, 85.8245],
      zoom: 15,
      distanceKm: 5.0,
      elevationGain: 24,
      foliageStatus: 'ATHLETIC GREENWAY ACTIVE',
      foliageSummary: 'Wide pedestrian avenues along Vidyut Marg tree-lined corridors. Fast, level running track flanked by mature neem, banyan, and gulmohar foliage.',
      subBadge: 'SPORTS CITY GREEN CORRIDOR • ELEVATION ~42M ASL',
      routeTitle: 'Kalinga Stadium & Vidyut Marg Circuit',
      coordinates: [
        [20.2995, 85.8245],
        [20.3035, 85.8220],
        [20.3060, 85.8260],
        [20.3025, 85.8290],
        [20.2980, 85.8275],
        [20.2995, 85.8245],
      ],
      waypoints: [
        { lat: 20.3035, lng: 85.8220, km: '1.2 km', name: 'Vidyut Marg Shaded Avenue' },
        { lat: 20.3060, lng: 85.8260, km: '2.5 km', name: 'Hockey Complex North Turn' },
        { lat: 20.2980, lng: 85.8275, km: '4.0 km', name: 'Athletic Plaza Tree Line' },
      ],
      instructions: [
        'Depart Gate 3 on Vidyut Marg heading north.',
        'Follow the wide tree-lined sidewalk past the hockey arena perimeter.',
        'Curve eastward along the quiet sports village greenway.',
        'Maintain a steady pace south beneath the broad banyan shade.',
        'Finish at the stadium plaza arch.',
      ],
    },
    chandaka: {
      name: 'Chandaka Wildlife Sanctuary Trails, Bhubaneswar, Odisha',
      center: [20.3660, 85.7480],
      zoom: 14,
      distanceKm: 6.8,
      elevationGain: 84,
      foliageStatus: 'WILD SANCTUARY CANOPY',
      foliageSummary: 'Undulating forest dirt roads under pristine Sal (Shorea robusta) and Teak canopies. High oxygen density and tranquil wildlife sounds.',
      subBadge: 'CHANDAKA ELEPHANT RESERVE • ELEVATION ~88M ASL',
      routeTitle: 'Godibari Ecotourism Trail Loop',
      coordinates: [
        [20.3660, 85.7480],
        [20.3710, 85.7440],
        [20.3770, 85.7480],
        [20.3800, 85.7550],
        [20.3740, 85.7580],
        [20.3680, 85.7530],
        [20.3660, 85.7480],
      ],
      waypoints: [
        { lat: 20.3710, lng: 85.7440, km: '1.5 km', name: 'Derass Lake Branch' },
        { lat: 20.3800, lng: 85.7550, km: '3.5 km', name: 'Watchtower Sal Clearing' },
        { lat: 20.3680, lng: 85.7530, km: '5.5 km', name: 'Bamboo Valley Stream' },
      ],
      instructions: [
        'Start at Godibari ecotourism visitor center trailhead.',
        'Head into the forest on the marked dirt pathway under heavy sal canopy.',
        'Ascend the gentle ridge approaching the watchtower clearing.',
        'Follow the stream bed path with natural gravel footing.',
        'Complete the deep woodland loop back to Godibari gate.',
      ],
    },
    biju: {
      name: 'Biju Patnaik Forest Park, Bhubaneswar, Odisha',
      center: [20.2670, 85.8300],
      zoom: 15,
      distanceKm: 4.8,
      elevationGain: 28,
      foliageStatus: 'URBAN OXYGEN OASIS',
      foliageSummary: 'Lush tree canopy in the heart of the capital city. Shaded rubberized walking track alongside musical fountains and old neem avenues.',
      subBadge: 'FOREST PARK LOOPS • ELEVATION ~40M ASL',
      routeTitle: 'Biju Patnaik Forest Park Perimeter',
      coordinates: [
        [20.2670, 85.8300],
        [20.2695, 85.8280],
        [20.2720, 85.8310],
        [20.2700, 85.8340],
        [20.2660, 85.8335],
        [20.2670, 85.8300],
      ],
      waypoints: [
        { lat: 20.2695, lng: 85.8280, km: '1.0 km', name: 'Central Fountain Boulevard' },
        { lat: 20.2720, lng: 85.8310, km: '2.5 km', name: 'Old Mahogany Shaded Lane' },
        { lat: 20.2660, lng: 85.8335, km: '3.8 km', name: 'Heritage Neem Perimeter' },
      ],
      instructions: [
        'Depart the main Forest Park entrance opposite Capital Hospital.',
        'Jog clockwise on the wide outer path under heavy green tree shade.',
        'Circle the fountain pond enjoying cool breezes.',
        'Complete two circuits to reach target 4.8k distance.',
        'Cool down at the open air pavilion.',
      ],
    },
    nandankanan: {
      name: 'Nandankanan Lake Perimeter, Bhubaneswar, Odisha',
      center: [20.3950, 85.8250],
      zoom: 15,
      distanceKm: 6.2,
      elevationGain: 35,
      foliageStatus: 'LAKESIDE CANOPY PROMENADE',
      foliageSummary: 'Tranquil water perimeter of Kanjia Lake. Sprawling century-old banyan, debdaru, and teak trees along flat trail runner paths.',
      subBadge: 'KANJIA LAKE BASIN • ELEVATION ~48M ASL',
      routeTitle: 'Kanjia Lake Waterside Circuit',
      coordinates: [
        [20.3950, 85.8250],
        [20.3980, 85.8280],
        [20.4010, 85.8240],
        [20.3990, 85.8190],
        [20.3940, 85.8210],
        [20.3950, 85.8250],
      ],
      waypoints: [
        { lat: 20.3980, lng: 85.8280, km: '1.5 km', name: 'Kanjia Wetlands Overlook' },
        { lat: 20.4010, lng: 85.8240, km: '3.0 km', name: 'Botanical Reserve Trail' },
        { lat: 20.3940, lng: 85.8210, km: '5.0 km', name: 'Lake Boating Embankment' },
      ],
      instructions: [
        'Begin at the botanical side entrance of Kanjia Lake.',
        'Follow the earthen embankment path bordering the calm waters.',
        'Run under ancient debdaru and banyan canopy watching wetland birds.',
        'Cross the wooden pedestrian footway on the south bank.',
        'Finish the scenic 6.2k waterside loop.',
      ],
    },
  };

  // Global State: Localized to Bhubaneswar, Odisha
  let currentCoordinates = { lat: 20.3015, lng: 85.8078 }; // Ekamra Kanan, Bhubaneswar
  let selectedDistanceKm = 5.0;
  let activeRouteData = null;
  let map = null;
  let routeGlowLayer = null;
  let routeCoreLayer = null;
  let routeMarkersLayer = null;

  // DOM Elements
  const locationInput = document.getElementById('location-input');
  const gpsBtn = document.getElementById('gps-btn');
  const distanceBtns = document.querySelectorAll('.distance-btn');
  const distanceSlider = document.getElementById('distance-slider');
  const sliderValBadge = document.getElementById('slider-val-badge');
  const tagBtns = document.querySelectorAll('.tag-btn');
  const generateBtn = document.getElementById('generate-btn');
  const agentPill = document.getElementById('agent-status-pill');
  const presetPills = document.querySelectorAll('.preset-pill');

  // Briefing Elements
  const briefingTray = document.getElementById('briefing-tray');
  const briefingTitle = document.getElementById('briefing-title');
  const statDistance = document.getElementById('stat-distance');
  const statFoliage = document.getElementById('stat-foliage');
  const statWaypoints = document.getElementById('stat-waypoints');
  const statElevation = document.getElementById('stat-elevation');
  const turnByTurnList = document.getElementById('turn-by-turn-list');
  const downloadGpxBtn = document.getElementById('download-gpx-btn');
  const lockScreenBtn = document.getElementById('lock-screen-btn');
  const pocketModal = document.getElementById('pocket-takeover-modal');
  const pocketCountdownFill = document.getElementById('pocket-countdown-fill');
  const pocketCountdownNum = document.getElementById('pocket-countdown-num');

  // Foliage Overlay Elements
  const foliageStatusTitle = document.getElementById('foliage-status-title');
  const foliageSummaryText = document.getElementById('foliage-summary-text');
  const foliageSubBadge = document.getElementById('foliage-sub-badge');

  // =========================================================================
  // 1. Initialize Map with Standard 100% Free OpenStreetMap Tiles
  // =========================================================================
  function initMap() {
    map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
    }).setView([currentCoordinates.lat, currentCoordinates.lng], 15);

    // Standard OpenStreetMap Tile Layer (Zero API keys required)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    osmLayer.addTo(map);

    // Automatic fallback if a specific CDN mirror throttles
    osmLayer.on('tileerror', function (e) {
      if (!e.tile._fallbackTried) {
        e.tile._fallbackTried = true;
        e.tile.src = e.tile.src.replace(/https:\/\/[a-c]\.tile\./, 'https://tile.');
      }
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    routeMarkersLayer = L.layerGroup().addTo(map);

    // Immediately load and render the default Ekamra Kanan loop
    loadPresetRoute('ekamra', false);
  }

  // =========================================================================
  // 2. Dual-Layer Glowing Polyline & Custom Markers Rendering
  // =========================================================================
  function renderRoutePolyline(latLngs, waypointsData = [], options = {}) {
    if (!map || !Array.isArray(latLngs) || latLngs.length < 2) return;

    // Clean up previous layers
    if (routeGlowLayer) map.removeLayer(routeGlowLayer);
    if (routeCoreLayer) map.removeLayer(routeCoreLayer);
    routeMarkersLayer.clearLayers();

    // Glow Layer: color: '#d48324', weight: 10, opacity: 0.4, lineCap: 'round'
    routeGlowLayer = L.polyline(latLngs, {
      color: '#d48324',
      weight: 10,
      opacity: 0.4,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Core Route Layer: color: '#e76f51', weight: 4, opacity: 0.95, dashArray: '8, 8'
    routeCoreLayer = L.polyline(latLngs, {
      color: '#e76f51',
      weight: 4,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Start Flag Marker: Forest green pill with label START / FINISH
    const startPt = latLngs[0];
    const startIcon = L.divIcon({
      className: 'custom-start-pill',
      html: `<div class="start-finish-pill"><span class="pin-icon">🏁</span><span class="pin-text">START / FINISH</span></div>`,
      iconSize: [130, 32],
      iconAnchor: [65, 16],
    });

    L.marker(startPt, { icon: startIcon, zIndexOffset: 1000 })
      .addTo(routeMarkersLayer)
      .bindPopup(
        `<strong style="color:#01472e;">${options.startName || 'Trailhead'}</strong><br><small style="color:#01472e;">Start & Finish Loop Hub</small>`
      );

    // Canopy Waypoint Badges (1.0 km, 2.0 km, 3.5 km)
    if (Array.isArray(waypointsData)) {
      waypointsData.forEach((wp) => {
        if (!wp.lat || !wp.lng) return;
        const kmLabel = wp.km || (wp.name && wp.name.includes('KM') ? wp.name.split('KM')[1].trim() : 'WP');
        const wpIcon = L.divIcon({
          className: 'custom-wp-badge',
          html: `<div class="canopy-wp-badge"><span>${kmLabel}</span></div>`,
          iconSize: [52, 24],
          iconAnchor: [26, 12],
        });

        L.marker([wp.lat, wp.lng], { icon: wpIcon })
          .addTo(routeMarkersLayer)
          .bindPopup(
            `<strong style="color:#01472e;">${wp.name || 'Canopy Checkpoint'}</strong><br><small style="color:#01472e;">Marker: ${kmLabel}</small>`
          );
      });
    }

    if (options.fitBounds) {
      map.fitBounds(routeCoreLayer.getBounds(), { padding: [50, 50] });
    }
  }

  // =========================================================================
  // 3. Load & Switch Presets Dynamically with Smooth Fly-To
  // =========================================================================
  function loadPresetRoute(presetKey, shouldFly = true) {
    const preset = PRESET_ROUTES[presetKey] || PRESET_ROUTES.ekamra;
    currentCoordinates = { lat: preset.center[0], lng: preset.center[1] };
    selectedDistanceKm = preset.distanceKm;

    if (locationInput) locationInput.value = preset.name;
    if (distanceSlider) distanceSlider.value = preset.distanceKm;
    if (sliderValBadge) sliderValBadge.textContent = `${preset.distanceKm.toFixed(1)} KM`;

    // Re-center map with smooth fly-to
    if (shouldFly && map) {
      map.flyTo(preset.center, 15, { duration: 1.4 });
    } else if (map) {
      map.setView(preset.center, 15);
    }

    // Render polyline & markers
    renderRoutePolyline(preset.coordinates, preset.waypoints, {
      startName: preset.name,
      fitBounds: false,
    });

    // Update Foliage Glassmorphic Overlay Card
    if (foliageStatusTitle) foliageStatusTitle.textContent = preset.foliageStatus;
    if (foliageSummaryText) foliageSummaryText.textContent = preset.foliageSummary;
    if (foliageSubBadge) foliageSubBadge.textContent = preset.subBadge;

    // Build standard briefing
    renderBriefing({
      routeTitle: preset.routeTitle,
      distanceKm: preset.distanceKm,
      foliageSummary: preset.foliageSummary,
      waypoints: preset.coordinates.map((pt, i) => ({
        lat: pt[0],
        lng: pt[1],
        name: i === 0 ? 'Start/Finish' : `Foliage Checkpoint ${i}`,
      })),
      turnByTurnInstructions: preset.instructions,
    });

    // Synthesize fallback GPX in case user downloads immediately
    activeRouteData = {
      routeTitle: preset.routeTitle,
      distanceKm: preset.distanceKm,
      foliageSummary: preset.foliageSummary,
      gpxData: generateFallbackGpx(preset),
    };
  }

  // Preset Pills Click Listener
  presetPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      presetPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const presetKey = pill.dataset.preset;
      loadPresetRoute(presetKey, true);
    });
  });

  // =========================================================================
  // 4. Geolocation Detection
  // =========================================================================
  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    gpsBtn.style.opacity = '0.5';
    gpsBtn.textContent = '⏳';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        gpsBtn.style.opacity = '1';
        gpsBtn.textContent = '📍';
        currentCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        locationInput.value = `Current Location (${currentCoordinates.lat.toFixed(3)}, ${currentCoordinates.lng.toFixed(3)})`;
        map.flyTo([currentCoordinates.lat, currentCoordinates.lng], 15, { duration: 1.5 });
        
        // Remove active preset highlight
        presetPills.forEach((p) => p.classList.remove('active'));
      },
      (error) => {
        gpsBtn.style.opacity = '1';
        gpsBtn.textContent = '📍';
        console.warn('Geolocation failed:', error.message);
        alert('Could not acquire GPS position. Staying centered on current map position.');
      },
      { timeout: 8000 }
    );
  });

  // =========================================================================
  // 5. Distance Selectors & Sliders
  // =========================================================================
  distanceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      distanceBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const dist = parseFloat(btn.dataset.distance);
      selectedDistanceKm = dist;
      if (distanceSlider) distanceSlider.value = dist;
      if (sliderValBadge) sliderValBadge.textContent = `${dist.toFixed(1)} KM`;
    });
  });

  if (distanceSlider) {
    distanceSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      selectedDistanceKm = val;
      if (sliderValBadge) sliderValBadge.textContent = `${val.toFixed(1)} KM`;

      distanceBtns.forEach((b) => {
        b.classList.toggle('active', parseFloat(b.dataset.distance) === val);
      });
    });
  }

  // Scenic Tags Toggle
  tagBtns.forEach((tag) => {
    tag.addEventListener('click', () => tag.classList.toggle('active'));
  });

  // =========================================================================
  // 6. Generate Route Submission (Groq / Mastra Backend)
  // =========================================================================
  generateBtn.addEventListener('click', async () => {
    const locationName = locationInput.value.trim() || 'Autumn Trail Loop';

    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.7';
    if (agentPill) agentPill.classList.add('active');

    try {
      const response = await fetch('/api/routes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLat: currentCoordinates.lat,
          startLng: currentCoordinates.lng,
          targetDistanceKm: selectedDistanceKm,
          locationName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      activeRouteData = data;

      // Extract waypoints for polyline
      if (Array.isArray(data.waypoints) && data.waypoints.length >= 2) {
        const latLngs = data.waypoints.map((wp) => [wp.lat, wp.lng]);
        
        // Extract distance markers (every 3rd waypoint)
        const distanceMarkers = [];
        const totalWps = data.waypoints.length;
        if (totalWps >= 6) {
          const step1 = Math.round(totalWps * 0.25);
          const step2 = Math.round(totalWps * 0.5);
          const step3 = Math.round(totalWps * 0.75);

          [step1, step2, step3].forEach((idx) => {
            if (data.waypoints[idx]) {
              const fraction = idx / totalWps;
              const kmEst = (fraction * (data.distanceKm || selectedDistanceKm)).toFixed(1);
              distanceMarkers.push({
                lat: data.waypoints[idx].lat,
                lng: data.waypoints[idx].lng,
                km: `${kmEst} km`,
                name: data.waypoints[idx].name || `Checkpoint ${kmEst} km`,
              });
            }
          });
        }

        renderRoutePolyline(latLngs, distanceMarkers, {
          startName: locationName,
          fitBounds: true,
        });
      }

      // Update Foliage Glassmorphic Badge
      if (foliageSummaryText && data.foliageSummary) {
        foliageSummaryText.textContent = data.foliageSummary;
      }
      if (foliageStatusTitle) {
        foliageStatusTitle.textContent = data.foliageSummary.toLowerCase().includes('peak')
          ? 'PEAK CANOPY DISPATCH'
          : 'LUSH CANOPY ACTIVE';
      }

      // Render Briefing
      renderBriefing(data);

      // Scroll smoothly to briefing
      if (briefingTray) {
        briefingTray.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to generate route:', err);
      alert('Unable to generate route: ' + (err.message || 'Network error'));
    } finally {
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      if (agentPill) agentPill.classList.remove('active');
    }
  });

  // =========================================================================
  // 7. Render Briefing & Turn-by-Turn Guidance
  // =========================================================================
  function renderBriefing(data) {
    if (briefingTitle) briefingTitle.textContent = data.routeTitle || 'Autumn Running Loop';
    if (statDistance) statDistance.textContent = `${data.distanceKm} km`;
    if (statWaypoints) statWaypoints.textContent = data.waypoints?.length || '--';
    if (statElevation) statElevation.textContent = `+${Math.round(data.distanceKm * 12)} m`;
    if (statFoliage) statFoliage.textContent = data.foliageSummary?.toLowerCase().includes('peak') ? 'Peak' : 'Near Peak';

    if (turnByTurnList) {
      turnByTurnList.innerHTML = '';
      const instructions = data.turnByTurnInstructions || [
        'Begin at the starting trailhead.',
        'Follow the tree canopy along the park loop.',
        'Complete the circular trail returning to start.',
      ];

      instructions.forEach((instruction, idx) => {
        const li = document.createElement('li');
        li.className = 'turn-step';
        li.innerHTML = `
          <span class="step-number">${idx + 1}</span>
          <span class="step-text">${instruction}</span>
        `;
        turnByTurnList.appendChild(li);
      });
    }

    if (briefingTray) briefingTray.classList.add('visible');
  }

  // =========================================================================
  // Toast Notification Utility (Issue 4)
  // =========================================================================
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `<span style="font-size:1.15rem;">🍁</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // =========================================================================
  // Issue 4: Functional GPX File Export Utility
  // =========================================================================
  function exportRouteToGpx(routeName, waypoints) {
    const trkpts = waypoints
      .map(
        (wp) =>
          `      <trkpt lat="${wp.lat}" lon="${wp.lng}"><ele>${wp.ele ?? 920}</ele><name>${wp.name ?? ''}</name></trkpt>`
      )
      .join('\n');

    const gpxXml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FoliageRun - Open-Source Autumn Route Dispatcher" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeName}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${routeName}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxXml], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const filename = `${routeName.toLowerCase().replace(/\s+/g, '-')}.gpx`;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    showToast(`Dispatched: ${filename} (Garmin, Apple Watch, Strava ready)`);
  }

  // =========================================================================
  // 8. DOWNLOAD GPX Button Handler (Issue 4)
  // =========================================================================
  downloadGpxBtn.addEventListener('click', () => {
    let routeName = 'Autumn Route';
    let waypoints = [];

    if (activeRouteData && Array.isArray(activeRouteData.waypoints) && activeRouteData.waypoints.length > 0) {
      routeName = activeRouteData.routeTitle || 'Autumn Running Loop';
      waypoints = activeRouteData.waypoints;
    } else {
      // Fallback to active preset waypoints
      const currentPresetKey = document.querySelector('.preset-pill.active')?.dataset.preset || 'ekamra';
      const preset = PRESET_ROUTES[currentPresetKey] || PRESET_ROUTES.ekamra;
      routeName = preset.routeTitle;
      waypoints = preset.coordinates.map((c, i) => ({
        lat: c[0],
        lng: c[1],
        name: i === 0 ? 'Trailhead Start/Finish' : `Checkpoint ${i}`,
        ele: 900 + i * 2,
      }));
    }

    exportRouteToGpx(routeName, waypoints);
  });

  // =========================================================================
  // 9. DISPATCH & LOCK SCREEN 🔒 Button Handler (Issue 4)
  // =========================================================================
  let pocketDismissTimeout = null;
  let pocketCountdownInterval = null;

  function dismissPocketModal() {
    if (pocketDismissTimeout) clearTimeout(pocketDismissTimeout);
    if (pocketCountdownInterval) clearInterval(pocketCountdownInterval);
    pocketDismissTimeout = null;
    pocketCountdownInterval = null;
    if (pocketModal) pocketModal.classList.remove('active');
  }

  if (lockScreenBtn && pocketModal) {
    lockScreenBtn.addEventListener('click', () => {
      pocketModal.classList.add('active');

      let secondsRemaining = 4;
      if (pocketCountdownNum) pocketCountdownNum.textContent = '4';
      if (pocketCountdownFill) {
        pocketCountdownFill.style.transition = 'none';
        pocketCountdownFill.style.width = '100%';
        // Force layout repaint
        void pocketCountdownFill.offsetWidth;
        pocketCountdownFill.style.transition = 'width 4s linear';
        pocketCountdownFill.style.width = '0%';
      }

      if (pocketCountdownInterval) clearInterval(pocketCountdownInterval);
      pocketCountdownInterval = setInterval(() => {
        secondsRemaining -= 1;
        if (pocketCountdownNum) {
          pocketCountdownNum.textContent = Math.max(0, secondsRemaining).toString();
        }
      }, 1000);

      if (pocketDismissTimeout) clearTimeout(pocketDismissTimeout);
      pocketDismissTimeout = setTimeout(() => {
        dismissPocketModal();
      }, 4000);
    });

    // Auto-dismisses on any click/tap, smoothly restoring the page state
    pocketModal.addEventListener('click', () => {
      dismissPocketModal();
    });
  }

  // =========================================================================
  // 10. Footer Sentry Telemetry Status Modal (Issue 5)
  // =========================================================================
  const sentryTrigger = document.getElementById('sentry-trace-trigger');
  const sentryModal = document.getElementById('sentry-inspector-modal');
  const sentryCloseBtn = document.getElementById('sentry-close-btn');
  const sentryDismissBtn = document.getElementById('sentry-dismiss-btn');

  function openSentryModal() {
    if (sentryModal) sentryModal.classList.add('active');
  }

  function closeSentryModal() {
    if (sentryModal) sentryModal.classList.remove('active');
  }

  if (sentryTrigger) {
    sentryTrigger.addEventListener('click', openSentryModal);
    sentryTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSentryModal();
      }
    });
  }

  if (sentryCloseBtn) sentryCloseBtn.addEventListener('click', closeSentryModal);
  if (sentryDismissBtn) sentryDismissBtn.addEventListener('click', closeSentryModal);
  if (sentryModal) {
    sentryModal.addEventListener('click', (e) => {
      if (e.target === sentryModal) closeSentryModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dismissPocketModal();
      closeSentryModal();
    }
  });

  // Start Map
  initMap();
});
