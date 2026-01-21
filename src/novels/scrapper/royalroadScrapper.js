const axios = require("axios");
const cheerio = require("cheerio");
const BASE_URL = "https://www.royalroad.com";

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
  }
});

async function scrapeLatestUpdates(page = 1) {
  const url = `${BASE_URL}/fictions/latest-updates?page=${page}`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);
  const novels = [];

  $('.fiction-list-item').each((i, el) => {
    const titleEl = $(el).find('.fiction-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href');
    
    if (title && href) {
      const id = href.split('/fiction/')[1]?.split('/')[0];
      const coverImg = $(el).find('img.cover-img').attr('src');
      const author = $(el).find('.author a').text().trim();
      const authorUrl = $(el).find('.author a').attr('href');
      const tags = [];
      
      $(el).find('.tags a').each((j, tag) => {
        tags.push($(tag).text().trim());
      });
      
      const stats = $(el).find('.stats .fa-book').parent().text().trim();
      const pages = $(el).find('.stats .fa-list').parent().text().trim();
      const rating = $(el).find('.stats .fa-star').parent().text().trim();
      
      novels.push({
        id,
        title,
        url: BASE_URL + href,
        cover: coverImg || '',
        author: {
          name: author,
          url: authorUrl ? BASE_URL + authorUrl : ''
        },
        tags,
        stats: {
          chapters: stats,
          pages,
          rating
        }
      });
    }
  });

  return novels;
}

async function scrapePopular(page = 1) {
  const url = `${BASE_URL}/fictions/best-rated?page=${page}`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);
  const novels = [];

  $('.fiction-list-item').each((i, el) => {
    const titleEl = $(el).find('.fiction-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href');
    
    if (title && href) {
      const id = href.split('/fiction/')[1]?.split('/')[0];
      const coverImg = $(el).find('img.cover-img').attr('src');
      const author = $(el).find('.author a').text().trim();
      const description = $(el).find('.margin-top-10').text().trim();
      
      novels.push({
        id,
        title,
        url: BASE_URL + href,
        cover: coverImg || '',
        author: author,
        description
      });
    }
  });

  return novels;
}

async function scrapeTrending(page = 1) {
  const url = `${BASE_URL}/fictions/trending?page=${page}`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);
  const novels = [];

  $('.fiction-list-item').each((i, el) => {
    const titleEl = $(el).find('.fiction-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href');
    
    if (title && href) {
      const id = href.split('/fiction/')[1]?.split('/')[0];
      const coverImg = $(el).find('img.cover-img').attr('src');
      const author = $(el).find('.author a').text().trim();
      
      novels.push({
        id,
        title,
        url: BASE_URL + href,
        cover: coverImg || '',
        author: author
      });
    }
  });

  return novels;
}

async function scrapeWeeklyPopular(page = 1) {
  const url = `${BASE_URL}/fictions/weekly-popular?page=${page}`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);
  const novels = [];

  $('.fiction-list-item').each((i, el) => {
    const titleEl = $(el).find('.fiction-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href');
    
    if (title && href) {
      const id = href.split('/fiction/')[1]?.split('/')[0];
      const coverImg = $(el).find('img.cover-img').attr('src');
      
      novels.push({
        id,
        title,
        url: BASE_URL + href,
        cover: coverImg || ''
      });
    }
  });

  return novels;
}

async function scrapeSearch(query, page = 1) {
  const url = `${BASE_URL}/fictions/search?title=${encodeURIComponent(query)}&page=${page}`;
  const { data } = await axiosInstance.get(url);
  const $ = cheerio.load(data);
  const novels = [];

  $('.fiction-list-item').each((i, el) => {
    const titleEl = $(el).find('.fiction-title a');
    const title = titleEl.text().trim();
    const href = titleEl.attr('href');
    
    if (title && href) {
      const id = href.split('/fiction/')[1]?.split('/')[0];
      const coverImg = $(el).find('img.cover-img').attr('src');
      const author = $(el).find('.author a').text().trim();
      
      novels.push({
        id,
        title,
        url: BASE_URL + href,
        cover: coverImg || '',
        author: author
      });
    }
  });

  return novels;
}

module.exports = {
  scrapeLatestUpdates,
  scrapePopular,
  scrapeTrending,
  scrapeWeeklyPopular,
  scrapeSearch
};
