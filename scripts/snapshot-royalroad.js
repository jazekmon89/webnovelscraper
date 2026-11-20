// Scrapes the Royal Road lists with a headful Google Chrome (run under Xvfb on Linux)
// and writes one JSON file per page: <outDir>/<list>-<page>.json.
// Plain HTTP and headless browsers get Royal Road's Cloudflare challenge instead, and
// from a data-center IP only some runners get through. So the workflow starts several
// runners: a runner blocked on its first page stops, and one that gets through scrapes
// the remaining pages slowly, with a fresh browser session after any challenge.
// SNAPSHOT_OFFSET rotates which page each runner tries first.
// Usage: node scripts/snapshot-royalroad.js [outDir] [list page]
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright-core");
const { BASE_URL, SNAPSHOT_LISTS, parseNovelList } = require("../src/novels/scrapper/royalroadScrapper");

const [outDir = "royalroad", onlyList, onlyPage] = process.argv.slice(2);
const PAGE_DELAY_MS = Number(process.env.PAGE_DELAY_MS || 15000);
const OFFSET = Number(process.env.SNAPSHOT_OFFSET || 0);

// Also report as GitHub Actions annotations, which are readable without opening the log
function report(level, message) {
  const log = level === "notice" ? console.log : console.error;
  log(process.env.GITHUB_ACTIONS ? `::${level}::${message}` : message);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// [list, page, withChapters] for every page in the snapshot, or just the requested one
function pagesToScrape() {
  const pages = [];
  for (const [list, { pages: count, withChapters = false }] of Object.entries(SNAPSHOT_LISTS)) {
    for (let n = 1; n <= count; n++) pages.push([list, n, withChapters]);
  }
  if (!onlyList) {
    const start = OFFSET % pages.length;
    return [...pages.slice(start), ...pages.slice(0, start)];
  }
  const selected = pages.filter(([list, n]) => list === onlyList && n === Number(onlyPage));
  if (selected.length === 0) throw new Error(`Unknown list/page: ${onlyList} ${onlyPage}`);
  return selected;
}

// Each session gets its own profile so a challenged session leaves nothing behind
function launchBrowser() {
  return chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "rr-profile-")), {
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: false,
    viewport: { width: 1366, height: 768 },
    args: ["--disable-blink-features=AutomationControlled"]
  });
}

async function scrapeList(context, list, n, withChapters) {
  const url = `${BASE_URL}${SNAPSHOT_LISTS[list].path}?page=${n}`;
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".fiction-list-item", { timeout: 30000 });
    const data = parseNovelList(await page.content(), withChapters);
    fs.writeFileSync(path.join(outDir, `${list}-${n}.json`), JSON.stringify({ updatedAt: new Date().toISOString(), data }));
    report("notice", `${list} page ${n}: ${data.length} novels`);
  } catch (error) {
    const title = await page.title().catch(() => "?");
    throw new Error(`${list} page ${n} failed (page title "${title}"): ${error.message.split("\n")[0]}`);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const pages = pagesToScrape();
  fs.mkdirSync(outDir, { recursive: true });
  let context = await launchBrowser();
  let saved = 0;

  for (const [index, [list, n, withChapters]] of pages.entries()) {
    if (index > 0) await delay(PAGE_DELAY_MS);
    try {
      await scrapeList(context, list, n, withChapters);
      saved++;
    } catch (error) {
      report("warning", error.message);
      if (saved === 0) {
        report("warning", "Blocked on the first page; leaving the rest to other runners");
        break;
      }
      // Retry once in a fresh browser session
      await context.close();
      context = await launchBrowser();
      await delay(PAGE_DELAY_MS);
      try {
        await scrapeList(context, list, n, withChapters);
        saved++;
      } catch (retryError) {
        report("warning", `retry: ${retryError.message}`);
      }
    }
  }

  await context.close();
  report("notice", `Saved ${saved} of ${pages.length} pages`);
}

main().catch((error) => {
  report("error", error.message.split("\n")[0]);
  process.exit(1);
});
