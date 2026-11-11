/*
 * Generador del sitio de Wets. Sin dependencias: node build.mjs
 *
 * Lee datos/config.mjs y datos/productos.mjs y escribe HTML estático listo para
 * GitHub Pages: la portada, una página por producto (/p/<id>/), /legal/, y los
 * archivos para buscadores y agentes de IA (sitemap.xml, robots.txt, llms.txt,
 * catalogo.json). Todo el contenido queda en el HTML, sin depender de JavaScript,
 * para que cualquier rastreador lo lea.
 */
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import C from "./datos/config.mjs";
import { OBJETIVOS, PRODUCTOS, RUTINAS, PORTADA, DESTACADOS } from "./datos/productos.mjs";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const HOY = new Date().toISOString().slice(0, 10);
const VALIDO_HASTA = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
const ENVIO_TXT = `${C.envio.diasMin} a ${C.envio.diasMax} días hábiles`;
const CATS = {
  suplementos: { nombre: "Suplementos", titulo: "Suplementos originales traídos de USA", ceja: "Cuerpo" },
  skincare: { nombre: "Skincare", titulo: "Skincare coreano y cuidado personal", ceja: "Piel" },
};

// ───────────── utilidades ─────────────
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const plata = (n) => "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const vence = (v) => (v ? v.slice(5, 7) + "/" + v.slice(0, 4) : "");
const porId = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p]));
const descuentoPara = (n) => (C.escalas.find((e) => n >= e.desde) || { descuento: 0 }).descuento;
const maxDescuento = Math.round(Math.max(...C.escalas.map((e) => e.descuento)) * 100);
const off = (p) => (p.antes > p.precio ? Math.round((1 - p.precio / p.antes) * 100) : 0);
// Fotos por convención: assets/fotos/<id>-1.webp, -2, -3… (900 px) y su versión chica <id>-1s.webp (440 px).
const FOTOS = Object.fromEntries(PRODUCTOS.map((p) => {
  const l = [];
  for (let n = 1; n <= 8 && existsSync(join(RAIZ, `assets/fotos/${p.id}-${n}.webp`)); n++) l.push(n);
  return [p.id, l];
}));
const conFotos = (p) => FOTOS[p.id].length > 0;
const img = (p, n = 1, chica = false) => (conFotos(p) ? `assets/fotos/${p.id}-${Math.min(n, FOTOS[p.id].length)}${chica ? "s" : ""}.webp` : `assets/p/${p.id}.svg`);
const srcset = (p, n, raiz, sizes) => (conFotos(p) ? ` srcset="${raiz}${img(p, n, true)} 440w, ${raiz}${img(p, n)} 900w" sizes="${sizes}"` : "");
const numero = (p) => String(PRODUCTOS.indexOf(p) + 1).padStart(2, "0");
const compradoEn = (p) => p.origen || "Estados Unidos";
const traido = (p) => (p.origen ? `Marca de ${p.pais || p.origen}` : "Traído de USA");
const urlP = (p) => `${C.url}/p/${p.id}/`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const waLink = (texto) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(texto)}`;

function escribir(ruta, contenido) {
  const destino = join(RAIZ, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
}

for (const p of PRODUCTOS) {
  for (const id of p.combina || []) if (!porId[id]) throw new Error(`${p.id}: "combina" apunta a un producto que no existe: ${id}`);
  for (const o of p.objetivos) if (!OBJETIVOS.some((x) => x.id === o)) throw new Error(`${p.id}: objetivo desconocido: ${o}`);
}
for (const r of RUTINAS) for (const id of r.items) if (!porId[id]) throw new Error(`${r.id}: producto inexistente: ${id}`);
for (const id of [...PORTADA, ...DESTACADOS]) if (!porId[id]) throw new Error(`PORTADA/DESTACADOS: producto inexistente: ${id}`);
const sinFotos = PRODUCTOS.filter((p) => FOTOS[p.id].length < 3).map((p) => `${p.id} (${FOTOS[p.id].length})`);

// ───────────── dibujo del envase (mientras no haya foto real) ─────────────
function dibujo(p0) {
  const p = { forma: "frasco", color: "#FBF8F1", fondo: "#E9E1D0", corto: p0.marca.toUpperCase().slice(0, 12), ...p0 };
  const c = p.color, t = "#14201B";
  const claro = /^#(F|E|D)/i.test(c);
  const tapa = claro ? "#2C3A44" : t;
  const etiqueta = (x, y, w, h) => {
    const ancho = (txt, tam) => Math.min(txt.length * tam * 0.66, w - 12);
    const marca = p.marca.toUpperCase();
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FBF8F1"/>`
      + `<text x="${x + w / 2}" y="${y + 17}" text-anchor="middle" font-size="7" letter-spacing=".6" fill="#46544C" textLength="${ancho(marca, 7.6)}" lengthAdjust="spacingAndGlyphs">${esc(marca)}</text>`
      + `<rect x="${x + w / 2 - 9}" y="${y + 23}" width="18" height="2" fill="#EE4A1F"/>`
      + `<text x="${x + w / 2}" y="${y + 42}" text-anchor="middle" font-size="11" font-weight="700" fill="${t}" textLength="${ancho(p.corto, 11)}" lengthAdjust="spacingAndGlyphs">${esc(p.corto)}</text>`;
  };
  const brillo = (x, y, h) => `<rect x="${x}" y="${y}" width="7" height="${h}" rx="3.5" fill="#fff" opacity="${claro ? 0.7 : 0.22}"/>`;
  const borde = claro ? ` stroke="#14201B" stroke-opacity=".12"` : "";
  const formas = {
    frasco: `<rect x="62" y="22" width="76" height="34" rx="7" fill="${tapa}"/><rect x="72" y="54" width="56" height="12" fill="${tapa}" opacity=".7"/><rect x="46" y="64" width="108" height="154" rx="16" fill="${c}"${borde}/>${etiqueta(46, 106, 108, 58)}${brillo(56, 76, 22)}`,
    tarro: `<rect x="34" y="34" width="132" height="36" rx="9" fill="${tapa}"/><rect x="40" y="68" width="120" height="150" rx="14" fill="${c}"${borde}/>${etiqueta(40, 108, 120, 62)}${brillo(50, 80, 20)}`,
    gotero: `<rect x="88" y="10" width="24" height="40" rx="11" fill="${tapa}"/><rect x="80" y="46" width="40" height="18" rx="4" fill="${tapa}"/><rect x="64" y="62" width="72" height="156" rx="12" fill="${c}"${borde}/>${etiqueta(64, 112, 72, 58)}${brillo(72, 72, 30)}`,
    dispensador: `<path d="M96 14h34a6 6 0 0 1 6 6v8h-28v14H96z" fill="${tapa}"/><rect x="84" y="40" width="36" height="20" rx="4" fill="${tapa}"/><rect x="54" y="58" width="92" height="160" rx="18" fill="${c}"${borde}/>${etiqueta(54, 104, 92, 60)}${brillo(63, 72, 24)}`,
    tubo: `<path d="M56 22h88l-10 162H66z" fill="${c}"${borde}/><rect x="56" y="14" width="88" height="10" rx="3" fill="${tapa}" opacity=".55"/><rect x="70" y="182" width="60" height="36" rx="6" fill="${tapa}"/>${etiqueta(66, 76, 68, 58)}`,
    pote: `<rect x="38" y="92" width="124" height="38" rx="9" fill="${tapa}"/><rect x="44" y="128" width="112" height="90" rx="16" fill="${c}"${borde}/>${etiqueta(44, 146, 112, 54)}`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" font-family="Arial,Helvetica,sans-serif"><rect width="240" height="240" fill="${p.fondo}"/><circle cx="196" cy="44" r="70" fill="#fff" opacity=".22"/><ellipse cx="120" cy="216" rx="64" ry="8" fill="#14201B" opacity=".13"/><g transform="translate(28 12) scale(.92)">${formas[p.forma] || formas.frasco}</g></svg>`;
}

