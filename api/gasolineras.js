// RutaCoste — API de gasolineras (Ministerio para la Transición Ecológica)
// Función serverless de Vercel. Devuelve las estaciones dentro de un rectángulo
// GET /api/gasolineras?bbox=minLat,minLon,maxLat,maxLon
// Fuente: https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/

const SOURCE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';

let cache = { at: 0, list: null, fecha: '' };
const TTL = 10 * 60 * 1000; // 10 min en memoria

const num = (v) => {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const pick = (o, keys) => {
  for (const k of keys) {
    const n = num(o[k]);
    if (n != null && n > 0) return n;
  }
  return null;
};

async function load() {
  if (cache.list && Date.now() - cache.at < TTL) return cache;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(SOURCE, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; RutaCoste/1.0)' },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('ministerio ' + r.status);
    const text = (await r.text()).replace(/^\uFEFF/, '');
    const data = JSON.parse(text);

    const list = (data.ListaEESSPrecio || []).map((e) => {
      const lat = num(e['Latitud']);
      const lon = num(e['Longitud (WGS84)']);
      if (lat == null || lon == null) return null;
      return {
        id: 'm' + e['IDEESS'],
        name: (e['Rótulo'] || '').trim() || 'Gasolinera',
        addr: (e['Dirección'] || '').trim(),
        city: (e['Localidad'] || e['Municipio'] || '').trim(),
        lat, lon,
        hours: (e['Horario'] || '').trim(),
        p: {
          g95: pick(e, ['Precio Gasolina 95 E5', 'Precio Gasolina 95 E10']),
          g98: pick(e, ['Precio Gasolina 98 E5', 'Precio Gasolina 98 E10']),
          d: pick(e, ['Precio Gasoleo A']),
          dp: pick(e, ['Precio Gasoleo Premium']),
          glp: pick(e, ['Precio Gases licuados del petróleo']),
          gnc: pick(e, ['Precio Gas Natural Comprimido']),
        },
      };
    }).filter(Boolean);

    cache = { at: Date.now(), list, fecha: data.Fecha || '' };
    return cache;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  try {
    const parts = String(req.query.bbox || '').split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      res.status(400).json({ error: 'bbox inválido' });
      return;
    }
    const [minLat, minLon, maxLat, maxLon] = parts;
    const { list, fecha } = await load();
    const stations = list.filter((s) => s.lat >= minLat && s.lat <= maxLat && s.lon >= minLon && s.lon <= maxLon);

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({ fecha, stations });
  } catch (err) {
    res.status(502).json({ error: 'No se pudo consultar el servicio del Ministerio' });
  }
};
