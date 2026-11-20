// Scrapes the Royal Road lists with a headful Google Chrome (run under Xvfb on Linux)
// and writes one JSON file per page: <outDir>/<list>-<page>.json.
// Plain HTTP and headless browsers get Royal Road's Cloudflare challenge instead.
// From a data-center IP only the first page per session gets through, so the
// workflow scrapes one page per job: pass a list and page to limit the run.
// Usage: node scripts/snapshot-royalroad.js [outDir] [list page]
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-core");
const { BASE_URL, SNAPSHOT_LISTS, parseNovelList } = require("../src/novels/scrapper/royalroadScrapper");

const [outDir = "royalroad", onlyList, onlyPage] = process.argv.slice(2);
const ATTEMPTS = 2;

// [list, page, withChapters] for every page in the snapshot, or just the requested one
function pagesToScrape() {
  const pages = [];
  for (const [list, { pages: count, withChapters = false }] of Object.entries(SNAPSHOT_LISTS)) {
    for (let n = 1; n <= count; n++) pages.push([list, n, withChapters]);
  }
  if (!onlyList) return pages;
  const selected = pages.filter(([list, n]) => list === onlyList && n === Number(onlyPage));
  if (selected.length === 0) throw new Error(`Unknown list/page: ${onlyList} ${onlyPage}`);
  return selected;
}

// Also report as GitHub Actions annotations, which are readable without opening the log
function report(level, message) {
  const log = level === "notice" ? console.log : console.error;
  log(process.env.GITHUB_ACTIONS ? `::${level}::${message}` : message);
}

async function scrapePage(page, url, withChapters) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForSelector(".fiction-list-item", { timeout: 30000 });
      return parseNovelList(await page.content(), withChapters);
    } catch (error) {
      const title = await page.title().catch(() => "?");
      const message = `${url} attempt ${attempt} failed (page title "${title}"): ${error.message.split("\n")[0]}`;
      if (attempt === ATTEMPTS) throw new Error(message);
      report("warning", message);
    }
  }
}

async function main() {
  const pages = pagesToScrape();
  fs.mkdirSync(outDir, { recursive: true });
  const context = await chromium.launchPersistentContext(path.join(os.tmpdir(), "rr-snapshot-profile"), {
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: false,
    viewport: { width: 1366, height: 768 },
    args: ["--disable-blink-features=AutomationControlled"]
  });
  const page = await context.newPage();
  let saved = 0;

  for (const [list, n, withChapters] of pages) {
    try {
      const url = `${BASE_URL}${SNAPSHOT_LISTS[list].path}?page=${n}`;
      const data = await scrapePage(page, url, withChapters);
      const snapshot = { updatedAt: new Date().toISOString(), data };
      fs.writeFileSync(path.join(outDir, `${list}-${n}.json`), JSON.stringify(snapshot));
      report("notice", `${list} page ${n}: ${data.length} novels`);
      saved++;
    } catch (error) {
      report("error", error.message);
    }
  }

  await context.close();
  // Keep the previous snapshot if nothing could be scraped
  if (saved === 0) process.exit(1);
}

main().catch((error) => {
  report("error", error.message.split("\n")[0]);
  process.exit(1);
});
