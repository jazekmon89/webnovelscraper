const axios = require("axios");
const cheerio = require("cheerio");
const BASE_URL = "https://www.foxaholic.com/";

// Configure axios with browser-like headers
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.foxaholic.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'DNT': '1',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Cache-Control': 'max-age=0'
  }
});

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

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make requests with retry logic
async function fetchWithRetry(url, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log(`403 error on attempt ${i + 1} for ${url}`);
        if (i < retries - 1) {
          await delay(delayMs * (i + 1)); // Exponential backoff
          continue;
        }
      }
      throw error;
    }
  }
}

async function scrapeLatestRelease(page){
  const url = `${BASE_URL}novel/page/${page}/`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}
async function scrapeFinishedNovels(page){
  const url = `${BASE_URL}novel-tag/finished/page/${page}/`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}
async function scrapeTrendingNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=trending`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}
async function scrapeMostViewedNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=views`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}
async function scrapeNewestNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=new-manga`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}
async function scrapeMostRatedNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=rating`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}
async function scrapeAllNovels(page){
  const url = `${BASE_URL}novel/page/${page}/?m_orderby=alphabet`;
  const data = await fetchWithRetry(url);
  return scrapeData(data);
}

module.exports = {
  scrapeLatestRelease,
  scrapeFinishedNovels,
  scrapeTrendingNovels,
  scrapeMostViewedNovels,
  scrapeNewestNovels,
  scrapeMostRatedNovels,
  scrapeAllNovels
};