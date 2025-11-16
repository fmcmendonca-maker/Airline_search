import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia + Planespotters) is running ✔");
});

/* -----------------------------------------------
   1) Wikipedia Scraper
------------------------------------------------ */
async function scrapeWikipedia(nameOrCode) {
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(
    nameOrCode
  )}`;

  try {
    const resp = await fetch(url);
    const html = await resp.text();
    const $ = load(html);

    const info = {};

    $("table.infobox tr").each((i, row) => {
      const header = $(row).find("th").text().trim();
      const value = $(row).find("td").text().trim();

      if (!header || !value) return;

      if (/IATA/i.test(header)) info.iata = value;
      if (/ICAO/i.test(header)) info.icao = value;
      if (/Callsign/i.test(header)) info.callsign = value;
      if (/Founded/i.test(header)) info.founded = value;
      if (/Headquarters/i.test(header)) info.headquarters = value;
      if (/Website/i.test(header)) info.website = $(row).find("td a").attr("href") || value;
      if (/Fleet size/i.test(header)) info.fleet_size = value; // sometimes exists
      if (/Destinations/i.test(header)) info.destinations = value;
      if (/Parent company/i.test(header)) info.parent = value;
      if (/Hubs/i.test(header)) info.hubs = value;
    });

    info.name = $("#firstHeading").text().trim();

    return info;
  } catch (err) {
    console.log("Wikipedia error", err);
    return null;
  }
}

/* --------------------------------------------------------
   2) Planespotters Scraper (Fleet Size + Aircraft Types)
---------------------------------------------------------*/
async function scrapePlanespotters(iata, icao) {
  if (!iata && !icao) return {};

  const code = iata || icao;
  const url = `https://www.planespotters.net/airline/${code}`;

  try {
    const resp = await fetch(url);
    const html = await resp.text();
    const $ = load(html);

    const result = {};

    // Fleet total
    const fleetText = $("div.airline-fleet h2")
      .text()
      .trim()
      .match(/Fleet\s+(\d+)/i);

    if (fleetText) {
      result.fleet_size = fleetText[1];
    }

    // Aircraft types list
    const types = [];
    $("table.fleet-table tbody tr").each((i, row) => {
      const aircraft = $(row).find("td:nth-child(1)").text().trim();
      if (aircraft) types.push(aircraft);
    });

    if (types.length) {
      result.aircraft_types = types.join(", ");
    }

    return result;
  } catch (err) {
    console.log("Planespotters error", err);
    return {};
  }
}

/* --------------------------------------------------------
   MAIN ENDPOINT
---------------------------------------------------------*/
app.get("/airline", async (req, res) => {
  try {
    const { iata, icao, name } = req.query;

    const searchTerm =
      name ||
      (iata && iata.toUpperCase()) ||
      (icao && icao.toUpperCase());

    if (!searchTerm) {
      return res.status(400).json({ error: "Provide name, iata, or icao" });
    }

    // 1) Wikipedia
    const wiki = await scrapeWikipedia(searchTerm);

    if (!wiki || !wiki.name) {
      return res.status(404).json({ error: "No airline found" });
    }

    // 2) Planespotters (priority for fleet data)
    const planes = await scrapePlanespotters(wiki.iata, wiki.icao);

    // Merge results (Planespotters overrides Wikipedia)
    const output = {
      ...wiki,
      ...planes,
    };

    res.json(output);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

/* ------------------------------------------------------ */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