// ───────────── piezas ─────────────
const ICO = {
  billete: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>`,
  bolsa: `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
  gota: `<svg class="logo__gota" viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0c3 4.4 6 7 6 10.2A6 6 0 0 1 0 10.2C0 7 3 4.400 6 0z"/></svg>`,
};

function cabeza({ raiz, titulo, descripcion, ruta, tipo = "website", extra = "", jsonld = [], imagen = "assets/img/caja.webp" }) {
  const canonica = C.url + ruta;
  const g = C.geo;
  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="robots" content="${C.modoDemo ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1"}">
<link rel="canonical" href="${canonica}">
<link rel="alternate" hreflang="es-CO" href="${canonica}">
<link rel="alternate" hreflang="x-default" href="${canonica}">
<link rel="alternate" type="text/plain" href="${C.url}/llms.txt" title="Resumen para asistentes de IA">
<link rel="alternate" type="application/json" href="${C.url}/catalogo.json" title="Catálogo de ${esc(C.marca)}">
<meta name="theme-color" content="#13201A">
<meta name="geo.region" content="${esc(g.region)}">${g.ciudad ? `
<meta name="geo.placename" content="${esc(g.ciudad)}, Colombia">` : ""}${g.lat != null && g.lon != null ? `
<meta name="geo.position" content="${g.lat};${g.lon}">
<meta name="ICBM" content="${g.lat}, ${g.lon}">` : ""}
<meta name="language" content="Spanish">
<meta property="og:type" content="${tipo}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${canonica}">
<meta property="og:locale" content="es_CO">
<meta property="og:site_name" content="${esc(C.marca)}">
<meta property="og:image" content="${C.url}/${imagen}">
<meta name="twitter:card" content="summary_large_image">
${extra}<link rel="icon" type="image/svg+xml" href="${raiz}assets/favicon.svg">
<link rel="preload" as="font" type="font/woff2" href="${raiz}assets/fonts/bricolage-grotesque.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="${raiz}assets/fonts/instrument-sans.woff2" crossorigin>
<link rel="stylesheet" href="${raiz}assets/wets.css">
<script>document.documentElement.className='js'</script>
${jsonld.map(ld).join("\n")}
</head>
<body>
<i class="prog" aria-hidden="true"></i>
<a class="salto" href="#contenido">Saltar al contenido</a>
<p class="aviso">Envío gratis a toda Colombia <i>·</i> Pagas al recibir<span class="aviso__x"> <i>·</i> 100% originales de USA</span></p>
<header class="cab">
  <div class="wrap cab__in">
    <a class="logo" href="${raiz || "./"}" aria-label="${esc(C.marca)}, ir al inicio">wets${ICO.gota}</a>
    <nav class="cab__nav" aria-label="Principal">
      <a href="${raiz}#suplementos">Suplementos</a>
      <a href="${raiz}#skincare">Skincare</a>
      <a href="${raiz}#destacados">Destacados</a>
      <a href="${raiz}#rutinas">Rutinas</a>
      <a href="${raiz}#originalidad">Originalidad</a>
      <a href="${raiz}#preguntas">Preguntas</a>
    </nav>
    <button class="cab__carro js-abrir-carro" type="button" aria-label="Abrir el carrito de compras">${ICO.bolsa}<span>Carrito</span><b class="cab__cuenta js-cuenta" hidden>0</b></button>
  </div>
</header>
<main id="contenido">
`;
}

function pie(raiz) {
  const e = C.empresa;
  const redes = [
    C.instagram && `<a href="https://www.instagram.com/${esc(C.instagram)}" rel="noopener">Instagram</a>`,
    C.tiktok && `<a href="https://www.tiktok.com/@${esc(C.tiktok)}" rel="noopener">TikTok</a>`,
    `<a href="${waLink("Hola Wets, tengo una pregunta.")}" rel="noopener">WhatsApp</a>`,
  ].filter(Boolean).join("");
  return `</main>
<footer class="pie">
  <div class="wrap pie__grid">
    <div>
      <a class="logo logo--pie" href="${raiz || "./"}">wets${ICO.gota}</a>
      <p>${esc(C.lema)} Suplementos y productos para el cuidado de la piel importados de Estados Unidos, con envío gratis y pago contraentrega en Colombia.</p>
    </div>
    <nav aria-label="Tienda"><h2>Tienda</h2><a href="${raiz}#suplementos">Suplementos</a><a href="${raiz}#skincare">Skincare</a><a href="${raiz}#rutinas">Rutinas armadas</a><a href="${raiz}#quiz">Armar mi rutina</a></nav>
    <nav aria-label="Ayuda"><h2>Ayuda</h2><a href="${raiz}#originalidad">Originalidad</a><a href="${raiz}#preguntas">Preguntas frecuentes</a><a href="${raiz}legal/">Términos, envíos y datos</a></nav>
    <nav aria-label="Contacto"><h2>Contacto</h2>${redes}${C.correo ? `<a href="mailto:${esc(C.correo)}">${esc(C.correo)}</a>` : ""}</nav>
  </div>
  <div class="wrap pie__legal">
    <p>Los suplementos dietarios no son medicamentos y no reemplazan una alimentación balanceada. Si estás en embarazo, lactancia o bajo tratamiento médico, consulta a tu médico antes de consumirlos. Las marcas mostradas pertenecen a sus dueños; ${esc(C.marca)} es un comercio independiente que las importa y distribuye.</p>
    <p>© ${HOY.slice(0, 4)} ${esc(e.razonSocial || C.marca)}${e.nit ? ` · NIT ${esc(e.nit)}` : ""}${e.ciudad ? ` · ${esc(e.ciudad)}, Colombia` : " · Colombia"}</p>
  </div>
