import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const API_KEY = tea70fdbdb86c100d9c929a453923d93a9;

// Health check
app.get("/", (req, res) => {
  res.send("Airline API is running ✔");
});

// Unified endpoint
app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res
        .status(400)
        .json({ error: "Provide at least one: ?name= OR ?iata= OR ?icao=" });
    }

    const queryValue = iata || icao || name;

    const url = `http://api.aviationstack.com/v1/airlines?access_key=${API_KEY}&search=${queryValue}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.json({ error: "No airline found" });
    }

    const airline = data.data[0];

    res.json({
      name: airline.airline_name || "",
      iata: airline.iata_code || "",
      icao: airline.icao_code || "",
      callsign: airline.callsign || "",
      country: airline.country_name || "",
      type: airline.type || "",
      status: airline.status || "",
      hub_code: airline.hub_code || "",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () =>
  console.log(`Airline API running on port ${PORT}`)
);
