// Genera assets/marca/compartir.jpg (la imagen que sale al compartir el enlace en WhatsApp y redes)
// a partir de herramientas/compartir.html, con Chrome o Edge sin ventana y ffmpeg.
//   node herramientas/compartir.mjs
// Después de cambiarla, sube el número de ?v= en build.mjs para que WhatsApp no muestre la anterior.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const navegadores = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const nav = navegadores.find(existsSync);
if (!nav) throw new Error("No encontré Chrome ni Edge");

const png = join(raiz, "compartir-tmp.png");
execFileSync(nav, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  "--window-size=1200,630", "--virtual-time-budget=3000", `--screenshot=${png}`, pathToFileURL(join(aqui, "compartir.html")).href], { stdio: "ignore" });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "crop=1200:630:0:0", "-q:v", "3", join(raiz, "assets/marca/compartir.jpg")]);
rmSync(png);
console.log("Listo: assets/marca/compartir.jpg");