</footer>
${C.modoDemo ? `<p class="demo">Precios de referencia, por confirmar</p>` : ""}
<script src="${raiz}assets/catalogo.js" defer></script>
<script src="${raiz}assets/wets.js" defer></script>
</body>
</html>
`;
}

function tarjeta(p, raiz) {
  const d = off(p);
  const nombre = `${p.nombre} ${p.marca}`;
  return `<article class="card" data-cat="${p.cat}" data-obj="${p.objetivos.join(" ")}">
  <a class="card__img" href="${raiz}p/${p.id}/" tabindex="-1">
    <img src="${raiz}${img(p, 1, true)}"${srcset(p, 1, raiz, "(min-width:860px) 270px, (min-width:620px) 31vw, 46vw")} alt="${esc(nombre)}, ${esc(p.tamano)}" width="440" height="440" loading="lazy" decoding="async">${FOTOS[p.id].length > 1 ? `
    <img class="card__f2" data-src="${raiz}${img(p, 2, true)}" alt="" width="440" height="440" decoding="async">` : ""}
    ${d ? `<span class="tag tag--off">${d}% OFF</span>` : p.etiqueta ? `<span class="tag">${esc(p.etiqueta)}</span>` : ""}
    <span class="card__n">N.º ${numero(p)}</span>
  </a>
  <div class="card__txt">
    <p class="card__marca">${esc(p.marca)}</p>
    <h3 class="card__nombre"><a href="${raiz}p/${p.id}/">${esc(p.nombre)}</a></h3>
    <p class="card__tam">${esc(p.tamano)}</p>
    <p class="precio"><b>${plata(p.precio)}</b>${p.antes ? ` <s>${plata(p.antes)}</s>` : ""}</p>
    <p class="card__nota">Envío gratis · hasta ${maxDescuento}% menos llevando 3</p>
    <button class="btn btn--tinta js-agregar" type="button" data-id="${p.id}">Comprar</button>
  </div>
</article>`;
}

const FAQ = [
  ["¿Los productos de Wets son originales?", `Sí. ${C.marca} compra cada producto en Estados Unidos a tiendas y distribuidores autorizados de la marca. Llega sellado de fábrica, con el lote y la fecha de vencimiento impresos en el envase; si quieres saber la fecha antes de pedir, te la confirmamos por WhatsApp. Si recibes algo que no es original, te devolvemos el 100% del dinero.`],
  ["¿Puedo pagar contraentrega?", `Sí. Haces el pedido sin pagar nada y pagas en efectivo cuando la transportadora te lo entrega. El pago contraentrega está disponible según la cobertura de la transportadora en tu municipio; si tu dirección no tiene cobertura te escribimos por WhatsApp para darte otra opción.`],
  ["¿Cuánto cuesta el envío y cuánto tarda?", `El envío es gratis a toda Colombia. La entrega tarda de ${ENVIO_TXT} según la ciudad.`],
  ["¿Cómo hago un pedido?", `Elige el producto y toca "Pedir y pagar al recibir". Llenas tu nombre, celular y dirección en un formulario corto, confirmas, y te contactamos por WhatsApp para verificar el pedido antes de despacharlo. No necesitas crear cuenta ni tarjeta.`],
  ["¿Hay descuento si llevo varios productos?", `Sí. Con 2 productos en el mismo pedido tienes ${Math.round(descuentoPara(2) * 100)}% de descuento y con 3 o más, ${Math.round(descuentoPara(3) * 100)}%. El descuento se aplica solo en el carrito y puedes combinar suplementos y skincare.`],
  ["¿Puedo devolver un producto?", `Tienes ${C.devolucionDias} días desde que lo recibes para pedir cambio o devolución si el producto llega en mal estado, no es lo que pediste o sigue sellado. Además aplica el derecho de retracto de 5 días hábiles de la ley colombiana para compras a distancia.`],
  ["¿Los suplementos tienen efectos médicos?", `No. Los suplementos dietarios no son medicamentos, no sirven para diagnosticar, tratar ni curar enfermedades y no reemplazan una alimentación balanceada. Si estás en embarazo, lactancia o tomas medicamentos, consulta primero a tu médico.`],
];
const faqHtml = (lista) => lista.map(([q, a], i) => `<details class="faq__item"${i === 0 ? " open" : ""}><summary><h3>${esc(q)}</h3></summary><p>${esc(a)}</p></details>`).join("\n");
const faqLd = (lista) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: lista.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

const tiendaLd = () => ({
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": C.url + "/#tienda",
  name: C.marca,
  url: C.url + "/",
  slogan: C.lema,
  description: "Tienda en línea de suplementos y productos para el cuidado de la piel originales, importados de Estados Unidos, con envío gratis y pago contraentrega en Colombia.",
  areaServed: { "@type": "Country", name: "Colombia" },
  currenciesAccepted: "COP",
  paymentAccepted: "Pago contraentrega (efectivo al recibir)",
  ...(C.correo && { email: C.correo }),
  ...(C.whatsapp && { telephone: "+" + C.whatsapp, contactPoint: { "@type": "ContactPoint", telephone: "+" + C.whatsapp, contactType: "customer service", availableLanguage: "Spanish" } }),
  ...(C.empresa.ciudad && { address: { "@type": "PostalAddress", addressLocality: C.empresa.ciudad, addressCountry: "CO" } }),
  sameAs: [C.instagram && `https://www.instagram.com/${C.instagram}`, C.tiktok && `https://www.tiktok.com/@${C.tiktok}`].filter(Boolean),
});

const ofertaLd = (p) => ({
  "@type": "Offer",
  url: urlP(p),
  priceCurrency: "COP",
  price: String(p.precio),
  priceValidUntil: VALIDO_HASTA,
  availability: "https://schema.org/InStock",
  itemCondition: "https://schema.org/NewCondition",
  seller: { "@id": C.url + "/#tienda" },
  areaServed: { "@type": "Country", name: "Colombia" },
  acceptedPaymentMethod: ["http://purl.org/goodrelations/v1#COD"],
  hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", applicableCountry: "CO", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: C.devolucionDias },
  shippingDetails: {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "COP" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "CO" },
    deliveryTime: { "@type": "ShippingDeliveryTime", transitTime: { "@type": "QuantitativeValue", minValue: C.envio.diasMin, maxValue: C.envio.diasMax, unitCode: "DAY" } },
  },
});

