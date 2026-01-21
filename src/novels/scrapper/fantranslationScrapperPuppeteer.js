const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");
const axios = require("axios");
const BASE_URL = "https://www.foxaholic.com/";

let browser = null;

// Fallback to axios if Puppeteer fails
async function fetchWithAxios(url) {
  const axiosInstance = axios.create({
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.foxaholic.com/',
      'Connection': 'keep-alive',
    }
  });
  
  const response = await axiosInstance.get(url);
  return response.data;
}

async function getBrowser() {
  if (!browser) {
    try {
      // Check if running on Vercel/serverless environment
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;
      
      if (isServerless) {
        // Configure chromium for serverless
        chromium.setHeadlessMode = true;
        chromium.setGraphicsMode = false;
        
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-sandbox',
            '--no-zygote',
            '--single-process'
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } else {
        // Local development - use regular puppeteer
        const puppeteerLocal = require("puppeteer");
        browser = await puppeteerLocal.launch({
          headless: "new",
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ]
        });
      }
    } catch (error) {
      console.error("Failed to launch browser:", error);
      throw error;
    }
  }
  return browser;
}

async function fetchPage(url) {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const html = await page.content();
      await page.close();
      return html;
    } catch (error) {
      await page.close();
      throw error;
    }
  } catch (browserError) {
    console.error("Browser error, falling back to axios:", browserError.message);
    // Fallback to axios if browser fails
    return await fetchWithAxios(url);
  }
}

function scrapeData(data){
  const $ = cheerio.load(data);
  const novels = [];
  
  $(".page-listing-item .badge-pos-2").each((i, element) => {
    const pageItemDetail = $(element).find(".page-item-detail");
    const id = pageItemDetail.find(".item-thumb a").first().attr("href").split(BASE_URL).pop();
    const cover = pageItemDetail.find(".item-thumb img").attr("src") || "";
    const itemDetails = $(element).find(".item-summary");
    const title = itemDetails.find(".post-title h3").text().trim() || "";
    const rating = $(element).find(".meta-item .post-total-rating span.score").text().trim() || "";
    const chapterCon = $(element).find(".list-chapter");
    const chapterList = [];
    chapterCon.find(".chapter-item").each((i, elem) => {
      const latestChapter = $(elem).find(".chapter a").text().trim() || "";
      const chapterId = $(elem).find(".chapter a").attr("href").split(BASE_URL).pop() || "";
      const uploadedTime = $(elem).find(".post-on").text().trim() || "";
      chapterList.push({ chapterId, latestChapter, uploadedTime, });
    });
    
    novels.push({ id, cover, title, rating, chapterList, });
  });
  return novels;
}

async function scrapeLatestRelease(page){
  const url = `${BASE_URL}novel/page/${page}/`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

async function scrapeFinishedNovels(page){
  const url = `${BASE_URL}novel-tag/finished/page/${page}/`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

async function scrapeTrendingNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=trending`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

async function scrapeMostViewedNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=views`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

async function scrapeNewestNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=new-manga`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

async function scrapeMostRatedNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=rating`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

async function scrapeAllNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=alphabet`;
  const html = await fetchPage(url);
  return scrapeData(html);
}

// Cleanup function
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

module.exports = {
  scrapeLatestRelease,
  scrapeFinishedNovels,
  scrapeTrendingNovels,
  scrapeMostViewedNovels,
  scrapeNewestNovels,
  scrapeMostRatedNovels,
  scrapeAllNovels,
  closeBrowser
};
