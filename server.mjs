import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const yahooHeaders = {
  "User-Agent": "Mozilla/5.0 (compatible; QuantSightAI/1.0)",
  Accept: "application/json"
};

function isInsideRoot(filePath) {
  const resolved = resolve(filePath);
  const prefix = root.endsWith("\\") ? root : `${root}\\`;
  return resolved === root || resolved.startsWith(prefix) || resolved.startsWith(`${root}/`);
}

async function proxyYahooChart(searchParams, response) {
  const symbol = searchParams.get("symbol");
  if (!symbol || !/^[A-Z0-9.^=-]+$/i.test(symbol)) {
    response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Invalid symbol" }));
    return;
  }

  const range = searchParams.get("range");
  const period1 = searchParams.get("period1");
  const period2 = searchParams.get("period2");
  let yahooUrl;
  if (period1 && period2) {
    yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;
  } else {
    const safeRange = ["1mo", "3mo", "6mo", "1y", "5y", "2y", "10y", "max"].includes(range) ? range : "6mo";
    yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${safeRange}&interval=1d&includePrePost=false`;
  }

  const upstream = await fetch(yahooUrl, { headers: yahooHeaders });
  const body = await upstream.text();
  response.writeHead(upstream.status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=120"
  });
  response.end(body);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);

    if (url.pathname === "/api/chart") {
      await proxyYahooChart(url.searchParams, response);
      return;
    }

    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = normalize(join(root, requested.replace(/^\/+/, "")));
    if (!isInsideRoot(filePath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`QuantSight AI running at http://localhost:${port}`);
});
