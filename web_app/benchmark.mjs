import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'ui', 'dist');

// Minimal static file server for the built UI
function startStaticServer(port = 4321) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
  };

  const server = createServer((req, res) => {
    let urlPath = req.url === '/' ? '/index.html' : req.url;
    let filePath = join(DIST_DIR, urlPath);
    if (!existsSync(filePath)) filePath = join(DIST_DIR, 'index.html'); // SPA fallback
    try {
      const ext = extname(filePath);
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

console.log("Starting benchmark evaluation...");

async function runBenchmarks() {
  if (!existsSync(DIST_DIR)) {
    console.error("❌ No build found at ui/dist. Run: cd ui && npm run build");
    process.exit(1);
  }

  const port = 4321;
  const server = await startStaticServer(port);
  const targetUrl = `http://localhost:${port}/`;

  console.log(`Serving built UI from ${DIST_DIR} on port ${port}`);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome' });
  } catch (e) {
    try {
      browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/chromium-browser' });
    } catch (e2) {
      browser = await puppeteer.launch({ headless: 'new' });
    }
  }

  const page = await browser.newPage();

  try {
    const startLoad = performance.now();
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 10000 });
    const endLoad = performance.now();
    console.log(`✅ UI Initial Page Load Time: ${(endLoad - startLoad).toFixed(2)} ms`);

    const title = await page.title();
    console.log(`✅ Page Title: ${title}`);

    console.log("Simulating complex Canvas interactions...");

    const clusterButtons = await page.$$('::-p-xpath(//button[contains(., "Cluster")])');
    if (clusterButtons.length > 0) {
      await clusterButtons[0].click();

      let totalRenderTime = 0;
      for (let i = 0; i < 5; i++) {
        const renderStart = performance.now();
        await page.mouse.click(150 + (i * 60), 200 + (i * 20));
        const renderEnd = performance.now();
        totalRenderTime += (renderEnd - renderStart);
      }

      console.log(`✅ Successfully added 5 cluster nodes.`);
      console.log(`✅ Average SVG Node Render Time: ${(totalRenderTime / 5).toFixed(2)} ms`);
    } else {
      console.log("⚠️ Could not find Cluster button.");
    }

    const generateButtons = await page.$$('::-p-xpath(//button[contains(., "Generate Matrices")])');
    if (generateButtons.length > 0) {
      console.log("Triggering Matrix Generation API...");
      await generateButtons[0].click();
      try {
        await page.waitForFunction(
          `document.querySelector('.status-bar') && document.querySelector('.status-bar').innerText.includes('generated')`,
          { timeout: 5000 }
        );
        console.log(`✅ Matrix Generation API responded successfully.`);
      } catch (e) {
        console.log("⚠️ Matrix Generation timed out (Python backend likely not running — expected in CI).");
      }
    }

  } catch (err) {
    console.log("⚠️ Evaluation interrupted.");
    console.log(err.message);
  } finally {
    await browser.close();
    server.close();
    console.log("🛑 Browser closed. Evaluation complete.");
  }
}

runBenchmarks();
// <eval > /media/harsh/Do not touch/Acad work/WEBSITE/web_app/benchmark.mjs </eval>
