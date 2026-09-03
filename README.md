# RutaCoste

Calculadora del coste de combustible de un trayecto por carretera, en España o en el extranjero. Sitio estático (HTML/CSS/JS puro), sin backend ni dependencias — se despliega tal cual en Vercel.

## Qué trae esta versión

- Identidad visual propia: héroe "carretera de noche" con panel de mandos flotante, contenido sobre "papel de mapa" y footer de asfalto.
- Buscador de origen/destino con **autocompletado en tiempo real y cobertura mundial** (no solo España): al escribir aparecen coincidencias con ciudad, región y país.
- Selector rápido de tipo de vehículo (chips) que rellena el consumo automáticamente; la tabla de consumos orientativos también es interactiva (clic en una fila = rellena el campo).
- Mapa de la ruta calculada (Leaflet + teselas de OpenStreetMap) con el trazado real.
- Sección dedicada a explicar el uso internacional, pensada para SEO y para dejar claro el alcance de la herramienta.

## Cómo funciona técnicamente

- **Geocodificación y autocompletado** (convertir "Madrid" o "Lyon" en coordenadas): [Nominatim](https://nominatim.org/) (OpenStreetMap), servicio público y gratuito, sin restricción de país.
- **Cálculo de ruta** (distancia real por carretera): [OSRM](http://project-osrm.org/) demo server, también público y gratuito.
- **Mapa**: [Leaflet](https://leafletjs.com/) cargado desde cdnjs, con teselas del servidor de demostración `tile.openstreetmap.org`.
- **Aviso importante:** los tres servicios anteriores son *de demostración*, pensados para uso ligero (Nominatim y OSRM limitan a ~1 petición/segundo; las teselas de OSM piden un uso razonable). Son perfectos para lanzar y probar RutaCoste. Si el tráfico crece de verdad, sustitúyelos por planes de pago (Google Maps Platform, Mapbox, OpenRouteService, MapTiler…) para evitar bloqueos — todas las llamadas están aisladas en `app.js` para que sea fácil de cambiar.

## Desplegar en Vercel (gratis, con subdominio)

1. Crea un repositorio en GitHub y sube esta carpeta tal cual (`index.html`, `style.css`, `app.js`, páginas legales, etc.) a la raíz del repo.
2. Entra en [vercel.com](https://vercel.com) y crea una cuenta (puedes entrar directamente con tu cuenta de GitHub).
3. "Add New… → Project" → selecciona el repositorio de RutaCoste.
4. Como es un sitio estático, Vercel no necesita configuración especial (no hay "Build Command" ni framework) — dale a **Deploy**.
5. En un par de minutos tendrás la web publicada en `rutacoste.vercel.app` (o el nombre que le des al proyecto).

## Cuando quieras pasar a un dominio propio (rutacoste.es)

1. Compra el dominio en cualquier registrador (no hace falta que sea en Vercel).
2. En el proyecto de Vercel → **Settings → Domains** → añade `rutacoste.es`.
3. Vercel te dará unos registros DNS (normalmente un registro `A` o `CNAME`) que tienes que añadir en el panel de tu registrador de dominios.
4. En unas horas (a veces minutos) el dominio quedará apuntando a tu web en Vercel, con HTTPS automático.

## Antes de solicitar Google AdSense

- [ ] Sustituye todos los campos `[entre corchetes]` de `aviso-legal.html` y `privacidad.html` por tus datos reales.
- [ ] Ten el sitio en su dominio propio (`.es` o `.com`), no en el subdominio `.vercel.app`.
- [ ] Da de alta el dominio en [Google Search Console](https://search.google.com/search-console) para que Google pueda indexarlo.
- [ ] Actualiza `robots.txt` y `sitemap.xml` si cambias el dominio (ahora mismo apuntan a `rutacoste.es`, cámbialo si usas otro).
- [ ] Añade contenido de calidad de verdad (esta plantilla ya trae una sección "Cómo funciona", una tabla de consumos, una sección internacional y una FAQ — puedes ampliarlas con más artículos si quieres reforzar el SEO).
- [ ] Si esperas mucho tráfico, revisa el apartado "Cómo funciona técnicamente" y valora pasar a APIs de pago para geocodificación, rutas y teselas del mapa.

## Estructura de archivos

```
index.html         → página principal con la calculadora
aviso-legal.html    → plantilla de aviso legal (rellena los datos)
privacidad.html      → plantilla de política de privacidad
cookies.html         → plantilla de política de cookies
style.css            → estilos de todo el sitio
app.js               → lógica de la calculadora + aviso de cookies
robots.txt           → indicaciones para buscadores
sitemap.xml           → mapa del sitio para indexación
```
