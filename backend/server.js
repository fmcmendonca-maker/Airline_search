import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Small helper to clean text
function clean(str = "") {
  return str.replace(/\[.*?\]/g, "").trim();
}

// -------- Airfleets scraper (optional) --------
async function fetchAirfleetsData(name, icao) {
  try {
    // We try with the airline name first, fallback to ICAO if needed
    const key = name || icao;
    if (!key) return { fleet_size: "", aircraft_types: "" };

    const url = `https://www.airfleets.net/flottecie/${encodeURIComponent(
      key
    )}.htm`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AirlineScraper/1.0)"
      }
    });

    if (!resp.ok) {
      return { fleet_size: "", aircraft_types: "" };
    }

    const html = await resp.text();
    const $ = load(html);

    let fleet_size = "";
    const typesSet = new Set();

    // Heuristic: look for a "Total" cell and take the next td as the fleet size
    $("td").each((_, el) => {
      const txt = $(el).text().trim();
      if (/^Total\b/i.test(txt)) {
        const val = $(el).next("td").text().trim();
        if (val) {
          fleet_size = val;
        }
      }
    });

    // Heuristic: first column of fleet table rows is the aircraft type
    $("table tr").each((_, row) => {
      const cols = $(row).find("td");
      if (cols.length >= 2) {
        const type = $(cols[0]).text().trim();
        if (
          type &&
          !/^Total\b/i.test(type) &&
          type.length < 60 &&
          !/\d/.test(type) // avoid numeric junk rows
        ) {
          typesSet.add(type);
        }
      }
    });

    return {
      fleet_size: fleet_size || "",
      aircraft_types: Array.from(typesSet).join(", ")
    };
  } catch (err) {
    console.error("Airfleets error:", err);
    return { fleet_size: "", aircraft_types: "" };
  }
}

// -------- Wikipedia scraper (current working logic) --------
app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia + Airfleets) is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;

    if (!name && !iata && !icao) {
      return res
        .status(400)
        .json({ error: "Provide ?name= OR ?iata= OR ?icao=" });
    }

    const term = name || iata || icao;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AirlineScraper/1.0)" }
    });

    if (!resp.ok) {
      return res.status(404).json({ error: "No airline found" });
    }

    const html = await resp.text();
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

    // Title
    data.name = clean($("#firstHeading").text()) || term;

    // Basic infobox parsing
    const rows = $("table.infobox tr");
    rows.each((_, el) => {
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

    // Simple summary as observations (first paragraph)
    const firstP = $("#mw-content-text p").first().text().trim();
    if (firstP) {
      data.observations = firstP;
    }

    // Logo from infobox
    const logoSrc = $("table.infobox img").first().attr("src");
    if (logoSrc) {
      data.logo_url = logoSrc.startsWith("http")
        ? logoSrc
        : "https:" + logoSrc;
    }

    if (!data.name) {
      return res.status(404).json({ error: "No airline found" });
    }

    // ------- NOW: augment with Airfleets (optional) -------
    const airfleets = await fetchAirfleetsData(data.name, data.icao);

    if (airfleets.fleet_size) {
      data.fleet_size = airfleets.fleet_size;
    }
    if (airfleets.aircraft_types) {
      data.aircraft_types = airfleets.aircraft_types;
    }

    res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
