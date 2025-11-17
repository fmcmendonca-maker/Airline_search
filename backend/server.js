import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Helper cleanup
function clean(str = "") {
  return str.replace(/\[.*?\]/g, "").trim();
}

// ----------------- AIRFLEETS SCRAPER -----------------
async function fetchAirfleetsData(name, icao) {
  try {
    const key = icao || name;
    if (!key) return { fleet_size: "", aircraft_types: "" };

    const url = `https://www.airfleets.net/flottecie/${encodeURIComponent(key)}.htm`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 AirlineScraper/1.0" }
    });

    if (!resp.ok) return { fleet_size: "", aircraft_types: "" };

    const html = await resp.text();
    const $ = load(html);

    let fleet_size = "";
    const aircraftSet = new Set();

    $("td").each((_, td) => {
      let t = $(td).text().trim();
      if (/^Total$/i.test(t)) {
        const val = $(td).next("td").text().trim();
        if (val) fleet_size = val;
      }
    });

    $("table tr").each((_, row) => {
      const cols = $(row).find("td");
      if (cols.length >= 2) {
        let t = $(cols[0]).text().trim();
        if (t && !/^Total/i.test(t) && t.length < 50) {
          aircraftSet.add(t);
        }
      }
    });

    return {
      fleet_size,
      aircraft_types: Array.from(aircraftSet).join(", ")
    };

  } catch (err) {
    console.error("Airfleets scraper error:", err);
    return { fleet_size: "", aircraft_types: "" };
  }
}

// ----------------- MAIN ENDPOINT -----------------
app.get("/", (req, res) => {
  res.send("Airline API (Wikipedia + Airfleets) is running ✔");
});

app.get("/airline", async (req, res) => {
  try {
    const { name, iata, icao } = req.query;
    if (!name && !iata && !icao)
      return res.status(400).json({ error: "Provide name, IATA or ICAO" });

    const term = name || iata || icao;
    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(term)}`;

    const resp = await fetch(wikiUrl, {
      headers: { "User-Agent": "Mozilla/5.0 AirlineScraper/1.0" }
    });

    if (!resp.ok) return res.status(404).json({ error: "No airline found" });

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
      key_people: "",
      observations: ""
    };

    // ---------- Extract TITLE ----------
    data.name = clean($("#firstHeading").text()) || term;

    // ---------- Extract INFOBOX ----------
    const rows = $("table.infobox tr");
    rows.each((_, el) => {
      const label = clean($(el).find("th").text());
      const value = clean($(el).find("td").text());
      if (!label || !value) return;

      if (/Short name|Operating name/i.test(label)) data.shortName = value;

      if (/IATA/i.test(label)) {
        const m = value.match(/\b[A-Z0-9]{2}\b/);
        if (m) data.iata = m[0];
      }

      if (/ICAO/i.test(label)) {
        const m = value.match(/\b[A-Z0-9]{3}\b/);
        if (m) data.icao = m[0];
      }

      if (/Callsign/i.test(label)) {
        data.callsign = value
          .replace(/\b[A-Z0-9]{2,3}\b/g, "") // Remove codes
          .replace(/[•·]/g, " ")
          .trim();
      }

      if (/Headquarters/i.test(label)) data.headquarters = value;
      if (/Founded/i.test(label)) data.founded = value;

      if (/Fleet size/i.test(label)) data.fleet_size = value;

      if (/Key people/i.test(label)) {
        data.key_people = value.replace(/\s{2,}/g, " ");
      }

      if (/Website/i.test(label)) data.website = value;

      // STATUS
      if (/Ceased|Defunct/i.test(label)) data.status = "Defunct";
      if (/Commenced|Operating/i.test(label)) data.status = "Active";

      // TYPE
      if (/Type/i.test(label)) data.type = value;

      // CATEGORY from keywords
      const vL = value.toLowerCase();
      if (vL.includes("flag carrier")) data.category = "Flag carrier";
      if (vL.includes("low-cost") || vL.includes("low cost")) data.category = "Low-cost";
      if (vL.includes("regional")) data.category = "Regional";
      if (vL.includes("charter")) data.category = "Charter";
      if (vL.includes("cargo")) data.category = "Cargo";
    });

    // -------- Summary paragraph --------
    const p = $("#mw-content-text p").first().text().trim();
    if (p) data.observations = p;

    // -------- LOGO --------
    const logo = $("table.infobox img").first().attr("src");
    if (logo) data.logo_url = logo.startsWith("http") ? logo : "https:" + logo;

    // -------- AIRFLEETS MERGE --------
    const airfleets = await fetchAirfleetsData(data.name, data.icao);

    if (airfleets.fleet_size) data.fleet_size = airfleets.fleet_size;
    if (airfleets.aircraft_types) data.aircraft_types = airfleets.aircraft_types;

    res.json(data);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// -----------------
app.listen(PORT, () => {
  console.log(`Airline API running on port ${PORT}`);
});
