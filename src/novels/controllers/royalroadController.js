const {
  scrapeLatestUpdates,
  scrapePopular,
  scrapeTrending,
  scrapeWeeklyPopular
} = require("../scrapper/royalroadScrapper");

// Returns a positive integer page, or null if the value is invalid (e.g. "[object Event]")
function parsePage(value) {
  if (value === undefined) return 1;
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : null;
}

// Serves one Royal Road list from the snapshot data
function listHandler(scrape) {
  return async (req, res) => {
    const page = parsePage(req.query.page);
    if (!page) {
      return res.status(400).send({ success: false, message: "Page must be a positive integer!" });
    }
    try {
      const { updatedAt, data } = await scrape(page);
      if (data && data.length > 0) {
        return res.status(200).send({ success: true, page, updatedAt, data: data });
      } else {
        return res.status(404).send({ success: false, message: "No novels found on this page!" });
      }
    } catch (error) {
      console.error("Failed to load Royal Road snapshot!", error);
      return res.status(502).send({ success: false, message: "Failed to load Royal Road data." });
    }
  };
}

const getLatestUpdates = listHandler(scrapeLatestUpdates);
const getPopular = listHandler(scrapePopular);
const getTrending = listHandler(scrapeTrending);
const getWeeklyPopular = listHandler(scrapeWeeklyPopular);

async function search(req, res) {
  // Search needs a live request per query, which Royal Road's Cloudflare challenge blocks
  return res.status(503).send({
    success: false,
    message: "Royal Road search is temporarily unavailable."
  });
}

module.exports = {
  getLatestUpdates,
  getPopular,
  getTrending,
  getWeeklyPopular,
  search
};
