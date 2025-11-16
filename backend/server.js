import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

/* ----------------------------- WIKIPEDIA SCRAPER ---------------------------- */

async function fetchWikipediaData(query) {
  try {
    const searchUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`;
    const html = await (await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })).text();

    const $ = load(html);

    const infobox = $(".infobox");

    if (!infobox || infobox.length === 0) {
      return null;
    }

    const getRow = (label) =>
      infobox.find(`th:contains(${label})`).next("td").text().trim() || "";

    return {
      name: $("h1").text().trim(),
      shortName: "",
      iata: getRow("IATA"),
      icao: getRow("ICAO"),
      callsign: getRow("Callsign"),
      founded: getRow("Founded"),
      headquarters: getRow("Headquarters"),
      website: getRow("Website"),
      country: "",
      region: "",
      fleet_size: "",
      aircraft_types: "",
      email: "",
      phone: "",
      type: "",
      status: "",
      category: "",
      email_sales: "",
      email_ops: "",
      logo_url: infobox.find("img").attr("src")
        ? "https:" + infobox.find("img").attr("src")
        : "",
      phone_sales: "",
      phone_ops: "",
      observations: ""
    };

  } catch (err) {
    console.error("Wikipedia error:", err);
    return null;
  }
}

/* ----------------------------- AIRFLEETS SCRAPER ---------------------------- */

async function fetchAirfleetsData(icao) {
  try {
    if (!icao) return { fleet_size: "", aircraft_types: "" };

    const url = `https://www.airfleets.net/flottecie/${icao}.htm`;

    const html = await (await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })).text();

    const $ = load(html);

    // Fleet size
    let fleet_size = $("td:contains('Total')").next().text().trim();

    // Aircraft types list
    let aircraft_types = [];
    $("table.tablo > tbody > tr td:nth-child(1)").each((i, el) => {
      let type = $(el).text().trim();
      if (type && type.length < 60) {
        aircraft_types.push(type);
      }
    });

    return {
      fleet_size: fleet_size || "",
      aircraft_types: aircraft_types.join(", ")
    };

  } catch (err) {
    console.error("Airfleets error:", err);
    return { fleet_size: "", aircraft_types: "" };
  }
}

/* ----------------------------- MAIN ENDPOINT ---------------------------- */

app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia + Airfleets) is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res.status(400).json({ error: "Provide ?name= or ?iata= or ?icao=" });
    }

    const searchKey = name || iata || icao;

    // 1️⃣ Get Wikipedia Data
    let wiki = await fetchWikipediaData(searchKey);
    if (!wiki) {
      return res.status(404).json({ error: "No airline found on Wikipedia" });
    }

    // 2️⃣ Determine ICAO (needed for Airfleets)
    const icaoCode = icao || wiki.icao;

    // 3️⃣ Get Airfleets Data (fleet size + aircraft types)
    const airfleets = await fetchAirfleetsData(icaoCode);

    // 4️⃣ Merge results
    wiki.fleet_size = airfleets.fleet_size;
    wiki.aircraft_types = airfleets.aircraft_types;

    res.json(wiki);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
