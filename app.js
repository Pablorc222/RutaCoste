// RutaCoste — lógica de la web
// Geocodificación y autocompletado: Nominatim (OpenStreetMap), sin restricción de país
// Cálculo de ruta: OSRM demo server
// Ambos son servicios públicos y gratuitos pensados para uso ligero (~1 petición/seg).
// Si RutaCoste crece en tráfico, sustituye estas llamadas por una API de pago
// (Google Maps, Mapbox, OpenRouteService con API key, etc.) para evitar límites de uso.
// Lo mismo aplica a las teselas del mapa (tile.openstreetmap.org): en producción con
// tráfico alto, usa un proveedor de teselas con API key (MapTiler, Mapbox, Stadia…).

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Cabecera: opaca al hacer scroll                                    */
  /* ------------------------------------------------------------------ */
  const header = document.querySelector('header');
  if (header) {
    const onScroll = () => header.classList.toggle('solid', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* Autocompletado de ciudades (mundial)                                */
  /* ------------------------------------------------------------------ */
  function shortLabel(place) {
    const a = place.address || {};
    const city = a.city || a.town || a.village || a.municipality || a.county || place.display_name.split(',')[0];
    return city;
  }

  function regionLabel(place) {
    const a = place.address || {};
    return a.state || a.region || a.county || '';
  }

  function countryCode(place) {
    const a = place.address || {};
    return (a.country_code || '').toUpperCase();
  }

  function countryName(place) {
    const a = place.address || {};
    return a.country || '';
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  async function searchPlaces(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=es&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se ha podido contactar con el servicio de mapas.');
    return res.json();
  }

  function createAutocomplete(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const field = input.closest('.field');
    const wrap = input.closest('.ac-input-wrap') || field;
    let results = [];
    let activeIndex = -1;
    let selected = null; // { lat, lon, label, countryCode }

    function markSelected(place) {
      selected = {
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        label: shortLabel(place),
        countryCode: countryCode(place) || '—',
      };
      field.classList.add('has-selection');
      let badge = wrap.querySelector('.ac-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ac-badge';
        wrap.appendChild(badge);
      }
      badge.textContent = selected.countryCode;
    }

    function clearSelected() {
      selected = null;
      field.classList.remove('has-selection');
    }

    function closeList() {
      list.classList.remove('open');
      list.innerHTML = '';
      activeIndex = -1;
    }

    function renderList() {
      if (!results.length) {
        list.innerHTML = '<div class="ac-empty">Sin resultados. Prueba con otro nombre.</div>';
        list.classList.add('open');
        return;
      }
      list.innerHTML = results
        .map((place, i) => {
          const region = regionLabel(place);
          const country = countryName(place) || countryCode(place);
          return `<div class="ac-item${i === activeIndex ? ' active' : ''}" data-index="${i}">
            <span class="ac-city">${shortLabel(place)}</span>
            <span class="ac-region">${region ? region + (country ? ', ' + country : '') : country}</span>
            <span class="ac-country">${countryCode(place) || '—'}</span>
          </div>`;
        })
        .join('');
      list.classList.add('open');
      list.querySelectorAll('.ac-item').forEach((el) => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const i = parseInt(el.dataset.index, 10);
          choose(i);
        });
      });
    }

    function choose(i) {
      const place = results[i];
      if (!place) return;
      input.value = shortLabel(place) + (regionLabel(place) ? `, ${regionLabel(place)}` : '');
      markSelected(place);
      closeList();
    }

    const runSearch = debounce(async (q) => {
      if (q.trim().length < 2) {
        closeList();
        return;
      }
      try {
        results = await searchPlaces(q);
        activeIndex = -1;
        renderList();
      } catch (err) {
        closeList();
      }
    }, 350);

    input.addEventListener('input', () => {
      clearSelected();
      runSearch(input.value);
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.ac-item');
      if (!items.length || !list.classList.contains('open')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList();
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) {
          e.preventDefault();
          choose(activeIndex);
        }
      } else if (e.key === 'Escape') {
        closeList();
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(closeList, 120);
    });

    return {
      getSelected: () => selected,
      getText: () => input.value.trim(),
    };
  }

  const origenAC = createAutocomplete('origen', 'origen-list');
  const destinoAC = createAutocomplete('destino', 'destino-list');

  /* ------------------------------------------------------------------ */
  /* Selector rápido de vehículo                                        */
  /* ------------------------------------------------------------------ */
  const consumoInput = document.getElementById('consumo');
  document.querySelectorAll('.vchip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.vchip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      consumoInput.value = chip.dataset.consumo;
    });
  });
  consumoInput.addEventListener('input', () => {
    document.querySelectorAll('.vchip').forEach((c) => c.classList.remove('active'));
  });

  // la tabla de consumos orientativos también rellena el campo al hacer clic
  document.querySelectorAll('table.consumo tbody tr[data-consumo]').forEach((row) => {
    row.addEventListener('click', () => {
      consumoInput.value = row.dataset.consumo;
      document.querySelectorAll('.vchip').forEach((c) => c.classList.remove('active'));
      document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Cálculo de ruta                                                     */
  /* ------------------------------------------------------------------ */
  const form = document.getElementById('calc-form');
  const btn = document.getElementById('calc-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const mapBox = document.getElementById('route-map');
  let leafletMap = null;
  let routeLayer = null;

  async function geocodeFallback(query) {
    const results = await searchPlaces(query);
    if (!results.length) throw new Error(`No hemos encontrado "${query}". Prueba a añadir la región o el país.`);
    const place = results[0];
    return { lat: parseFloat(place.lat), lon: parseFloat(place.lon), label: shortLabel(place) };
  }

  async function getRoute(origin, destination) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se ha podido calcular la ruta entre esos dos puntos.');
    const data = await res.json();
    if (!data.routes || !data.routes.length) throw new Error('No existe una ruta por carretera entre esos dos puntos.');
    return data.routes[0];
  }

  function formatNumber(n, decimals = 2) {
    return n.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    resultBox.style.display = 'none';
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  function drawRoute(coordsLatLon, originLabel, destLabel) {
    if (typeof L === 'undefined') return; // Leaflet no disponible (sin conexión, por ejemplo)
    mapBox.style.display = 'block';
    if (!leafletMap) {
      leafletMap = L.map(mapBox, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(leafletMap);
    }
    if (routeLayer) leafletMap.removeLayer(routeLayer);
    const line = L.polyline(coordsLatLon, { color: '#1f6f4a', weight: 4, opacity: 0.9 });
    routeLayer = L.layerGroup([
      line,
      L.circleMarker(coordsLatLon[0], { radius: 6, color: '#164f36', fillColor: '#1f6f4a', fillOpacity: 1 }).bindTooltip(originLabel),
      L.circleMarker(coordsLatLon[coordsLatLon.length - 1], { radius: 6, color: '#7a5b17', fillColor: '#e2a33d', fillOpacity: 1 }).bindTooltip(destLabel),
    ]).addTo(leafletMap);
    setTimeout(() => {
      leafletMap.invalidateSize();
      leafletMap.fitBounds(line.getBounds(), { padding: [24, 24] });
    }, 50);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    resultBox.style.display = 'none';
    mapBox.style.display = 'none';

    const origenTexto = origenAC.getText();
    const destinoTexto = destinoAC.getText();
    const consumo = parseFloat(document.getElementById('consumo').value);
    const precio = parseFloat(document.getElementById('precio').value);
    const idaVuelta = document.getElementById('ida-vuelta').checked;

    if (!origenTexto || !destinoTexto) { showError('Escribe un origen y un destino.'); return; }
    if (!consumo || consumo <= 0) { showError('Introduce un consumo válido (litros cada 100 km).'); return; }
    if (!precio || precio <= 0) { showError('Introduce un precio de combustible válido.'); return; }

    btn.disabled = true;
    btn.textContent = 'Calculando ruta…';

    try {
      const oSel = origenAC.getSelected();
      const dSel = destinoAC.getSelected();
      const [o, d] = await Promise.all([
        oSel ? Promise.resolve(oSel) : geocodeFallback(origenTexto),
        dSel ? Promise.resolve(dSel) : geocodeFallback(destinoTexto),
      ]);
      const route = await getRoute(o, d);

      const distanciaKm = route.distance / 1000;
      const totalKm = idaVuelta ? distanciaKm * 2 : distanciaKm;
      const litros = (totalKm / 100) * consumo;
      const coste = litros * precio;
      const horas = route.duration / 3600;

      document.getElementById('res-coste').textContent = formatNumber(coste, 2);
      document.getElementById('res-km').textContent = `${formatNumber(totalKm, 0)} km`;
      document.getElementById('res-litros').textContent = `${formatNumber(litros, 1)} L`;
      document.getElementById('res-tiempo').textContent = idaVuelta
        ? `${formatNumber(horas * 2, 1)} h aprox. (ida y vuelta)`
        : `${formatNumber(horas, 1)} h aprox.`;
      document.getElementById('res-sub').textContent = `${o.label} → ${d.label}${idaVuelta ? ' (ida y vuelta)' : ' (solo ida)'}`;

      resultBox.style.display = 'block';

      if (route.geometry && route.geometry.coordinates) {
        const coordsLatLon = route.geometry.coordinates.map((c) => [c[1], c[0]]);
        drawRoute(coordsLatLon, o.label, d.label);
      }

      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      showError(err.message || 'Ha ocurrido un error inesperado. Inténtalo de nuevo.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Calcular coste de la ruta';
    }
  });

  /* ------------------------------------------------------------------ */
  /* Aviso de cookies                                                    */
  /* ------------------------------------------------------------------ */
  const banner = document.getElementById('cookie-banner');
  if (banner) {
    const consent = localStorage.getItem('rutacoste-cookies');
    if (!consent) banner.style.display = 'flex';
    document.getElementById('cookie-accept')?.addEventListener('click', () => {
      localStorage.setItem('rutacoste-cookies', 'accepted');
      banner.style.display = 'none';
    });
    document.getElementById('cookie-reject')?.addEventListener('click', () => {
      localStorage.setItem('rutacoste-cookies', 'rejected');
      banner.style.display = 'none';
    });
  }
})();
