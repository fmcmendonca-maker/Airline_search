import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Normalize label names
function clean(str) {
  return str.replace(/\[.*?\]/g, "").trim();
}

app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia + Planespotters) is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res.status(400).json({ error: "Provide ?name= OR ?iata= OR ?icao=" });
    }

    // Choose search term
    const term = name || iata || icao;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`;

    const html = await (await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })).text();

    const $ = load(html);

    let data = {
      name: "",
      shortName: "",
      iata: "",
      icao: "",
      country: "",
      region: "",
      fleet_size: "",
      aircraft_types: "",
      headquarters: "",
      founded: "",
      website: "",
      email: "",
      phone: "",
      callsign: "",
      type: "",
      status: "",
      category: "",
      email_sales: "",
      email_ops: "",
      logo_url: "",
      phone_sales: "",
      phone_ops: "",
      observations: ""
    };

    // Select ANY infobox version
    const rows = $("table.infobox tr");

    rows.each((i, el) => {
      const label = clean($(el).find("th").text());
      const value = clean($(el).find("td").text());

      if (!label || !value) return;

      if (label.includes("IATA")) data.iata = value;
      if (label.includes("ICAO")) data.icao = value;
      if (label.includes("Callsign")) data.callsign = value;
      if (label.includes("Fleet size")) data.fleet_size = value;
      if (label.includes("Headquarters")) data.headquarters = value;
      if (label.includes("Founded")) data.founded = value;
      if (label.includes("Website")) data.website = value;
    });

    // Capture title
    data.name = clean($("#firstHeading").text()) || term;

    // Fallback fleet size from ANY bullet
    if (!data.fleet_size) {
      const fleetLine = $("li:contains('fleet')").first().text();
      if (fleetLine) {
        const match = fleetLine.match(/\d+/);
        if (match) data.fleet_size = match[0];
      }
    }

    if (!data.name) {
      return res.status(404).json({ error: "No airline found" });
    }

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