// ───────────── portada ─────────────
function portada() {
  const raiz = "";
  const cuenta = {};
  for (const p of PRODUCTOS) cuenta[p.marca] = (cuenta[p.marca] || 0) + 1;
  const marcas = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]); // las más presentes primero
  const mano = (PORTADA.length === 5 ? PORTADA.map((id) => porId[id]) : PRODUCTOS.slice(0, 5));
  const destacados = (DESTACADOS.length ? DESTACADOS.map((id) => porId[id]) : PRODUCTOS.slice(0, 8));
  const cuantos = (cat) => PRODUCTOS.filter((p) => p.cat === cat).length;

  const objetivos = OBJETIVOS.map((o, i) => {
    const cat = o.grupo === "Piel" ? "skincare" : "suplementos";
    return `<a class="obj js-obj" href="#${cat}" data-obj="${o.id}"><span class="obj__n">${String(i + 1).padStart(2, "0")} · ${o.grupo}</span><b>${esc(o.nombre)}</b><span>${esc(o.pista)}</span></a>`;
  }).join("\n");

  const seccion = (cat) => `<section class="sec" id="${cat}">
  <div class="wrap">
    <header class="sec__cab"><p class="ceja">${CATS[cat].ceja} · ${cuantos(cat)} productos</p><h2>${CATS[cat].titulo}</h2></header>
    <p class="filtro js-filtro" hidden></p>
    <div class="grid">
${PRODUCTOS.filter((p) => p.cat === cat).map((p) => tarjeta(p, raiz)).join("\n")}
    </div>
  </div>
</section>`;

  const rutinas = RUTINAS.map((r) => {
    const items = r.items.map((id) => porId[id]);
    const suma = items.reduce((a, p) => a + p.precio, 0);
    const d = descuentoPara(items.length);
    const total = items.reduce((a, p) => a + Math.round(p.precio * (1 - d)), 0);
    return `<article class="rut">
  <div class="rut__fotos">${items.map((p) => `<img src="${img(p, 1, true)}" alt="" width="440" height="440" loading="lazy" decoding="async">`).join("")}</div>
  <p class="ceja">${esc(r.para)}</p>
  <h3>${esc(r.nombre)}</h3>
  <p class="rut__nota">${esc(r.nota)}</p>
  <ul>${items.map((p) => `<li><a href="p/${p.id}/">${esc(p.nombre)}</a> <span>${esc(p.marca)}</span></li>`).join("")}</ul>
  <p class="precio precio--claro"><b>${plata(total)}</b> <s>${plata(suma)}</s> <span class="tag tag--off">${Math.round(d * 100)}% menos</span></p>
  <button class="btn btn--crema js-rutina" type="button" data-ids="${r.items.join(",")}">Agregar la rutina</button>
</article>`;
  }).join("\n");

  const jsonld = [
    tiendaLd(),
    { "@context": "https://schema.org", "@type": "WebSite", name: C.marca, url: C.url + "/", inLanguage: "es-CO", publisher: { "@id": C.url + "/#tienda" } },
    { "@context": "https://schema.org", "@type": "ItemList", name: `Catálogo de ${C.marca}`, numberOfItems: PRODUCTOS.length, itemListElement: PRODUCTOS.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: urlP(p), name: `${p.nombre} ${p.marca} ${p.tamano}` })) },
    faqLd(FAQ),
  ];

  return cabeza({
    raiz,
    ruta: "/",
    titulo: `${C.marca} | Suplementos y skincare originales de USA en Colombia`,
    descripcion: `Suplementos y skincare 100% originales importados de Estados Unidos: ${marcas.slice(0, 4).join(", ")} y más. Envío gratis a toda Colombia y pago contraentrega.`,
    jsonld,
  }) + `
<section class="hero">
  <div class="wrap hero__grid">
    <div class="hero__txt">
      <p class="ceja">Importado de Estados Unidos · Entrega en toda Colombia</p>
      <h1>Suplementos y skincare <em>originales</em>, traídos de USA. Pagas al recibir.</h1>
      <p class="hero__sub">Marcas como ${["Centrum", "Medicube", "Nature's Bounty", "Anua"].join(", ")}, compradas en Estados Unidos y entregadas en tu casa en ${ENVIO_TXT}. Sin pagos por adelantado.</p>
      <div class="hero__cta">
        <a class="cod" href="#suplementos">${ICO.billete}Ver productos</a>
        <a class="btn btn--linea" href="#quiz">Armar mi rutina en 1 minuto</a>
      </div>
      <ul class="hero__puntos"><li>Envío gratis</li><li>Pago contraentrega</li><li>${C.devolucionDias} días para cambios</li></ul>
    </div>
    <div class="mano">
      ${mano.map((p, i) => `<a class="mano__c" href="p/${p.id}/" style="--i:${i - 2};--z:${5 - Math.abs(i - 2)}"><img src="${img(p, 1, true)}" alt="${esc(p.nombre)} ${esc(p.marca)}" width="440" height="440"${i === 2 ? ' fetchpriority="high"' : ""}><span><small>${esc(p.marca)}</small>${esc(p.corto || p.nombre)}</span></a>`).join("\n      ")}
      <svg class="sello" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="aro" d="M100 100m-80 0a80 80 0 1 1 160 0a80 80 0 1 1-160 0"/></defs><circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="100" cy="100" r="63" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 5"/><text font-size="12.5" font-weight="700" fill="currentColor"><textPath href="#aro" textLength="496" lengthAdjust="spacing">100% ORIGINAL · TRAÍDO DE USA · PAGAS AL RECIBIR ·</textPath></text><text x="100" y="104" text-anchor="middle" font-size="34" font-weight="800" fill="currentColor">USA</text><text x="100" y="124" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="2" fill="currentColor">COLOMBIA</text></svg>
    </div>
  </div>
</section>

<div class="cinta" aria-hidden="true"><div class="cinta__pista">${Array(2).fill(["100% original", "Traído de USA", "Sellado de fábrica", "Pago contraentrega", "Envío gratis", "Asesoría por WhatsApp"].map((t) => `<span>${t}</span>`).join("")).join("")}</div></div>

<section class="wrap cats" aria-label="Categorías">
  <a class="cat" href="#suplementos" data-sp><img src="assets/img/suplementos.webp" alt="" width="960" height="1200" loading="lazy" decoding="async"><div class="cat__txt"><p class="ceja">Cuerpo · ${cuantos("suplementos")} productos</p><h2>Suplementos</h2><span class="cat__ir">Ver suplementos</span></div></a>
  <a class="cat" href="#skincare" data-sp><img src="assets/img/skincare.webp" alt="" width="960" height="1200" loading="lazy" decoding="async"><div class="cat__txt"><p class="ceja">Piel · ${cuantos("skincare")} productos</p><h2>Skincare</h2><span class="cat__ir">Ver skincare</span></div></a>
</section>

<section class="rail js-rail" id="destacados" data-sp="fijo">
  <div class="rail__fijo">
    <div class="wrap"><header class="sec__cab"><p class="ceja">Selección Wets</p><h2>${destacados.length} productos para empezar a conocernos</h2></header></div>
    <div class="rail__pista">
      ${destacados.map((p, i) => `<a class="rail__c" href="p/${p.id}/"><img src="${img(p, 2, true)}"${srcset(p, 2, "", "(min-width:860px) 360px, 76vw")} alt="${esc(p.nombre)} ${esc(p.marca)}" width="900" height="900" loading="lazy" decoding="async"><span class="rail__n">${String(i + 1).padStart(2, "0")} / ${String(destacados.length).padStart(2, "0")}</span><div class="rail__txt"><small>${esc(p.marca)}</small><b>${esc(p.corto || p.nombre)}</b><span>${plata(p.precio)}</span></div></a>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="sec sec--obj" id="objetivos">
  <div class="wrap">
    <header class="sec__cab"><p class="ceja">Compra por objetivo</p><h2>¿Qué quieres cuidar?</h2></header>
    <div class="objs">
