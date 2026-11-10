/*
 * CONFIGURACIÓN DE WETS
 * Todo lo que cambia con el negocio vive aquí. Después de editar: node build.mjs
 */
export default {
  marca: "Wets",
  lema: "Originales de USA. Pagas al recibir.",

  // Dirección pública del sitio, sin "/" al final. Cámbiala cuando tengas dominio propio
  // (y crea un archivo CNAME con el dominio, igual que en las landings de JOG).
  url: "https://mrkardona.github.io/wets",

  // WhatsApp que recibe pedidos y consultas: indicativo + número, sin "+" ni espacios.
  // Ejemplo: "573001234567". Vacío = el cliente elige el contacto al abrir WhatsApp.
  whatsapp: "",
  correo: "",
  instagram: "", // usuario sin @
  tiktok: "", // usuario sin @

  // Datos legales: salen en el pie y en la página /legal/.
  empresa: { razonSocial: "", nit: "", ciudad: "", direccion: "" },

  // Geolocalización para buscadores. "region" es el código ISO (CO, o CO-ANT para Antioquia).
  geo: { region: "CO", ciudad: "", lat: null, lon: null },

  // Promesas comerciales (mismo modelo que Importaciones JOG). Ajusta a lo que vayas a cumplir.
  envio: { diasMin: 2, diasMax: 5 }, // envío gratis, días hábiles
  devolucionDias: 30,

  // Descuento por cantidad sobre el total de unidades del pedido (igual que JOG).
  escalas: [
    { desde: 3, descuento: 0.1 },
    { desde: 2, descuento: 0.05 },
  ],

  // Motor de pedidos contraentrega.
  //   endpoint vacío  -> el pedido se arma y se envía por WhatsApp.
  //   endpoint con URL -> el formulario hace POST del pedido (JSON) a ese puente,
  //                       que lo crea en Dropi. Ver README, sección "Conectar Dropi".
  pedidos: { endpoint: "" },

  // Clave IndexNow (Bing, Yandex y otros). El build crea <clave>.txt en la raíz.
  indexNowKey: "b7d1f0a94c2e4e6f8a3d5c1e9f2b6a70",

  // true = catálogo de muestra: aparece el aviso y las páginas salen con "noindex"
  // para que Google y los buscadores de IA no guarden precios de ejemplo.
  // Ponlo en false cuando cargues productos, precios y fechas reales.
  modoDemo: true,
};
