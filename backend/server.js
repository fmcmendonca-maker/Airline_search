import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.AVIATIONSTACK_KEY;

app.get("/", (req, res) => {
  res.send("Aviation API is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res.status(400).json({ error: "Provide name, iata, or icao" });
    }

    const url = `http://api.aviationstack.com/v1/airlines?access_key=${API_KEY}${query}`;

    const response = await fetch(url);
    const json = await response.json();

    if (!json.data || json.data.length === 0) {
      return res.status(404).json({ error: "No airline found" });
    }

    return res.json(json.data[0]);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
});
app.get("/check", (req, res) => {
  res.json({
    keyLoaded: process.env.AVIATIONSTACK_KEY ? true : false,
    keyPrefix: process.env.AVIATIONSTACK_KEY
      ? process.env.AVIATIONSTACK_KEY.substring(0, 4)
      : null
  });
});
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