${objetivos}
    </div>
  </div>
</section>

${seccion("suplementos")}

${seccion("skincare")}

<section class="sec sec--tinta" id="rutinas">
  <div class="wrap">
    <header class="sec__cab"><p class="ceja">Rutinas armadas</p><h2>Lleva la rutina completa y paga menos</h2><p>Con 2 productos tienes ${Math.round(descuentoPara(2) * 100)}% de descuento y con 3 o más, ${Math.round(descuentoPara(3) * 100)}%. Aplica solo, sin cupones.</p></header>
    <div class="ruts">
${rutinas}
    </div>
  </div>
</section>

<section class="sec sec--agua" id="quiz">
  <div class="wrap quiz__grid">
    <header class="sec__cab"><p class="ceja">1 minuto · 2 preguntas</p><h2>¿No sabes por dónde empezar?</h2><p>Responde dos preguntas y te mostramos los productos del catálogo que van con lo que buscas, sin relleno.</p></header>
    <div class="quiz js-quiz"><noscript><p>Para usar el recomendador activa JavaScript, o escríbenos por WhatsApp y te asesoramos.</p></noscript></div>
  </div>
</section>

<section class="sec" id="originalidad">
  <div class="wrap orig">
    <div class="orig__izq">
      <header class="sec__cab"><p class="ceja">Originalidad</p><h2>Así sabes que lo que recibes es original</h2></header>
      <p class="orig__garantia"><b>Garantía de originalidad:</b> si un producto no es original, te devolvemos el 100% de tu dinero.</p>
      <figure class="orig__foto" data-sp><img src="assets/img/caja.webp" alt="Caja de envío abierta con productos sellados" width="1100" height="739" loading="lazy" decoding="async"></figure>
    </div>
    <ol class="orig__lista">
      <li style="--i:0"><b>Comprado en Estados Unidos</b><span>Cada producto se compra allá, a tiendas y distribuidores autorizados de la marca. No trabajamos con réplicas ni con mercancía de origen dudoso.</span></li>
      <li style="--i:1"><b>Sellado de fábrica</b><span>Llega con el sello de seguridad intacto y en su empaque original, tal como se vende en USA.</span></li>
      <li style="--i:2"><b>Lote y vencimiento impresos</b><span>Cada envase trae su lote y su fecha de vencimiento. Si quieres saber la fecha antes de pedir, te la confirmamos por WhatsApp.</span></li>
      <li style="--i:3"><b>Revisas antes de pagar</b><span>Como pagas contraentrega, recibes el paquete primero. No hay pagos por adelantado.</span></li>
    </ol>
  </div>
</section>

<section class="sec sec--pasos" id="como-funciona">
  <div class="wrap">
    <header class="sec__cab"><p class="ceja">Pago contraentrega</p><h2>Pides hoy, pagas cuando te llegue</h2></header>
    <ol class="pasos">
      <li><b>Elige y pide</b><span>Toca "Pedir y pagar al recibir" y llena tus datos de entrega. Toma menos de un minuto.</span></li>
      <li><b>Confirmamos por WhatsApp</b><span>Te escribimos para verificar el pedido y la dirección antes de despacharlo.</span></li>
      <li><b>Recibes y pagas</b><span>La transportadora lo entrega en ${ENVIO_TXT} y pagas en efectivo en la puerta.</span></li>
    </ol>
  </div>
</section>

<section class="sec" id="preguntas">
  <div class="wrap faq">
    <header class="sec__cab"><p class="ceja">Preguntas frecuentes</p><h2>Lo que más nos preguntan</h2><p>¿Otra duda? <a href="${waLink("Hola Wets, tengo una pregunta.")}" rel="noopener">Escríbenos por WhatsApp</a>.</p></header>
    <div class="faq__lista">
${faqHtml(FAQ)}
    </div>
  </div>
