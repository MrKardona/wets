// Arma "Cositas bajo encargo" desde el catálogo de Las Cositas de María E (Shopify products.json).
//   node herramientas/encargo.mjs <productos.json> [--sin-fotos]
// Escribe datos/encargo.json y adapta las fotos al estilo Wets en assets/fotos/<id>-N.webp
// (producto sobre fondo rosa degradado, 900 y 440 px). Las fotos ya hechas no se repiten.
// Necesita ffmpeg en el PATH.
import { execFileSync, execFile } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const [origen, ...banderas] = process.argv.slice(2);
if (!origen) { console.error("Uso: node herramientas/encargo.mjs <productos.json> [--sin-fotos]"); process.exit(1); }
const FOTOS_MAX = 3;

// ───────── grupos, en el orden en que se muestran ─────────
const tiene = (p, ...t) => (p.tags || []).some((x) => t.includes(x));
const MED = /advil|excedrin|aspirin|tylenol|ibuprof|acetamin|tums|zyrtec|claritin|allegra|benadryl|pepto|mucinex|nyquil|dayquil|aleve|motrin|nexium|prilosec|omeprazol|famotid|pepcid|antiácido|antialérg/i;
const GRUPOS = [
  ["Medicamentos de venta libre", "medicamento", (p) => tiene(p, "Acetaminofén", "Antiácidos", "Antialérgicos") || MED.test(p.title)],
  ["Niños", null, (p) => tiene(p, "Niños") || /\bkids?\b|niños|lil critters/i.test(p.title)],
  ["Magnesio", "suplemento", (p) => /magnesio/i.test(p.title) || tiene(p, "Magnesio")],
  ["Colágeno y belleza", "suplemento", (p) => tiene(p, "Colágeno", "Biotina", "Hair Skin and Nails", "Keratina") || /col[aá]geno|biotin|hair,? skin/i.test(p.title)],
  ["Sueño y calma", "suplemento", (p) => tiene(p, "Melatonina", "Ashwagandha") || /melaton|ashwagandha|sleep/i.test(p.title)],
  ["Vitaminas y suplementos", "suplemento", (p) => tiene(p, "Suplementos", "Vitaminas/Minerales")],
  ["Labios", "externo", (p) => tiene(p, "Hidratante de Labios") || /labios|lip/i.test(p.title)],
  ["Cuidado facial", "externo", (p) => tiene(p, "Cuidado facial", "Jabón facial", "Protector Solar")],
  ["Cuidado capilar", "externo", (p) => tiene(p, "Cuidado Capilar", "Aceite Capilar", "Mascarilla Capilar", "Acondicionador")],
  ["Jabones y exfoliantes", "externo", (p) => tiene(p, "Jabón", "Jabón Líquido", "Jabones", "Exfoliantes")],
  ["Cremas y cuerpo", "externo", (p) => tiene(p, "Cuidado Corporal", "Crema Hidratante", "Spray Corporal", "Spray corporal", "Desodorante", "Crema Depilatoria")],
  ["Cuidado personal", "externo", () => true],
];
const ORDEN = ["Vitaminas y suplementos", "Magnesio", "Colágeno y belleza", "Sueño y calma", "Cuidado facial", "Cremas y cuerpo", "Jabones y exfoliantes", "Labios", "Cuidado capilar", "Cuidado personal", "Niños", "Medicamentos de venta libre"];

// ───────── texto ─────────
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", iexcl: "¡", iquest: "¿", deg: "°", reg: "®", trade: "™", copy: "©", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·" };
const decodificar = (t) => t.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m));
function lineas(html) {
  return decodificar(String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|p|div|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l && l !== "•" && !/^(descripci[oó]n|beneficios?|caracter[ií]sticas?|ingredientes?):?$/i.test(l));
}
const recorta = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)).replace(/[,;:\s]+$/, "") + "…");
const USO = /^(modo de uso|modo de empleo|c[oó]mo usar(lo)?|c[oó]mo se usa|uso sugerido|instrucciones de uso|dosis recomendada|recomendaciones de uso)\b/i;

function textos(html) {
  const ls = lineas(html);
  let uso = "";
  const i = ls.findIndex((l) => USO.test(l));
  if (i >= 0) {
    const resto = ls[i].replace(USO, "").replace(/^[^:]{0,25}:\s*/, "").replace(/^[:\s-]+/, "");
    uso = recorta((resto.length > 15 ? resto : ls[i + 1] || "").replace(/^•\s*/, ""), 320);
  }
  const cuerpo = ls.filter((l, k) => k !== i && !(uso && l.includes(uso.slice(0, 30))));
  const claves = cuerpo.filter((l) => l.startsWith("• ")).map((l) => recorta(l.slice(2), 70)).filter((l) => l.length > 3).slice(0, 6);
  const parrafos = cuerpo.filter((l) => !l.startsWith("• ") && l.length > 25);
  const detalle = parrafos.slice(0, 4).map((l) => recorta(l, 420));
  const desc = recorta(parrafos[0] || claves.join(". ") || "", 240);
  return { desc, detalle, uso, claves };
}

