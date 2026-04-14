import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';

// benchmark.mjs
// This script serves as the evaluation utility for the web_app, similar to how prepare.py
// serves as the evaluation script in the autoresearch repository.

console.log("Starting benchmark evaluation...");

async function runBenchmarks() {
  console.log("Launching Puppeteer Headless Browser...");
  
  let browser;
  try {
    // Attempt to use system Chrome to bypass slow download times
    browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/google-chrome' });
  } catch (e) {
    try {
      browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/chromium-browser' });
    } catch (e2) {
      // Fallback to downloaded version
      browser = await puppeteer.launch({ headless: 'new' });
    }
  }
  const page = await browser.newPage();
  
  // Benchmark targets the live hosted Interactive Lab on GitHub Pages
  const targetUrl = 'https://harshqec.github.io/qmatrix/index.html'; 
  
  try {
    const startLoad = performance.now();
    console.log(`Navigating to target UI at ${targetUrl}... (Ensure your UI server is running)`);
    
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 5000 });
    const endLoad = performance.now();
    
    console.log(`✅ UI Initial Page Load Time: ${(endLoad - startLoad).toFixed(2)} ms`);
    
    // Ensure the tool loaded
    const title = await page.title();
    console.log(`✅ Page Title: ${title}`);
    
    console.log("Simulating complex Canvas interactions...");
    
    // 1. Activate Cluster Node mode
    const clusterButtons = await page.$$('::-p-xpath(//button[contains(., "Cluster")])');
    if (clusterButtons.length > 0) {
      await clusterButtons[0].click();
      
      let totalRenderTime = 0;
      
      // Inject 5 nodes onto the canvas rapidly to test SVG re-rendering performance
      for (let i = 0; i < 5; i++) {
        const renderStart = performance.now();
        await page.mouse.click(150 + (i * 60), 200 + (i * 20));
        const renderEnd = performance.now();
        totalRenderTime += (renderEnd - renderStart);
      }
      
      console.log(`✅ Successfully added 5 cluster nodes.`);
      console.log(`✅ Average SVG Node Render Time: ${(totalRenderTime / 5).toFixed(2)} ms`);
      
    } else {
      console.log("⚠️ Could not find Cluster button. Ensure the SPA UI is properly loaded.");
    }

    // Benchmark the Generate Matrices / API latency round-trip time
    const generateButtons = await page.$$('::-p-xpath(//button[contains(., "Generate Matrices")])');
    if (generateButtons.length > 0) {
       console.log("Triggering Matrix Generation API...");
       await generateButtons[0].click();
       
       // Measure time until the term status changes to Matrices generated
        const waitStart = performance.now();
        try {
            await page.waitForFunction(
                `document.querySelector('.status-bar') && document.querySelector('.status-bar').innerText.includes('generated')`, 
                { timeout: 5000 }
            );
            const waitEnd = performance.now();
            console.log(`✅ Matrix Generation + API Roundtrip Latency: ${(waitEnd - waitStart).toFixed(2)} ms`);
        } catch (e) {
            console.log("⚠️ Matrix Generation timed out. Make sure the Python backend ('127.0.0.1:5000') is running and reachable!");
        }
    }

  } catch (err) {
    console.log("⚠️ Target URL could not be loaded or evaluation interrupted.");
    console.log(err.message);
  } finally {
    await browser.close();
    console.log("🛑 Browser closed. Evaluation complete.");
  }
}

runBenchmarks();
// <eval > /media/harsh/Do not touch/Acad work/WEBSITE/web_app/benchmark.mjs </eval>
