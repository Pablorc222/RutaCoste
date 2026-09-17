# 🚗 RutaCoste

**Calculadora gratuita para calcular cuánto cuesta un viaje en coche.**

RutaCoste permite estimar el coste de combustible de cualquier trayecto por carretera introduciendo el origen, destino, consumo del vehículo y precio del combustible.

🌐 **Web:** https://ruta-coste.vercel.app/

---

## ✨ Características

* 🗺️ **Cálculo de rutas reales por carretera**
* ⛽ **Estimación del coste de gasolina o diésel**
* 📍 **Origen y destino con autocompletado**
* 🌍 **Compatible con rutas internacionales**
* 🚗 **Selección rápida del tipo de vehículo**
* 🔄 **Cálculo de trayectos de ida y vuelta**
* 💶 **Detección de moneda según el país**
* 🗺️ **Mapa interactivo con el recorrido**
* 📱 **Diseño responsive para ordenador y móvil**
* 🔒 **Sin registro y sin necesidad de descargar ninguna aplicación**

---

## 🎯 ¿Para qué sirve?

RutaCoste está pensada para conocer de forma rápida cuánto puede costar un viaje antes de salir.

Solo tienes que introducir:

1. 📍 Origen
2. 📍 Destino
3. ⛽ Consumo del vehículo en L/100 km
4. 💰 Precio del combustible

La calculadora obtiene la distancia por carretera y estima los litros necesarios y el coste aproximado del combustible.

También puedes seleccionar **ida y vuelta** para calcular el coste total del trayecto.

---

## 🧮 ¿Cómo se calcula?

El coste estimado se obtiene mediante una fórmula sencilla:

```text
Litros necesarios = Distancia × Consumo / 100

Coste del viaje = Litros necesarios × Precio por litro
```

### Ejemplo

Para un viaje de **500 km**, con un consumo de **6,5 L/100 km** y un precio de **1,65 €/L**:

```text
500 × 6,5 / 100 = 32,5 litros

32,5 × 1,65 € = 53,63 €
```

Por tanto, el coste estimado del trayecto sería de **53,63 €**.

---

## 🌍 Rutas internacionales

RutaCoste no está limitada a España.

Puedes introducir ciudades, pueblos o direcciones de diferentes países y calcular rutas internacionales por carretera.

El sistema permite seleccionar las coincidencias encontradas mostrando información sobre la ciudad, región y país.

---

## 🛠️ Tecnologías utilizadas

RutaCoste está desarrollado como una aplicación web estática utilizando tecnologías web estándar:

* **HTML5**
* **CSS3**
* **JavaScript**
* **Leaflet**
* **OpenStreetMap**
* **Nominatim**
* **OSRM**
* **Vercel**

No utiliza backend propio ni framework frontend.

---

## 🗺️ Servicios utilizados

### Nominatim

Se utiliza para la búsqueda y geocodificación de lugares.

Convierte búsquedas como:

```text
Madrid
```

en coordenadas geográficas que pueden utilizarse para calcular la ruta.

Proyecto:

https://nominatim.org/

### OSRM

Se utiliza para calcular la ruta real por carretera entre dos puntos.

Proyecto:

http://project-osrm.org/

### Leaflet

Se utiliza para mostrar el mapa interactivo y representar visualmente el recorrido.

Web:

https://leafletjs.com/

### OpenStreetMap

Los mapas utilizan datos de OpenStreetMap.

Web:

https://www.openstreetmap.org/

---

## ⚠️ Limitaciones de los servicios

RutaCoste utiliza servicios públicos y de demostración para la geocodificación, cálculo de rutas y mapas.

Estos servicios están pensados para un uso razonable y pueden aplicar límites de peticiones.

Por este motivo, si el proyecto alcanza un volumen elevado de tráfico, sería recomendable migrar a servicios con infraestructura y límites adecuados para producción, como alternativas comerciales o servicios propios.

La integración está centralizada principalmente en `app.js`, facilitando una futura sustitución.

---

## 🚀 Ejecutar el proyecto

RutaCoste no necesita un proceso de compilación.

Puedes descargar o clonar el repositorio y abrir `index.html` en un navegador.

```bash
git clone https://github.com/Pablorc222/RutaCoste.git
cd RutaCoste
```

También puedes desplegarlo directamente en servicios de hosting para sitios estáticos.

---

## ☁️ Despliegue

El proyecto está preparado para desplegarse en **Vercel**.

No necesita:

* Backend
* Base de datos
* Build command
* Framework
* Servidor propio

La aplicación puede desplegarse directamente conectando el repositorio de GitHub con Vercel.

🌐 **Demo:** https://ruta-coste.vercel.app/

---

## 📁 Estructura del proyecto

```text
RutaCoste/
│
├── index.html
├── style.css
├── app.js
│
├── aviso-legal.html
├── privacidad.html
├── cookies.html
│
├── robots.txt
└── sitemap.xml
```

### Archivos principales

| Archivo            | Función                        |
| ------------------ | ------------------------------ |
| `index.html`       | Página principal y calculadora |
| `style.css`        | Diseño y estilos               |
| `app.js`           | Lógica de la aplicación        |
| `aviso-legal.html` | Aviso legal                    |
| `privacidad.html`  | Política de privacidad         |
| `cookies.html`     | Política de cookies            |
| `robots.txt`       | Configuración para buscadores  |
| `sitemap.xml`      | Mapa del sitio                 |

---

## 🔎 SEO

RutaCoste incluye elementos básicos de SEO:

* `title` optimizado
* Meta description
* URL canónica
* Open Graph
* Robots meta
* `robots.txt`
* `sitemap.xml`
* Estructura semántica HTML
* Contenido informativo sobre el cálculo del combustible
* Preguntas frecuentes

El objetivo es que la herramienta pueda posicionarse para búsquedas relacionadas con:

* calcular coste de gasolina
* calculadora de gasolina
* coste de un viaje en coche
* calcular combustible de un viaje
* cuánto cuesta un viaje en coche
* calcular gasto de gasolina
* calculadora de combustible

---

## 📈 Próximas mejoras

Algunas mejoras previstas para futuras versiones:

* [ ] Añadir dominio propio
* [ ] Crear más contenido orientado a búsquedas
* [ ] Mejorar la precisión de los precios de combustible
* [ ] Añadir cálculo de peajes
* [ ] Añadir más opciones de vehículos
* [ ] Mejorar el cálculo para rutas internacionales
* [ ] Optimizar el rendimiento
* [ ] Añadir estadísticas de uso
* [ ] Migrar los servicios de demostración a infraestructura preparada para mayor tráfico

---

## 📄 Licencia

Proyecto desarrollado como aplicación web independiente.

Consulta las condiciones del repositorio para conocer los términos de uso del código.

---

## 🌐 Proyecto

**RutaCoste**
Calculadora de coste de combustible para viajes por carretera.

👉 https://ruta-coste.vercel.app/

👉 https://github.com/Pablorc222/RutaCoste
