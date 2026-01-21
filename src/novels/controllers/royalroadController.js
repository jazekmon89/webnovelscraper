const {
  scrapeLatestUpdates,
  scrapePopular,
  scrapeTrending,
  scrapeWeeklyPopular,
  scrapeSearch
} = require("../scrapper/royalroadScrapper");

async function getLatestUpdates(req, res) {
  const page = req.query.page || 1;
  try {
    const data = await scrapeLatestUpdates(page);
    if (data && data.length > 0) {
      return res.status(200).send({ success: true, page: parseInt(page), data: data });
    } else {
      return res.status(404).send({ success: false, message: "No novels found on this page!" });
    }
  } catch (error) {
    console.error("Failed to fetch data from Royal Road!", error);
    return res.status(500).send({ success: false, message: error.message });
  }
}

async function getPopular(req, res) {
  const page = req.query.page || 1;
  try {
    const data = await scrapePopular(page);
    if (data && data.length > 0) {
      return res.status(200).send({ success: true, page: parseInt(page), data: data });
    } else {
      return res.status(404).send({ success: false, message: "No novels found on this page!" });
    }
  } catch (error) {
    console.error("Failed to fetch data from Royal Road!", error);
    return res.status(500).send({ success: false, message: error.message });
  }
}

async function getTrending(req, res) {
  const page = req.query.page || 1;
  try {
    const data = await scrapeTrending(page);
    if (data && data.length > 0) {
      return res.status(200).send({ success: true, page: parseInt(page), data: data });
    } else {
      return res.status(404).send({ success: false, message: "No novels found on this page!" });
    }
  } catch (error) {
    console.error("Failed to fetch data from Royal Road!", error);
    return res.status(500).send({ success: false, message: error.message });
  }
}

async function getWeeklyPopular(req, res) {
  const page = req.query.page || 1;
  try {
    const data = await scrapeWeeklyPopular(page);
    if (data && data.length > 0) {
      return res.status(200).send({ success: true, page: parseInt(page), data: data });
    } else {
      return res.status(404).send({ success: false, message: "No novels found on this page!" });
    }
  } catch (error) {
    console.error("Failed to fetch data from Royal Road!", error);
    return res.status(500).send({ success: false, message: error.message });
  }
}

async function search(req, res) {
  const query = req.query.query || req.query.q || '';
  const page = req.query.page || 1;
  
  if (!query) {
    return res.status(400).send({ success: false, message: "Query parameter is required!" });
  }
  
  try {
    const data = await scrapeSearch(query, page);
    return res.status(200).send({ success: true, query, page: parseInt(page), results: data.length, data: data });
  } catch (error) {
    console.error("Failed to search Royal Road!", error);
    return res.status(500).send({ success: false, message: error.message });
  }
}

module.exports = {
  getLatestUpdates,
  getPopular,
  getTrending,
  getWeeklyPopular,
  search
};
