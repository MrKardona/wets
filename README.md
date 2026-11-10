# Wets

Tienda de suplementos y skincare originales importados de USA, para Colombia. Sitio estático, liviano, con el mismo motor de compra de las landings de Importaciones JOG: carrito lateral, descuento por cantidad y formulario "Pide y paga al recibir" (contraentrega).

## Cómo se edita

Todo el contenido sale de dos archivos. Después de tocarlos se regenera el sitio:

```bash
node build.mjs
```

| Archivo | Qué contiene |
| --- | --- |
| `datos/config.mjs` | WhatsApp, dominio, datos legales, escalas de descuento, días de envío y devolución, puente de pedidos |
| `datos/productos.mjs` | Productos, objetivos ("¿Qué quieres cuidar?") y rutinas armadas |
| `assets/wets.css` · `assets/wets.js` | Estilos y motor de compra (se editan a mano) |
| `build.mjs` | Genera `index.html`, `p/<producto>/`, `legal/`, `sitemap.xml`, `robots.txt`, `llms.txt`, `catalogo.json` |

No hay dependencias que instalar. Para ver el sitio en el computador:

```bash
node servir.mjs
```

Los HTML, `sitemap.xml`, `llms.txt`, `catalogo.json`, `assets/catalogo.js` y `assets/p/` son generados: no se editan a mano, se regeneran.

## Antes de vender

El catálogo actual es **de muestra** (productos típicos con precios y vencimientos inventados). Mientras `modoDemo` esté en `true`, el sitio muestra un aviso y sale con `noindex` para que ningún buscador guarde esos precios.

1. Cargar productos, precios y vencimientos reales en `datos/productos.mjs`.
2. Poner fotos reales en `assets/fotos/` y apuntarlas con el campo `foto` (WebP cuadrado, 800 px). Sin foto se dibuja un envase genérico y Google no muestra la ficha de producto.
3. Completar `whatsapp`, `empresa` (razón social, NIT, ciudad) y `geo` en `datos/config.mjs`.
4. Revisar que las promesas del sitio sean las que se van a cumplir: envío gratis, días de entrega, 30 días de cambios, garantía de originalidad.
5. Cambiar `modoDemo` a `false` y correr `node build.mjs`.

Los suplementos dietarios importados requieren registro sanitario INVIMA y los cosméticos, notificación sanitaria obligatoria. Los textos del sitio describen el producto sin prometer efectos de salud; conviene mantenerlos así.

## Cómo entra un pedido

El cliente llega al formulario por dos caminos: "Pedir y pagar al recibir" en la página de un producto (elige 1, 2 o 3 unidades) o "Pagar al recibir" desde el carrito. El descuento por cantidad se calcula sobre el total de unidades del pedido (`escalas` en la configuración: 5% con 2, 10% con 3 o más).

Según `pedidos.endpoint` en `datos/config.mjs`:

- **Vacío (hoy):** el pedido se arma como mensaje y se abre WhatsApp hacia el número configurado.
- **Con URL:** el formulario hace `POST` del pedido en JSON a ese puente.

### Conectar Dropi

Dropi no se llama desde el navegador (expondría el token de la tienda). Se usa un puente, igual que el de Tiendanube y Effi en JOG: un Cloudflare Worker que recibe el pedido, lo valida y crea la orden con recaudo en Dropi.

El puente recibe:

```json
{
  "productos": [{ "id": "creatina-...", "dropi": 12345, "nombre": "...", "cantidad": 2, "precio_unitario": 123405 }],
  "total": 246810, "descuento": 12990, "pago": "contraentrega",
  "nombre": "...", "telefono": "3001234567", "correo": "",
  "departamento": "Antioquia", "ciudad": "Medellín",
  "direccion": "...", "barrio": "...", "detalles": "",
  "origen": "https://.../p/creatina-.../"
}
```

y responde `{ "ok": true, "numero": "1234", "total": 246810 }` o `{ "ok": false, "problemas": ["mensaje para el cliente"] }`.

Para dejarlo listo: poner en cada producto el campo `dropi` con su id en Dropi, recalcular el total en el puente con los precios del servidor (no confiar en el que manda el navegador) y permitir CORS solo desde el dominio de la tienda. Los nombres de departamento y ciudad vienen de `assets/ciudades.json`.

## SEO y buscadores de IA (GEO)

- Todo el contenido está en el HTML: una página por producto con precio, ficha, uso y preguntas, sin depender de JavaScript.
- Datos estructurados: `OnlineStore`, `WebSite`, `ItemList`, `Product` con `Offer` (contraentrega, envío gratis, devolución), `BreadcrumbList` y `FAQPage`.
- `llms.txt` resume la tienda y el catálogo para asistentes; `catalogo.json` es el mismo catálogo en formato de máquina.
- `robots.txt` permite de forma explícita a Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended, Applebot y otros.
- `sitemap.xml` con todas las páginas y sus imágenes; metadatos `geo.*`, `hreflang es-CO`, canónicas y Open Graph.
- Clave IndexNow en la raíz. Al publicar cambios se avisa a Bing y compañía con:

```bash
curl "https://api.indexnow.org/indexnow?url=https://TU-DOMINIO/&key=b7d1f0a94c2e4e6f8a3d5c1e9f2b6a70"
```

Al salir de demo: registrar el dominio en Google Search Console y Bing Webmaster Tools y enviar el sitemap.

## Publicación

GitHub Pages sirve la rama `main` desde la raíz. Con dominio propio: crear el archivo `CNAME` con el dominio, cambiar `url` en `datos/config.mjs` y regenerar.

## De dónde salen las tácticas de venta

| Táctica en Wets | Referente |
| --- | --- |
| Formulario contraentrega con escalas 1, 2 y 3 unidades | Importaciones JOG (formulario propio, estilo Releasit) |
| Carrito lateral con barra "agrega 1 más y ahorra" y productos sugeridos | Tiendanube de JOG, guías de bundles para suplementos |
| "¿Qué quieres cuidar?" (compra por objetivo) | The Ordinary (Common Concerns), JOG |
| Rutinas armadas con ahorro | Ritual (Starter Sets), The Ordinary (Sets) |
| Recomendador de 3 preguntas | Quizzes de rutina en skincare |
| Vencimiento visible y garantía de originalidad | iHerb (fecha de vencimiento en cada producto) |
| Franja de sellos de confianza bajo el hero | Ritual |
| Preguntas frecuentes que responden objeciones | Buenas prácticas de CRO |

No se incluyeron reseñas ni contadores de urgencia porque todavía no hay datos reales; el campo `resenas` de cada producto los activa cuando existan.
