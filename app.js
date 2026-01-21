const express = require("express");
const esnovelRoutes = require("./src/novels/routes/esnovelsRoutes");
const fanTranslationRoutes = require("./src/novels/routes/fantranslationRoute");const royalroadRoutes = require("./src/novels/routes/royalroadRoutes");
const app = express();
const port = 5000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Jellee Api - your destination for scrapping data from various novel & manga sites! Seamlessly access  id, title, image and more.");
});

// app.use("/novel", esnovelRoutes);
app.use("/novel", fanTranslationRoutes);
app.use("/novel", royalroadRoutes);

// Start server
app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);
});
