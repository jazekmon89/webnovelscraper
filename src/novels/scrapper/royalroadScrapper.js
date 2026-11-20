const axios = require("axios");
const cheerio = require("cheerio");
const BASE_URL = "https://www.royalroad.com";

// Royal Road's Cloudflare challenge blocks direct requests from here, so the lists are
// scraped by the "Royal Road snapshot" GitHub workflow (headful Chrome) and served
// from the repo's data branch.
const SNAPSHOT_URL = "https://raw.githubusercontent.com/jazekmon89/webnovelscraper/data/royalroad";

// Lists and page counts captured by scripts/snapshot-royalroad.js
const SNAPSHOT_LISTS = {
  latest: { path: "/fictions/latest-updates", pages: 3, withChapters: true },
  popular: { path: "/fictions/best-rated", pages: 1 },
  trending: { path: "/fictions/trending", pages: 1 },
  weekly: { path: "/fictions/weekly-popular", pages: 1 }
};

function parseNovelList(html, withChapters = false) {
  const $ = cheerio.load(html);
  const novels = [];

  $('.fiction-list-item').each((i, el) => {
    const titleEl = $(el).find('.fiction-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href');

    if (title && href) {
      const id = href.split('/fiction/')[1]?.split('/')[0];
      const coverImg = $(el).find('img').attr('src');
      const tags = [];

      $(el).find('.tags a').each((j, tag) => {
        tags.push($(tag).text().trim());
      });

      const novel = {
        id,
        title,
        url: BASE_URL + href,
        cover: coverImg || '',
        tags
      };

      if (withChapters) {
        // Get latest chapters from this page
        novel.latestChapters = [];
        $(el).find('ul.list-unstyled li.list-item a').each((j, chap) => {
          const chapterTitle = $(chap).find('span.col-xs-8').text().trim();
          const timeAgo = $(chap).find('time').text().trim();
          const chapterHref = $(chap).attr('href');

          if (chapterTitle) {
            novel.latestChapters.push({
              title: chapterTitle,
              url: BASE_URL + chapterHref,
              timeAgo: timeAgo + ' ago'
            });
          }
        });
      }

      novels.push(novel);
    }
  });

  return novels;
}

// Returns { updatedAt, data }; pages that aren't in the snapshot come back empty
async function fetchSnapshot(list, page) {
  try {
    const { data } = await axios.get(`${SNAPSHOT_URL}/${list}-${page}.json`, { timeout: 15000 });
    return data;
  } catch (error) {
    if (error.response?.status === 404) return { updatedAt: null, data: [] };
    throw error;
  }
}

async function scrapeLatestUpdates(page = 1) {
  return fetchSnapshot("latest", page);
}

async function scrapePopular(page = 1) {
  return fetchSnapshot("popular", page);
}

async function scrapeTrending(page = 1) {
  return fetchSnapshot("trending", page);
}

async function scrapeWeeklyPopular(page = 1) {
  return fetchSnapshot("weekly", page);
}

module.exports = {
  BASE_URL,
  SNAPSHOT_LISTS,
  parseNovelList,
  scrapeLatestUpdates,
  scrapePopular,
  scrapeTrending,
  scrapeWeeklyPopular
};
