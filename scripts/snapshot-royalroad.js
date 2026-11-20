// Scrapes the Royal Road lists with a headful Google Chrome (run under Xvfb on Linux)
// and writes one JSON file per page: <outDir>/<list>-<page>.json.
// Plain HTTP and headless browsers get Royal Road's Cloudflare challenge instead.
// Usage: node scripts/snapshot-royalroad.js [outDir]
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-core");
const { BASE_URL, SNAPSHOT_LISTS, parseNovelList } = require("../src/novels/scrapper/royalroadScrapper");

const outDir = process.argv[2] || "royalroad";

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const context = await chromium.launchPersistentContext(path.join(os.tmpdir(), "rr-snapshot-profile"), {
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: false,
    viewport: { width: 1366, height: 768 },
    args: ["--disable-blink-features=AutomationControlled"]
  });
  const page = await context.newPage();
  let saved = 0;

  for (const [list, { path: listPath, pages, withChapters }] of Object.entries(SNAPSHOT_LISTS)) {
    for (let n = 1; n <= pages; n++) {
      try {
        await page.goto(`${BASE_URL}${listPath}?page=${n}`, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForSelector(".fiction-list-item", { timeout: 30000 });
        const data = parseNovelList(await page.content(), withChapters);
        const snapshot = { updatedAt: new Date().toISOString(), data };
        fs.writeFileSync(path.join(outDir, `${list}-${n}.json`), JSON.stringify(snapshot));
        console.log(`${list} page ${n}: ${data.length} novels`);
        saved++;
      } catch (error) {
        const title = await page.title().catch(() => "?");
        console.error(`${list} page ${n} failed (page title "${title}"): ${error.message.split("\n")[0]}`);
      }
    }
  }

  await context.close();
  // Keep the previous snapshot if nothing could be scraped
  if (saved === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
