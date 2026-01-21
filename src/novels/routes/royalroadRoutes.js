const express = require("express");
const {
  getLatestUpdates,
  getPopular,
  getTrending,
  getWeeklyPopular,
  search
} = require("../controllers/royalroadController");

const router = express.Router();

router.get("/royalroad/latest", getLatestUpdates);
router.get("/royalroad/popular", getPopular);
router.get("/royalroad/trending", getTrending);
router.get("/royalroad/weekly", getWeeklyPopular);
router.get("/royalroad/search", search);

module.exports = router;
