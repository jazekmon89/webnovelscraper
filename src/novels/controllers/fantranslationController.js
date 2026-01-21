const {
  scrapeLatestRelease,
  scrapeFinishedNovels,
  scrapeTrendingNovels,
  scrapeMostViewedNovels,
  scrapeNewestNovels,
  scrapeMostRatedNovels,
  scrapeAllNovels
} = require("../scrapper/fantranslationScrapper");

async function getLatestChapter(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeLatestRelease(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.error("Failed to fetch data from Fan Translations!", error);
    // Provide more detailed error information
    if (error.response && error.response.status === 403) {
      return res.status(503).send({ 
        success: false, 
        message: "The target website (foxaholic.com) is currently blocking automated requests with Cloudflare protection. This endpoint is temporarily unavailable.",
        technicalDetails: "403 Forbidden - Bot detection active"
      });
    }
    return res.status(500).send({ success: false, message: error.message, });
  }
}
async function getFinishedNovels(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeFinishedNovels(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.error("Failed to fetch data from Fan Translations!", error);
    if (error.response && error.response.status === 403) {
      return res.status(503).send({ 
        success: false, 
        message: "The target website (foxaholic.com) is currently blocking automated requests with Cloudflare protection. This endpoint is temporarily unavailable.",
        technicalDetails: "403 Forbidden - Bot detection active"
      });
    }
    return res.status(500).send({ success: false, message: error.message || "Failed to fetch data from Fan Translations!", });
  }
}
async function getTrendingNovels(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeTrendingNovels(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.error("Failed to fetch data from Fan Translations!", error);
    if (error.response && error.response.status === 403) {
      return res.status(503).send({ 
        success: false, 
        message: "The target website (foxaholic.com) is currently blocking automated requests with Cloudflare protection. This endpoint is temporarily unavailable.",
        technicalDetails: "403 Forbidden - Bot detection active"
      });
    }
    return res.status(500).send({ success: false, message: error.message || "Failed to fetch data from Fan Translations!", });
  }
}
async function getMostViewedNovels(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeMostViewedNovels(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.error("Failed to fetch data from Fan Translations!", error);
    if (error.response && error.response.status === 403) {
      return res.status(503).send({ 
        success: false, 
        message: "The target website (foxaholic.com) is currently blocking automated requests with Cloudflare protection. This endpoint is temporarily unavailable.",
        technicalDetails: "403 Forbidden - Bot detection active"
      });
    }
    return res.status(500).send({ success: false, message: error.message || "Failed to fetch data from Fan Translations!", });
  }
}
async function getNewestNovels(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeNewestNovels(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.error("Failed to fetch data from Fan Translations!", error);
    if (error.response && error.response.status === 403) {
      return res.status(503).send({ 
        success: false, 
        message: "The target website (foxaholic.com) is currently blocking automated requests with Cloudflare protection. This endpoint is temporarily unavailable.",
        technicalDetails: "403 Forbidden - Bot detection active"
      });
    }
    return res.status(500).send({ success: false, message: error.message || "Failed to fetch data from Fan Translations!", });
  }
}
async function getMostRatedNovels(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeMostRatedNovels(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.error("Failed to fetch data from Fan Translations!", error);
    if (error.response && error.response.status === 403) {
      return res.status(503).send({ 
        success: false, 
        message: "The target website (foxaholic.com) is currently blocking automated requests with Cloudflare protection. This endpoint is temporarily unavailable.",
        technicalDetails: "403 Forbidden - Bot detection active"
      });
    }
    return res.status(500).send({ success: false, message: error.message || "Failed to fetch data from Fan Translations!", });
  }
}
async function getAllNovels(req, res){
  const page = req.query.page || 1;
  try{
    const data = await scrapeAllNovels(page);
    if(data){
      return res.status(200).send({ success: true, page: page, data: data, });
    }else{
      return res.status(404).send({ success: false, message: "Page not found!", });
    }
  }catch(error){
    console.log("Failed to fetch data from Fan Translations!");
    return res.status(500).send({ success: false, message: "Failed to fetch data from Fan Translations!", });
  }
}

module.exports = {
  getLatestChapter,
  getFinishedNovels,
  getTrendingNovels,
  getMostViewedNovels,
  getNewestNovels,
  getMostRatedNovels,
  getAllNovels
};