const MAYUS_OK = new Set(["EOS", "NOW", "CVS", "OLLY", "GOLI", "SR", "II", "USA", "CBD", "B12", "D3", "K2"]);
const marcaBonita = (v) => (v === v.toUpperCase() ? v.split(/(\s+|-)/).map((w) => (MAYUS_OK.has(w) || w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase().replace(/'S\b/i, "'s"))).join("") : v);
const idDe = (h) => h.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90).replace(/-$/, "");

// ───────── datos ─────────
const crudos = JSON.parse(readFileSync(origen, "utf8"));
const lista = [];
for (const p of crudos) {
  const vivas = p.variants.filter((v) => v.available);
  if (!vivas.length || !p.images.length) continue;
  const v = vivas.reduce((a, b) => (+b.price < +a.price ? b : a));
  const m = p.title.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const nombre = (m ? m[1] : p.title).replace(/\s+/g, " ").trim();
  const tamano = m ? m[2].trim() : v.title !== "Default Title" ? v.title : "";
  const [grupo, tipoG] = GRUPOS.find(([, , f]) => f(p));
  const tipo = tipoG || (tiene(p, "Suplementos", "Vitaminas/Minerales") ? "suplemento" : "externo");
  const t = textos(p.body_html);
  lista.push({
    id: idDe(p.handle),
    nombre,
    marca: marcaBonita(p.vendor || ""),
    tamano: tamano || "1 unidad",
    grupo,
    tipo,
    base: Math.round(+v.price),
    antesBase: v.compare_at_price ? Math.round(+v.compare_at_price) : 0,
    desc: t.desc || `${nombre} de ${marcaBonita(p.vendor || "")}, original de Estados Unidos.`,
    detalle: t.detalle,
    uso: t.uso || {
      suplemento: "Toma la dosis que indica la etiqueta del envase, de preferencia con una comida. No superes la dosis recomendada.",
      medicamento: "Lee la etiqueta completa y toma solo la dosis indicada para tu edad. No superes la dosis ni lo combines con otros medicamentos sin consultar.",
      externo: "Aplica según las indicaciones de la etiqueta. Solo para uso externo.",
    }[tipo],
    claves: t.claves,
    fuente: `https://www.lascositasdemariae.com/products/${p.handle}`,
    _fotos: p.images.slice(0, FOTOS_MAX).map((im) => im.src),
  });
}
lista.sort((a, b) => ORDEN.indexOf(a.grupo) - ORDEN.indexOf(b.grupo) || a.nombre.localeCompare(b.nombre, "es"));
const vistos = new Set();
for (const p of lista) { let id = p.id, k = 2; while (vistos.has(id)) id = `${p.id}-${k++}`; p.id = id; vistos.add(id); }

// ───────── fotos ─────────
const DEST = join(RAIZ, "assets/fotos");
mkdirSync(DEST, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "wets-enc-"));
const fondo = join(tmp, "fondo.png");
// Degradado rosa: casi blanco al centro, rosado hacia los bordes (mismos tonos de --papel y --agua).
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=white:s=900x900,format=gbrp", "-vf",
  "geq=r='255-6*min(1,hypot(X-450,Y-420)/620)':g='246-40*min(1,hypot(X-450,Y-420)/620)':b='249-26*min(1,hypot(X-450,Y-420)/620)'", "-frames:v", "1", fondo]);

const bajar = (url, archivo) => new Promise((ok, mal) => execFile("curl", ["-sSfL", "--max-time", "40", "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36", "-o", archivo, url], (e) => (e ? mal(new Error(e.message.split("\n").pop() || "curl")) : ok())));

async function adaptar(url, id, n) {
  const grande = join(DEST, `${id}-${n}.webp`), chica = join(DEST, `${id}-${n}s.webp`);
  if (existsSync(grande) && existsSync(chica)) return true;
  const u = new URL(url.startsWith("//") ? "https:" + url : url);
  u.searchParams.set("width", "1000");
  for (let intento = 1; intento <= 3; intento++) {
    try {
      // curl y no fetch: el CDN de Shopify rechaza (403) muchas descargas seguidas desde fetch de Node.
      const archivo = join(tmp, `${id}-${n}`);
      await bajar(u.href, archivo);
      // El blanco del fondo original se multiplica por el rosa; el producto queda intacto.
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", fondo, "-i", archivo, "-filter_complex",
        "[1]scale=770:770:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=900:900:(ow-iw)/2:(oh-ih)/2:color=white,format=gbrp[p];[0]format=gbrp[f];[f][p]blend=all_mode=multiply,format=yuv420p,split[a][b];[b]scale=440:440:flags=lanczos[c]",
        "-map", "[a]", "-frames:v", "1", "-c:v", "libwebp", "-q:v", "74", grande,
        "-map", "[c]", "-frames:v", "1", "-c:v", "libwebp", "-q:v", "72", chica]);
      rmSync(archivo, { force: true });
      return true;
    } catch (e) {
      if (intento === 3) { console.warn(`  sin foto ${id}-${n}: ${e.message}`); return false; }
      await new Promise((r) => setTimeout(r, 4000 * intento));
    }
  }
}

if (!banderas.includes("--sin-fotos")) {
  const tareas = lista.flatMap((p) => p._fotos.map((url, i) => [url, p.id, i + 1]));
  let hechas = 0, k = 0;
  const trabajador = async () => { while (k < tareas.length) { const t = tareas[k++]; await adaptar(...t); if (++hechas % 50 === 0) console.log(`  fotos ${hechas}/${tareas.length}`); } };
  await Promise.all(Array.from({ length: 3 }, trabajador));
}
rmSync(tmp, { recursive: true, force: true });

// Solo quedan los productos con al menos una foto adaptada.
const final = lista.filter((p) => banderas.includes("--sin-fotos") || existsSync(join(DEST, `${p.id}-1.webp`))).map(({ _fotos, ...p }) => p);
writeFileSync(join(RAIZ, "datos/encargo.json"), JSON.stringify(final, null, 1));
const porGrupo = final.reduce((a, p) => ((a[p.grupo] = (a[p.grupo] || 0) + 1), a), {});
console.log(`datos/encargo.json: ${final.length} productos`, porGrupo);
