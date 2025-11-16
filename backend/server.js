import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.AVIATIONSTACK_KEY;
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Aviation API is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res.status(400).json({ error: "Provide name, iata, or icao" });
    }

    // Build API query
    let query = "";
    if (iata) query = `&iata_code=${iata.toUpperCase()}`;
    if (icao) query = `&icao_code=${icao.toUpperCase()}`;
    if (name) query = `&airline_name=${encodeURIComponent(name)}`;

    const url = `https://api.aviationstack.com/v1/airlines?access_key=${API_KEY}${query}`;
    console.log("Calling:", url);

    const response = await fetch(url);
    const json = await response.json();

    if (!json.data || json.data.length === 0) {
      return res.status(404).json({ error: "No airline found" });
    }

    return res.json(json.data[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Debug endpoint
app.get("/check", (req, res) => {
  res.json({
    keyLoaded: !!process.env.AVIATIONSTACK_KEY,
    keyPrefix: process.env.AVIATIONSTACK_KEY
      ? process.env.AVIATIONSTACK_KEY.substring(0, 4)
      : null
  });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