</section>
` + pie(raiz);
}

// ───────────── página de producto ─────────────
function paginaProducto(p) {
  const raiz = "../../";
  const d = off(p);
  const cat = CATS[p.cat];
  const nombreLargo = `${p.nombre} ${p.marca} ${p.tamano.split(" · ")[0]}`;
  const descripcion = `${p.nombre} de ${p.marca} (${p.tamano}) original${p.origen ? "" : ", traído de USA"}. ${plata(p.precio)} con envío gratis y pago contraentrega en Colombia.`;
  const fotos = FOTOS[p.id].length ? FOTOS[p.id] : [1];
  const pieFoto = ["empaque", "en ambiente", "detalle", "foto de la marca"];
  const avisoBase = p.cat === "suplementos"
    ? "Es un suplemento dietario, no un medicamento: no sirve para diagnosticar, tratar ni curar enfermedades y no reemplaza una alimentación balanceada. Consulta a tu médico si estás en embarazo, lactancia o tomas medicamentos. Mantener fuera del alcance de los niños."
    : "Uso externo. Prueba primero en una zona pequeña y suspende el uso si notas irritación. Evita el contacto con los ojos.";
  const ficha = [
    ["Marca", p.marca + (p.pais ? ` (${p.pais})` : "")],
    ["Presentación", p.tamano],
    ["Categoría", cat.nombre + (p.paso ? ` · ${p.paso}` : "")],
    ["Comprado en", compradoEn(p)],
    p.vence && ["Vence", vence(p.vence)],
    ["Envío", `Gratis a toda Colombia, ${ENVIO_TXT}`],
    ["Pago", "Contraentrega, en efectivo al recibir"],
    ["Cambios y devoluciones", `${C.devolucionDias} días`],
  ].filter(Boolean);
  const faq = [
    [`¿${p.nombre} de ${p.marca} es original?`, `Sí. ${C.marca} lo compra en ${compradoEn(p)} a tiendas y distribuidores autorizados y lo entrega sellado de fábrica${p.vence ? `, con vencimiento ${vence(p.vence)}` : ""}. Si no es original te devolvemos el 100% del dinero.`],
    [`¿Cuánto cuesta ${p.nombre} en Colombia?`, `En ${C.marca} cuesta ${plata(p.precio)} COP con envío gratis a toda Colombia. Llevando 2 productos tienes ${Math.round(descuentoPara(2) * 100)}% de descuento y con 3 o más, ${Math.round(descuentoPara(3) * 100)}%.`],
    ["¿Puedo pagarlo contraentrega?", `Sí. Lo pides sin pagar nada y pagas en efectivo cuando te llega, según la cobertura de la transportadora en tu municipio. La entrega tarda de ${ENVIO_TXT}.`],
    ["¿Cómo se usa?", p.uso],
  ];
  const ofertas = [1, 2, 3].map((n) => {
    const dn = descuentoPara(n);
    const unidad = Math.round(p.precio * (1 - dn));
    return `<label class="oferta${n === 1 ? " is-elegida" : ""}"><input type="radio" name="cantidad" value="${n}"${n === 1 ? " checked" : ""}><span class="oferta__radio"></span><span><b>${n === 1 ? "1 unidad" : "Lleva " + n}${dn ? ` <span class="tag tag--off">${Math.round(dn * 100)}% menos</span>` : ""}</b><small>${n === 1 ? "Precio normal" : plata(unidad) + " cada uno"}</small></span><span class="oferta__precio">${dn ? `<s>${plata(p.precio * n)}</s>` : ""}${plata(unidad * n)}</span></label>`;
  }).join("\n");
  const relacionados = (p.combina || []).map((id) => porId[id]).slice(0, 4);

  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: nombreLargo,
      description: p.desc,
      sku: p.id,
      ...(p.gtin && { gtin: p.gtin }),
      ...(conFotos(p) && { image: fotos.map((n) => `${C.url}/${img(p, n)}`) }),
      brand: { "@type": "Brand", name: p.marca },
      category: cat.nombre,
      additionalProperty: [{ "@type": "PropertyValue", name: "Presentación", value: p.tamano }, { "@type": "PropertyValue", name: "Comprado en", value: compradoEn(p) }, ...(p.vence ? [{ "@type": "PropertyValue", name: "Vencimiento", value: vence(p.vence) }] : []), ...p.claves.map((c) => ({ "@type": "PropertyValue", name: "Dato de la etiqueta", value: c }))],
      ...(p.resenas && { aggregateRating: { "@type": "AggregateRating", ratingValue: p.resenas.promedio, reviewCount: p.resenas.total } }),
      offers: ofertaLd(p),
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: C.url + "/" }, { "@type": "ListItem", position: 2, name: cat.nombre, item: `${C.url}/#${p.cat}` }, { "@type": "ListItem", position: 3, name: p.nombre, item: urlP(p) }] },
    tiendaLd(),
    faqLd(faq),
  ];

  return cabeza({
    raiz,
    ruta: `/p/${p.id}/`,
    tipo: "product",
    titulo: `${nombreLargo} original en Colombia | ${C.marca}`,
    descripcion,
    extra: `<meta property="product:price:amount" content="${p.precio}">\n<meta property="product:price:currency" content="COP">\n<meta property="product:brand" content="${esc(p.marca)}">\n`,
    ...(conFotos(p) && { imagen: img(p, 1) }),
    jsonld,
  }) + `
<div class="wrap pp">
  <nav class="migas" aria-label="Ruta"><a href="${raiz}">Inicio</a> <i>›</i> <a href="${raiz}#${p.cat}">${cat.nombre}</a> <i>›</i> <span>${esc(p.nombre)}</span></nav>
  <div class="pp__grid">
    <div class="gal js-gal">
      <div class="gal__pista" tabindex="0" aria-label="Fotos de ${esc(p.nombre)}">
        ${fotos.map((n, i) => `<figure class="gal__foto"><img src="${raiz}${img(p, n)}"${srcset(p, n, raiz, "(min-width:860px) 520px, 100vw")} alt="${esc(nombreLargo)}: ${pieFoto[i] || "foto " + (i + 1)}" width="900" height="900"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}></figure>`).join("\n        ")}
      </div>${fotos.length > 1 ? `
      <div class="gal__minis">${fotos.map((n, i) => `<button type="button" aria-label="Ver foto ${i + 1} de ${fotos.length}" aria-current="${i === 0}"><img src="${raiz}${img(p, n, true)}" alt="" width="440" height="440" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}
      ${d ? `<span class="tag tag--off">${d}% OFF</span>` : p.etiqueta ? `<span class="tag">${esc(p.etiqueta)}</span>` : ""}${conFotos(p) ? `
      <p class="gal__nota">Imágenes de referencia. La presentación puede variar según el lote.</p>` : ""}
    </div>
    <div class="pp__info">
      <p class="card__marca">${esc(p.marca)} · ${traido(p)}</p>
      <h1>${esc(p.nombre)} <span>${esc(p.tamano)}</span></h1>
      <p class="pp__desc">${esc(p.desc)}</p>
      <p class="precio precio--xl"><b>${plata(p.precio)}</b>${p.antes ? ` <s>${plata(p.antes)}</s>` : ""}</p>
      <ul class="pp__sellos"><li>Envío gratis</li><li>Pagas al recibir</li><li>100% original${p.vence ? ` · vence ${vence(p.vence)}` : ""}</li></ul>
      <form class="ofertas js-ofertas" data-id="${p.id}">
        <fieldset><legend>Elige cuántas unidades</legend>
${ofertas}
        </fieldset>
      </form>
      <button class="cod cod--xl js-comprar" type="button" data-id="${p.id}">${ICO.billete}<span>Pedir y pagar al recibir</span></button>
      <button class="btn btn--linea btn--ancho js-agregar" type="button" data-id="${p.id}">Agregar al carrito</button>
      <p class="pp__mini">Sin pagos por adelantado: confirmas el pedido y pagas en efectivo cuando te llegue, en ${ENVIO_TXT}.</p>
    </div>
  </div>

  <div class="bento">
    <section class="bx bx--desc"><p class="ceja">Descripción</p><h2>Qué es ${esc(p.corto || p.nombre)}</h2>${(p.detalle || [p.desc]).map((t) => `<p>${esc(t)}</p>`).join("")}</section>
    <section class="bx bx--trae bx--tinta"><p class="ceja">En la etiqueta</p><h2>Lo que trae</h2><ul class="chips">${p.claves.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>
    <section class="bx bx--uso bx--agua"><p class="ceja">Modo de uso${p.paso ? ` · ${esc(p.paso)}` : ""}</p><h2>Cómo se usa</h2><p>${esc(p.uso)}</p></section>
    <section class="bx bx--ficha"><p class="ceja">Ficha</p><h2>Datos del producto</h2>
      <dl class="ficha">${ficha.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></section>
    <section class="bx bx--aviso"><p>${p.aviso ? esc(p.aviso) + " " : ""}${avisoBase}</p><p>La descripción resume la información que publica la marca${p.fuente ? ` (<a href="${esc(p.fuente)}" rel="nofollow noopener" target="_blank">ver fuente</a>)` : ""}. Si algo no coincide con la etiqueta del envase, manda la etiqueta.</p></section>
  </div>
${relacionados.length ? `
  <section class="pp__rel"><h2>Va bien con</h2>
    <div class="grid">
${relacionados.map((r) => tarjeta(r, raiz)).join("\n")}
    </div>
  </section>` : ""}

  <section class="faq pp__faq">
    <header class="sec__cab"><h2>Preguntas sobre ${esc(p.nombre)}</h2></header>
    <div class="faq__lista">
${faqHtml(faq)}
    </div>
  </section>
</div>
<div class="barra"><p class="precio"><b>${plata(p.precio)}</b>${p.antes ? ` <s>${plata(p.antes)}</s>` : ""}<small>Envío gratis</small></p><button class="cod js-comprar" type="button" data-id="${p.id}">${ICO.billete}<span>Pagar al recibir</span></button></div>
` + pie(raiz);
}

// ───────────── legal ─────────────
function legal() {
  const e = C.empresa;
  const quien = e.razonSocial ? `${e.razonSocial}${e.nit ? `, NIT ${e.nit}` : ""}${e.ciudad ? `, con domicilio en ${e.ciudad}, Colombia` : ""}` : `${C.marca} [completa razón social, NIT y ciudad en datos/config.mjs]`;
  const contacto = [C.whatsapp && `WhatsApp +${C.whatsapp}`, C.correo && `correo ${C.correo}`].filter(Boolean).join(" o ") || "[completa WhatsApp y correo en datos/config.mjs]";
  return cabeza({ raiz: "../", ruta: "/legal/", titulo: `Términos, envíos, devoluciones y tratamiento de datos | ${C.marca}`, descripcion: `Condiciones de compra de ${C.marca}: pago contraentrega, envío gratis, cambios y devoluciones, y política de tratamiento de datos personales.` }) + `
<div class="wrap legal">
  <h1>Términos, envíos y tratamiento de datos</h1>
  <p class="legal__fecha">Última actualización: ${HOY}</p>

  <h2 id="terminos">Términos de compra</h2>
  <p>Este sitio es operado por ${esc(quien)}. Al confirmar un pedido aceptas estas condiciones.</p>
  <ul>
    <li>Los precios están en pesos colombianos (COP) e incluyen el envío.</li>
    <li>El pago es contraentrega: pagas en efectivo a la transportadora al recibir el pedido, según cobertura en tu municipio.</li>
    <li>Antes de despachar confirmamos el pedido por WhatsApp o llamada. Si no logramos confirmarlo, el pedido no se despacha.</li>
    <li>Los descuentos por cantidad se calculan sobre el total de unidades del pedido y se muestran antes de confirmar.</li>
  </ul>

  <h2 id="envios">Envíos</h2>
  <p>El envío es gratis a toda Colombia. El tiempo de entrega es de ${ENVIO_TXT} desde la confirmación, según la ciudad y la transportadora.</p>

  <h2 id="devoluciones">Cambios, devoluciones y garantía</h2>
  <ul>
    <li>Tienes ${C.devolucionDias} días desde la entrega para pedir cambio o devolución si el producto llega en mal estado, no corresponde a lo pedido o sigue sellado.</li>
    <li>Derecho de retracto: en compras a distancia puedes retractarte dentro de los 5 días hábiles siguientes a la entrega (artículo 47 de la Ley 1480 de 2011), devolviendo el producto en las mismas condiciones en que lo recibiste.</li>
    <li>Garantía de originalidad: si un producto no es original devolvemos el 100% de lo pagado.</li>
    <li>Por higiene y seguridad no se reciben productos abiertos o usados, salvo defecto de fábrica.</li>
  </ul>

  <h2 id="salud">Aviso sobre suplementos</h2>
  <p>Los suplementos dietarios no son medicamentos, no sirven para diagnosticar, tratar, curar ni prevenir enfermedades y no reemplazan una alimentación balanceada. Consulta a tu médico antes de consumirlos si estás en embarazo, lactancia o bajo tratamiento médico. Mantenlos fuera del alcance de los niños.</p>

  <h2 id="datos">Tratamiento de datos personales</h2>
  <p>De acuerdo con la Ley 1581 de 2012, ${esc(quien)} es responsable del tratamiento de los datos que entregas al hacer un pedido: nombre, celular, dirección, ciudad y, si lo das, correo.</p>
  <ul>
    <li><b>Para qué los usamos:</b> confirmar, despachar y entregar tu pedido, atender cambios y devoluciones y contactarte sobre tu compra.</li>
    <li><b>Con quién se comparten:</b> con la transportadora y el operador logístico que entregan y recaudan el pedido. No vendemos tus datos.</li>
    <li><b>Tus derechos:</b> conocer, actualizar, rectificar y pedir la supresión de tus datos, y revocar la autorización.</li>
    <li><b>Cómo ejercerlos:</b> escríbenos por ${esc(contacto)}.</li>
  </ul>
</div>
` + pie("../");
}

// ───────────── archivos para buscadores y agentes ─────────────
function llms() {
  const linea = (p) => `- [${p.nombre} · ${p.marca}](${urlP(p)}): ${p.tamano}. ${plata(p.precio)} COP${p.antes ? ` (antes ${plata(p.antes)})` : ""}. ${p.desc}`;
  return `# ${C.marca}

> ${C.marca} es una tienda en línea colombiana de suplementos dietarios y productos para el cuidado de la piel (skincare) 100% originales, importados de Estados Unidos. Vende a toda Colombia con envío gratis y pago contraentrega (el cliente paga en efectivo al recibir).
${C.modoDemo ? "\nNota: los precios publicados son de referencia y están por confirmar.\n" : ""}
## Cómo se compra

- Pago: contraentrega, en efectivo al recibir, según cobertura de la transportadora en el municipio
- Envío: gratis a toda Colombia, entrega en ${ENVIO_TXT}
- Descuento por cantidad: ${C.escalas.slice().reverse().map((e) => `${Math.round(e.descuento * 100)}% llevando ${e.desde}${e.desde === Math.max(...C.escalas.map((x) => x.desde)) ? " o más" : ""} productos`).join(", ")}
- Cambios y devoluciones: ${C.devolucionDias} días desde la entrega; retracto legal de 5 días hábiles
- Originalidad: productos comprados en Estados Unidos, sellados de fábrica, con lote y vencimiento visibles; devolución del 100% si no es original
- Pedido: formulario "Pedir y pagar al recibir" en cada producto, sin crear cuenta${C.whatsapp ? `\n- WhatsApp: +${C.whatsapp}` : ""}
- Moneda: pesos colombianos (COP)

## Suplementos

${PRODUCTOS.filter((p) => p.cat === "suplementos").map(linea).join("\n")}

## Skincare

${PRODUCTOS.filter((p) => p.cat === "skincare").map(linea).join("\n")}

## Datos

- [Catálogo completo en JSON](${C.url}/catalogo.json): precios, presentaciones, vencimientos y enlaces
- [Términos, envíos, devoluciones y datos personales](${C.url}/legal/)
- [Preguntas frecuentes](${C.url}/#preguntas)

Los suplementos dietarios no son medicamentos y no reemplazan una alimentación balanceada.
`;
}

const BOTS = ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "Applebot", "Applebot-Extended", "DuckAssistBot", "Meta-ExternalAgent", "Amazonbot", "MistralAI-User", "CCBot"];
const robots = () => `User-agent: *\nAllow: /\n\n${BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}\n\nSitemap: ${C.url}/sitemap.xml\n`;

const sitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${C.url}/</loc><lastmod>${HOY}</lastmod></url>
${PRODUCTOS.map((p) => `  <url><loc>${urlP(p)}</loc><lastmod>${HOY}</lastmod>${(FOTOS[p.id].length ? FOTOS[p.id] : [1]).map((n) => `<image:image><image:loc>${C.url}/${img(p, n)}</image:loc></image:image>`).join("")}</url>`).join("\n")}
  <url><loc>${C.url}/legal/</loc><lastmod>${HOY}</lastmod></url>
</urlset>
`;

const catalogoJson = () => JSON.stringify({
  tienda: C.marca,
  url: C.url + "/",
  pais: "CO",
  moneda: "COP",
  actualizado: HOY,
  muestra: C.modoDemo,
  pago: "Contraentrega (efectivo al recibir)",
  envio: { costo: 0, dias_habiles: [C.envio.diasMin, C.envio.diasMax] },
  descuento_por_cantidad: C.escalas.map((e) => ({ desde_unidades: e.desde, porcentaje: Math.round(e.descuento * 100) })),
  devolucion_dias: C.devolucionDias,
  productos: PRODUCTOS.map((p) => ({ id: p.id, nombre: p.nombre, marca: p.marca, categoria: p.cat, presentacion: p.tamano, precio: p.precio, ...(p.antes && { precio_antes: p.antes }), disponible: true, comprado_en: compradoEn(p), ...(p.pais && { pais_marca: p.pais }), ...(p.fuente && { fuente: p.fuente }), ...(p.vence && { vence: p.vence }), url: urlP(p), ...(conFotos(p) && { imagenes: FOTOS[p.id].map((n) => `${C.url}/${img(p, n)}`) }), descripcion: (p.detalle || [p.desc]).join(" "), uso: p.uso, datos: p.claves })),
}, null, 1);

// Datos mínimos que necesita el carrito en el navegador.
const catalogoJs = () => "window.WETS=" + JSON.stringify({
  cfg: { marca: C.marca, wa: C.whatsapp, endpoint: C.pedidos.endpoint, escalas: C.escalas },
  p: Object.fromEntries(PRODUCTOS.map((p) => [p.id, { n: p.nombre, m: p.marca, t: p.tamano, pr: p.precio, a: p.antes || 0, i: img(p, 1, true), c: p.combina || [], k: p.cat, o: p.objetivos, ...(p.dropi && { d: p.dropi }) }])),
  obj: Object.fromEntries(OBJETIVOS.map((o) => [o.id, o.nombre])),
  objg: Object.fromEntries(OBJETIVOS.map((o) => [o.id, o.grupo])),
}) + ";";

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#13201A"/><path d="M16 5c5 7.200 9 10.800 9 15.500a9 9 0 0 1-18 0C7 15.800 11 12.200 16 5z" fill="#EE4A1F"/></svg>`;

