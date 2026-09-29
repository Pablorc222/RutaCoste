// RutaCoste — Gasolineras en ruta
// Ruta: OSRM (demo). Gasolineras: OpenStreetMap vía Overpass API (amenity=fuel).
// Nota: OpenStreetMap no incluye precios en tiempo real; muestra ubicación y servicios cuando constan.

(function () {
  'use strict';

  const form = document.getElementById('gas-form');
  if (!form || !window.RutaCoste) return;

  const { origenAC, destinoAC, searchPlaces } = window.RutaCoste;

  const btn = document.getElementById('gas-btn');
  const msg = document.getElementById('gas-msg');
  const results = document.getElementById('gas-results');
  const listEl = document.getElementById('gas-list');
  const countEl = document.getElementById('gas-count');
  const filtersEl = document.getElementById('gas-filters');
  const rulerTrack = document.getElementById('ruler-track');

  const OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  let map = null;
  let routeLayer = null;
  let markerLayer = null;
  let stations = [];       // todas las gasolineras encontradas
  let visible = [];        // tras aplicar filtro
  let markers = new Map(); // id -> marker
  let activeId = null;
  let activeFilter = 'all';

  /* ---------------------------------------------------------------- utils */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const fmt = (n, d = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

  function haversine(a, b) {
    const R = 6371;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function show(type, text) {
    msg.className = 'x-msg ' + type;
    msg.textContent = text;
    msg.style.display = 'block';
  }
  function hide() { msg.style.display = 'none'; }

  /* ---------------------------------------------------------------- ruta */
  async function geocode(sel, text) {
    if (sel) return sel;
    const r = await searchPlaces(text);
    if (!r.length) throw new Error(`No hemos encontrado «${text}». Prueba a añadir la región o el país.`);
    const p = r[0];
    const a = p.address || {};
    return {
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      label: a.city || a.town || a.village || a.municipality || p.display_name.split(',')[0],
    };
  }

  async function getRoute(o, d) {
    const url = `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=full&geometries=geojson`;
    const res = await fetchWithTimeout(url, {}, 20000);
    if (!res.ok) throw new Error('No se ha podido calcular la ruta entre esos dos puntos.');
    const data = await res.json();
    if (!data.routes || !data.routes.length) throw new Error('No existe una ruta por carretera entre esos dos puntos.');
    return data.routes[0];
  }

  /* ---------------------------------------------------------- gasolineras */
  function samplePoints(coords, radiusKm) {
    // coords: [[lat,lon],...]. Devuelve puntos separados ~1.6·radio para cubrir toda la ruta.
    let step = Math.max(radiusKm * 1.6, 1);
    const total = coords.cum[coords.length - 1];
    if (total / step > 900) step = total / 900;
    const pts = [coords[0]];
    let next = step;
    for (let i = 1; i < coords.length; i++) {
      if (coords.cum[i] >= next) { pts.push(coords[i]); next += step; }
    }
    const last = coords[coords.length - 1];
    if (pts[pts.length - 1] !== last) pts.push(last);
    return pts;
  }

  async function fetchWithTimeout(url, opts, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); }
    finally { clearTimeout(t); }
  }

  async function overpass(query) {
    let lastErr;
    for (let round = 0; round < 2; round++) {
      for (const ep of OVERPASS) {
        try {
          const res = await fetchWithTimeout(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: 'data=' + encodeURIComponent(query),
          }, 20000);
          if (!res.ok) throw new Error('overpass ' + res.status);
          return await res.json();
        } catch (e) { lastErr = e; }
      }
    }
    throw lastErr || new Error('overpass');
  }

  async function fetchStations(points, radiusM, onProgress) {
    const CHUNK = 25;            // pocos puntos por consulta: respuesta rápida
    const PARALLEL = 3;          // consultas simultáneas
    const found = new Map();
    const chunks = [];
    for (let i = 0; i < points.length; i += CHUNK - 1) {
      chunks.push(points.slice(i, i + CHUNK));
      if (i + CHUNK >= points.length) break;
    }
    let done = 0, next = 0;
    async function worker() {
      while (next < chunks.length) {
        const c = chunks[next++];
        const poly = c.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(',');
        const q = `[out:json][timeout:20];nwr["amenity"="fuel"](around:${radiusM},${poly});out center tags;`;
        const data = await overpass(q);
        (data.elements || []).forEach((el) => found.set(el.type + el.id, el));
        onProgress(++done, chunks.length);
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, worker));
    return [...found.values()];
  }

  function locate(coords, lat, lon) {
    // Punto de la ruta más cercano (aprox.) → km recorridos y desvío
    let best = 0, bestD = Infinity;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    for (let i = 0; i < coords.length; i++) {
      const dy = coords[i][0] - lat;
      const dx = (coords[i][1] - lon) * cosLat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return { km: coords.cum[best], offsetKm: haversine(coords[best], [lat, lon]) };
  }

  function buildStation(el, coords, radiusM) {
    const lat = el.lat != null ? el.lat : el.center && el.center.lat;
    const lon = el.lon != null ? el.lon : el.center && el.center.lon;
    if (lat == null || lon == null) return null;
    const t = el.tags || {};
    const loc = locate(coords, lat, lon);
    if (loc.offsetKm * 1000 > radiusM * 1.15) return null;

    const yes = (k) => t[k] === 'yes';
    const fuels = [];
    if (yes('fuel:diesel')) fuels.push('Diésel');
    if (yes('fuel:octane_95')) fuels.push('Gasolina 95');
    if (yes('fuel:octane_98')) fuels.push('Gasolina 98');
    if (yes('fuel:lpg')) fuels.push('GLP');
    if (yes('fuel:cng')) fuels.push('GNC');
    if (yes('fuel:e85')) fuels.push('E85');

    const hours = t.opening_hours || '';
    const is24 = /^24\/7$/i.test(hours.trim());

    return {
      id: el.type + el.id,
      lat, lon,
      name: t.name || t.brand || t.operator || 'Gasolinera',
      brand: t.brand && t.brand !== t.name ? t.brand : '',
      place: [t['addr:street'], t['addr:city']].filter(Boolean).join(', '),
      fuels,
      is24,
      hours,
      km: loc.km,
      offset: loc.offsetKm,
    };
  }

  /* ----------------------------------------------------------------- mapa */
  function initMap() {
    if (map || typeof L === 'undefined') return;
    map = L.map('gas-map', { scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);
  }

  function drawRoute(coords, o, d) {
    initMap();
    if (!map) return;
    if (routeLayer) map.removeLayer(routeLayer);
    const line = L.polyline(coords, { color: '#1f6f4a', weight: 5, opacity: 0.9 });
    routeLayer = L.layerGroup([
      line,
      L.circleMarker(coords[0], { radius: 7, color: '#164f36', fillColor: '#1f6f4a', fillOpacity: 1 }).bindTooltip(o.label),
      L.circleMarker(coords[coords.length - 1], { radius: 7, color: '#1c232b', fillColor: '#f5f2eb', fillOpacity: 1, weight: 3 }).bindTooltip(d.label),
    ]).addTo(map);
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    }, 60);
  }

  function popupHtml(s) {
    const osm = `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`;
    return `<b>${esc(s.name)}</b><br>Km ${fmt(s.km, 0)} de la ruta · a ${fmt(s.offset * 1000, 0)} m<br><a href="${osm}" target="_blank" rel="noopener">Ver en OpenStreetMap</a>`;
  }

  function drawMarkers() {
    if (!map) return;
    if (markerLayer) map.removeLayer(markerLayer);
    markers = new Map();
    markerLayer = L.layerGroup();
    visible.forEach((s) => {
      const m = L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: '', html: '<div class="x-pin"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
      }).bindPopup(popupHtml(s));
      m.on('click', () => setActive(s.id, false));
      markers.set(s.id, m);
      markerLayer.addLayer(m);
    });
    markerLayer.addTo(map);
  }

  /* ------------------------------------------------------- lista y regla */
  function renderRuler(total) {
    rulerTrack.innerHTML = '';
    visible.forEach((s) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'x-tick';
      t.dataset.id = s.id;
      t.style.left = Math.min(100, Math.max(0, (s.km / total) * 100)) + '%';
      t.setAttribute('aria-label', `${s.name}, km ${fmt(s.km, 0)}`);
      t.title = `${s.name} · km ${fmt(s.km, 0)}`;
      t.addEventListener('click', () => setActive(s.id, true));
      rulerTrack.appendChild(t);
    });
  }

  function renderList() {
    countEl.textContent = `${visible.length} ${visible.length === 1 ? 'gasolinera' : 'gasolineras'}`;
    if (!visible.length) {
      listEl.innerHTML = '<li class="x-empty">No hay gasolineras que cumplan este filtro en la ruta.</li>';
      return;
    }
    listEl.innerHTML = visible.map((s) => {
      const tags = [];
      if (s.is24) tags.push('<span class="x-tag gold">24 horas</span>');
      s.fuels.forEach((f) => tags.push(`<span class="x-tag">${esc(f)}</span>`));
      if (!s.is24 && s.hours) tags.push(`<span class="x-tag grey">${esc(s.hours.length > 34 ? s.hours.slice(0, 34) + '…' : s.hours)}</span>`);
      if (!tags.length) tags.push('<span class="x-tag grey">Servicios sin especificar</span>');
      const sub = [s.brand, s.place].filter(Boolean).join(' · ');
      return `<li class="x-item" data-id="${esc(s.id)}">
        <div class="x-km"><b>${fmt(s.km, 0)}</b><span>km</span></div>
        <div class="x-info">
          <h3>${esc(s.name)}</h3>
          <p class="sub">${sub ? esc(sub) + ' · ' : ''}a ${fmt(s.offset * 1000, 0)} m de la ruta</p>
          <div class="x-tags">${tags.join('')}</div>
        </div>
      </li>`;
    }).join('');
    listEl.querySelectorAll('.x-item').forEach((li) => {
      li.addEventListener('click', () => setActive(li.dataset.id, true));
    });
  }

  function setActive(id, pan) {
    activeId = id;
    listEl.querySelectorAll('.x-item').forEach((li) => li.classList.toggle('active', li.dataset.id === id));
    rulerTrack.querySelectorAll('.x-tick').forEach((t) => t.classList.toggle('active', t.dataset.id === id));
    const m = markers.get(id);
    if (m && map) {
      if (pan) map.setView(m.getLatLng(), Math.max(map.getZoom(), 13), { animate: true });
      m.openPopup();
    }
    const li = listEl.querySelector(`.x-item[data-id="${CSS.escape(id)}"]`);
    if (li && !pan) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function applyFilter(total) {
    visible = stations.filter((s) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === '24h') return s.is24;
      if (activeFilter === 'diesel') return s.fuels.includes('Diésel');
      if (activeFilter === 'g95') return s.fuels.includes('Gasolina 95');
      if (activeFilter === 'glp') return s.fuels.includes('GLP');
      return true;
    });
    renderList();
    renderRuler(total);
    drawMarkers();
  }

  let routeTotalKm = 0;
  filtersEl.querySelectorAll('.x-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      filtersEl.querySelectorAll('.x-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      applyFilter(routeTotalKm);
    });
  });

  /* --------------------------------------------------------------- envío */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide();
    results.style.display = 'none';

    const oText = origenAC.getText();
    const dText = destinoAC.getText();
    if (!oText || !dText) { show('error', 'Escribe un origen y un destino.'); return; }
    const radiusKm = parseFloat(form.querySelector('input[name="radio"]:checked').value);

    btn.disabled = true;
    btn.textContent = 'Calculando la ruta…';

    try {
      const [o, d] = await Promise.all([
        geocode(origenAC.getSelected(), oText),
        geocode(destinoAC.getSelected(), dText),
      ]);
      const route = await getRoute(o, d);

      const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
      coords.cum = [0];
      for (let i = 1; i < coords.length; i++) coords.cum.push(coords.cum[i - 1] + haversine(coords[i - 1], coords[i]));
      // Ajustamos a la distancia oficial de OSRM
      const scale = (route.distance / 1000) / coords.cum[coords.length - 1] || 1;
      coords.cum = coords.cum.map((v) => v * scale);
      const totalKm = coords.cum[coords.length - 1];
      routeTotalKm = totalKm;

      const points = samplePoints(coords, radiusKm);
      btn.textContent = 'Buscando gasolineras…';
      const raw = await fetchStations(points, radiusKm * 1000, (i, n) => {
        btn.textContent = n > 1 ? `Buscando gasolineras (${i}/${n})…` : 'Buscando gasolineras…';
      });

      stations = raw.map((el) => buildStation(el, coords, radiusKm * 1000)).filter(Boolean).sort((a, b) => a.km - b.km);

      // Resumen
      const marks = [0, ...stations.map((s) => s.km), totalKm];
      let gap = 0;
      for (let i = 1; i < marks.length; i++) gap = Math.max(gap, marks[i] - marks[i - 1]);

      document.getElementById('st-km').innerHTML = `${fmt(totalKm, 0)}<em>km</em>`;
      document.getElementById('st-time').innerHTML = `${fmt(route.duration / 3600, 1)}<em>h</em>`;
      document.getElementById('st-count').innerHTML = `${stations.length}<em>en ruta</em>`;
      document.getElementById('st-gap').innerHTML = stations.length ? `${fmt(gap, 0)}<em>km</em>` : '—';
      document.getElementById('ruler-from').textContent = o.label;
      document.getElementById('ruler-to').textContent = d.label;
      document.getElementById('ruler-end').textContent = `${fmt(totalKm, 0)} km`;

      results.style.display = 'block';
      activeFilter = 'all';
      filtersEl.querySelectorAll('.x-chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === 'all'));

      drawRoute(coords, o, d);
      applyFilter(totalKm);

      if (!stations.length) {
        show('info', 'No hemos encontrado gasolineras registradas a menos de ' + radiusKm + ' km de esta ruta. Prueba a ampliar la distancia.');
      }
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      const isNet = err && (err.message === 'overpass' || /overpass|Failed to fetch|NetworkError|abort/i.test(err.message || ''));
      show('error', isNet
        ? 'El servicio público de datos de gasolineras está saturado ahora mismo. Espera unos segundos e inténtalo de nuevo.'
        : (err.message || 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ver gasolineras de la ruta';
    }
  });
})();
