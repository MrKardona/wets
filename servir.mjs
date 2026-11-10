// Vista previa local, sin dependencias: node servir.mjs  ->  http://localhost:4173
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL(".", import.meta.url));
const PUERTO = Number(process.env.PORT) || 4173;
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };

createServer(async (req, res) => {
  try {
    let ruta = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\]|\.\.)+/, "");
    let archivo = join(RAIZ, ruta);
    if ((await stat(archivo)).isDirectory()) archivo = join(archivo, "index.html");
    res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(await readFile(archivo));
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(join(RAIZ, "404.html")).catch(() => "No encontrado"));
  }
}).listen(PUERTO, () => console.log(`Wets en http://localhost:${PUERTO}`));
