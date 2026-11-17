// Serves the built app (web/dist) on this computer with the headers in web/public/_headers, as Cloudflare Pages
// will, so the app can be checked in Chrome under them before it is hosted.
//   npm run build, then npm run serve-built (or: node tools/serve-built.ts 4319)
// Like Cloudflare Pages with no 404 page, any address without a file opens the app.
// Only here, the Content-Security-Policy also asks the browser to report anything it blocks to this server, which
// prints it and counts it at /__csp-count, so a check can fail on any blocked load. Node only, no package.
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { headersFor, readHeadersFile } from "../src/lib/headersFile.ts";

const web = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(web, "dist");
const port = Number(process.argv[2] ?? 4319);
const rules = readHeadersFile(readFileSync(join(web, "public", "_headers"), "utf8"));

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

if (!existsSync(join(dist, "index.html"))) {
  console.error("No built app in web/dist: run npm run build first.");
  process.exit(1);
}

let blocked = 0;

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);

  if (path === "/__csp" && request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      blocked += 1;
      console.log(`BLOCKED by the Content-Security-Policy: ${body}`);
      response.writeHead(204).end();
    });
    return;
  }
  if (path === "/__csp-count") {
    response.writeHead(200, { "content-type": "text/plain" }).end(String(blocked));
    return;
  }

  const wanted = normalize(join(dist, path));
  const found = wanted.startsWith(dist) && existsSync(wanted) && statSync(wanted).isFile() ? wanted : join(dist, "index.html");
  const headers = Object.fromEntries(headersFor(rules, path));
  if (headers["content-security-policy"]) headers["content-security-policy"] += "; report-uri /__csp";
  headers["content-type"] = TYPES[extname(found)] ?? "application/octet-stream";
  response.writeHead(200, headers).end(readFileSync(found));
}).listen(port, () => console.log(`The built app, with the headers of _headers: http://localhost:${port}/`));
