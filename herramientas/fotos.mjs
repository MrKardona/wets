// Convierte imágenes a las fotos del catálogo: node herramientas/fotos.mjs <id> <n> <archivo-o-url>
// Escribe assets/fotos/<id>-<n>.webp (900 px) y <id>-<n>s.webp (440 px), recortadas en cuadrado.
// Necesita ffmpeg en el PATH.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const [id, n, origen] = process.argv.slice(2);
if (!id || !n || !origen) {
  console.error("Uso: node herramientas/fotos.mjs <id> <n> <archivo-o-url>");
  process.exit(1);
}

let archivo = origen, temporal;
if (/^https?:\/\//.test(origen)) {
  temporal = mkdtempSync(join(tmpdir(), "wets-"));
  const r = await fetch(origen, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`No se pudo descargar (${r.status}): ${origen}`);
  archivo = join(temporal, "origen");
  writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
}

const destino = join(RAIZ, "assets/fotos");
mkdirSync(destino, { recursive: true });
// Recorte cuadrado centrado; fondo crema si la imagen trae transparencia.
const filtro = (lado) => `crop='min(iw,ih)':'min(iw,ih)',scale=${lado}:${lado}:flags=lanczos,format=rgba,pad=iw:ih:0:0:color=0xF3EEE3`;
for (const [lado, sufijo, q] of [[900, "", 78], [440, "s", 74]]) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `color=c=0xF3EEE3:s=${lado}x${lado}`, "-i", archivo,
    "-filter_complex", `[1]${filtro(lado)}[f];[0][f]overlay=shortest=1`, "-frames:v", "1", "-c:v", "libwebp", "-q:v", String(q),
    join(destino, `${id}-${n}${sufijo}.webp`)]);
}
if (temporal) rmSync(temporal, { recursive: true, force: true });
console.log(`assets/fotos/${id}-${n}.webp`);