const noEncontrada = () => cabeza({ raiz: `${new URL(C.url).pathname.replace(/\/$/, "")}/`, ruta: "/404.html", titulo: `Página no encontrada | ${C.marca}`, descripcion: "Esta página no existe." }) + `
<div class="wrap legal"><h1>Esta página no existe</h1><p>Puede que el producto haya cambiado de dirección. <a href="${C.url}/">Volver a la tienda</a>.</p></div>
` + pie(`${new URL(C.url).pathname.replace(/\/$/, "")}/`);

// ───────────── escribir ─────────────
rmSync(join(RAIZ, "p"), { recursive: true, force: true });
rmSync(join(RAIZ, "assets/p"), { recursive: true, force: true });
escribir("index.html", portada());
for (const p of PRODUCTOS) {
  escribir(`p/${p.id}/index.html`, paginaProducto(p));
  if (!conFotos(p)) escribir(`assets/p/${p.id}.svg`, dibujo(p));
}
escribir("legal/index.html", legal());
escribir("404.html", noEncontrada());
escribir("llms.txt", llms());
escribir("robots.txt", robots());
escribir("sitemap.xml", sitemap());
escribir("catalogo.json", catalogoJson());
escribir("assets/catalogo.js", catalogoJs());
escribir("assets/favicon.svg", favicon);
escribir(`${C.indexNowKey}.txt`, C.indexNowKey);
escribir(".nojekyll", "");
if (sinFotos.length) console.warn(`Aviso: con menos de 3 fotos -> ${sinFotos.join(", ")}`);
console.log(`Listo: portada + ${PRODUCTOS.length} productos${C.modoDemo ? " (modo demo: noindex)" : ""} -> ${C.url}/`);
